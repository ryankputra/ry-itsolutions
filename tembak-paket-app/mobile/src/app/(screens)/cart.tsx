import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  Ticket,
  Sparkles,
  Wallet,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  CreditCard,
  QrCode,
  Tag,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { storage, STORAGE_KEYS } from '../../utils/storage';
import { CartItem } from '../../types';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';

interface CouponItem {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_order_amount?: number;
  max_discount_amount?: number;
  discount_amount?: number;
  is_claimed?: boolean;
}

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateUserBalance, refreshUser } = useAuth();
  const colors = Colors.dark;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [checkingOut, setCheckingOut] = useState(false);

  // Voucher states
  const [publicCoupons, setPublicCoupons] = useState<CouponItem[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponItem | null>(null);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Coins & Payment states
  const [useCoins, setUseCoins] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'balance' | 'qris'>('balance');

  useEffect(() => {
    async function loadInitialData() {
      try {
        const items = await storage.getObject<CartItem[]>(STORAGE_KEYS.CART_ITEMS);
        if (items && Array.isArray(items)) {
          setCart(items);
          setSelectedItems(items.map((i) => i.id));
        }
        const coupRes = await apiClient.get('/coupons/public');
        if (coupRes.data?.status && Array.isArray(coupRes.data.data)) {
          setPublicCoupons(coupRes.data.data);
        }
      } catch (e) {} finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  const saveCart = async (items: CartItem[]) => {
    setCart(items);
    await storage.setObject(STORAGE_KEYS.CART_ITEMS, items);
  };

  const handleUpdateQty = async (id: string, delta: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const updated = cart
      .map((item) => {
        if (item.id === id) {
          const newQty = (item.quantity || 1) + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      })
      .filter(Boolean) as CartItem[];
    await saveCart(updated);
  };

  const handleRemoveItem = async (id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    const updated = cart.filter((i) => i.id !== id);
    setSelectedItems((prev) => prev.filter((i) => i !== id));
    await saveCart(updated);
  };

  const toggleSelectItem = (id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter((i) => i !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const toggleSelectAll = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (selectedItems.length === cart.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cart.map((i) => i.id));
    }
  };

  const formatRupiah = (val: number) => {
    return 'Rp ' + (val || 0).toLocaleString('id-ID');
  };

  // Calculations
  const activeCartItems = cart.filter((item) => selectedItems.includes(item.id));
  const subtotal = activeCartItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);

  let discountAmount = 0;
  if (appliedCoupon && subtotal > 0) {
    if (appliedCoupon.discount_type === 'percent') {
      discountAmount = Math.floor((subtotal * appliedCoupon.discount_value) / 100);
      if (appliedCoupon.max_discount_amount) {
        discountAmount = Math.min(discountAmount, appliedCoupon.max_discount_amount);
      }
    } else {
      discountAmount = appliedCoupon.discount_value || 0;
    }
    discountAmount = Math.min(discountAmount, subtotal);
  }

  const priceAfterCoupon = Math.max(0, subtotal - discountAmount);
  const userCoins = user?.coins || 0;
  // Web rules: min order 50.000, 2% max, 5.000 cap
  const maxCoinsAllowed = priceAfterCoupon >= 50000 ? Math.min(Math.floor(priceAfterCoupon * 0.02), 5000) : 0;
  const coinsDiscount = useCoins && maxCoinsAllowed > 0 ? Math.min(userCoins, maxCoinsAllowed, priceAfterCoupon) : 0;
  const grandTotal = Math.max(0, priceAfterCoupon - coinsDiscount);

  // Apply Coupon Logic
  const handleApplyCoupon = async (codeToApply: string) => {
    const cleanCode = codeToApply.trim().toUpperCase();
    if (!cleanCode) return;
    setValidatingCoupon(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await apiClient.post('/coupon/validate', {
        code: cleanCode,
        order_amount: subtotal,
      });
      const data = res.data;
      if (data?.status && data.data) {
        setAppliedCoupon(data.data);
        setShowVoucherModal(false);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        Alert.alert('Voucher Terpasang! 🎉', `Voucher ${data.data.code} berhasil digunakan.`);
      } else if (data?.require_claim) {
        // Auto-claim and re-apply
        const claimRes = await apiClient.post('/coupons/claim', { code: cleanCode });
        if (claimRes.data?.status) {
          const retryRes = await apiClient.post('/coupon/validate', {
            code: cleanCode,
            order_amount: subtotal,
          });
          if (retryRes.data?.status && retryRes.data.data) {
            setAppliedCoupon(retryRes.data.data);
            setShowVoucherModal(false);
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {}
            Alert.alert('Voucher Diklaim & Terpasang! 🎉', `Voucher ${retryRes.data.data.code} berhasil dipasang.`);
            return;
          }
        }
        Alert.alert('Klaim Voucher', data.message || 'Silakan klaim voucher terlebih dahulu.');
      } else {
        Alert.alert('Gagal Menggunakan Voucher', data?.message || 'Kupon tidak dapat digunakan untuk pesanan ini.');
      }
    } catch (e: any) {
      Alert.alert('Gagal', e.response?.data?.message || 'Terjadi kesalahan saat memvalidasi voucher.');
    } finally {
      setValidatingCoupon(false);
    }
  };

  // Checkout execution matching web FormData flow
  const handleCheckout = async () => {
    if (activeCartItems.length === 0) {
      Alert.alert('Pilih Item', 'Pilih minimal 1 layanan di keranjang untuk checkout.');
      return;
    }

    if (paymentMethod === 'qris') {
      router.push('/(screens)/topup' as any);
      return;
    }

    if ((user?.balance || 0) < grandTotal) {
      Alert.alert(
        'Saldo RyPay Tidak Cukup',
        `Total tagihan: ${formatRupiah(grandTotal)}.\nSaldo Anda saat ini: ${formatRupiah(user?.balance || 0)}.\n\nSilakan isi saldo RyPay Anda terlebih dahulu.`,
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Top Up Sekarang', onPress: () => router.push('/(screens)/topup' as any) },
        ]
      );
      return;
    }

    Alert.alert(
      'Konfirmasi Checkout',
      `Potong saldo ${formatRupiah(grandTotal)} untuk memproses ${activeCartItems.length} layanan?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Bayar Sekarang',
          onPress: async () => {
            setCheckingOut(true);
            let successCount = 0;
            const processedIds: string[] = [];

            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              for (let idx = 0; idx < activeCartItems.length; idx++) {
                const item = activeCartItems[idx];
                const itemPrice = (item.price || 0) * (item.quantity || 1);
                const pkgKey = String(item.packageId || item.id);
                const cleanImei = (item.imei || item.target || '').replace(/\D/g, '');

                const formData = new FormData();
                formData.append('service_type', item.serviceType === 'ceir' ? 'ceir' : 'imei');
                formData.append('imei', cleanImei);
                formData.append('duration', item.duration || '1 Bulan');
                formData.append('amount', itemPrice.toString());
                formData.append('package_id', pkgKey);
                formData.append('price_key', pkgKey);
                formData.append('speed', item.speed || 'regular');
                formData.append('speed_option', item.speed || 'regular');
                formData.append('payment_method', 'balance');
                const custPhone = item.targetPhone || user?.phone || user?.verifiedPhone || '';
                formData.append('target_phone', custPhone);

                if (idx === 0 && appliedCoupon) {
                  formData.append('couponCode', appliedCoupon.code);
                  formData.append('coupon_code', appliedCoupon.code);
                  formData.append('cart_subtotal', subtotal.toString());
                }
                if (idx === 0 && useCoins && coinsDiscount > 0) {
                  formData.append('use_coins', 'true');
                }

                const res = await apiClient.post('/order/manual', formData, {
                  headers: { 'Content-Type': 'multipart/form-data' },
                });

                if (res.data?.status) {
                  successCount++;
                  processedIds.push(item.id);
                } else {
                  throw new Error(res.data?.message || `Gagal memproses item: ${item.title || item.name}`);
                }
              }

              // Remove processed items
              const remainingCart = cart.filter((i) => !processedIds.includes(i.id));
              await saveCart(remainingCart);
              await refreshUser();
              try {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch {}
              Alert.alert(
                'Pesanan Berhasil Diproses! 🎉',
                `${successCount} layanan sedang diproses otomatis oleh sistem.`,
                [{ text: 'Lihat Riwayat', onPress: () => router.replace('/(tabs)/history' as any) }]
              );
            } catch (err: any) {
              await refreshUser();
              Alert.alert('Gagal Checkout', err.message || 'Terjadi kesalahan jaringan.');
            } finally {
              setCheckingOut(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.canvas }]} edges={['top']}>
      {/* Top Nav */}
      <View style={styles.topNav}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <ArrowLeft size={18} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.navTitle, { color: colors.ink }]}>Keranjang Belanja</Text>
          <Text style={[styles.navSubtitle, { color: colors.inkMuted }]}>
            {cart.length} Layanan Terdaftar
          </Text>
        </View>
        {cart.length > 0 && (
          <Pressable
            onPress={() => {
              Alert.alert('Kosongkan Keranjang', 'Hapus semua item dari keranjang?', [
                { text: 'Batal', style: 'cancel' },
                { text: 'Kosongkan', style: 'destructive', onPress: () => saveCart([]) },
              ]);
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#ff453a' }}>Hapus Semua</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : cart.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}>
            <ShoppingCart size={40} color={colors.inkMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.ink }]}>Keranjang Anda Kosong</Text>
          <Text style={[styles.emptyDesc, { color: colors.inkMuted }]}>
            Temukan berbagai paket roaming, aktivasi IMEI, dan layanan CEIR resmi terbaik.
          </Text>
          <Pressable
            style={[styles.emptyCta, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={styles.emptyCtaText}>Mulai Belanja Layanan</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: 150 + insets.bottom },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Select All Row */}
            <View style={[styles.selectAllRow, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}>
              <Pressable
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                onPress={toggleSelectAll}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: selectedItems.length === cart.length ? colors.primary : colors.hairline,
                      backgroundColor: selectedItems.length === cart.length ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  {selectedItems.length === cart.length && <Check size={14} color="#fff" />}
                </View>
                <Text style={[styles.selectAllText, { color: colors.ink }]}>
                  Pilih Semua ({cart.length} item)
                </Text>
              </Pressable>
              <Text style={[styles.selectedCountText, { color: colors.primary }]}>
                {selectedItems.length} Terpilih
              </Text>
            </View>

            {/* Cart Items List */}
            {cart.map((item) => {
              const isSelected = selectedItems.includes(item.id);
              return (
                <View
                  key={item.id}
                  style={[
                    styles.itemCard,
                    { backgroundColor: colors.parchment, borderColor: isSelected ? colors.primary : colors.hairline },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    <Pressable
                      style={[
                        styles.checkbox,
                        {
                          borderColor: isSelected ? colors.primary : colors.hairline,
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                          marginTop: 2,
                        },
                      ]}
                      onPress={() => toggleSelectItem(item.id)}
                    >
                      {isSelected && <Check size={14} color="#fff" />}
                    </Pressable>

                    <View style={{ flex: 1 }}>
                      <View style={styles.itemHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.itemName, { color: colors.ink }]}>
                            {item.title || item.name || item.packageName}
                          </Text>
                          {item.duration && (
                            <Text style={[styles.itemSubDetail, { color: colors.inkMuted }]}>
                              Durasi: {item.duration} {item.speed ? `• ${item.speed.toUpperCase()}` : ''}
                            </Text>
                          )}
                          {(item.imei || item.target) && (
                            <Text style={[styles.itemTarget, { color: colors.primary }]}>
                              IMEI: {item.imei || item.target}
                            </Text>
                          )}
                        </View>
                        <Pressable
                          onPress={() => handleRemoveItem(item.id)}
                          hitSlop={8}
                          style={styles.trashBtn}
                        >
                          <Trash2 size={16} color="#ff453a" />
                        </Pressable>
                      </View>

                      <View style={styles.itemFooter}>
                        <Text style={[styles.itemPrice, { color: colors.primary }]}>
                          {formatRupiah((item.price || 0) * (item.quantity || 1))}
                        </Text>

                        {/* Quantity Counter */}
                        <View
                          style={[
                            styles.counterWrap,
                            { backgroundColor: colors.canvas, borderColor: colors.hairline },
                          ]}
                        >
                          <Pressable
                            style={styles.counterBtn}
                            onPress={() => handleUpdateQty(item.id, -1)}
                          >
                            <Minus size={14} color={colors.ink} />
                          </Pressable>
                          <Text style={[styles.counterVal, { color: colors.ink }]}>
                            {item.quantity || 1}
                          </Text>
                          <Pressable
                            style={styles.counterBtn}
                            onPress={() => handleUpdateQty(item.id, 1)}
                          >
                            <Plus size={14} color={colors.ink} />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Shopee Voucher Card */}
            <View style={[styles.voucherCard, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.voucherIconWrap, { backgroundColor: 'rgba(255, 149, 0, 0.12)' }]}>
                    <Tag size={16} color="#ff9500" />
                  </View>
                  <View>
                    <Text style={[styles.voucherTitle, { color: colors.ink }]}>
                      {appliedCoupon ? `Voucher: ${appliedCoupon.code}` : 'Voucher Diskon Ry'}
                    </Text>
                    <Text style={[styles.voucherSub, { color: colors.inkMuted }]}>
                      {appliedCoupon
                        ? `Hemat ${formatRupiah(discountAmount)}`
                        : `${publicCoupons.length} Kupon promo tersedia`}
                    </Text>
                  </View>
                </View>

                {appliedCoupon ? (
                  <Pressable
                    onPress={() => setAppliedCoupon(null)}
                    style={styles.removeVoucherBtn}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#ff453a' }}>Hapus</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => setShowVoucherModal(true)}
                    style={[styles.applyVoucherBtn, { backgroundColor: 'rgba(41, 151, 255, 0.12)' }]}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>Gunakan</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* RyPoints Deduction Card */}
            {(user?.coins || 0) > 0 && (
              <Pressable
                style={[
                  styles.coinOptionCard,
                  { backgroundColor: colors.parchment, borderColor: colors.hairline },
                ]}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  setUseCoins(!useCoins);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Sparkles size={18} color="#f59e0b" />
                  <View>
                    <Text style={[styles.coinOptionTitle, { color: colors.ink }]}>
                      Tukarkan RyPoints (Hemat {formatRupiah(maxCoinsAllowed)})
                    </Text>
                    <Text style={[styles.coinOptionDesc, { color: colors.inkMuted }]}>
                      Saldo Koin: {(user?.coins || 0).toLocaleString('id-ID')} (Maks. 2% & Rp 5rb)
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: useCoins ? colors.primary : colors.hairline,
                      backgroundColor: useCoins ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  {useCoins && <CheckCircle2 size={16} color="#fff" />}
                </View>
              </Pressable>
            )}

            {/* Order Summary Card */}
            <View
              style={[
                styles.summaryCard,
                { backgroundColor: colors.parchment, borderColor: colors.hairline },
              ]}
            >
              <Text style={[styles.summaryTitle, { color: colors.ink }]}>Rincian Pembayaran</Text>

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.inkMuted }]}>Subtotal ({activeCartItems.length} item)</Text>
                <Text style={[styles.summaryValue, { color: colors.ink }]}>
                  {formatRupiah(subtotal)}
                </Text>
              </View>

              {discountAmount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: '#10b981' }]}>Diskon Voucher</Text>
                  <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                    - {formatRupiah(discountAmount)}
                  </Text>
                </View>
              )}

              {coinsDiscount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: '#f59e0b' }]}>Diskon RyPoints</Text>
                  <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>
                    - {formatRupiah(coinsDiscount)}
                  </Text>
                </View>
              )}

              <View style={[styles.divider, { backgroundColor: colors.hairline }]} />

              <View style={styles.summaryRow}>
                <Text style={[styles.totalLabel, { color: colors.ink }]}>Total Tagihan</Text>
                <Text style={[styles.totalValue, { color: colors.primary }]}>
                  {formatRupiah(grandTotal)}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Sticky Bottom Bar */}
          <View
            style={[
              styles.stickyBar,
              {
                backgroundColor: colors.parchment,
                borderTopColor: colors.hairline,
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}
          >
            <View style={styles.stickyInfo}>
              <Text style={[styles.stickySubText, { color: colors.inkMuted }]}>Total Pembayaran</Text>
              <Text style={[styles.stickyAmount, { color: colors.primary }]}>
                {formatRupiah(grandTotal)}
              </Text>
              <View style={styles.userBalanceRow}>
                <Wallet size={11} color={colors.inkMuted} />
                <Text style={[styles.userBalanceText, { color: colors.inkMuted }]}>
                  Saldo:{' '}
                  <Text
                    style={{
                      fontWeight: '700',
                      color: (user?.balance || 0) >= grandTotal ? '#10b981' : '#ff453a',
                    }}
                  >
                    {formatRupiah(user?.balance || 0)}
                  </Text>
                </Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.checkoutBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
              ]}
              onPress={handleCheckout}
              disabled={checkingOut}
            >
              {checkingOut ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.checkoutBtnText}>Bayar Saldo</Text>
                  <ArrowRight size={16} color="#fff" style={{ marginLeft: 6 }} />
                </>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Shopee Voucher Modal */}
      <Modal
        visible={showVoucherModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowVoucherModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ticket size={18} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.ink }]}>Pilih Voucher Diskon</Text>
              </View>
              <Pressable onPress={() => setShowVoucherModal(false)} hitSlop={10}>
                <X size={18} color={colors.inkMuted} />
              </Pressable>
            </View>

            {/* Manual Voucher Input */}
            <View style={[styles.manualVoucherRow, { backgroundColor: colors.canvas, borderColor: colors.hairline }]}>
              <TextInput
                style={[styles.manualVoucherInput, { color: colors.ink }]}
                placeholder="Masukkan Kode Promo"
                placeholderTextColor={colors.inkMuted}
                value={couponCodeInput}
                onChangeText={setCouponCodeInput}
                autoCapitalize="characters"
              />
              <Pressable
                style={[styles.manualVoucherApplyBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleApplyCoupon(couponCodeInput)}
                disabled={validatingCoupon || !couponCodeInput.trim()}
              >
                {validatingCoupon ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.manualVoucherApplyText}>Pakai</Text>
                )}
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 340, marginTop: 12 }}>
              {publicCoupons.length === 0 ? (
                <Text style={{ textAlign: 'center', color: colors.inkMuted, marginVertical: 20, fontSize: 12 }}>
                  Belum ada voucher publik tersedia.
                </Text>
              ) : (
                publicCoupons.map((coupon) => (
                  <Pressable
                    key={coupon.id}
                    style={[
                      styles.couponItemCard,
                      { backgroundColor: colors.canvas, borderColor: colors.hairline },
                    ]}
                    onPress={() => handleApplyCoupon(coupon.code)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.couponCodeText, { color: colors.ink }]}>{coupon.code}</Text>
                      <Text style={[styles.couponDescText, { color: colors.inkMuted }]}>
                        {coupon.discount_type === 'percent'
                          ? `Diskon ${coupon.discount_value}%`
                          : `Diskon Rp ${coupon.discount_value.toLocaleString('id-ID')}`}
                        {coupon.min_order_amount ? ` • Min. order Rp ${coupon.min_order_amount.toLocaleString('id-ID')}` : ''}
                      </Text>
                    </View>
                    <View style={[styles.useCouponPill, { backgroundColor: 'rgba(41, 151, 255, 0.12)' }]}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>Pakai</Text>
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  navSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyCta: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyCtaText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  selectedCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '800',
  },
  itemSubDetail: {
    fontSize: 11,
    marginTop: 2,
  },
  itemTarget: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  trashBtn: {
    padding: 4,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '800',
  },
  counterWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  counterBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterVal: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
  },
  voucherCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 12,
  },
  voucherIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  voucherSub: {
    fontSize: 10,
    marginTop: 1,
  },
  applyVoucherBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  removeVoucherBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  coinOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  coinOptionTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  coinOptionDesc: {
    fontSize: 10,
    marginTop: 2,
  },
  summaryCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stickyInfo: {
    flex: 1,
  },
  stickySubText: {
    fontSize: 10,
    fontWeight: '600',
  },
  stickyAmount: {
    fontSize: 16,
    fontWeight: '900',
  },
  userBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  userBalanceText: {
    fontSize: 10,
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginLeft: 12,
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  manualVoucherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },
  manualVoucherInput: {
    flex: 1,
    height: 42,
    fontSize: 13,
    fontWeight: '700',
  },
  manualVoucherApplyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  manualVoucherApplyText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  couponItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  couponCodeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  couponDescText: {
    fontSize: 11,
    marginTop: 2,
  },
  useCouponPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
});
