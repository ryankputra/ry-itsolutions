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
  Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
  Tag,
  Wallet,
  QrCode,
  ArrowRight,
  Receipt,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/api';
import { storage, STORAGE_KEYS } from '../../utils/storage';
import { CartItem } from '../../types';
import { Colors } from '../../theme/colors';
import { parseMultipleImeis } from '../../utils/imeiHelper';
import { InstantQrisModal } from '../../components/ui/InstantQrisModal';
import { DraggableBottomSheet } from '../../components/ui/DraggableBottomSheet';

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
  is_open_now?: boolean;
  open_hour?: number | null;
  close_hour?: number | null;
  status?: string;
}

export default function AddRoamerScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ imei?: string; q?: string }>();
  const insets = useSafeAreaInsets();
  const { user, updateUserBalance } = useAuth();
  const colors = Colors.dark;

  // Wizard state: 1 = IMEI & HP, 2 = Paket & Kecepatan, 3 = Konfirmasi & Bayar
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Backend Data
  const [packages, setPackages] = useState<ImeiPackage[]>([]);
  const [speedPricing, setSpeedPricing] = useState<any>({});
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [publicCoupons, setPublicCoupons] = useState<any[]>([]);
  const [serviceStatus, setServiceStatus] = useState({ isOpen: true, note: '' });
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [imei, setImei] = useState(searchParams.imei || searchParams.q || '');
  const [selectedPkgId, setSelectedPkgId] = useState('');
  const [selectedSpeed, setSelectedSpeed] = useState<string>('slow');
  const [targetPhone, setTargetPhone] = useState(user?.phone || user?.verifiedPhone || '');
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [ceirUri, setCeirUri] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [ketentuanOpen, setKetentuanOpen] = useState(false);

  // Discounts, Coins & Bottom Sheet Modals
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [showVoucherSheet, setShowVoucherSheet] = useState(false);
  const [showSummarySheet, setShowSummarySheet] = useState(false);
  const [useCoins, setUseCoins] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'balance'>('qris');
  const [showInstantQris, setShowInstantQris] = useState(false);

  // Submit states
  const [submitting, setSubmitting] = useState(false);
  const [addingCart, setAddingCart] = useState(false);

  // Load backend data
  useEffect(() => {
    Promise.all([
      apiClient.get('/imei-packages').catch(() => null),
      apiClient.get('/manual-services-pricing').catch(() => null),
      apiClient.get('/imei-service-status').catch(() => null),
      apiClient.get('/user/announcement').catch(() => null),
      apiClient.get('/coupons/public').catch(() => null),
    ]).then(([pkgRes, prcRes, statusRes, annRes, coupRes]) => {
      if (pkgRes?.data?.status && Array.isArray(pkgRes.data.data)) {
        const visible = pkgRes.data.data.filter((p: any) => p && p.isVisible !== false && p.is_active !== false);
        setPackages(visible);
        if (visible.length > 0 && !selectedPkgId) {
          setSelectedPkgId(visible[0].id);
        }
      }
      if (prcRes?.data?.status && prcRes.data.data) {
        setSpeedPricing(prcRes.data.data);
      }
      if (statusRes?.data?.status) {
        const isOpen = typeof statusRes.data.isOpen === 'boolean' ? statusRes.data.isOpen : statusRes.data.service_status !== 'closed';
        setServiceStatus({ isOpen, note: statusRes.data.note || '' });
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

  // Update default target phone
  useEffect(() => {
    if ((user?.phone || user?.verifiedPhone) && !targetPhone) {
      setTargetPhone(user.phone || user.verifiedPhone || '');
    }
  }, [user, targetPhone]);

  // Unique Packages
  const uniquePackages = useMemo(() => {
    const map = new Map<string, ImeiPackage>();
    packages.forEach((p) => {
      if (!p) return;
      const dur = (p.duration || '').trim().toLowerCase();
      if (!map.has(dur)) {
        map.set(dur, p);
      }
    });
    return Array.from(map.values());
  }, [packages]);

  // IMEI parsing & Luhn validation
  const parsedImeis = useMemo(() => parseMultipleImeis(imei), [imei]);
  const validImeiCount = parsedImeis.filter((i) => i.isValidLength && i.isValidLuhn).length;
  const imeiCount = parsedImeis.length > 0 ? parsedImeis.length : 1;

  // Selected package details
  const selectedPkg = uniquePackages.find((p) => p.id === selectedPkgId) || packages.find((p) => p.id === selectedPkgId) || packages[0];

  const pkgSpeedPrices: any = useMemo(() => {
    if (!selectedPkg?.speed_prices) return {};
    try {
      return typeof selectedPkg.speed_prices === 'string'
        ? JSON.parse(selectedPkg.speed_prices)
        : selectedPkg.speed_prices;
    } catch {
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

  // Discounts
  const discountAmount = appliedCoupon ? Math.min(Number(appliedCoupon.discount_amount || 0), rawTotalPrice) : 0;
  const priceAfterCoupon = Math.max(0, rawTotalPrice - discountAmount);

  // Coins
  const userCoins = Number(user?.coins || 0);
  const userBalance = Number(user?.balance || 0);
  const maxCoinsAllowed = priceAfterCoupon >= 50000 ? Math.min(Math.floor(priceAfterCoupon * 0.02), 5000) : 0;
  const coinsDiscount = useCoins && maxCoinsAllowed > 0 ? Math.min(userCoins, maxCoinsAllowed, priceAfterCoupon) : 0;
  const totalPrice = Math.max(0, priceAfterCoupon - coinsDiscount);

  // Speed options
  const cutoffTimeStr = (speedPricing?.rivera_slow_cutoff_time || '15:00').replace('.', ':');
  const speedOptions = [
    { id: 'fast', label: 'Fast (Super Cepat)', key: 'imei_speed_fast', defaultRange: '30 Menit - 2 Jam' },
    { id: 'semi', label: 'Semi Fast', key: 'imei_speed_semi', defaultRange: '2 - 6 Jam Proses' },
    { id: 'slow', label: 'Slow (Reguler)', key: 'imei_speed_slow', defaultRange: `Max kirim ${cutoffTimeStr} WIB` },
  ].map((opt) => {
    const hasSpecificPrice = pkgSpeedPrices[opt.id] !== undefined && Number(pkgSpeedPrices[opt.id]) > 0;
    const displayPrice = hasSpecificPrice
      ? Number(pkgSpeedPrices[opt.id])
      : ((speedPricing && parseInt(speedPricing[opt.key])) || 0);
    return {
      ...opt,
      hasSpecificPrice,
      price: displayPrice,
    };
  });

  // Pick Image Handler
  const handlePickImage = async (type: 'screenshot' | 'ceir') => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert(
        type === 'screenshot' ? 'Unggah Bukti Layar *#06#' : 'Unggah Bukti Cek CEIR',
        'Pilih sumber dokumen gambar:',
        [
          {
            text: 'Buka Kamera',
            onPress: async () => {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Izin Ditolak', 'Izin kamera dibutuhkan.');
                return;
              }
              const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
              if (!res.canceled && res.assets[0]?.uri) {
                if (type === 'screenshot') setScreenshotUri(res.assets[0].uri);
                else setCeirUri(res.assets[0].uri);
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
              const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.8 });
              if (!res.canceled && res.assets[0]?.uri) {
                if (type === 'screenshot') setScreenshotUri(res.assets[0].uri);
                else setCeirUri(res.assets[0].uri);
              }
            },
          },
          { text: 'Batal', style: 'cancel' },
        ]
      );
    } catch {
      Alert.alert('Error', 'Gagal membuka pemilih gambar.');
    }
  };

  // Step Validation
  const validateStep1 = () => {
    if (!selectedPkgId) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
      Alert.alert('Paket Belum Dipilih', 'Silakan pilih salah satu paket masa aktif roamer Anda.');
      return false;
    }
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    return true;
  };

  const validateStep2 = () => {
    if (parsedImeis.length === 0) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
      Alert.alert('IMEI Belum Diisi', 'Masukkan minimal satu nomor IMEI (15 digit angka).');
      return false;
    }
    if (validImeiCount === 0) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
      Alert.alert('Format IMEI Tidak Valid', 'Nomor IMEI harus 15 digit dan lolos uji checksum Luhn.');
      return false;
    }
    if (!targetPhone.trim() || targetPhone.replace(/\D/g, '').length < 9) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
      Alert.alert('Nomor HP Belum Lengkap', 'Nomor WhatsApp penerima nota minimal 9 digit angka.');
      return false;
    }
    if (!screenshotUri) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
      Alert.alert('Screenshot Wajib', 'Unggah bukti foto screenshot *#06# HP target Anda.');
      return false;
    }
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!validateStep2()) return;
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    if (currentStep === 3) setCurrentStep(2);
    else if (currentStep === 2) setCurrentStep(1);
  };

  // Add to cart
  const handleAddToCart = async () => {
    if (!agreed) {
      Alert.alert('Persetujuan Layanan', 'Centang persetujuan Syarat & Ketentuan Layanan.');
      return;
    }
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
    } catch {
      Alert.alert('Gagal', 'Terjadi kesalahan saat menyimpan ke keranjang.');
    } finally {
      setAddingCart(false);
    }
  };

  // Checkout Execution
  const executeOrderSubmission = async (paymentType: 'balance' | 'qris' = 'balance') => {
    setSubmitting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const formData = new FormData();
      formData.append('service_type', 'imei');
      formData.append('imei', imei.trim());
      formData.append('duration', selectedPkg.duration || '1 Bulan');
      formData.append('amount', totalPrice.toString());
      formData.append('package_id', selectedPkg.id);
      formData.append('price_key', selectedPkg.id);
      formData.append('speed', selectedSpeed);
      formData.append('speed_option', selectedSpeed);
      formData.append('speedPrice', speedCost.toString());
      formData.append('targetPhone', targetPhone.trim());
      formData.append('target_phone', targetPhone.trim());
      if (appliedCoupon) {
        formData.append('couponCode', appliedCoupon.code);
        formData.append('coupon_code', appliedCoupon.code);
      }
      if (useCoins) {
        formData.append('use_coins', 'true');
        formData.append('useCoins', 'true');
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
        formData.append('image', {
          uri: screenshotUri,
          name: filename,
          type,
        } as any);
      }

      if (ceirUri) {
        const filename = ceirUri.split('/').pop() || 'ceir.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        formData.append('ceir_screenshot', {
          uri: ceirUri,
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
        setShowInstantQris(false);
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        Alert.alert(
          'Pesanan Berhasil Dibuat! 🎉',
          'Pesanan Add Roamer Anda telah berhasil diteruskan ke Admin untuk diproses.',
          [{ text: 'Lihat Riwayat Pesanan', onPress: () => router.push('/(tabs)/history' as any) }]
        );
      } else {
        Alert.alert('Gagal Membuat Pesanan', res.data?.message || 'Terjadi kesalahan sistem.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Kesalahan jaringan saat memproses pesanan.';
      Alert.alert('Gagal', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyCoupon = async (code: string) => {
    if (!code.trim()) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await apiClient.post('/coupon/validate', {
        code: code.trim().toUpperCase(),
        order_amount: rawTotalPrice,
      });
      if (res.data?.status && res.data.data) {
        setAppliedCoupon(res.data.data);
        setShowVoucherSheet(false);
        Alert.alert('Voucher Terpasang! 🎉', `Potongan hemat Rp ${Number(res.data.data.discount_amount || 0).toLocaleString('id-ID')}`);
      } else {
        Alert.alert('Voucher Tidak Valid', res.data?.message || 'Kupon tidak dapat digunakan.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Gagal memvalidasi kupon.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.canvas }]} edges={['top']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}
          onPress={() => {
            if (currentStep > 1) handlePrevStep();
            else router.back();
          }}
          hitSlop={10}
        >
          <ArrowLeft size={18} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.headerTitle, { color: colors.ink }]}>Add Roamer</Text>
            <View style={styles.starSellerBadge}>
              <Text style={styles.starSellerText}>STAR SELLER</Text>
            </View>
          </View>
          <Text style={[styles.headerSub, { color: colors.inkMuted }]}>
            Step {currentStep} dari 3 • Aktivasi Sinyal All Operator
          </Text>
        </View>
      </View>

      {/* Step Wizard Progress Indicator */}
      <View style={styles.wizardIndicatorRow}>
        <View style={styles.wizardStepCol}>
          <View
            style={[
              styles.stepNumberBadge,
              {
                backgroundColor: currentStep >= 1 ? colors.primary : colors.parchment,
                borderColor: currentStep >= 1 ? colors.primary : colors.hairline,
              },
            ]}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: currentStep >= 1 ? '#000' : colors.inkMuted }}>
              1
            </Text>
          </View>
          <Text style={[styles.stepLabel, { color: currentStep === 1 ? colors.primary : colors.inkMuted }]}>
            Pilih Paket
          </Text>
        </View>

        <View
          style={[
            styles.stepConnector,
            { backgroundColor: currentStep >= 2 ? colors.primary : colors.hairline },
          ]}
        />

        <View style={styles.wizardStepCol}>
          <View
            style={[
              styles.stepNumberBadge,
              {
                backgroundColor: currentStep >= 2 ? colors.primary : colors.parchment,
                borderColor: currentStep >= 2 ? colors.primary : colors.hairline,
              },
            ]}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: currentStep >= 2 ? '#000' : colors.inkMuted }}>
              2
            </Text>
          </View>
          <Text style={[styles.stepLabel, { color: currentStep === 2 ? colors.primary : colors.inkMuted }]}>
            Data IMEI & HP
          </Text>
        </View>

        <View
          style={[
            styles.stepConnector,
            { backgroundColor: currentStep >= 3 ? colors.primary : colors.hairline },
          ]}
        />

        <View style={styles.wizardStepCol}>
          <View
            style={[
              styles.stepNumberBadge,
              {
                backgroundColor: currentStep >= 3 ? colors.primary : colors.parchment,
                borderColor: currentStep >= 3 ? colors.primary : colors.hairline,
              },
            ]}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: currentStep >= 3 ? '#000' : colors.inkMuted }}>
              3
            </Text>
          </View>
          <Text style={[styles.stepLabel, { color: currentStep === 3 ? colors.primary : colors.inkMuted }]}>
            Review & Bayar
          </Text>
        </View>
      </View>

      {/* Main Wizard Form Body */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 130 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* STEP 1: Pilih Paket Roaming Dinamis, Kecepatan, dan Diskon */}
        {currentStep === 1 && (
          <View>
            {/* Package Selector */}
            <View style={styles.sectionWrap}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[styles.fieldLabel, { color: colors.ink }]}>Pilih Paket Masa Aktif</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>Garansi Resmi RY</Text>
              </View>

              <View style={styles.packageGrid}>
                {loading ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  uniquePackages.map((opt) => {
                    const active = selectedPkgId === opt.id;
                    let optSp: any = {};
                    if (opt.speed_prices) {
                      try {
                        optSp = typeof opt.speed_prices === 'string' ? JSON.parse(opt.speed_prices) : opt.speed_prices;
                      } catch {}
                    }
                    const activeCardPrice = active && selectedSpeed && optSp[selectedSpeed] && Number(optSp[selectedSpeed]) >= 1000
                      ? Number(optSp[selectedSpeed])
                      : Number(opt.price || 0);

                    return (
                      <Pressable
                        key={opt.id}
                        style={[
                          styles.packageCard,
                          {
                            backgroundColor: active ? 'rgba(30, 215, 96, 0.08)' : colors.parchment,
                            borderColor: active ? colors.primary : colors.hairline,
                          },
                        ]}
                        onPress={() => {
                          try { Haptics.selectionAsync(); } catch {}
                          setSelectedPkgId(opt.id);
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={[styles.pkgDuration, { color: colors.ink }]}>{opt.duration}</Text>
                          {active && <CheckCircle2 size={16} color={colors.primary} />}
                        </View>
                        <Text style={[styles.pkgPrice, { color: colors.primary }]}>
                          Rp {activeCardPrice.toLocaleString('id-ID')}
                        </Text>
                        {optSp.wholesale_enabled && (
                          <Text style={styles.pkgGrosirBadge}>
                            Grosir &ge;{optSp.wholesale_min_qty || 2} IMEI
                          </Text>
                        )}
                      </Pressable>
                    );
                  })
                )}
              </View>
            </View>

            {/* Kecepatan Proses Server */}
            <View style={styles.sectionWrap}>
              <Text style={[styles.fieldLabel, { color: colors.ink, marginBottom: 8 }]}>
                Pilih Kecepatan Proses Server
              </Text>
              <View style={styles.speedRow}>
                {speedOptions.map((opt) => {
                  const active = selectedSpeed === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      style={[
                        styles.speedCard,
                        {
                          backgroundColor: active ? 'rgba(30, 215, 96, 0.08)' : colors.parchment,
                          borderColor: active ? colors.primary : colors.hairline,
                        },
                      ]}
                      onPress={() => {
                        try { Haptics.selectionAsync(); } catch {}
                        setSelectedSpeed(opt.id);
                      }}
                    >
                      <Text style={[styles.speedName, { color: colors.ink }]}>{opt.label.split(' ')[0]}</Text>
                      <Text style={[styles.speedPriceText, { color: colors.primary }]}>
                        {opt.hasSpecificPrice
                          ? `Rp ${Number(opt.price).toLocaleString('id-ID')}`
                          : opt.price === 0
                          ? 'Gratis'
                          : `+Rp ${Number(opt.price).toLocaleString('id-ID')}`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Voucher Promo Selector Button */}
            <Pressable
              style={[styles.voucherBar, { backgroundColor: colors.parchment, borderColor: colors.hairline }]
              }
              onPress={() => setShowVoucherSheet(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ticket size={20} color={colors.primary} />
                <View>
                  <Text style={[styles.voucherTitle, { color: colors.ink }]}>
                    {appliedCoupon ? `Voucher ${appliedCoupon.code} Aktif` : 'Gunakan Voucher Promo'}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.inkMuted }}>
                    {appliedCoupon ? `Hemat -Rp ${discountAmount.toLocaleString('id-ID')}` : 'Pilih kupon diskon Shopee-style'}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                {appliedCoupon ? 'Ubah' : 'Pilih'}
              </Text>
            </Pressable>

            {/* RyPoints Coins Bar */}
            <View style={[styles.coinsBar, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <Coins size={20} color="#f59e0b" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.voucherTitle, { color: colors.ink }]}>
                    Tukarkan Koin ({userCoins.toLocaleString('id-ID')} RyPoints)
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.inkMuted }}>
                    {priceAfterCoupon < 50000
                      ? 'Min. belanja Rp 50.000 untuk tukar koin'
                      : maxCoinsAllowed > 0
                      ? `Hemat maks. Rp ${maxCoinsAllowed.toLocaleString('id-ID')}`
                      : 'Kumpulkan koin dari mini game'}
                  </Text>
                </View>
              </View>
              {userCoins > 0 && maxCoinsAllowed > 0 && (
                <Switch
                  value={useCoins}
                  onValueChange={setUseCoins}
                  trackColor={{ false: '#3f3f46', true: colors.primary }}
                />
              )}
            </View>
          </View>
        )}

        {/* STEP 2: Input & Validasi Nomor HP + IMEI */}
        {currentStep === 2 && (
          <View>
            {/* Wholesale Banner */}
            <View style={styles.wholesaleBanner}>
              <View style={styles.wholesaleIconWrap}>
                <Tag size={18} color="#10b981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.wholesaleTitle}>Promo Diskon Multi-IMEI Otomatis</Text>
                <Text style={styles.wholesaleDesc}>
                  Daftarkan 2 IMEI atau lebih (Dual SIM), otomatis dapat harga grosir spesial mulai dari Rp 160.000 / IMEI.
                </Text>
              </View>
            </View>

            {/* Input IMEI Box */}
            <View style={styles.sectionWrap}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={[styles.fieldLabel, { color: colors.ink }]}>Nomor IMEI Target (15 Digit)</Text>
                {imei.trim().length > 0 && (
                  <View style={[styles.badgeValid, { backgroundColor: validImeiCount > 0 ? 'rgba(30, 215, 96, 0.12)' : 'rgba(255, 69, 58, 0.12)' }]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: validImeiCount > 0 ? colors.primary : '#ff453a' }}>
                      {validImeiCount} / {imeiCount} Valid Luhn
                    </Text>
                  </View>
                )}
              </View>

              <View style={[styles.textInputWrap, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}>
                <TextInput
                  style={[styles.textInputArea, { color: colors.ink }]}
                  placeholder="Masukkan 15 digit IMEI (Bisa banyak sekaligus, pisahkan dengan enter atau spasi)"
                  placeholderTextColor={colors.inkMuted}
                  multiline
                  numberOfLines={3}
                  value={imei}
                  onChangeText={(val) => setImei(val.replace(/[^0-9,\n\r ]/g, ''))}
                />
              </View>
              <Text style={{ fontSize: 11, color: colors.inkMuted, marginTop: 4 }}>
                💡 Masukkan IMEI 1 & IMEI 2 di baris terpisah untuk aktivasi Dual SIM.
              </Text>
            </View>

            {/* WhatsApp Notification Input */}
            <View style={[styles.sectionCard, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Smartphone size={16} color="#10b981" />
                  <Text style={[styles.fieldLabel, { color: colors.ink }]}>WhatsApp Penerima Nota</Text>
                </View>
                <View style={[styles.badgeValid, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#10b981' }}>Auto Kirim Nota</Text>
                </View>
              </View>
              <TextInput
                style={[styles.phoneInput, { backgroundColor: colors.canvas, borderColor: colors.hairline, color: colors.ink }]}
                placeholder="Contoh: 081234567890"
                placeholderTextColor={colors.inkMuted}
                keyboardType="phone-pad"
                value={targetPhone}
                onChangeText={(val) => setTargetPhone(val.replace(/[^0-9+]/g, ''))}
              />
            </View>

            {/* Upload Dokumen Bukti */}
            <View style={styles.uploadRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.ink, marginBottom: 6 }]}>
                  Screenshot *#06# <Text style={{ color: '#ff453a' }}>*</Text>
                </Text>
                <Pressable
                  style={[styles.uploadBox, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}
                  onPress={() => handlePickImage('screenshot')}
                >
                  {screenshotUri ? (
                    <Image source={{ uri: screenshotUri }} style={styles.uploadedThumb} />
                  ) : (
                    <View style={{ alignItems: 'center', gap: 4 }}>
                      <Camera size={20} color={colors.primary} />
                      <Text style={{ fontSize: 11, color: colors.inkMuted, fontWeight: '600' }}>Pilih Foto</Text>
                    </View>
                  )}
                </Pressable>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.ink, marginBottom: 6 }]}>
                  Cek CEIR <Text style={{ fontSize: 11, color: colors.inkMuted }}>(Opsional)</Text>
                </Text>
                <Pressable
                  style={[styles.uploadBox, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}
                  onPress={() => handlePickImage('ceir')}
                >
                  {ceirUri ? (
                    <Image source={{ uri: ceirUri }} style={styles.uploadedThumb} />
                  ) : (
                    <View style={{ alignItems: 'center', gap: 4 }}>
                      <ImageIcon size={20} color={colors.inkMuted} />
                      <Text style={{ fontSize: 11, color: colors.inkMuted, fontWeight: '600' }}>Pilih Foto</Text>
                    </View>
                  )}
                </Pressable>
              </View>
            </View>

            {/* Ketentuan Layanan Accordion */}
            <View style={styles.ketentuanCard}>
              <Pressable
                style={styles.ketentuanHeader}
                onPress={() => setKetentuanOpen(!ketentuanOpen)}
              >
                <AlertTriangle size={16} color="#d97706" style={{ marginRight: 8 }} />
                <Text style={styles.ketentuanTitle}>Syarat & Ketentuan Layanan</Text>
                {ketentuanOpen ? <ChevronUp size={16} color="#d97706" /> : <ChevronDown size={16} color="#d97706" />}
              </Pressable>
              {ketentuanOpen && (
                <View style={styles.ketentuanList}>
                  <Text style={styles.ketentuanItem}>1. Khusus untuk HP Inter (Internasional).</Text>
                  <Text style={styles.ketentuanItem}>2. Pastikan HP BUKAN bypass-an.</Text>
                  <Text style={styles.ketentuanItem}>3. IC Baseband sehat (Muncul &quot;Tidak ada layanan&quot; saat SIM masuk).</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* STEP 3: Review Ringkasan Biaya, Metode Pembayaran & Konfirmasi */}
        {currentStep === 3 && (
          <View>
            {/* Review Card */}
            <View style={[styles.sectionCard, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}>
              <Text style={[styles.fieldLabel, { color: colors.ink, marginBottom: 8 }]}>Detail Permintaan Roamer</Text>
              <View style={{ gap: 6 }}>
                <View style={styles.detailRow}>
                  <Text style={{ fontSize: 12, color: colors.inkMuted }}>Paket Dipilih:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>{selectedPkg?.duration}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={{ fontSize: 12, color: colors.inkMuted }}>Jumlah IMEI:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>{imeiCount} IMEI</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={{ fontSize: 12, color: colors.inkMuted }}>Kecepatan Proses:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>{selectedSpeed.toUpperCase()}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={{ fontSize: 12, color: colors.inkMuted }}>WhatsApp Nota:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>{targetPhone}</Text>
                </View>
              </View>
            </View>

            {/* Metode Pembayaran */}
            <View style={styles.sectionWrap}>
              <Text style={[styles.fieldLabel, { color: colors.ink, marginBottom: 8 }]}>Metode Pembayaran</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  style={[
                    styles.methodTile,
                    {
                      borderColor: paymentMethod === 'qris' ? colors.primary : colors.hairline,
                      backgroundColor: paymentMethod === 'qris' ? 'rgba(30, 215, 96, 0.08)' : colors.parchment,
                    },
                  ]}
                  onPress={() => {
                    try { Haptics.selectionAsync(); } catch {}
                    setPaymentMethod('qris');
                  }}
                >
                  <QrCode size={18} color={paymentMethod === 'qris' ? colors.primary : colors.inkMuted} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>Direct QRIS</Text>
                    <Text style={{ fontSize: 11, color: colors.inkMuted }}>Otomatis 24 Jam</Text>
                  </View>
                </Pressable>

                <Pressable
                  style={[
                    styles.methodTile,
                    {
                      borderColor: paymentMethod === 'balance' ? colors.primary : colors.hairline,
                      backgroundColor: paymentMethod === 'balance' ? 'rgba(30, 215, 96, 0.08)' : colors.parchment,
                    },
                  ]}
                  onPress={() => {
                    try { Haptics.selectionAsync(); } catch {}
                    setPaymentMethod('balance');
                  }}
                >
                  <Wallet size={18} color={paymentMethod === 'balance' ? colors.primary : colors.inkMuted} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>Saldo RyPay</Text>
                    <Text style={{ fontSize: 11, color: colors.inkMuted }}>Rp {userBalance.toLocaleString('id-ID')}</Text>
                  </View>
                </Pressable>
              </View>
            </View>

            {/* Syarat Persetujuan */}
            <Pressable
              style={styles.agreedRow}
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                setAgreed(!agreed);
              }}
              hitSlop={8}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: agreed ? colors.primary : colors.hairline,
                    backgroundColor: agreed ? colors.primary : 'transparent',
                  },
                ]}
              >
                {agreed && <Check size={12} color="#fff" strokeWidth={3} />}
              </View>
              <Text style={[styles.agreedText, { color: colors.inkMuted }]}>
                Saya menyatakan data IMEI HP target sudah benar dan setuju dengan syarat & ketentuan layanan.
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Bar Ringkasan Biaya + Bayar */}
      <View
        style={[
          styles.stickyBottomBar,
          {
            backgroundColor: colors.parchment,
            borderTopColor: colors.hairline,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <Pressable
          style={styles.stickyPriceCol}
          onPress={() => setShowSummarySheet(true)}
          hitSlop={10}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 11, color: colors.inkMuted }}>Total Tagihan ({imeiCount} IMEI)</Text>
            <Receipt size={12} color={colors.primary} />
          </View>
          <Text style={[styles.stickyTotalPrice, { color: colors.primary }]}>
            Rp {totalPrice.toLocaleString('id-ID')}
          </Text>
        </Pressable>

        <View style={styles.stickyActionsRow}>
          {currentStep < 3 ? (
            <Pressable
              style={[styles.nextStepBtn, { backgroundColor: colors.primary }]}
              onPress={handleNextStep}
            >
              <Text style={styles.nextStepBtnText}>
                {currentStep === 1 ? 'Lanjut ke Data HP' : 'Lanjut ke Review'}
              </Text>
              <ArrowRight size={16} color="#000" />
            </Pressable>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                style={[styles.cartBtnCompact, { borderColor: colors.primary }]}
                onPress={handleAddToCart}
                disabled={addingCart || submitting}
              >
                {addingCart ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <ShoppingCart size={16} color={colors.primary} />
                )}
              </Pressable>

              <Pressable
                style={[styles.payNowBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  if (!agreed) {
                    Alert.alert('Persetujuan Layanan', 'Centang kotak persetujuan sebelum melanjutkan pembayaran.');
                    return;
                  }
                  if (paymentMethod === 'qris') {
                    setShowInstantQris(true);
                  } else {
                    executeOrderSubmission('balance');
                  }
                }}
                disabled={submitting || addingCart}
              >
                {submitting ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <>
                    <Zap size={16} color="#000" fill="#000" />
                    <Text style={styles.payNowBtnText}>
                      {paymentMethod === 'qris' ? 'Bayar QRIS' : 'Bayar Saldo'}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* Draggable Bottom Sheet: Rincian Lengkap Biaya */}
      <DraggableBottomSheet
        visible={showSummarySheet}
        onClose={() => setShowSummarySheet(false)}
        title="Rincian Tagihan Pembayaran"
        subtitle="Transparan tanpa biaya tersembunyi"
      >
        <View style={{ gap: 10, paddingVertical: 12 }}>
          <View style={styles.summaryRow}>
            <Text style={{ color: colors.inkMuted, fontSize: 13 }}>Subtotal ({imeiCount} IMEI)</Text>
            <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 13 }}>
              Rp {rawTotalPrice.toLocaleString('id-ID')}
            </Text>
          </View>
          {isWholesaleActive && (
            <View style={styles.summaryRow}>
              <Text style={{ color: '#10b981', fontSize: 13 }}>Hemat Grosir Multi-IMEI</Text>
              <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 13 }}>
                -Rp {wholesaleSavings.toLocaleString('id-ID')}
              </Text>
            </View>
          )}
          {appliedCoupon && (
            <View style={styles.summaryRow}>
              <Text style={{ color: '#10b981', fontSize: 13 }}>Kupon Diskon ({appliedCoupon.code})</Text>
              <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 13 }}>
                -Rp {discountAmount.toLocaleString('id-ID')}
              </Text>
            </View>
          )}
          {useCoins && coinsDiscount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={{ color: '#f59e0b', fontSize: 13 }}>Potongan Koin RyPoints</Text>
              <Text style={{ color: '#f59e0b', fontWeight: '700', fontSize: 13 }}>
                -Rp {coinsDiscount.toLocaleString('id-ID')}
              </Text>
            </View>
          )}
          <View style={[styles.summaryRow, { borderTopWidth: 1, borderColor: colors.hairline, paddingTop: 10, marginTop: 4 }]}>
            <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 15 }}>Total Pembayaran</Text>
            <Text style={{ color: colors.primary, fontWeight: '900', fontSize: 17 }}>
              Rp {totalPrice.toLocaleString('id-ID')}
            </Text>
          </View>
        </View>
      </DraggableBottomSheet>

      {/* Draggable Bottom Sheet: Voucher Promo */}
      <DraggableBottomSheet
        visible={showVoucherSheet}
        onClose={() => setShowVoucherSheet(false)}
        title="Voucher Promo Diskon"
        subtitle="Pilih atau masukkan kode voucher Anda"
      >
        <View style={{ paddingVertical: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.canvas, borderColor: colors.hairline, color: colors.ink }]}
              placeholder="Masukkan kode promo"
              placeholderTextColor={colors.inkMuted}
              value={couponCode}
              onChangeText={(val) => setCouponCode(val.toUpperCase())}
            />
            <Pressable
              style={[styles.applyBtn, { backgroundColor: colors.primary }]}
              onPress={() => handleApplyCoupon(couponCode)}
            >
              <Text style={{ color: '#000', fontWeight: '800', fontSize: 13 }}>Pakai</Text>
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
            {publicCoupons.map((c) => (
              <Pressable
                key={c.id || c.code}
                style={[styles.couponTile, { backgroundColor: colors.canvas, borderColor: colors.hairline }]}
                onPress={() => handleApplyCoupon(c.code)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.ink }}>{c.code}</Text>
                  <Text style={{ fontSize: 11, color: colors.inkMuted }}>
                    {c.title || c.description || 'Diskon spesial pengguna'}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>Gunakan</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </DraggableBottomSheet>

      {/* Direct Instant QRIS Modal */}
      <InstantQrisModal
        isOpen={showInstantQris}
        onClose={() => setShowInstantQris(false)}
        amount={totalPrice}
        orderTitle={`Add Roamer ${selectedPkg?.duration || '1 Bulan'} (${imeiCount} IMEI)`}
        onSuccess={() => {
          setShowInstantQris(false);
          executeOrderSubmission('qris');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 11,
    marginTop: 2,
  },
  starSellerBadge: {
    backgroundColor: '#ff453a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  starSellerText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  wizardIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  wizardStepCol: {
    alignItems: 'center',
    gap: 4,
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  stepConnector: {
    flex: 1,
    height: 2,
    marginHorizontal: 8,
    marginBottom: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  wholesaleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  wholesaleIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wholesaleTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10b981',
  },
  wholesaleDesc: {
    fontSize: 11,
    color: '#a1a1aa',
    marginTop: 2,
    lineHeight: 15,
  },
  ketentuanCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  ketentuanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ketentuanTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#d97706',
  },
  ketentuanList: {
    marginTop: 8,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 158, 11, 0.2)',
    paddingTop: 8,
  },
  ketentuanItem: {
    fontSize: 11,
    color: '#d97706',
    lineHeight: 16,
  },
  sectionWrap: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  badgeValid: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  textInputWrap: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
  },
  textInputArea: {
    height: 70,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  phoneInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  uploadRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  uploadBox: {
    height: 72,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  uploadedThumb: {
    width: '100%',
    height: '100%',
  },
  packageGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  packageCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    gap: 4,
  },
  pkgDuration: {
    fontSize: 13,
    fontWeight: '800',
  },
  pkgPrice: {
    fontSize: 14,
    fontWeight: '900',
  },
  pkgGrosirBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10b981',
    marginTop: 2,
  },
  speedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  speedCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 10,
    alignItems: 'center',
  },
  speedName: {
    fontSize: 12,
    fontWeight: '700',
  },
  speedPriceText: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  voucherBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  voucherTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  coinsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  methodTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  agreedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 14,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  agreedText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  stickyBottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
  },
  stickyPriceCol: {
    flex: 1,
  },
  stickyTotalPrice: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  stickyActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  nextStepBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
  },
  cartBtnCompact: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  payNowBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  applyBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponTile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
});
