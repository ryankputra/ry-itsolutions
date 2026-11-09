import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  Share,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Barcode as BarcodeIcon,
  Copy,
  Check,
  Share2,
  Moon,
  Sun,
  ShieldCheck,
  Wallet,
  QrCode,
  Zap,
  Download,
  AlertCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';
import { InstantQrisModal } from '../../components/ui/InstantQrisModal';

interface BarcodeProduct {
  code: string;
  name: string;
  price: number;
  active?: boolean;
}

const DEFAULT_BARCODE_SERVICES: BarcodeProduct[] = [
  { code: 'create_barcode', name: 'Create Barcode Universal', price: 5000 },
  { code: 'create_barcode_samsung', name: 'Barcode Samsung', price: 5000 },
  { code: 'create_barcode_redmi', name: 'Barcode Redmi', price: 5000 },
  { code: 'create_barcode_ios26', name: 'Barcode iOS 26', price: 5000 },
];

export default function BarcodeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors.dark;
  const { user, updateUserBalance } = useAuth();

  const [imei1, setImei1] = useState('358912345678901');
  const [imei2, setImei2] = useState('');
  const [selectedMode, setSelectedMode] = useState('create_barcode');
  const [cardTheme, setCardTheme] = useState<'light' | 'dark'>('dark');
  const [copied, setCopied] = useState(false);

  // Catalog Pricing from Backend
  const [services, setServices] = useState<BarcodeProduct[]>(DEFAULT_BARCODE_SERVICES);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Order Submission State
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'balance' | 'qris'>('balance');
  const [showInstantQris, setShowInstantQris] = useState(false);
  const [resultData, setResultData] = useState<{ note: string; image?: string | null } | null>(null);

  // Load backend catalog
  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await apiClient.get('/orders/catalog');
        if (res.data?.status && res.data.data?.barcode) {
          const activeBarcode = res.data.data.barcode.filter((b: BarcodeProduct) => b.active !== false);
          if (activeBarcode.length > 0) {
            setServices(activeBarcode);
            setSelectedMode(activeBarcode[0].code);
          }
        }
      } catch (e) {
        // Fallback to default
      } finally {
        setLoadingCatalog(false);
      }
    }
    loadCatalog();
  }, []);

  const activeService = services.find((s) => s.code === selectedMode) || services[0];
  const activePrice = activeService ? activeService.price : 5000;

  const barcodeText = imei2 ? `${imei1} / ${imei2}` : imei1;
  const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(
    imei1
  )}&scale=3&height=12&includetext`;

  const barcode2Url = imei2
    ? `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(
        imei2
      )}&scale=3&height=12&includetext`
    : null;

  const handleCopy = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Clipboard.setStringAsync(barcodeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await Share.share({
        title: 'Kode Barcode IMEI',
        message: `Nomor Barcode IMEI Code128:\nIMEI 1: ${imei1}${imei2 ? `\nIMEI 2: ${imei2}` : ''}`,
      });
    } catch {}
  };

  const handleExecuteOrder = async (overrideMethod?: 'balance' | 'qris') => {
    const cleanImei = imei1.replace(/\D/g, '');
    if (!cleanImei || cleanImei.length < 14) {
      Alert.alert('Perhatian', 'Masukkan minimal 14–15 digit IMEI utama.');
      return;
    }

    const activeM = overrideMethod || paymentMethod;
    if (activeM === 'qris') {
      setShowInstantQris(true);
      return;
    }

    // Balance verification
    const currentBalance = user?.balance || 0;
    if (currentBalance < activePrice) {
      Alert.alert(
        'Saldo Tidak Cukup',
        `Saldo akun Anda Rp ${currentBalance.toLocaleString('id-ID')}, biaya pembuatan barcode Rp ${activePrice.toLocaleString('id-ID')}. Pilih bayar dengan QRIS?`,
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Bayar via QRIS', onPress: () => setShowInstantQris(true) },
        ]
      );
      return;
    }

    setSubmitting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.post('/order/barcode', {
        service_type: 'barcode',
        service_code: selectedMode,
        price_key: selectedMode,
        imei: cleanImei,
        imei2: imei2.replace(/\D/g, '') || undefined,
        theme: cardTheme,
        duration: activeService?.name || 'Create Barcode',
        payment_method: 'balance',
      });

      const data = res.data;
      if (data.status) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        if (typeof data.data?.newBalance === 'number') {
          updateUserBalance(data.data.newBalance);
        } else if (typeof data.newBalance === 'number') {
          updateUserBalance(data.newBalance);
        }

        const note = data.data?.adminNote || (typeof data.data?.result === 'string' ? data.data.result : 'Barcode resmi berhasil digenerate.');
        const img = data.data?.result?.qr_url || data.data?.result?.image_url || data.data?.adminImage || null;
        setResultData({ note, image: img });

        Alert.alert('Sukses 🎉', note);
      } else {
        Alert.alert('Gagal Order Barcode', data.message || 'Terjadi kesalahan sistem.');
      }
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Gagal memproses pesanan barcode.';
      Alert.alert('Gagal', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.canvas }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
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
            <Text style={[styles.navTitle, { color: colors.ink }]}>Generator Barcode IMEI</Text>
            <Text style={[styles.navSubtitle, { color: colors.inkMuted }]}>
              Standar Code128 & Scanner Resmi
            </Text>
          </View>
        </View>

        {/* Mode Selector */}
        <Text style={[styles.sectionHeading, { color: colors.ink }]}>Pilihan Format Template</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modeRow}>
          {services.map((svc) => {
            const active = selectedMode === svc.code;
            return (
              <Pressable
                key={svc.code}
                style={[
                  styles.modeChip,
                  {
                    backgroundColor: active ? colors.primary : colors.parchment,
                    borderColor: active ? colors.primary : colors.hairline,
                  },
                ]}
                onPress={() => {
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                  setSelectedMode(svc.code);
                }}
              >
                <Text style={[styles.modeChipText, { color: active ? '#ffffff' : colors.ink }]}>
                  {svc.name}
                </Text>
                <Text style={{ fontSize: 11, color: active ? 'rgba(255,255,255,0.8)' : colors.primary, fontWeight: '700', marginTop: 2 }}>
                  Rp {svc.price.toLocaleString('id-ID')}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Live Barcode Preview Card */}
        <View
          style={[
            styles.previewCard,
            {
              backgroundColor: cardTheme === 'dark' ? '#09090b' : '#ffffff',
              borderColor: colors.hairline,
            },
          ]}
        >
          <View style={styles.previewHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <BarcodeIcon size={16} color={colors.primary} />
              <Text
                style={[
                  styles.previewHeaderText,
                  { color: cardTheme === 'dark' ? '#f4f4f5' : '#09090b' },
                ]}
              >
                {activeService?.name || 'Universal Code128'}
              </Text>
            </View>
            <Pressable
              style={[
                styles.themeToggle,
                { backgroundColor: cardTheme === 'dark' ? '#18181b' : '#f4f4f5' },
              ]}
              onPress={() => setCardTheme(cardTheme === 'dark' ? 'light' : 'dark')}
            >
              {cardTheme === 'dark' ? (
                <Sun size={14} color="#e4e4e7" />
              ) : (
                <Moon size={14} color="#09090b" />
              )}
            </Pressable>
          </View>

          {/* Barcode Render 1 */}
          <View style={styles.barcodeWrapper}>
            <Image
              source={{ uri: barcodeUrl }}
              style={styles.barcodeImage}
              resizeMode="contain"
            />
          </View>

          {/* Barcode Render 2 (if dual SIM) */}
          {barcode2Url && (
            <View style={[styles.barcodeWrapper, { marginTop: 12 }]}>
              <Image
                source={{ uri: barcode2Url }}
                style={styles.barcodeImage}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Action Row */}
          <View style={styles.previewActions}>
            <Pressable
              style={[
                styles.smallActionBtn,
                { backgroundColor: cardTheme === 'dark' ? '#18181b' : '#f4f4f5' },
              ]}
              onPress={handleCopy}
            >
              {copied ? <Check size={14} color={colors.primary} /> : <Copy size={14} color={colors.inkMuted} />}
              <Text style={[styles.smallActionText, { color: copied ? colors.primary : colors.inkMuted }]}>
                {copied ? 'Tersalin' : 'Salin Text'}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.smallActionBtn,
                { backgroundColor: cardTheme === 'dark' ? '#18181b' : '#f4f4f5' },
              ]}
              onPress={handleShare}
            >
              <Share2 size={14} color={colors.inkMuted} />
              <Text style={[styles.smallActionText, { color: colors.inkMuted }]}>Bagikan</Text>
            </Pressable>
          </View>
        </View>

        {/* Input IMEI 1 */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.ink }]}>Nomor IMEI 1 (Utama)</Text>
          <View
            style={[
              styles.inputBox,
              { backgroundColor: colors.parchment, borderColor: colors.hairline },
            ]}
          >
            <TextInput
              style={[styles.inputField, { color: colors.ink }]}
              placeholder="Contoh: 358912345678901"
              placeholderTextColor={colors.inkMuted}
              value={imei1}
              onChangeText={(text) => setImei1(text.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={15}
            />
          </View>
        </View>

        {/* Input IMEI 2 (Opsional) */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.ink }]}>
            Nomor IMEI 2 (Opsional / Dual SIM)
          </Text>
          <View
            style={[
              styles.inputBox,
              { backgroundColor: colors.parchment, borderColor: colors.hairline },
            ]}
          >
            <TextInput
              style={[styles.inputField, { color: colors.ink }]}
              placeholder="Kosongkan jika hanya 1 IMEI"
              placeholderTextColor={colors.inkMuted}
              value={imei2}
              onChangeText={(text) => setImei2(text.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={15}
            />
          </View>
        </View>

        {/* Payment Method Selector */}
        <View style={[styles.paymentCard, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}>
          <Text style={[styles.paymentTitle, { color: colors.ink }]}>Metode Pembayaran</Text>
          <View style={styles.paymentRow}>
            <Pressable
              style={[
                styles.methodChip,
                {
                  borderColor: paymentMethod === 'balance' ? colors.primary : colors.hairline,
                  backgroundColor: paymentMethod === 'balance' ? 'rgba(30, 215, 96, 0.1)' : 'transparent',
                },
              ]}
              onPress={() => setPaymentMethod('balance')}
            >
              <Wallet size={16} color={paymentMethod === 'balance' ? colors.primary : colors.inkMuted} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>Saldo RyPay</Text>
                <Text style={{ fontSize: 11, color: colors.inkMuted }}>
                  Rp {(user?.balance || 0).toLocaleString('id-ID')}
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={[
                styles.methodChip,
                {
                  borderColor: paymentMethod === 'qris' ? colors.primary : colors.hairline,
                  backgroundColor: paymentMethod === 'qris' ? 'rgba(30, 215, 96, 0.1)' : 'transparent',
                },
              ]}
              onPress={() => setPaymentMethod('qris')}
            >
              <QrCode size={16} color={paymentMethod === 'qris' ? colors.primary : colors.inkMuted} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>Direct QRIS</Text>
                <Text style={{ fontSize: 11, color: colors.inkMuted }}>Otomatis 24 Jam</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Submit Order Official Button */}
        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={() => handleExecuteOrder()}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Zap size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>
                Order Barcode Resmi (Rp {activePrice.toLocaleString('id-ID')})
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      {/* Instant QRIS Modal */}
      <InstantQrisModal
        isOpen={showInstantQris}
        onClose={() => setShowInstantQris(false)}
        amount={activePrice}
        orderTitle={`Pembuatan ${activeService?.name || 'Barcode IMEI'}`}
        onSuccess={() => {
          setShowInstantQris(false);
          handleExecuteOrder('balance');
        }}
      />
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
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  navSubtitle: {
    fontSize: 12,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modeRow: {
    marginBottom: 16,
  },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  modeChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  previewCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  previewHeaderText: {
    fontSize: 13,
    fontWeight: '700',
  },
  themeToggle: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barcodeWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barcodeImage: {
    width: '100%',
    height: 90,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    justifyContent: 'flex-end',
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  smallActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputBox: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  inputField: {
    fontSize: 14,
    fontWeight: '600',
  },
  paymentCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 6,
    marginBottom: 16,
  },
  paymentTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  paymentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  methodChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  submitBtn: {
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});