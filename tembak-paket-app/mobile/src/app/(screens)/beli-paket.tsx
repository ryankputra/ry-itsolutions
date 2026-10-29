import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import {
  ArrowLeft,
  Smartphone,
  Search,
  CheckCircle2,
  AlertCircle,
  Zap,
  ShieldCheck,
  Send,
  Lock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';

const PROVIDERS = [
  { id: 'ALL', name: 'Semua' },
  { id: 'XL', name: 'XL Axiata' },
  { id: 'AXIS', name: 'AXIS' },
  { id: 'TELKOMSEL', name: 'Telkomsel' },
  { id: 'INDOSAT', name: 'Indosat' },
  { id: 'TRI', name: 'Tri (3)' },
  { id: 'SMARTFREN', name: 'Smartfren' },
];

export default function BeliPaketScreen() {
  const router = useRouter();
  const { user, updateUserBalance } = useAuth();
  const colors = Colors.dark;

  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedProvider, setSelectedProvider] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Purchase States
  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const [phone, setPhone] = useState(user?.verifiedPhone || '');
  const [purchasing, setPurchasing] = useState(false);

  // OTP Verification States
  const [otpMode, setOtpMode] = useState(false);
  const [otp, setOtp] = useState('');
  const [authId, setAuthId] = useState('');
  const [requestingOtp, setRequestingOtp] = useState(false);

  useEffect(() => {
    async function loadPackages() {
      try {
        const res = await apiClient.get('/user/packages');
        if (res.data?.status && Array.isArray(res.data.data)) {
          setPackages(res.data.data);
        } else if (Array.isArray(res.data)) {
          setPackages(res.data);
        }
      } catch (err) {
        console.warn('Gagal memuat paket:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPackages();
  }, []);

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const matchProvider =
        selectedProvider === 'ALL' ||
        (pkg.provider && pkg.provider.toUpperCase().includes(selectedProvider)) ||
        (pkg.name && pkg.name.toUpperCase().includes(selectedProvider));

      const matchSearch =
        !search.trim() ||
        (pkg.name && pkg.name.toLowerCase().includes(search.toLowerCase())) ||
        (pkg.description && pkg.description.toLowerCase().includes(search.toLowerCase()));

      return matchProvider && matchSearch;
    });
  }, [packages, selectedProvider, search]);

  const formatRupiah = (val: number) => {
    return 'Rp ' + (val || 0).toLocaleString('id-ID');
  };

  const handleSelectPackage = (pkg: any) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSelectedPkg(pkg);
  };

  const handleRequestOtp = async () => {
    if (!phone || phone.length < 9) {
      Alert.alert('Perhatian', 'Nomor handphone tidak valid.');
      return;
    }
    setRequestingOtp(true);
    try {
      const res = await apiClient.post('/phone/request-otp', { phone });
      if (res.data?.status) {
        setAuthId(res.data.data?.auth_id || '');
        setOtpMode(true);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        Alert.alert('Kode OTP Terkirim', 'Silakan masukkan kode OTP yang dikirimkan via SMS.');
      } else {
        Alert.alert('Gagal Request OTP', res.data?.message || 'Nomor tidak terdaftar atau sistem sibuk.');
      }
    } catch (e: any) {
      Alert.alert('Gagal Request OTP', e.response?.data?.message || e.message);
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleExecutePurchase = async () => {
    if (!phone || phone.length < 9) {
      Alert.alert('Perhatian', 'Masukkan nomor tujuan yang benar.');
      return;
    }

    const price = selectedPkg.price;
    if ((user?.balance || 0) < price) {
      Alert.alert(
        'Saldo Tidak Cukup',
        `Saldo Anda (${formatRupiah(user?.balance || 0)}) tidak mencukupi untuk paket ini (${formatRupiah(price)}). Silakan isi saldo terlebih dahulu.`,
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Isi Saldo', onPress: () => router.push('/(screens)/topup' as any) },
        ]
      );
      return;
    }

    setPurchasing(true);
    try {
      const payload: any = {
        package_id: selectedPkg.id,
        phone: phone.trim(),
      };
      if (otpMode && otp) {
        payload.otp = otp.trim();
        payload.auth_id = authId;
      }

      const res = await apiClient.post('/purchase', payload);
      if (res.data?.status) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        updateUserBalance((user?.balance || 0) - price);
        Alert.alert(
          'Transaksi Berhasil!',
          `Paket ${selectedPkg.name} berhasil dikirim ke nomor ${phone}.`,
          [{ text: 'Lihat Riwayat', onPress: () => router.replace('/(tabs)/history') }]
        );
        setSelectedPkg(null);
        setOtpMode(false);
      } else {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {}
        Alert.alert('Transaksi Gagal', res.data?.message || 'Gagal memproses pesanan paket.');
      }
    } catch (e: any) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      Alert.alert('Transaksi Gagal', e.response?.data?.message || e.message);
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Navigation Header */}
        <View style={styles.topNav}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: colors.surface }]}
            onPress={() => router.back()}
            hitSlop={10}
          >
            <ArrowLeft size={20} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.navTitle, { color: colors.text }]}>Tembak Paket Data</Text>
            <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>
              Isi kuota otomatis semua operator
            </Text>
          </View>
        </View>

        {/* Input Nomor Telepon Tujuan */}
        <View style={[styles.phoneCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.phoneLabelRow}>
            <Smartphone size={16} color={colors.primary} />
            <Text style={[styles.phoneLabel, { color: colors.textMuted }]}>Nomor Handphone Tujuan</Text>
          </View>
          <View style={[styles.phoneInputBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.countryCode, { color: colors.textDim }]}>+62</Text>
            <TextInput
              style={[styles.phoneInput, { color: colors.text }]}
              placeholder="8xxxxxxxxxx"
              placeholderTextColor={colors.textDim}
              value={phone.startsWith('0') ? phone.slice(1) : phone.startsWith('62') ? phone.slice(2) : phone}
              onChangeText={(txt) => setPhone('0' + txt.replace(/\D/g, ''))}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Search & Provider Selector */}
        <View style={styles.filterSection}>
          <View
            style={[
              styles.searchBar,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Search size={18} color={colors.textDim} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Cari kuota, akrab, masa aktif..."
              placeholderTextColor={colors.textDim}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* Provider Pills */}
          <View style={styles.providerScroll}>
            {PROVIDERS.map((prov) => {
              const active = selectedProvider === prov.id;
              return (
                <Pressable
                  key={prov.id}
                  style={[
                    styles.provPill,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                    setSelectedProvider(prov.id);
                  }}
                >
                  <Text
                    style={[
                      styles.provPillText,
                      { color: active ? '#ffffff' : colors.textMuted },
                    ]}
                  >
                    {prov.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Package FlashList */}
        <View style={{ flex: 1 }}>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                Memuat daftar paket data...
              </Text>
            </View>
          ) : (
            <FlashList
              data={filteredPackages}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
              renderItem={({ item }) => {
                const isSelected = selectedPkg?.id === item.id;
                return (
                  <Pressable
                    style={({ pressed }) => [
                      styles.pkgItem,
                      {
                        backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                    onPress={() => handleSelectPackage(item)}
                    android_ripple={{ color: colors.ripple }}
                  >
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <View style={styles.pkgTopRow}>
                        <View style={[styles.provTag, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                          <Text style={[styles.provTagText, { color: colors.primary }]}>
                            {item.provider || 'DATA'}
                          </Text>
                        </View>
                        {item.active && (
                          <View style={styles.activeTag}>
                            <Zap size={11} color={colors.success} style={{ marginRight: 2 }} />
                            <Text style={[styles.activeTagText, { color: colors.success }]}>INSTAN</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.itemPkgName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.itemPkgDesc, { color: colors.textMuted }]} numberOfLines={2}>
                        {item.description || 'Pengiriman kuota otomatis 24 jam.'}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                      <Text style={[styles.itemPkgPrice, { color: colors.primary }]}>
                        {formatRupiah(item.price)}
                      </Text>
                      <View
                        style={[
                          styles.selectBtn,
                          { backgroundColor: isSelected ? colors.primary : colors.surfaceElevated },
                        ]}
                      >
                        <Text style={[styles.selectBtnText, { color: isSelected ? '#ffffff' : colors.text }]}>
                          {isSelected ? 'Dipilih' : 'Pilih'}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <AlertCircle size={36} color={colors.textDim} />
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    Tidak ada paket data yang sesuai filter.
                  </Text>
                </View>
              }
            />
          )}
        </View>

        {/* Bottom Purchase Bar */}
        {selectedPkg && (
          <View
            style={[
              styles.bottomPurchaseBar,
              { backgroundColor: colors.surfaceElevated, borderTopColor: colors.border },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.barPkgName, { color: colors.text }]} numberOfLines={1}>
                {selectedPkg.name}
              </Text>
              <Text style={[styles.barPrice, { color: colors.primary }]}>
                {formatRupiah(selectedPkg.price)}
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.buyNowBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={handleExecutePurchase}
              disabled={purchasing}
            >
              {purchasing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Send size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.buyNowText}>Beli Sekarang</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
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
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  navSubtitle: {
    fontSize: 12,
  },
  phoneCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  phoneLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  phoneLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  phoneInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
  },
  countryCode: {
    fontSize: 15,
    fontWeight: '700',
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontWeight: '600',
  },
  filterSection: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
  },
  providerScroll: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  provPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  provPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
  },
  pkgItem: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    alignItems: 'center',
  },
  pkgTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  provTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  provTagText: {
    fontSize: 9,
    fontWeight: '800',
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeTagText: {
    fontSize: 9,
    fontWeight: '800',
  },
  itemPkgName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  itemPkgDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  itemPkgPrice: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  selectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  selectBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
  },
  bottomPurchaseBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    elevation: 8,
  },
  barPkgName: {
    fontSize: 14,
    fontWeight: '700',
  },
  barPrice: {
    fontSize: 18,
    fontWeight: '800',
  },
  buyNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  buyNowText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
