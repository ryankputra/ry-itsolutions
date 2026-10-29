import React, { useState, useEffect, useRef } from 'react';
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
  Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  QrCode,
  Copy,
  Clock,
  CheckCircle2,
  Wallet,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
  Share2,
  ShieldCheck,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';

const QUICK_AMOUNTS = [
  { amount: 20000, label: 'Rp 20.000', tag: 'Pemula', badge: null },
  { amount: 50000, label: 'Rp 50.000', tag: 'Rekomendasi', badge: null },
  { amount: 100000, label: 'Rp 100.000', tag: 'Paling Populer', badge: 'HOT' },
  { amount: 250000, label: 'Rp 250.000', tag: 'Hemat Order', badge: 'HEMAT' },
  { amount: 500000, label: 'Rp 500.000', tag: 'Paket Hemat', badge: 'BEST SELLER' },
  { amount: 1000000, label: 'Rp 1.000.000', tag: 'Sultan / VIP', badge: 'VIP' },
];

export default function TopupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshUser, updateUserBalance } = useAuth();
  const colors = Colors.dark;

  const [selectedAmount, setSelectedAmount] = useState<number>(100000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [copiedNominal, setCopiedNominal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // QRIS Payment State
  const [qrisData, setQrisData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 menit (300s)
  const [checking, setChecking] = useState(false);
  const pollingRef = useRef<any>(null);

  // Auto-polling payment status every 2.5 seconds (identik web mode)
  useEffect(() => {
    if (!qrisData) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    pollingRef.current = setInterval(async () => {
      try {
        const topUpId = qrisData.transactionId;
        const res = await apiClient.get(topUpId ? `/topup/status/${topUpId}` : '/topup/latest-status');
        const isPaid = res.data?.status && (
          res.data.transactionStatus === 'completed' ||
          res.data.topUp?.status === 'completed' ||
          res.data.is_paid === true
        );
        if (isPaid) {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
          clearInterval(pollingRef.current);
          if (typeof res.data.balance === 'number') {
            updateUserBalance(res.data.balance);
          }
          await refreshUser();
          Alert.alert('Pembayaran Berhasil! 🎉', 'Saldo RyPay Anda telah berhasil ditambahkan.', [
            { text: 'Kembali ke Beranda', onPress: () => router.replace('/(tabs)') },
          ]);
          setQrisData(null);
        }
      } catch (e) {
        // silent polling check
      }
    }, 2500);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [qrisData]);

  // Countdown Timer
  useEffect(() => {
    if (!qrisData || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setQrisData(null);
          Alert.alert('Waktu Habis', 'Waktu pembayaran QRIS telah habis. Silakan buat QRIS baru.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [qrisData, timeLeft]);

  const formatRupiah = (val: number) => {
    return 'Rp ' + (val || 0).toLocaleString('id-ID');
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopy = async (text: string, type: 'nominal' | 'code') => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await Clipboard.setStringAsync(text);
    if (type === 'nominal') {
      setCopiedNominal(true);
      setTimeout(() => setCopiedNominal(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleShareQris = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const rawPayload = qrisData?.qrisString || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrisData?.qrisString || '')}`;
      await Share.share({
        title: 'Kode QRIS Deposit Ry-ITSolutions',
        message: `Silakan transfer tepat sejumlah ${formatRupiah(qrisData.amount)} via QRIS untuk akun ${user?.email || 'RY Member'}.\n\nKode/String QRIS:\n${rawPayload}`,
      });
    } catch (e) {
      // share canceled or dismissed
    }
  };

  const handleCancelQris = async () => {
    if (!qrisData?.transactionId) {
      setQrisData(null);
      return;
    }
    Alert.alert('Batalkan Transaksi', 'Apakah Anda yakin ingin membatalkan tagihan QRIS ini?', [
      { text: 'Tidak', style: 'cancel' },
      {
        text: 'Ya, Batalkan',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.post('/topup/cancel', { topUpId: qrisData.transactionId });
          } catch {}
          setQrisData(null);
        },
      },
    ]);
  };

  const handleRequestQris = async () => {
    const finalAmount = customAmount ? parseInt(customAmount.replace(/\D/g, ''), 10) : selectedAmount;
    if (isNaN(finalAmount) || finalAmount < 5000) {
      Alert.alert('Perhatian', 'Jumlah top up minimal Rp 5.000');
      return;
    }

    setLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.post('/topup/request-qris', {
        amount: finalAmount,
        gateway: 'auto',
        provider: 'auto',
      });

      const data = res.data;
      const qrisDataObj = data.qrisData || data.data?.qrisData;
      const qrisString = qrisDataObj?.qrisCode || qrisDataObj?.qris_code || data.qris_data || data.qris_string || data.data?.qris_string;
      const qrisImage = qrisDataObj?.base64Image || qrisDataObj?.qris_image || data.qris_image || data.data?.qris_image;
      const uniqueAmount = qrisDataObj?.uniqueAmount || qrisDataObj?.amount || data.amount || finalAmount;
      const topUpId = data.topUpId || data.top_up_id || data.transactionId || `TU-${Date.now()}`;

      if (data.status && (qrisString || qrisImage)) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        setQrisData({
          amount: uniqueAmount,
          qrisString,
          qrisImage,
          transactionId: topUpId,
        });
        setTimeLeft(300);
      } else {
        Alert.alert('Gagal Membuat QRIS', data.message || 'Gateway pembayaran sedang sibuk.');
      }
    } catch (e: any) {
      Alert.alert('Gagal', e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const topUpId = qrisData?.transactionId;
      const res = await apiClient.get(topUpId ? `/topup/status/${topUpId}` : '/topup/latest-status');
      const isPaid = res.data?.status && (
        res.data.transactionStatus === 'completed' ||
        res.data.topUp?.status === 'completed' ||
        res.data.is_paid === true
      );
      if (isPaid) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        if (typeof res.data.balance === 'number') {
          updateUserBalance(res.data.balance);
        }
        await refreshUser();
        Alert.alert('Pembayaran Diterima! 🎉', 'Saldo Anda telah berhasil ditambahkan.', [
          { text: 'Selesai', onPress: () => router.replace('/(tabs)') },
        ]);
        setQrisData(null);
      } else {
        Alert.alert('Menunggu Pembayaran', 'Pembayaran belum terdeteksi di mutasi gateway. Jika baru saja transfer, mohon tunggu beberapa detik lalu coba kembali.');
      }
    } catch (e) {
      Alert.alert('Status', 'Silakan refresh dalam beberapa detik.');
    } finally {
      setChecking(false);
    }
  };

  const qrImageUrl = qrisData?.qrisImage || (qrisData?.qrisString
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrisData.qrisString)}`
    : null);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.canvas }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation Bar */}
        <View style={styles.topNav}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}
            onPress={() => router.back()}
            hitSlop={10}
          >
            <ArrowLeft size={18} color={colors.ink} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.navTitle, { color: colors.ink }]}>Isi Saldo Akun (QRIS)</Text>
            <Text style={[styles.navSubtitle, { color: colors.inkMuted }]}>
              Otomatis & Real-time 24 Jam
            </Text>
          </View>
        </View>

        {!qrisData ? (
          <>
            {/* 1. Card Saldo & Profile Header (Apple Style) */}
            <View
              style={[
                styles.balanceCard,
                { backgroundColor: colors.parchment, borderColor: colors.hairline },
              ]}
            >
              <View style={styles.balanceHeader}>
                <View style={styles.balanceLabelRow}>
                  <Wallet size={16} color={colors.primary} />
                  <Text style={[styles.balanceLabel, { color: colors.inkMuted }]}>
                    Saldo RyPay Anda
                  </Text>
                  <Pressable
                    onPress={() => setShowBalance(!showBalance)}
                    hitSlop={8}
                    style={{ marginLeft: 4 }}
                  >
                    {showBalance ? (
                      <Eye size={14} color={colors.inkMuted} />
                    ) : (
                      <EyeOff size={14} color={colors.inkMuted} />
                    )}
                  </Pressable>
                </View>
                <View style={[styles.vipBadge, { backgroundColor: 'rgba(41, 151, 255, 0.12)' }]}>
                  <ShieldCheck size={11} color={colors.primary} style={{ marginRight: 3 }} />
                  <Text style={[styles.vipBadgeText, { color: colors.primary }]}>
                    {user?.role ? user.role.toUpperCase() : 'VIP MEMBER'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.balanceValue, { color: colors.ink }]}>
                {showBalance ? formatRupiah(user?.balance || 0) : 'Rp ••••••••'}
              </Text>

              <View style={[styles.pointsPill, { borderColor: colors.hairline }]}>
                <Sparkles size={12} color="#f59e0b" style={{ marginRight: 4 }} />
                <Text style={[styles.pointsText, { color: colors.inkMuted }]}>
                  Koin RyPoints:{' '}
                  <Text style={{ color: '#f59e0b', fontWeight: '700' }}>
                    {(user?.coins || 0).toLocaleString('id-ID')}
                  </Text>
                </Text>
              </View>
            </View>

            {/* 2. Grid Nominal Instan */}
            <Text style={[styles.sectionHeading, { color: colors.ink }]}>
              Pilih Nominal Instan
            </Text>
            <View style={styles.gridContainer}>
              {QUICK_AMOUNTS.map((item) => {
                const isSelected = selectedAmount === item.amount && !customAmount;
                return (
                  <Pressable
                    key={item.amount}
                    style={[
                      styles.amountTile,
                      {
                        backgroundColor: isSelected ? 'rgba(41, 151, 255, 0.12)' : colors.parchment,
                        borderColor: isSelected ? colors.primary : colors.hairline,
                      },
                    ]}
                    onPress={() => {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch {}
                      setSelectedAmount(item.amount);
                      setCustomAmount('');
                    }}
                  >
                    {item.badge && (
                      <View style={[styles.hotBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.hotBadgeText}>{item.badge}</Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.tileAmount,
                        { color: isSelected ? colors.primary : colors.ink },
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text style={[styles.tileTag, { color: colors.inkMuted }]}>{item.tag}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* 3. Input Nominal Custom */}
            <View
              style={[
                styles.customCard,
                { backgroundColor: colors.parchment, borderColor: colors.hairline },
              ]}
            >
              <Text style={[styles.customTitle, { color: colors.inkMuted }]}>
                Atau Masukkan Nominal Lain (Min. Rp 5.000)
              </Text>
              <View
                style={[
                  styles.customInputRow,
                  { backgroundColor: colors.canvas, borderColor: colors.hairline },
                ]}
              >
                <Text style={[styles.rpPrefix, { color: colors.primary }]}>Rp</Text>
                <TextInput
                  style={[styles.customInput, { color: colors.ink }]}
                  placeholder="0"
                  placeholderTextColor={colors.inkMuted}
                  value={customAmount}
                  onChangeText={(txt) => {
                    const clean = txt.replace(/\D/g, '');
                    setCustomAmount(clean);
                    setSelectedAmount(0);
                  }}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* 4. Action Button */}
            <Pressable
              style={({ pressed }) => [
                styles.ctaButton,
                { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
              ]}
              onPress={handleRequestQris}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <QrCode size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.ctaButtonText}>Lanjutkan Pembayaran QRIS</Text>
                </>
              )}
            </Pressable>
          </>
        ) : (
          /* ============================================================ */
          /* 5. BOX CONTAINER QRIS DINAMIS & REALTIME POLLING             */
          /* ============================================================ */
          <View
            style={[
              styles.qrisContainer,
              { backgroundColor: colors.parchment, borderColor: colors.hairline },
            ]}
          >
            {/* Countdown Badge Header */}
            <View style={styles.timerPill}>
              <Clock size={15} color="#f59e0b" style={{ marginRight: 6 }} />
              <Text style={styles.timerPillText}>
                Bayar dalam <Text style={{ fontWeight: '800' }}>{formatTimer(timeLeft)}</Text>
              </Text>
            </View>

            <Text style={[styles.qrisAmountTitle, { color: colors.ink }]}>
              {formatRupiah(qrisData.amount)}
            </Text>

            {/* Copy Nominal Button */}
            <Pressable
              onPress={() => handleCopy(String(qrisData.amount), 'nominal')}
              style={[styles.copyPillBtn, { borderColor: colors.hairline }]}
            >
              {copiedNominal ? (
                <>
                  <Check size={14} color="#10b981" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#10b981' }}>
                    Nominal Disalin!
                  </Text>
                </>
              ) : (
                <>
                  <Copy size={14} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                    Salin Nominal
                  </Text>
                </>
              )}
            </Pressable>

            <Text style={[styles.qrisNotice, { color: colors.inkMuted }]}>
              Pastikan transfer tepat sesuai nominal di atas agar saldo otomatis bertambah ke akun Anda.
            </Text>

            {/* QR Code Container */}
            <View style={[styles.qrFrame, { backgroundColor: '#ffffff' }]}>
              {qrImageUrl ? (
                <Image
                  source={{ uri: qrImageUrl }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.qrPlaceholder}>
                  <QrCode size={120} color="#86868b" />
                </View>
              )}
            </View>

            {/* Action Bar (Copy Code & Share) */}
            <View style={styles.qrisActionRow}>
              <Pressable
                onPress={() => handleCopy(qrisData.qrisString || qrisData.transactionId, 'code')}
                style={[styles.smallActionBtn, { backgroundColor: colors.canvas, borderColor: colors.hairline }]}
              >
                {copiedCode ? (
                  <Check size={14} color="#10b981" />
                ) : (
                  <Copy size={14} color={colors.ink} />
                )}
                <Text style={[styles.smallActionText, { color: colors.ink }]}>
                  {copiedCode ? 'Disalin' : 'Salin Kode QR'}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleShareQris}
                style={[styles.smallActionBtn, { backgroundColor: colors.canvas, borderColor: colors.hairline }]}
              >
                <Share2 size={14} color={colors.ink} />
                <Text style={[styles.smallActionText, { color: colors.ink }]}>Simpan / Bagikan</Text>
              </Pressable>
            </View>

            {/* Polling Status Button */}
            <Pressable
              style={({ pressed }) => [
                styles.checkStatusBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
              ]}
              onPress={handleCheckStatus}
              disabled={checking}
            >
              {checking ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <RefreshCw size={16} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.checkStatusBtnText}>Cek Status Pembayaran</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={styles.changeNominalBtn}
              onPress={handleCancelQris}
            >
              <Text style={[styles.changeNominalText, { color: '#ff453a' }]}>
                Batalkan Transaksi & Pilih Nominal Lain
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  balanceCard: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    marginBottom: 20,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  balanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  vipBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  balanceValue: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.6,
    marginBottom: 12,
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pointsText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 10,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  amountTile: {
    width: '48%',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    position: 'relative',
    minHeight: 74,
    justifyContent: 'center',
  },
  hotBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  hotBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
  },
  tileAmount: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  tileTag: {
    fontSize: 11,
    marginTop: 2,
  },
  customCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 20,
  },
  customTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    height: 48,
  },
  rpPrefix: {
    fontSize: 16,
    fontWeight: '800',
    marginRight: 6,
  },
  customInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  ctaButton: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2997ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  ctaButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  qrisContainer: {
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 22,
    alignItems: 'center',
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  timerPillText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '600',
  },
  qrisAmountTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  copyPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 12,
  },
  qrisNotice: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  qrFrame: {
    width: 240,
    height: 240,
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 16,
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  qrPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrisActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  smallActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  checkStatusBtn: {
    width: '100%',
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  checkStatusBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  changeNominalBtn: {
    paddingVertical: 8,
  },
  changeNominalText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
