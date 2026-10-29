import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Ticket,
  Copy,
  CheckCircle2,
  Sparkles,
  Check,
  Percent,
  Clock,
  ArrowRight,
  RotateCw,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';

export interface CouponItem {
  id: string;
  code: string;
  discount_type?: 'fixed' | 'percent';
  discount_value?: number;
  discount?: string | number;
  min_order_amount?: number;
  minSpend?: string | number;
  max_discount_amount?: number;
  max_usage_limit?: number;
  used_count?: number;
  start_date?: string;
  end_date?: string;
  claimed?: boolean;
  is_claimed?: boolean;
  tag?: string;
}

export default function VouchersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors.dark;
  const params = useLocalSearchParams<{ code?: string; claim?: string }>();

  const [inputCode, setInputCode] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'claimed'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Vouchers state - 100% live database sync, zero mock data
  const [vouchers, setVouchers] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/coupons/public');
      if (res.data?.status && Array.isArray(res.data.data)) {
        setVouchers(res.data.data);
      } else if (Array.isArray(res.data)) {
        setVouchers(res.data);
      } else {
        setVouchers([]);
      }
    } catch (e) {
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  // Auto-claim parameter listener (e.g. from WhatsApp broadcast ?claim=PROMO)
  useEffect(() => {
    const claimCode = params.claim || params.code;
    if (claimCode) {
      const clean = String(claimCode).trim().toUpperCase();
      setInputCode(clean);
      handleClaimCode(clean);
    }
  }, [params.claim, params.code]);

  const handleClaimCode = async (codeToClaim?: string) => {
    const clean = (codeToClaim || inputCode).trim().toUpperCase();
    if (!clean) {
      Alert.alert('Perhatian', 'Masukkan kode voucher terlebih dahulu.');
      return;
    }

    setClaiming(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.post('/coupons/claim', { code: clean });
      if (res.data?.status) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        Alert.alert(
          'Voucher Berhasil Diklaim! 🎉',
          res.data.message || `Kode voucher ${clean} telah masuk ke akun Anda dan siap dipakai saat checkout.`,
          [{ text: 'Lihat Voucher Saya', onPress: () => setActiveTab('claimed') }]
        );
        setInputCode('');
        fetchCoupons();
      } else {
        Alert.alert('Gagal Mengklaim', res.data?.message || 'Kupon tidak dapat diklaim saat ini.');
      }
    } catch (e: any) {
      Alert.alert('Info Klaim', e.response?.data?.message || e.message || 'Gagal menghubungi server.');
    } finally {
      setClaiming(false);
    }
  };

  const handleClaimItem = async (coupon: CouponItem) => {
    setClaimingId(coupon.id);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.post('/coupons/claim', {
        coupon_id: coupon.id,
        code: coupon.code,
      });

      if (res.data?.status) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        Alert.alert(
          'Voucher Berhasil Diklaim! 🎉',
          res.data.message || `Voucher ${coupon.code} siap digunakan saat checkout order.`
        );
        fetchCoupons();
      } else {
        Alert.alert('Gagal', res.data?.message || 'Voucher belum bisa diklaim.');
      }
    } catch (e: any) {
      Alert.alert('Info Klaim', e.response?.data?.message || e.message || 'Gagal klaim.');
    } finally {
      setClaimingId(null);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Clipboard.setStringAsync(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {}
  };

  const formatRupiah = (val: number) => {
    return 'Rp ' + (val || 0).toLocaleString('id-ID');
  };

  const displayedVouchers = activeTab === 'claimed'
    ? vouchers.filter((v) => v.claimed || v.is_claimed)
    : vouchers;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Nav */}
      <View style={styles.topNav}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.surface }]}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.navTitle, { color: colors.text }]}>Klaim Kupon & Voucher</Text>
          <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>
            Diskon Pesanan & Cashback Koin
          </Text>
        </View>
        <Pressable
          style={[styles.refreshBtn, { backgroundColor: colors.surface }]}
          onPress={fetchCoupons}
          hitSlop={10}
        >
          <RotateCw size={18} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Input Redeem Code Card */}
        <View style={[styles.redeemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Punya Kode Promo Khusus?</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
            Masukkan kode voucher yang Anda dapatkan dari WhatsApp atau event.
          </Text>

          <View style={styles.inputRow}>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
            >
              <Ticket size={18} color={colors.primary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="Contoh: DISKON50"
                placeholderTextColor={colors.textDim}
                autoCapitalize="characters"
                value={inputCode}
                onChangeText={(t) => setInputCode(t.toUpperCase())}
              />
            </View>

            <Pressable
              style={[
                styles.claimBtn,
                { backgroundColor: inputCode.trim() ? colors.primary : colors.surfaceElevated },
              ]}
              onPress={() => handleClaimCode()}
              disabled={claiming || !inputCode.trim()}
            >
              {claiming ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.claimBtnText, { color: inputCode.trim() ? '#fff' : colors.textDim }]}>
                  Klaim
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <Pressable
            style={[
              styles.tabItem,
              {
                backgroundColor: activeTab === 'all' ? colors.primary : colors.surface,
                borderColor: activeTab === 'all' ? colors.primary : colors.border,
              },
            ]}
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              setActiveTab('all');
            }}
          >
            <Text style={[styles.tabText, { color: activeTab === 'all' ? '#ffffff' : colors.textMuted }]}>
              Semua Voucher ({vouchers.length})
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.tabItem,
              {
                backgroundColor: activeTab === 'claimed' ? colors.primary : colors.surface,
                borderColor: activeTab === 'claimed' ? colors.primary : colors.border,
              },
            ]}
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              setActiveTab('claimed');
            }}
          >
            <Text style={[styles.tabText, { color: activeTab === 'claimed' ? '#ffffff' : colors.textMuted }]}>
              Voucher Saya ({vouchers.filter((v) => v.claimed || v.is_claimed).length})
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Memuat voucher aktif...</Text>
          </View>
        ) : displayedVouchers.length === 0 ? (
          <View style={[styles.emptyBox, { borderColor: colors.border }]}>
            <Ticket size={38} color={colors.textDim} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {activeTab === 'claimed' ? 'Belum Ada Voucher Diklaim' : 'Belum Ada Voucher Tersedia'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {activeTab === 'claimed'
                ? 'Klaim voucher dari tab "Semua Voucher" atau masukkan kode promo di atas.'
                : 'Saat ini belum ada promo kupon publik aktif. Pantau berkala untuk event mendatang!'}
            </Text>
          </View>
        ) : (
          displayedVouchers.map((coupon) => {
            const isClaimed = coupon.claimed || coupon.is_claimed;
            const isCopied = copiedCode === coupon.code;
            const isClaimingThis = claimingId === coupon.id;

            const discountDisplay =
              coupon.discount_type === 'percent'
                ? `Diskon ${coupon.discount_value || coupon.discount}%`
                : `Diskon ${formatRupiah(Number(coupon.discount_value || coupon.discount || 0))}`;

            const minSpendDisplay =
              Number(coupon.min_order_amount || coupon.minSpend || 0) > 0
                ? `Min. belanja ${formatRupiah(Number(coupon.min_order_amount || coupon.minSpend || 0))}`
                : 'Tanpa minimum belanja';

            const maxUsage = coupon.max_usage_limit || 100;
            const usedCount = coupon.used_count || 0;
            const percentUsed = Math.min(100, Math.round((usedCount / maxUsage) * 100));

            return (
              <View
                key={coupon.id}
                style={[
                  styles.voucherCard,
                  { backgroundColor: colors.surface, borderColor: isClaimed ? colors.primary : colors.border },
                ]}
              >
                {/* Left Ticket Cutout Decoration */}
                <View style={styles.voucherTop}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Text style={[styles.voucherCode, { color: colors.primary }]}>{coupon.code}</Text>
                      {coupon.tag && (
                        <View style={[styles.tagBadge, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                          <Text style={[styles.tagText, { color: colors.primary }]}>{coupon.tag}</Text>
                        </View>
                      )}
                    </View>

                    <Text style={[styles.voucherDiscount, { color: colors.text }]}>{discountDisplay}</Text>
                    <Text style={[styles.voucherMinSpend, { color: colors.textMuted }]}>{minSpendDisplay}</Text>
                  </View>

                  {/* Action Button */}
                  <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                    {isClaimed ? (
                      <Pressable
                        style={[styles.useBtn, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}
                        onPress={() => handleCopyCode(coupon.code)}
                      >
                        {isCopied ? (
                          <>
                            <Check size={12} color={colors.success} style={{ marginRight: 4 }} />
                            <Text style={[styles.useBtnText, { color: colors.success }]}>Tersalin</Text>
                          </>
                        ) : (
                          <>
                            <Copy size={12} color={colors.success} style={{ marginRight: 4 }} />
                            <Text style={[styles.useBtnText, { color: colors.success }]}>Salin</Text>
                          </>
                        )}
                      </Pressable>
                    ) : (
                      <Pressable
                        style={[styles.claimItemBtn, { backgroundColor: colors.primary }]}
                        onPress={() => handleClaimItem(coupon)}
                        disabled={isClaimingThis}
                      >
                        {isClaimingThis ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.claimItemBtnText}>Klaim</Text>
                        )}
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* Progress bar and expiry */}
                <View style={styles.voucherFooter}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <View style={styles.quotaRow}>
                      <Text style={[styles.quotaText, { color: colors.textDim }]}>
                        Kuota terpakai: {percentUsed}%
                      </Text>
                    </View>
                    <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceElevated }]}>
                      <View style={[styles.progressBarFill, { width: `${percentUsed}%`, backgroundColor: colors.primary }]} />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Clock size={11} color={colors.textDim} style={{ marginRight: 4 }} />
                    <Text style={[styles.expiryText, { color: colors.textDim }]}>
                      {coupon.end_date ? new Date(coupon.end_date).toLocaleDateString('id-ID') : 'Berlaku'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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
    paddingVertical: 12,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  navSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  redeemCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 3,
    marginBottom: 12,
    lineHeight: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  claimBtn: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    marginTop: 10,
  },
  emptyBox: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  voucherCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  voucherTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  voucherCode: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  voucherDiscount: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  voucherMinSpend: {
    fontSize: 12,
    marginTop: 3,
  },
  claimItemBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  claimItemBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  useBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  useBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  voucherFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  quotaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  quotaText: {
    fontSize: 10,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  expiryText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
