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
  Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Zap,
  Copy,
  Check,
  Share2,
  PhoneCall,
  Smartphone,
  ExternalLink,
  Barcode,
  Search,
  Sparkles,
  RefreshCw,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/api';
import { validateImeiLuhn, analyzeImei } from '../../utils/imeiHelper';
import { parseCeirResponse, ParsedCeirResult } from '../../utils/ceirParser';
import { Colors } from '../../theme/colors';

const ceirgoNameMapping: Record<string, string> = {
  cek_imei: 'Cek Status IMEI',
  cek_imei_beacukai: 'Cek IMEI Bea Cukai',
  cek_history_imei: 'Cek Riwayat Database CEIR',
  cek_validity: 'Cek Masa Aktif Sinyal',
  cek_digi: 'Cek DIGI',
  cek_sf: 'Cek Smartfren',
  cek_icloud: 'Cek iCloud & FMI',
  cek_simlock: 'Cek Carrier / Simlock',
};

const DIAGNOSTIC_SERVICES_CORE = [
  { code: 'cek_imei', name: 'Cek Status IMEI', modalPrice: 2000 },
  { code: 'cek_imei_beacukai', name: 'Cek IMEI Bea Cukai', modalPrice: 1500 },
  { code: 'cek_history_imei', name: 'Cek Riwayat Database CEIR', modalPrice: 5100 },
  { code: 'cek_validity', name: 'Cek Masa Aktif Sinyal', modalPrice: 1000 },
  { code: 'cek_digi', name: 'Cek DIGI', modalPrice: 1000 },
  { code: 'cek_sf', name: 'Cek Smartfren', modalPrice: 1000 },
];

export default function CekCeirScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateUserBalance } = useAuth();
  const colors = Colors.dark;

  // Catalog states
  const [ceirgoPricing, setCeirgoPricing] = useState<any>({});
  const [ceirgoServices, setCeirgoServices] = useState<any[]>(DIAGNOSTIC_SERVICES_CORE);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Form states
  const [imei, setImei] = useState('');
  const [selectedService, setSelectedService] = useState('cek_imei');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ParsedCeirResult | null>(null);
  const [copiedResult, setCopiedResult] = useState(false);

  // Load catalog data from server
  useEffect(() => {
    Promise.all([
      apiClient.get('/ceirgo-pricing').catch(() => null),
      apiClient.get('/ceirgo-services').catch(() => null),
      apiClient.get('/ceirgo-custom-names').catch(() => null),
      apiClient.get('/admin/ceirgo-display-settings').catch(() => null),
    ]).then(([prcRes, svcRes, nameRes, dispRes]) => {
      const customNames: Record<string, string> = nameRes?.data?.data || nameRes?.data?.customNames || {};

      if (prcRes?.data?.status && prcRes.data.data) {
        setCeirgoPricing(prcRes.data.data);
      }

      const rawServices = Array.isArray(svcRes?.data?.data?.page?.items)
        ? svcRes.data.data.page.items
        : Array.isArray(svcRes?.data?.data)
        ? svcRes.data.data
        : Array.isArray(svcRes?.data?.services)
        ? svcRes.data.services
        : [];

      const merged = DIAGNOSTIC_SERVICES_CORE.map((core) => ({
        ...core,
        name: customNames[core.code] || core.name,
      }));

      rawServices.forEach((svc: any) => {
        if (!svc?.code || /barcode|create/i.test(`${svc.code} ${svc.name}`)) return;
        const exists = merged.find((m) => m.code === svc.code);
        const resolvedName = customNames[svc.code] || svc.customName || svc.name || ceirgoNameMapping[svc.code];
        if (exists) {
          if (resolvedName) exists.name = resolvedName;
          exists.modalPrice = Number(svc.modalPrice ?? svc.unit_price ?? exists.modalPrice);
        } else {
          merged.push({
            code: svc.code,
            name: resolvedName || svc.code,
            modalPrice: Number(svc.modalPrice ?? svc.unit_price ?? 2000),
          });
        }
      });

      // Filter by display settings if available
      const displayData = dispRes?.data?.data;
      if (displayData && Array.isArray(displayData.cekCeir)) {
        const allowedSet = new Set(displayData.cekCeir);
        setCeirgoServices(merged.filter((s) => allowedSet.has(s.code)));
      } else {
        setCeirgoServices(merged);
      }
    }).finally(() => {
      setLoadingCatalog(false);
    });
  }, []);

  const getPrice = (code: string) => {
    const svc = ceirgoServices.find((s) => s.code === code);
    const aliases = [
      code,
      `ceirgo_price_${code}`,
      code.startsWith('ceirgo_price_') ? code.replace(/^ceirgo_price_/, '') : null,
      code.startsWith('price_') ? code.replace(/^price_/, '') : null,
    ].filter(Boolean) as string[];

    for (const key of aliases) {
      const sellingPrice = Number(ceirgoPricing?.[key]);
      if (Number.isFinite(sellingPrice) && sellingPrice > 0) return sellingPrice;
    }

    const modalPrice = Number(svc?.modalPrice);
    return Number.isFinite(modalPrice) && modalPrice > 0 ? modalPrice : 2000;
  };

  const getServiceName = (code: string) => {
    const svc = ceirgoServices.find((s) => s.code === code);
    return svc?.name || ceirgoNameMapping[code] || code;
  };

  const cleanImei = imei.trim().replace(/\D/g, '');
  const isValidLuhn = cleanImei.length === 15 ? validateImeiLuhn(cleanImei) : false;
  const detectedDevice = cleanImei.length >= 8 ? analyzeImei(cleanImei) : null;
  const activePrice = getPrice(selectedService);

  const handlePasteClipboard = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const text = await Clipboard.getStringAsync();
      const digits = text.replace(/\D/g, '').slice(0, 15);
      if (digits) {
        setImei(digits);
      } else {
        Alert.alert('Papan Klip Kosong', 'Tidak ada angka yang ditemukan.');
      }
    } catch (e) {}
  };

  const handleDialGuide = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    Alert.alert(
      'Cara Cek Nomor IMEI HP',
      '1. Buka menu Panggilan/Telepon di HP Anda.\n2. Ketik kode *#06#\n3. Nomor IMEI 15 digit akan langsung muncul di layar.\n4. Salin dan masukkan ke aplikasi ini.',
      [
        { text: 'Salin *#06#', onPress: () => Clipboard.setStringAsync('*#06#') },
        { text: 'Mengerti', style: 'cancel' },
      ]
    );
  };

  const handleExecuteCheck = async () => {
    if (cleanImei.length !== 15) {
      Alert.alert('IMEI Tidak Valid', 'IMEI harus tepat 15 digit angka.');
      return;
    }

    if (!isValidLuhn) {
      Alert.alert(
        'Peringatan Checksum',
        'Nomor IMEI tidak lolos verifikasi algoritma Luhn. Pastikan nomor IMEI benar.'
      );
      return;
    }

    if ((user?.balance || 0) < activePrice) {
      Alert.alert(
        'Saldo Tidak Cukup',
        `Biaya cek CEIR adalah Rp ${activePrice.toLocaleString('id-ID')}. Saldo Anda saat ini Rp ${Number(user?.balance || 0).toLocaleString('id-ID')}.\n\nIngin Top Up Saldo sekarang?`,
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Isi Saldo', onPress: () => router.push('/(screens)/topup' as any) },
        ]
      );
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const serviceName = getServiceName(selectedService);
      const res = await apiClient.post('/order/ceir', {
        service_type: 'ceir',
        service_code: selectedService,
        price_key: selectedService,
        imei: cleanImei,
        duration: serviceName,
        payment_method: 'balance',
        target_phone: user?.phone || user?.verifiedPhone || '',
      });

      const data = res.data;
      if (data?.status) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        if (typeof data.data?.newBalance === 'number') {
          updateUserBalance(data.data.newBalance);
        } else if (typeof data.newBalance === 'number') {
          updateUserBalance(data.newBalance);
        } else {
          updateUserBalance((user?.balance || 0) - activePrice);
        }

        const parsed = parseCeirResponse(data.data?.result || data.data?.adminNote || data.result, undefined, data);
        parsed.imei = cleanImei;
        setResult(parsed);
      } else {
        if (typeof data?.data?.newBalance === 'number') {
          updateUserBalance(data.data.newBalance);
        }
        Alert.alert('Gagal', data?.message || 'Gagal melakukan pengecekan.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Kesalahan jaringan saat pengecekan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyResult = async () => {
    if (!result) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const summary = `=== LAPORAN STATUS CEIR / IMEI ===\nPerangkat: ${detectedDevice?.brand || ''} ${detectedDevice?.model || ''}\nIMEI: ${result.imei || cleanImei}\nStatus: ${result.status}\nTanggal Cek: ${result.verifiedAt}\n\nDiperiksa via Ry-IT Solutions Mobile App`;
      await Clipboard.setStringAsync(summary);
      setCopiedResult(true);
      setTimeout(() => setCopiedResult(false), 2000);
    } catch (e) {}
  };

  const handleShareResult = async () => {
    if (!result) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const msg = `Hasil Cek CEIR IMEI ${result.imei || cleanImei}: Status [${result.status}]. Dicek resmi via Ry-IT Solutions.`;
      await Share.share({ message: msg });
    } catch (e) {}
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Category Tab Switcher: Layanan CEIR vs Generator Barcode */}
      <View style={styles.topSwitcherContainer}>
        <View style={[styles.topSwitcher, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            style={[styles.switcherBtn, { backgroundColor: colors.primary }]}
          >
            <ShieldCheck size={14} color="#fff" />
            <Text style={[styles.switcherBtnText, { color: '#fff' }]}>Layanan CEIR</Text>
          </Pressable>
          <Pressable
            style={styles.switcherBtn}
            onPress={() => router.push('/(screens)/barcode' as any)}
          >
            <Barcode size={14} color={colors.textMuted} />
            <Text style={[styles.switcherBtnText, { color: colors.textMuted }]}>Generator Barcode</Text>
          </Pressable>
        </View>
      </View>

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
          <Text style={[styles.navTitle, { color: colors.text }]}>Cek Status CEIR & IMEI</Text>
          <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>
            Basis data Bea Cukai RI, Kemenperin & Operator
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Service Options Grid */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.text }]}>Pilih Jenis Diagnostik CEIR</Text>
          {loadingCatalog ? (
            <View style={styles.rowCenter}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ color: colors.textMuted, fontSize: 12, marginLeft: 8 }}>Memuat katalog CEIR...</Text>
            </View>
          ) : (
            <View style={styles.serviceGrid}>
              {ceirgoServices.map((svc) => {
                const selected = selectedService === svc.code;
                const prc = getPrice(svc.code);
                return (
                  <Pressable
                    key={svc.code}
                    style={[
                      styles.serviceTile,
                      selected
                        ? { borderColor: colors.primary, backgroundColor: colors.primary + '18' }
                        : { borderColor: colors.border, backgroundColor: colors.surfaceElevated },
                    ]}
                    onPress={() => {
                      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                      setSelectedService(svc.code);
                    }}
                  >
                    <View>
                      <Text style={[styles.svcName, { color: colors.text }]} numberOfLines={1}>
                        {svc.name}
                      </Text>
                      <Text style={[styles.svcCode, { color: colors.textMuted }]}>{svc.code}</Text>
                    </View>
                    <View
                      style={[
                        styles.pricePill,
                        selected ? { backgroundColor: colors.primary } : { backgroundColor: colors.surface },
                      ]}
                    >
                      <Text style={[styles.pricePillText, { color: selected ? '#fff' : colors.primary }]}>
                        Rp {prc.toLocaleString('id-ID')}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Input Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.rowSpace}>
            <Text style={[styles.label, { color: colors.text }]}>Nomor IMEI Target (15 Digit)</Text>
            <Pressable onPress={handleDialGuide} hitSlop={6} style={styles.rowAlign}>
              <PhoneCall size={12} color={colors.primary} />
              <Text style={[styles.helperLink, { color: colors.primary }]}>Panduan *#06#</Text>
            </Pressable>
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              style={[
                styles.imeiInput,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: cleanImei.length === 15 ? (isValidLuhn ? '#10b981' : '#f59e0b') : colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Contoh: 352467471234567"
              placeholderTextColor={colors.textDim}
              value={imei}
              onChangeText={(val) => setImei(val.replace(/\D/g, '').slice(0, 15))}
              keyboardType="numeric"
              maxLength={15}
            />
            {imei.length > 0 && (
              <Pressable style={styles.clearBtn} onPress={() => setImei('')} hitSlop={8}>
                <XCircle size={18} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          {/* Action Row */}
          <View style={styles.inputActionRow}>
            <Pressable
              style={[styles.smallActionBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              onPress={handlePasteClipboard}
            >
              <Copy size={13} color={colors.text} />
              <Text style={[styles.smallActionText, { color: colors.text }]}>Tempel dari Klip</Text>
            </Pressable>

            <Pressable
              style={[styles.smallActionBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              onPress={() => router.push('/(screens)/barcode' as any)}
            >
              <Barcode size={13} color={colors.primary} />
              <Text style={[styles.smallActionText, { color: colors.primary }]}>Buka Barcode</Text>
            </Pressable>
          </View>

          {/* Live Device Identification Card */}
          {cleanImei.length >= 8 && (
            <View style={[styles.detectedBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Smartphone size={16} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.detectedTitle, { color: colors.text }]}>
                  {detectedDevice?.brand ? `${detectedDevice.brand} ${detectedDevice.model}` : 'Smartphone Terdeteksi'}
                </Text>
                <Text style={[styles.detectedSub, { color: colors.textMuted }]}>
                  {cleanImei.length === 15
                    ? isValidLuhn
                      ? 'Lolos Verifikasi Algoritma Luhn (Valid)'
                      : 'Peringatan: Checksum Luhn Tidak Sesuai'
                    : `Mengetik: ${cleanImei.length}/15 Digit`}
                </Text>
              </View>
              {cleanImei.length === 15 && (
                isValidLuhn ? <CheckCircle2 size={16} color="#10b981" /> : <AlertTriangle size={16} color="#f59e0b" />
              )}
            </View>
          )}

          {/* Submit Button */}
          <Pressable
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={handleExecuteCheck}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Search size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.submitBtnText}>
                  Periksa Sekarang (Rp {activePrice.toLocaleString('id-ID')})
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Diagnostic Result Card */}
        {result && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: result.isRegistered ? '#10b98144' : '#ef444444' }]}>
            {/* Bea Cukai / Official Header */}
            <View style={[styles.resultHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.rowAlign}>
                <ShieldCheck size={20} color={result.isRegistered ? '#10b981' : '#f59e0b'} />
                <View style={{ marginLeft: 8 }}>
                  <Text style={[styles.resultTitle, { color: colors.text }]}>Hasil Pengecekan CEIR Resmi</Text>
                  <Text style={[styles.resultTime, { color: colors.textMuted }]}>{result.verifiedAt}</Text>
                </View>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: result.isRegistered ? '#10b98122' : '#ef444422',
                    borderColor: result.isRegistered ? '#10b981' : '#ef4444',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: result.isRegistered ? '#10b981' : '#ef4444' },
                  ]}
                >
                  {result.status || (result.isRegistered ? 'TERDAFTAR' : 'TIDAK TERDAFTAR')}
                </Text>
              </View>
            </View>

            {/* Device Info */}
            <View style={[styles.infoGrid, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Nomor IMEI:</Text>
                <Text style={[styles.infoVal, { color: colors.text }]}>{result.imei || cleanImei}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Perangkat:</Text>
                <Text style={[styles.infoVal, { color: colors.text }]}>
                  {detectedDevice?.brand || 'Smartphone'} {detectedDevice?.model || ''}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Layanan:</Text>
                <Text style={[styles.infoVal, { color: colors.primary }]}>{getServiceName(selectedService)}</Text>
              </View>
            </View>

            {/* History Records Table (if available) */}
            {result.rows && result.rows.length > 0 && (
              <View style={styles.historySection}>
                <Text style={[styles.historyHeading, { color: colors.text }]}>Riwayat Peristiwa CEIR:</Text>
                {result.rows.map((row, idx) => (
                  <View key={idx} style={[styles.historyRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.historyText, { color: colors.text }]}>
                      {typeof row === 'string' ? row : JSON.stringify(row)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.resultActions}>
              <Pressable
                style={[styles.resultActionBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                onPress={handleCopyResult}
              >
                {copiedResult ? <Check size={14} color="#10b981" /> : <Copy size={14} color={colors.text} />}
                <Text style={[styles.resultActionText, { color: copiedResult ? '#10b981' : colors.text }]}>
                  {copiedResult ? 'Tersalin' : 'Salin Laporan'}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.resultActionBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                onPress={handleShareResult}
              >
                <Share2 size={14} color={colors.text} />
                <Text style={[styles.resultActionText, { color: colors.text }]}>Bagikan</Text>
              </Pressable>

              {!result.isRegistered && (
                <Pressable
                  style={[styles.resultActionBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => router.push('/(screens)/add-roamer' as any)}
                >
                  <Zap size={14} color="#fff" />
                  <Text style={[styles.resultActionText, { color: '#fff' }]}>Aktivasi Add Roamer</Text>
                </Pressable>
              )}
            </View>
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
  topSwitcherContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  topSwitcher: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
  },
  switcherBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 11,
  },
  switcherBtnText: {
    fontSize: 12,
    fontWeight: '700',
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
  navSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 14,
  },
  card: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  serviceGrid: {
    gap: 8,
  },
  serviceTile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  svcName: {
    fontSize: 13,
    fontWeight: '800',
  },
  svcCode: {
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  pricePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pricePillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  rowSpace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helperLink: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  inputWrapper: {
    position: 'relative',
  },
  imeiInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  clearBtn: {
    position: 'absolute',
    right: 12,
    top: 15,
  },
  inputActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
  },
  smallActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  detectedTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  detectedSub: {
    fontSize: 10,
    marginTop: 1,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    marginTop: 2,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  resultTime: {
    fontSize: 10,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  infoGrid: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 11,
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  historySection: {
    gap: 6,
    marginTop: 4,
  },
  historyHeading: {
    fontSize: 11,
    fontWeight: '800',
  },
  historyRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  historyText: {
    fontSize: 11,
    lineHeight: 15,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  resultActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
  },
  resultActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
