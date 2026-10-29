import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ShoppingCart,
  Clock,
  ChevronDown,
  ChevronUp,
  Camera,
  ImageIcon,
  X,
  Ticket,
  Coins,
  Send,
  Smartphone,
  Info,
  Sparkles,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/api';
import { storage, STORAGE_KEYS } from '../../utils/storage';
import { CartItem } from '../../types';
import { Colors } from '../../theme/colors';
import { parseMultipleImeis } from '../../utils/imeiHelper';

interface ImeiPackage {
  id: string;
  name: string;
  duration: string;
  price: number;
  description?: string;
  speed_prices?: any;
  allowed_speeds?: any;
  isVisible?: boolean | number;
  is_active?: boolean | number;
  status?: string;
}

const SPEED_OPTIONS_CONFIG = [
  { id: 'slow', label: 'Reguler (Slow)', key: 'imei_speed_slow', defaultRange: 'Max kirim 14:00 WIB, selesai max 00:00 WIB' },
  { id: 'semi', label: 'Semi Express', key: 'imei_speed_semi', defaultRange: '2 - 6 Jam Proses Kerja' },
  { id: 'fast', label: 'Super Express', key: 'imei_speed_fast', defaultRange: '30 Menit - 2 Jam Super Cepat' },
];

export default function AddRoamerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateUserBalance } = useAuth();
  const colors = Colors.dark;

  // Data states
  const [packages, setPackages] = useState<ImeiPackage[]>([]);
  const [speedPricing, setSpeedPricing] = useState<any>({});
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [publicCoupons, setPublicCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [imei, setImei] = useState('');
  const [selectedPkgId, setSelectedPkgId] = useState('');
  const [selectedSpeed, setSelectedSpeed] = useState<string>('slow');
  const [targetPhone, setTargetPhone] = useState(user?.phone || user?.verifiedPhone || '');
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [ketentuanOpen, setKetentuanOpen] = useState(false);

  // Discount & Coins states
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [useCoins, setUseCoins] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'balance' | 'qris'>('balance');

  // Submit states
  const [submitting, setSubmitting] = useState(false);
  const [addingCart, setAddingCart] = useState(false);

  // 1. Fetch initial data
  useEffect(() => {
    Promise.all([
      apiClient.get('/imei-packages').catch(() => null),
      apiClient.get('/manual-services-pricing').catch(() => null),
      apiClient.get('/user/announcement').catch(() => null),
      apiClient.get('/coupons/public').catch(() => null),
    ]).then(([pkgRes, prcRes, annRes, coupRes]) => {
      if (pkgRes?.data?.status && Array.isArray(pkgRes.data.data)) {
        const visible = pkgRes.data.data.filter((p: any) => p && p.isVisible !== false && p.is_active !== false);
        setPackages(visible);
        if (visible.length > 0) {
          setSelectedPkgId(visible[0].id);
        }
      }
      if (prcRes?.data?.status && prcRes.data.data) {
        setSpeedPricing(prcRes.data.data);
      }
      if (annRes?.data?.status) {
        if (Array.isArray(annRes.data.announcements)) {
          setAnnouncements(annRes.data.announcements);
        } else if (annRes.data.data?.message) {
          setAnnouncements([annRes.data.data]);
        }
      }
      if (coupRes?.data?.status && Array.isArray(coupRes.data.data)) {
        setPublicCoupons(coupRes.data.data);
      }
      setLoading(false);
    });
  }, []);

  // Set default phone
  useEffect(() => {
    if ((user?.phone || user?.verifiedPhone) && !targetPhone) {
      setTargetPhone(user.phone || user.verifiedPhone || '');
    }
  }, [user, targetPhone]);

  // IMEI parsing & analysis
  const parsedImeis = useMemo(() => parseMultipleImeis(imei), [imei]);
  const validImeiCount = parsedImeis.filter((i) => i.isValidLength && i.isValidLuhn).length;
  const imeiCount = parsedImeis.length > 0 ? parsedImeis.length : 1;

  // Selected package
  const selectedPkg = packages.find((p) => p.id === selectedPkgId) || packages[0];

  const pkgSpeedPrices: any = useMemo(() => {
    if (!selectedPkg?.speed_prices) return {};
    try {
      return typeof selectedPkg.speed_prices === 'string'
        ? JSON.parse(selectedPkg.speed_prices)
        : selectedPkg.speed_prices;
    } catch (e) {
      return {};
    }
  }, [selectedPkg]);

  // Wholesale calculation
  const wholesaleMinQty = Number(pkgSpeedPrices?.wholesale_min_qty) || 2;
  const wholesalePrices = pkgSpeedPrices?.wholesale_prices || {};
  const wholesalePriceForSpeed = Number(wholesalePrices[selectedSpeed] || 0);
  const isWholesaleActive = Boolean(
    pkgSpeedPrices?.wholesale_enabled &&
    imeiCount >= wholesaleMinQty &&
    wholesalePriceForSpeed > 0
  );

  // Speed pricing
  const speedCost = selectedSpeed && speedPricing ? Number(speedPricing[`imei_speed_${selectedSpeed}`] || speedPricing[selectedSpeed] || 0) : 0;

  let regularPricePerImei = 0;
  if (selectedPkg) {
    if (selectedSpeed && pkgSpeedPrices[selectedSpeed] !== undefined && Number(pkgSpeedPrices[selectedSpeed]) > 0) {
      regularPricePerImei = Number(pkgSpeedPrices[selectedSpeed]);
    } else {
      const basePrice = Number(selectedPkg.price || 0);
      regularPricePerImei = basePrice + speedCost;
    }
  }

  const pricePerImei = isWholesaleActive ? wholesalePriceForSpeed : regularPricePerImei;
  const rawTotalPrice = pricePerImei * imeiCount;
  const regularTotalPrice = regularPricePerImei * imeiCount;
  const wholesaleSavings = isWholesaleActive ? Math.max(0, regularTotalPrice - rawTotalPrice) : 0;

  // Coupon discount
  const discountAmount = appliedCoupon ? Math.min(Number(appliedCoupon.discount_amount || 0), rawTotalPrice) : 0;
  const priceAfterCoupon = Math.max(0, rawTotalPrice - discountAmount);

  // Coins discount
  const userCoins = Number(user?.coins || 0);
  const maxCoinsAllowed = priceAfterCoupon >= 50000 ? Math.min(Math.floor(priceAfterCoupon * 0.02), 5000) : 0;
  const coinsDiscount = useCoins && maxCoinsAllowed > 0 ? Math.min(userCoins, maxCoinsAllowed, priceAfterCoupon) : 0;
  const totalPrice = Math.max(0, priceAfterCoupon - coinsDiscount);

  // Pick Image Handler
  const handlePickImage = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert('Unggah Bukti Screenshot *#06#', 'Pilih sumber gambar:', [
        {
          text: 'Buka Kamera',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Izin Ditolak', 'Izin kamera dibutuhkan untuk memotret bukti layar.');
              return;
            }
            const res = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              quality: 0.8,
            });
            if (!res.canceled && res.assets[0]?.uri) {
              setScreenshotUri(res.assets[0].uri);
            }
          },
        },
        {
          text: 'Pilih dari Galeri',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Izin Ditolak', 'Izin galeri foto dibutuhkan.');
              return;
            }
            const res = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              quality: 0.8,
            });
            if (!res.canceled && res.assets[0]?.uri) {
              setScreenshotUri(res.assets[0].uri);
            }
          },
        },
        { text: 'Batal', style: 'cancel' },
      ]);
    } catch (e) {
      Alert.alert('Error', 'Gagal membuka pemilih gambar.');
    }
  };

  const validateForm = () => {
    if (parsedImeis.length === 0) {
      Alert.alert('Data Belum Lengkap', 'Nomor IMEI target belum diisi (minimal 15 digit angka).');
      return false;
    }
    if (!selectedPkgId) {
      Alert.alert('Data Belum Lengkap', 'Pilih Paket Masa Aktif / Garansi IMEI.');
      return false;
    }
    if (!screenshotUri) {
      Alert.alert('Data Belum Lengkap', 'Unggah bukti screenshot *#06# HP target Anda.');
      return false;
    }
    if (!targetPhone.trim() || targetPhone.replace(/\D/g, '').length < 9) {
      Alert.alert('Data Belum Lengkap', 'Nomor WhatsApp penerima nota minimal 9 digit angka.');
      return false;
    }
    if (!agreed) {
      Alert.alert('Persetujuan Layanan', 'Centang persetujuan Syarat & Ketentuan Layanan untuk melanjutkan.');
      return false;
    }
    return true;
  };

  // Add to cart
  const handleAddToCart = async () => {
    if (!validateForm()) return;
    setAddingCart(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const items = (await storage.getObject<CartItem[]>(STORAGE_KEYS.CART_ITEMS)) || [];
      const newItem: CartItem = {
        id: `roamer-${Date.now()}`,
        packageId: selectedPkg.id,
        packageName: selectedPkg.name || `Add Roamer ${selectedPkg.duration}`,
        name: selectedPkg.name || `Add Roamer ${selectedPkg.duration}`,
        serviceType: 'manual_imei',
        price: totalPrice,
        duration: selectedPkg.duration,
        imei: imei.trim(),
        targetPhone: targetPhone.trim(),
        quantity: imeiCount,
        speed: selectedSpeed,
        speedPrice: speedCost,
      };
      items.push(newItem);
      await storage.setObject(STORAGE_KEYS.CART_ITEMS, items);

      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      Alert.alert(
        'Masuk Keranjang! 🛒',
        `${selectedPkg.name || 'Paket Add Roamer'} berhasil ditambahkan ke keranjang belanja.`,
        [
          { text: 'Lanjut Belanja', style: 'cancel' },
          { text: 'Lihat Keranjang', onPress: () => router.push('/(screens)/cart' as any) },
        ]
      );
    } catch (e) {
      Alert.alert('Gagal', 'Terjadi kesalahan saat menyimpan ke keranjang.');
    } finally {
      setAddingCart(false);
    }
  };

  // Direct checkout
  const handleDirectCheckout = async () => {
    if (!validateForm()) return;

    if (paymentMethod === 'balance' && (user?.balance || 0) < totalPrice) {
      Alert.alert(
        'Saldo Tidak Mencukupi',
        `Biaya pengerjaan Rp ${totalPrice.toLocaleString('id-ID')}. Saldo Anda saat ini Rp ${Number(user?.balance || 0).toLocaleString('id-ID')}.\n\nIngin Top Up Saldo sekarang?`,
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Top Up Saldo', onPress: () => router.push('/(screens)/topup' as any) },
        ]
      );
      return;
    }

    Alert.alert(
      'Konfirmasi Checkout',
      `Yakin mau lanjut bayar untuk ${imeiCount} IMEI? ${appliedCoupon ? `(Diskon: -Rp ${discountAmount.toLocaleString('id-ID')}) ` : ''}Total Rp ${totalPrice.toLocaleString('id-ID')}.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Lanjutkan Bayar',
          onPress: async () => {
            setSubmitting(true);
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              const formData = new FormData();
              formData.append('service_type', 'imei');
              formData.append('imei', imei.trim());
              formData.append('duration', selectedPkg.duration || '1 Bulan');
              formData.append('amount', totalPrice.toString());
              formData.append('package_id', selectedPkg.id);
              formData.append('speed', selectedSpeed);
              formData.append('targetPhone', targetPhone.trim());
              if (appliedCoupon) {
                formData.append('couponCode', appliedCoupon.code);
              }

              if (screenshotUri) {
                const filename = screenshotUri.split('/').pop() || 'screenshot.jpg';
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image/jpeg`;
                formData.append('screenshot', {
                  uri: screenshotUri,
                  name: filename,
                  type,
                } as any);
              }

              const res = await apiClient.post('/transactions/manual', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
              });

              if (res.data?.status) {
                if (typeof res.data.newBalance === 'number') {
                  updateUserBalance(res.data.newBalance);
                }
                try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
                Alert.alert(
                  'Pesanan Berhasil Dibuat! 🎉',
                  'Pesanan Add Roamer Anda telah berhasil diteruskan ke sistem untuk diproses tim teknis.',
                  [
                    { text: 'Lihat Riwayat', onPress: () => router.push('/(tabs)/history' as any) },
                  ]
                );
              } else {
                Alert.alert('Gagal', res.data?.message || 'Gagal memproses pesanan.');
              }
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Terjadi kesalahan sistem saat memproses pesanan.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Memuat Layanan Add Roamer...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header */}
      <View style={[styles.topNav, { borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.surface }]}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={styles.rowAlign}>
            <Text style={[styles.navTitle, { color: colors.text }]}>Add Roamer</Text>
            <View style={styles.starSellerBadge}>
              <Text style={styles.starSellerText}>STAR SELLER</Text>
            </View>
          </View>
          <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>
            Aktivasi sinyal All Operator resmi & 100% bergaransi
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 150 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Broadcast Announcement Banner */}
        {announcements.length > 0 && announcements[0]?.message && (
          <View style={[styles.annBanner, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '44' }]}>
            <Sparkles size={16} color={colors.primary} style={{ marginTop: 2 }} />
            <Text style={[styles.annText, { color: colors.text }]}>
              {announcements[0].message}
            </Text>
          </View>
        )}

        {/* Promo Diskon Multi-IMEI Banner */}
        <View style={[styles.promoBanner, { backgroundColor: '#10b98115', borderColor: '#10b98144' }]}>
          <View style={styles.rowSpace}>
            <View style={styles.rowAlign}>
              <View style={[styles.iconCircle, { backgroundColor: '#10b98133' }]}>
                <Zap size={16} color="#10b981" />
              </View>
              <View style={{ marginLeft: 10 }}>
                <View style={styles.rowAlign}>
                  <Text style={[styles.promoTitle, { color: colors.text }]}>Promo Diskon Multi-IMEI</Text>
                  <View style={styles.promoPill}>
                    <Text style={styles.promoPillText}>Hemat Otomatis</Text>
                  </View>
                </View>
                <Text style={[styles.promoDesc, { color: colors.textMuted }]}>
                  Daftarkan 2 IMEI / Dual SIM otomatis dapat potongan grosir.
                </Text>
              </View>
            </View>
            <View style={[styles.minImeiTag, { backgroundColor: '#10b98122', borderColor: '#10b981' }]}>
              <Text style={[styles.minImeiTagText, { color: '#10b981' }]}>Min. 2 IMEI</Text>
            </View>
          </View>
        </View>

        {/* Collapsible Ketentuan Layanan Card */}
        <Pressable
          style={[styles.ketentuanCard, { backgroundColor: '#f59e0b12', borderColor: '#f59e0b44' }]}
          onPress={() => setKetentuanOpen(!ketentuanOpen)}
        >
          <View style={styles.rowSpace}>
            <View style={styles.rowAlign}>
              <AlertTriangle size={18} color="#f59e0b" />
              <Text style={[styles.ketentuanTitle, { color: '#f59e0b', marginLeft: 8 }]}>
                Ketentuan Layanan Penting
              </Text>
            </View>
            {ketentuanOpen ? <ChevronUp size={18} color="#f59e0b" /> : <ChevronDown size={18} color="#f59e0b" />}
          </View>

          {ketentuanOpen && (
            <View style={styles.ketentuanBody}>
              <Text style={[styles.ketentuanItem, { color: colors.text }]}>
                1. Khusus untuk unit <Text style={{ fontWeight: '800' }}>HP Inter (Internasional)</Text>.
              </Text>
              <Text style={[styles.ketentuanItem, { color: colors.text }]}>
                2. Untuk pengguna iPhone, pastikan HP <Text style={{ fontWeight: '800' }}>bukan barang bypass</Text>.
              </Text>
              <Text style={[styles.ketentuanItem, { color: colors.text }]}>
                3. Pastikan IC Baseband sehat: masukkan SIM Card jika muncul <Text style={{ color: '#ef4444', fontWeight: '800' }}>"Tidak ada layanan" (No Service)</Text> berarti aman.
              </Text>
              <Text style={[styles.ketentuanItem, { color: colors.text }]}>
                4. Jika status simlock, wajib terpasang rsim / sim sticker dari awal.
              </Text>
            </View>
          )}
        </Pressable>

        {/* Form Section: IMEI Input */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.rowSpace}>
            <Text style={[styles.label, { color: colors.text }]}>Nomor IMEI (15 Digit)</Text>
            {imei.trim().length > 0 && (
              <View style={[styles.tagBadge, { backgroundColor: colors.primary + '22' }]}>
                <Text style={[styles.tagBadgeText, { color: colors.primary }]}>
                  {validImeiCount} Siap Proses
                </Text>
              </View>
            )}
          </View>

          <TextInput
            style={[styles.textArea, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
            placeholder="Masukkan 15 digit nomor IMEI (Bisa banyak sekaligus, pisahkan dengan baris baru atau koma)"
            placeholderTextColor={colors.textDim}
            value={imei}
            onChangeText={(val) => setImei(val.replace(/[^0-9,\n\r ]/g, ''))}
            multiline
          />

          <View style={[styles.guideBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Info size={14} color={colors.primary} style={{ marginTop: 2 }} />
            <Text style={[styles.guideText, { color: colors.textMuted }]}>
              <Text style={{ fontWeight: '800', color: colors.text }}>HP Dual SIM (IMEI 1 & 2)? </Text>
              Masukkan tiap 15 digit IMEI di baris baru. Pembelian 2 IMEI otomatis dapat harga grosir.
            </Text>
          </View>

          {/* Interactive Parsed IMEI Cards */}
          {parsedImeis.length > 0 && (
            <View style={styles.imeiListWrap}>
              {parsedImeis.map((item, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.imeiItemCard,
                    {
                      backgroundColor: item.isValidLength && item.isValidLuhn ? '#10b98112' : '#f59e0b12',
                      borderColor: item.isValidLength && item.isValidLuhn ? '#10b98144' : '#f59e0b44',
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.imeiDeviceName, { color: colors.text }]}>
                      {item.brand ? `${item.brand} ${item.model}` : `Perangkat #${idx + 1}`}
                    </Text>
                    <Text style={[styles.imeiDigits, { color: colors.textMuted }]}>{item.clean}</Text>
                  </View>
                  <Pressable
                    hitSlop={8}
                    onPress={() => {
                      const lines = imei.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
                      setImei(lines.filter((_, i) => i !== idx).join('\n'));
                    }}
                  >
                    <X size={16} color={colors.danger} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Form Section: Package Duration Selection */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.text }]}>Pilih Paket Masa Aktif / Garansi</Text>
          <View style={styles.packageGrid}>
            {packages.map((pkg) => {
              const selected = selectedPkgId === pkg.id;
              return (
                <Pressable
                  key={pkg.id}
                  style={[
                    styles.packageCard,
                    selected
                      ? { borderColor: colors.primary, backgroundColor: colors.primary + '18' }
                      : { borderColor: colors.border, backgroundColor: colors.surfaceElevated },
                  ]}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                    setSelectedPkgId(pkg.id);
                  }}
                >
                  <View style={styles.rowSpace}>
                    <Text style={[styles.pkgName, { color: colors.text }]}>{pkg.name || pkg.duration}</Text>
                    {selected && <CheckCircle2 size={16} color={colors.primary} />}
                  </View>
                  <Text style={[styles.pkgPrice, { color: colors.primary }]}>
                    Rp {Number(pkg.price || 0).toLocaleString('id-ID')}
                  </Text>
                  <Text style={[styles.pkgDesc, { color: colors.textMuted }]}>
                    {pkg.description || `Garansi Sinyal ${pkg.duration}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Form Section: Speed / Kecepatan */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.text }]}>Kecepatan Pengerjaan</Text>
          <View style={styles.speedCol}>
            {SPEED_OPTIONS_CONFIG.map((opt) => {
              const selected = selectedSpeed === opt.id;
              const hasSpecific = pkgSpeedPrices[opt.id] !== undefined && Number(pkgSpeedPrices[opt.id]) > 0;
              const displayPrc = hasSpecific
                ? Number(pkgSpeedPrices[opt.id])
                : (speedPricing && Number(speedPricing[opt.key])) || 0;

              return (
                <Pressable
                  key={opt.id}
                  style={[
                    styles.speedCard,
                    selected
                      ? { borderColor: colors.primary, backgroundColor: colors.primary + '18' }
                      : { borderColor: colors.border, backgroundColor: colors.surfaceElevated },
                  ]}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                    setSelectedSpeed(opt.id);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.speedLabel, { color: colors.text }]}>{opt.label}</Text>
                    <Text style={[styles.speedRange, { color: colors.textMuted }]}>{opt.defaultRange}</Text>
                  </View>
                  <Text style={[styles.speedPriceTag, { color: colors.primary }]}>
                    {displayPrc > 0 ? `+Rp ${displayPrc.toLocaleString('id-ID')}` : 'Termasuk'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Form Section: Recipient WhatsApp Phone */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.text }]}>Nomor WhatsApp Penerima Nota</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
            placeholder="Contoh: 081234567890"
            placeholderTextColor={colors.textDim}
            value={targetPhone}
            onChangeText={setTargetPhone}
            keyboardType="phone-pad"
          />
          <Text style={[styles.fieldHint, { color: colors.textMuted }]}>
            Nota pengerjaan dan notifikasi sinyal aktif akan dikirim otomatis ke nomor ini.
          </Text>
        </View>

        {/* Form Section: Screenshot Upload */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.text }]}>Bukti Screenshot *#06#</Text>
          <Text style={[styles.fieldHint, { color: colors.textMuted, marginTop: 0 }]}>
            Wajib melampirkan screenshot layar saat menekan *#06# pada HP target.
          </Text>

          {screenshotUri ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: screenshotUri }} style={styles.previewImage} resizeMode="cover" />
              <Pressable
                style={styles.changeImageBtn}
                onPress={handlePickImage}
              >
                <Text style={styles.changeImageText}>Ganti Foto</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[styles.uploadBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              onPress={handlePickImage}
            >
              <Camera size={28} color={colors.primary} />
              <Text style={[styles.uploadHeading, { color: colors.text }]}>Unggah Bukti Screenshot *#06#</Text>
              <Text style={[styles.uploadSub, { color: colors.textMuted }]}>
                Tekan untuk ambil dari kamera atau galeri foto
              </Text>
            </Pressable>
          )}
        </View>

        {/* Form Section: Coupon & Coins */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.text }]}>Voucher & Koin Promo</Text>

          {/* Voucher Button */}
          <Pressable
            style={[styles.voucherTrigger, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            onPress={() => setShowVoucherModal(true)}
          >
            <View style={styles.rowAlign}>
              <Ticket size={18} color="#f59e0b" />
              <Text style={[styles.voucherTriggerText, { color: appliedCoupon ? colors.primary : colors.text }]}>
                {appliedCoupon ? `Voucher: ${appliedCoupon.code} (-Rp ${discountAmount.toLocaleString('id-ID')})` : 'Pilih atau Masukkan Voucher'}
              </Text>
            </View>
            {appliedCoupon ? (
              <Pressable
                hitSlop={8}
                onPress={(e) => {
                  e.stopPropagation();
                  setAppliedCoupon(null);
                }}
              >
                <X size={16} color={colors.textMuted} />
              </Pressable>
            ) : (
              <ChevronDown size={16} color={colors.textMuted} />
            )}
          </Pressable>

          {/* Coins Toggle */}
          <View style={[styles.switchRow, { borderTopColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <View style={styles.rowAlign}>
                <Coins size={16} color="#eab308" />
                <Text style={[styles.switchTitle, { color: colors.text, marginLeft: 6 }]}>
                  Tukarkan RyPoints / Koin
                </Text>
              </View>
              <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                Saldo Koin: {userCoins} Koin (Maks. potong Rp {maxCoinsAllowed.toLocaleString('id-ID')})
              </Text>
            </View>
            <Switch
              value={useCoins}
              onValueChange={setUseCoins}
              disabled={userCoins <= 0 || maxCoinsAllowed <= 0}
              trackColor={{ false: '#334155', true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Agreement Checkbox */}
        <Pressable
          style={styles.checkboxRow}
          onPress={() => setAgreed(!agreed)}
        >
          <View
            style={[
              styles.checkbox,
              agreed
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { borderColor: colors.border, backgroundColor: colors.surfaceElevated },
            ]}
          >
            {agreed && <Check size={14} color="#fff" />}
          </View>
          <Text style={[styles.checkboxLabel, { color: colors.text }]}>
            Saya menyetujui <Text style={{ fontWeight: '800', color: colors.primary }}>Syarat & Ketentuan Layanan</Text> IMEI All Operator.
          </Text>
        </Pressable>
      </ScrollView>

      {/* Sticky Bottom Checkout Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.bottomBarInfo}>
          <Text style={[styles.bottomBarLabel, { color: colors.textMuted }]}>Total Biaya</Text>
          <View style={styles.rowAlign}>
            <Text style={[styles.bottomBarPrice, { color: colors.primary }]}>
              Rp {totalPrice.toLocaleString('id-ID')}
            </Text>
            {wholesaleSavings > 0 && (
              <View style={styles.savingBadge}>
                <Text style={styles.savingBadgeText}>Hemat Rp {wholesaleSavings.toLocaleString('id-ID')}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.bottomBarActions}>
          <Pressable
            style={[styles.cartBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            onPress={handleAddToCart}
            disabled={addingCart}
          >
            {addingCart ? <ActivityIndicator size="small" color={colors.primary} /> : <ShoppingCart size={18} color={colors.text} />}
          </Pressable>

          <Pressable
            style={[styles.checkoutBtn, { backgroundColor: colors.primary }]}
            onPress={handleDirectCheckout}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.checkoutBtnText}>Bayar Sekarang</Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* Voucher Selection Modal */}
      <Modal visible={showVoucherModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.rowSpace}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Pilih Voucher Toko</Text>
              <Pressable onPress={() => setShowVoucherModal(false)}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.voucherInputRow}>
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                placeholder="Punya kode voucher?"
                placeholderTextColor={colors.textDim}
                value={couponCode}
                onChangeText={setCouponCode}
                autoCapitalize="characters"
              />
              <Pressable
                style={[styles.applyBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  if (!couponCode.trim()) return;
                  const match = publicCoupons.find((c) => c.code?.toUpperCase() === couponCode.trim().toUpperCase());
                  if (match) {
                    setAppliedCoupon(match);
                    setShowVoucherModal(false);
                    Alert.alert('Voucher Digunakan! 🎉', `Diskon -Rp ${Number(match.discount_amount || 0).toLocaleString('id-ID')}`);
                  } else {
                    setAppliedCoupon({ code: couponCode.trim().toUpperCase(), discount_amount: 10000 });
                    setShowVoucherModal(false);
                    Alert.alert('Voucher Digunakan! 🎉', `Kode ${couponCode.toUpperCase()} diterapkan.`);
                  }
                }}
              >
                <Text style={styles.applyBtnText}>Pakai</Text>
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              {publicCoupons.length === 0 ? (
                <Text style={{ color: colors.textMuted, fontSize: 12, paddingVertical: 12, textAlign: 'center' }}>
                  Tidak ada voucher publik yang tersedia saat ini.
                </Text>
              ) : (
                publicCoupons.map((c) => (
                  <Pressable
                    key={c.id || c.code}
                    style={[styles.couponCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                    onPress={() => {
                      setAppliedCoupon(c);
                      setShowVoucherModal(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.couponCode, { color: colors.primary }]}>{c.code}</Text>
                      <Text style={[styles.couponDesc, { color: colors.textMuted }]}>
                        Potongan Rp {Number(c.discount_amount || 0).toLocaleString('id-ID')}
                      </Text>
                    </View>
                    <Text style={[styles.applyText, { color: colors.primary }]}>Gunakan</Text>
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
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  starSellerBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  starSellerText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  navSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 14,
  },
  annBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  annText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  promoBanner: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  promoPill: {
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  promoPillText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  promoDesc: {
    fontSize: 10,
    marginTop: 2,
  },
  minImeiTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  minImeiTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  ketentuanCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  ketentuanTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  ketentuanBody: {
    marginTop: 10,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#f59e0b22',
    paddingTop: 8,
  },
  ketentuanItem: {
    fontSize: 11,
    lineHeight: 16,
  },
  card: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textArea: {
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    fontSize: 12,
    textAlignVertical: 'top',
  },
  guideBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  guideText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
  },
  imeiListWrap: {
    gap: 6,
    marginTop: 4,
  },
  imeiItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  imeiDeviceName: {
    fontSize: 12,
    fontWeight: '800',
  },
  imeiDigits: {
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  packageGrid: {
    gap: 8,
  },
  packageCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  pkgName: {
    fontSize: 13,
    fontWeight: '800',
  },
  pkgPrice: {
    fontSize: 13,
    fontWeight: '900',
  },
  pkgDesc: {
    fontSize: 10,
  },
  speedCol: {
    gap: 8,
  },
  speedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  speedLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  speedRange: {
    fontSize: 10,
    marginTop: 2,
  },
  speedPriceTag: {
    fontSize: 12,
    fontWeight: '800',
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  fieldHint: {
    fontSize: 10,
    lineHeight: 14,
  },
  previewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    height: 140,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  changeImageBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#000000aa',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  changeImageText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  uploadBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 6,
  },
  uploadHeading: {
    fontSize: 12,
    fontWeight: '800',
  },
  uploadSub: {
    fontSize: 10,
  },
  voucherTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  voucherTriggerText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    marginTop: 4,
  },
  switchTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  switchDesc: {
    fontSize: 10,
    marginTop: 2,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  bottomBarInfo: {
    flex: 1,
  },
  bottomBarLabel: {
    fontSize: 10,
  },
  bottomBarPrice: {
    fontSize: 16,
    fontWeight: '900',
  },
  savingBadge: {
    backgroundColor: '#10b98122',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  savingBadgeText: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: '800',
  },
  bottomBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  checkoutBtn: {
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowSpace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    padding: 16,
  },
  modalBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  voucherInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  applyBtn: {
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  couponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  couponCode: {
    fontSize: 13,
    fontWeight: '800',
  },
  couponDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  applyText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
