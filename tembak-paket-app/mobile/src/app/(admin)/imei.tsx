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
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Smartphone,
  RotateCw,
  Zap,
  Clock,
  Gauge,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Server,
  ShieldCheck,
  Tag,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';

const SPEED_TIERS = [
  { id: 'fast', label: 'Fast', desc: 'Prioritas Kilat' },
  { id: 'semi', label: 'Semi Fast', desc: 'Estimasi Sedang' },
  { id: 'slow', label: 'Slow', desc: 'Paling Hemat' },
];

const SPEED_STATUS_CYCLE = ['active', 'maintenance', 'hidden'] as const;

export default function AdminImeiScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors.dark;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'service' | 'packages' | 'ceir'>('service');

  // Global IMEI Service Status
  const [imeiServiceOpen, setImeiServiceOpen] = useState(true);
  const [imeiServiceNote, setImeiServiceNote] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  // Speed Pricing
  const [pricing, setPricing] = useState<any>({});
  const debounceRef = useRef<any>(null);

  // IMEI Packages
  const [imeiPackages, setImeiPackages] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newImeiPkg, setNewImeiPkg] = useState<{
    duration: string;
    allowed_speeds: string[];
    speed_prices: { fast: string; semi: string; slow: string };
    wholesale_enabled: boolean;
    wholesale_min_qty: number;
    wholesale_prices: { fast: string; semi: string; slow: string };
    wholesale_promo_note: string;
    open_hour: string;
    close_hour: string;
  }>({
    duration: '',
    allowed_speeds: ['fast', 'semi', 'slow'],
    speed_prices: { fast: '', semi: '', slow: '' },
    open_hour: '',
    close_hour: '',
    wholesale_enabled: false,
    wholesale_min_qty: 2,
    wholesale_prices: { fast: '', semi: '', slow: '' },
    wholesale_promo_note: '',
  });

  const [editingPkg, setEditingPkg] = useState<any | null>(null);
  const [savingImeiPkg, setSavingImeiPkg] = useState(false);

  // Server Pusat CEIR & Barcode
  const [ceirgoServices, setCeirgoServices] = useState<any[]>([]);
  const [ceirgoPricing, setCeirgoPricing] = useState<any>({});
  const [ceirgoDisplayCodes, setCeirgoDisplayCodes] = useState<Set<string>>(new Set());
  const [ceirgoCustomNames, setCeirgoCustomNames] = useState<Record<string, string>>({});
  const [savingCeir, setSavingCeir] = useState(false);

  const autoSavePricing = (p: any) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await apiClient.post('/admin/manual-services-pricing', p);
      } catch (e) {}
    }, 800);
  };

  const cycleSpeedStatus = (speedId: string) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    const key = `imei_speed_${speedId}_status`;
    const current = SPEED_STATUS_CYCLE.indexOf((pricing[key] as any) || 'hidden');
    const next = SPEED_STATUS_CYCLE[(current + 1) % SPEED_STATUS_CYCLE.length];
    const updated = { ...pricing, [key]: next };
    setPricing(updated);
    autoSavePricing(updated);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [pricingRes, statusRes, imeiRes, ceirSvcRes, dispRes, ceirPriceRes] = await Promise.all([
        apiClient.get('/manual-services-pricing').catch(() => null),
        apiClient.get('/admin/imei-service-status').catch(() => null),
        apiClient.get('/imei-packages?all=true').catch(() => null),
        apiClient.get('/admin/ceirgo-services').catch(() => null),
        apiClient.get('/admin/ceirgo-display-settings').catch(() => null),
        apiClient.get('/admin/ceirgo-pricing').catch(() => null),
      ]);

      if (pricingRes?.data) {
        const prc = pricingRes.data.data || pricingRes.data.pricing || pricingRes.data;
        if (prc && typeof prc === 'object') setPricing(prc);
      }

      if (statusRes?.data?.status) {
        setImeiServiceOpen(statusRes.data.isOpen ?? true);
        setImeiServiceNote(statusRes.data.note || '');
      }

      if (imeiRes?.data) {
        const pkgs = imeiRes.data.data || imeiRes.data.packages || (Array.isArray(imeiRes.data) ? imeiRes.data : []);
        if (Array.isArray(pkgs)) setImeiPackages(pkgs);
      }

      if (ceirSvcRes?.data) {
        const svcs = ceirSvcRes.data.data || ceirSvcRes.data.services || (Array.isArray(ceirSvcRes.data) ? ceirSvcRes.data : []);
        if (Array.isArray(svcs)) setCeirgoServices(svcs);
        if (ceirSvcRes.data.customNames && typeof ceirSvcRes.data.customNames === 'object') {
          setCeirgoCustomNames(ceirSvcRes.data.customNames);
        }
      }

      if (dispRes?.data?.status && dispRes.data.data) {
        const codes = new Set<string>([
          ...(dispRes.data.data.cekCeir || []),
          ...(dispRes.data.data.barcode || []),
        ]);
        setCeirgoDisplayCodes(codes);
      }

      if (ceirPriceRes?.data) {
        const prc = ceirPriceRes.data.data || ceirPriceRes.data.pricing || ceirPriceRes.data;
        if (prc && typeof prc === 'object') setCeirgoPricing(prc);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveImeiServiceStatus = async (isOpen: boolean, note: string) => {
    setSavingStatus(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.post('/admin/imei-service-status', {
        isOpen,
        note,
      });
      if (res.data?.status !== false) {
        setImeiServiceOpen(isOpen);
        setImeiServiceNote(note);
        Alert.alert('Sukses', `Status operasional IMEI berhasil disimpan: ${isOpen ? 'BUKA' : 'TUTUP'}`);
      } else {
        Alert.alert('Gagal', res.data?.message || 'Gagal menyimpan status');
      }
    } catch (e: any) {
      Alert.alert('Gagal', e.message);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleCreateImeiPkg = async () => {
    if (!newImeiPkg.duration.trim()) {
      Alert.alert('Perhatian', 'Isi durasi paket terlebih dahulu.');
      return;
    }
    const activeSpeeds = newImeiPkg.allowed_speeds || [];
    if (activeSpeeds.length === 0) {
      Alert.alert('Perhatian', 'Pilih minimal 1 kecepatan pengerjaan.');
      return;
    }

    const spPrices: Record<string, number> = {};
    for (const sp of activeSpeeds) {
      const rawPrice = newImeiPkg.speed_prices?.[sp as 'fast' | 'semi' | 'slow'];
      const num = parseInt(rawPrice || '', 10);
      if (!num || num <= 0) {
        Alert.alert('Perhatian', `Isi tarif valid untuk opsi ${sp.toUpperCase()}`);
        return;
      }
      spPrices[sp] = num;
    }

    if (newImeiPkg.wholesale_enabled) {
      (spPrices as any).wholesale_enabled = true;
      (spPrices as any).wholesale_min_qty = Number(newImeiPkg.wholesale_min_qty) || 2;
      const wsObj: Record<string, number> = {};
      for (const sp of activeSpeeds) {
        const p = parseInt(newImeiPkg.wholesale_prices?.[sp as 'fast' | 'semi' | 'slow'] || '', 10);
        if (p > 0) wsObj[sp] = p;
      }
      (spPrices as any).wholesale_prices = wsObj;
      (spPrices as any).wholesale_promo_note = newImeiPkg.wholesale_promo_note || '';
    }

    const minPrice = Math.min(
      ...(Object.values(spPrices).filter((v) => typeof v === 'number' && v > 0) as number[])
    );

    setSavingImeiPkg(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.post('/admin/imei-packages', {
        duration: newImeiPkg.duration.trim(),
        price: minPrice,
        isVisible: 1,
        allowed_speeds: activeSpeeds,
        speed_prices: spPrices,
        open_hour: newImeiPkg.open_hour === '' ? null : Number(newImeiPkg.open_hour),
        close_hour: newImeiPkg.close_hour === '' ? null : Number(newImeiPkg.close_hour),
        wholesale_enabled: newImeiPkg.wholesale_enabled,
        wholesale_min_qty: Number(newImeiPkg.wholesale_min_qty) || 2,
        wholesale_prices: (spPrices as any).wholesale_prices || {},
        wholesale_promo_note: newImeiPkg.wholesale_promo_note || '',
      });

      if (res.data?.status) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        Alert.alert('Berhasil', 'Paket IMEI baru berhasil ditambahkan.');
        setShowAddModal(false);
        setNewImeiPkg({
          duration: '',
          allowed_speeds: ['fast', 'semi', 'slow'],
          speed_prices: { fast: '', semi: '', slow: '' },
          open_hour: '',
          close_hour: '',
          wholesale_enabled: false,
          wholesale_min_qty: 2,
          wholesale_prices: { fast: '', semi: '', slow: '' },
          wholesale_promo_note: '',
        });
        loadData();
      } else {
        Alert.alert('Gagal', res.data?.message || 'Gagal menambahkan paket.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingImeiPkg(false);
    }
  };

  const handleToggleImeiPkg = async (pkg: any) => {
    const isVisible = pkg.isVisible === 1 || pkg.isVisible === true || pkg.isVisible === undefined;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await apiClient.put(`/admin/imei-packages/${pkg.id}/toggle`, {
        isVisible: isVisible ? 0 : 1,
      });
      if (res.data?.status) {
        loadData();
      }
    } catch (e) {}
  };

  const handleDeleteImeiPkg = (pkg: any) => {
    Alert.alert(
      'Hapus Paket IMEI?',
      `Hapus durasi ${pkg.duration} secara permanen?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              const res = await apiClient.delete(`/admin/imei-packages/${pkg.id}`);
              if (res.data?.status) {
                Alert.alert('Dihapus', 'Paket berhasil dihapus.');
                loadData();
              }
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const handleSaveEditingPkg = async () => {
    if (!editingPkg) return;
    setSavingImeiPkg(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.put(`/admin/imei-packages/${editingPkg.id}`, {
        duration: editingPkg.duration,
        allowed_speeds: editingPkg.allowed_speeds,
        speed_prices: editingPkg.speed_prices,
        open_hour: editingPkg.open_hour === '' ? null : Number(editingPkg.open_hour),
        close_hour: editingPkg.close_hour === '' ? null : Number(editingPkg.close_hour),
        wholesale_enabled: editingPkg.wholesale_enabled,
        wholesale_min_qty: Number(editingPkg.wholesale_min_qty) || 2,
        wholesale_prices: editingPkg.wholesale_prices || {},
        wholesale_promo_note: editingPkg.wholesale_promo_note || '',
      });

      if (res.data?.status) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        Alert.alert('Berhasil', 'Paket IMEI berhasil diperbarui.');
        setEditingPkg(null);
        loadData();
      } else {
        Alert.alert('Gagal', res.data?.message || 'Gagal menyimpan perubahan.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingImeiPkg(false);
    }
  };

  const handleSaveCeirSettings = async () => {
    setSavingCeir(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const allActive = Array.from(ceirgoDisplayCodes);
      const cekCeir = allActive.filter((c) => !/barcode|create/i.test(c));
      const barcode = allActive.filter((c) => /barcode|create/i.test(c));

      await Promise.all([
        apiClient.put('/admin/ceirgo-display-settings', { cekCeir, barcode }),
        apiClient.post('/admin/ceirgo-pricing', ceirgoPricing),
        apiClient.post('/admin/ceirgo-custom-names', ceirgoCustomNames),
      ]);

      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      Alert.alert('Sukses', 'Pengaturan layanan CEIR & Barcode berhasil disimpan.');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setSavingCeir(false);
    }
  };

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
          <Text style={[styles.navTitle, { color: colors.text }]}>Layanan Add Roamer & CEIR</Text>
          <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>
            Kontrol status, tarif kecepatan, & paket
          </Text>
        </View>
        <Pressable
          style={[styles.refreshBtn, { backgroundColor: colors.surface }]}
          onPress={loadData}
          hitSlop={10}
        >
          <RotateCw size={18} color={colors.primary} />
        </Pressable>
      </View>

      {/* Segmented Tabs */}
      <View style={styles.tabBar}>
        {[
          { key: 'service', label: 'Status & Speed' },
          { key: 'packages', label: `Paket (${imeiPackages.length})` },
          { key: 'ceir', label: 'Server CEIR' },
        ].map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[
                styles.tabItem,
                {
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                setActiveTab(tab.key as any);
              }}
            >
              <Text style={[styles.tabText, { color: active ? '#ffffff' : colors.textMuted }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Memuat data layanan...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'service' && (
            <>
              {/* Operasional Service Status Card */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Status Layanan IMEI</Text>
                    <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                      Buka atau tutup akses pemesanan IMEI secara global
                    </Text>
                  </View>
                  <Pressable
                    style={[
                      styles.statusBadgeBtn,
                      { backgroundColor: imeiServiceOpen ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' },
                    ]}
                    onPress={() => handleSaveImeiServiceStatus(!imeiServiceOpen, imeiServiceNote)}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: imeiServiceOpen ? colors.success : colors.danger },
                      ]}
                    >
                      {imeiServiceOpen ? 'BUKA (Aktif)' : 'TUTUP (Off)'}
                    </Text>
                  </Pressable>
                </View>

                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                  Pemberitahuan Khusus Saat Tutup (Opsional)
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text },
                  ]}
                  placeholder="Contoh: Server Bea Cukai sedang antrean maintenance..."
                  placeholderTextColor={colors.textDim}
                  value={imeiServiceNote}
                  onChangeText={setImeiServiceNote}
                />
                <Pressable
                  style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleSaveImeiServiceStatus(imeiServiceOpen, imeiServiceNote)}
                  disabled={savingStatus}
                >
                  {savingStatus ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Simpan Status Layanan</Text>
                  )}
                </Pressable>
              </View>

              {/* Kecepatan Pengerjaan Card */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.sectionHeader}>
                  <Gauge size={18} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Tarif Kecepatan Pengerjaan</Text>
                </View>
                <Text style={[styles.cardSubtitle, { color: colors.textMuted, marginBottom: 12 }]}>
                  Atur biaya tambahan dan range waktu tier Fast, Semi Fast, dan Slow.
                </Text>

                {SPEED_TIERS.map((tier) => {
                  const statusKey = `imei_speed_${tier.id}_status`;
                  const priceKey = `imei_speed_${tier.id}`;
                  const rangeKey = `imei_speed_${tier.id}_range`;
                  const currentStatus = pricing[statusKey] || 'active';

                  return (
                    <View
                      key={tier.id}
                      style={[
                        styles.tierItem,
                        { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                      ]}
                    >
                      <View style={styles.tierTop}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          {tier.id === 'fast' ? (
                            <Zap size={16} color="#f59e0b" style={{ marginRight: 6 }} />
                          ) : tier.id === 'semi' ? (
                            <Clock size={16} color="#3b82f6" style={{ marginRight: 6 }} />
                          ) : (
                            <Gauge size={16} color="#64748b" style={{ marginRight: 6 }} />
                          )}
                          <Text style={[styles.tierLabel, { color: colors.text }]}>{tier.label}</Text>
                        </View>

                        <Pressable
                          style={[
                            styles.tierStatusPill,
                            {
                              backgroundColor:
                                currentStatus === 'active'
                                  ? 'rgba(16, 185, 129, 0.2)'
                                  : currentStatus === 'maintenance'
                                  ? 'rgba(245, 158, 11, 0.2)'
                                  : 'rgba(100, 116, 139, 0.2)',
                            },
                          ]}
                          onPress={() => cycleSpeedStatus(tier.id)}
                        >
                          <Text
                            style={[
                              styles.tierStatusText,
                              {
                                color:
                                  currentStatus === 'active'
                                    ? colors.success
                                    : currentStatus === 'maintenance'
                                    ? colors.warning
                                    : colors.textDim,
                              },
                            ]}
                          >
                            {currentStatus.toUpperCase()}
                          </Text>
                        </Pressable>
                      </View>

                      <View style={styles.tierInputs}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={[styles.miniLabel, { color: colors.textMuted }]}>Biaya (Rp)</Text>
                          <TextInput
                            style={[
                              styles.miniInput,
                              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                            ]}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={colors.textDim}
                            value={String(pricing[priceKey] ?? '')}
                            onChangeText={(t) => {
                              const updated = { ...pricing, [priceKey]: t };
                              setPricing(updated);
                              autoSavePricing(updated);
                            }}
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={[styles.miniLabel, { color: colors.textMuted }]}>Estimasi Waktu</Text>
                          <TextInput
                            style={[
                              styles.miniInput,
                              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                            ]}
                            placeholder="Cth: 1-3 Jam"
                            placeholderTextColor={colors.textDim}
                            value={String(pricing[rangeKey] ?? '')}
                            onChangeText={(t) => {
                              const updated = { ...pricing, [rangeKey]: t };
                              setPricing(updated);
                              autoSavePricing(updated);
                            }}
                          />
                        </View>
                      </View>
                    </View>
                  );
                })}

                {/* Auto Processing Toggle */}
                <View style={[styles.toggleRow, { borderColor: colors.border }]}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={[styles.toggleTitle, { color: colors.text }]}>Order Langsung Processing</Text>
                    <Text style={[styles.toggleDesc, { color: colors.textMuted }]}>
                      Pesanan Add Roamer langsung masuk status 'processing' tanpa konfirmasi manual.
                    </Text>
                  </View>
                  <Switch
                    value={pricing.imei_auto_processing === 'true'}
                    onValueChange={(val) => {
                      const updated = { ...pricing, imei_auto_processing: val ? 'true' : 'false' };
                      setPricing(updated);
                      autoSavePricing(updated);
                    }}
                    thumbColor="#ffffff"
                    trackColor={{ false: '#334155', true: colors.primary }}
                  />
                </View>
              </View>
            </>
          )}

          {activeTab === 'packages' && (
            <>
              {/* Header with Add Button */}
              <View style={styles.pkgListHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Daftar Durasi Paket</Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                    {imeiPackages.length} paket garansi aktif
                  </Text>
                </View>
                <Pressable
                  style={[styles.addBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setShowAddModal(true)}
                >
                  <Plus size={16} color="#fff" style={{ marginRight: 4 }} />
                  <Text style={styles.addBtnText}>Tambah Paket</Text>
                </Pressable>
              </View>

              {imeiPackages.map((pkg) => {
                const isVisible = pkg.isVisible === 1 || pkg.isVisible === true || pkg.isVisible === undefined;
                let spPrices: any = {};
                if (pkg.speed_prices) {
                  try {
                    spPrices = typeof pkg.speed_prices === 'string' ? JSON.parse(pkg.speed_prices) : pkg.speed_prices;
                  } catch (e) {}
                }

                return (
                  <View
                    key={pkg.id}
                    style={[styles.pkgCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <View style={styles.pkgCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.pkgDuration, { color: colors.text }]}>{pkg.duration}</Text>
                        <Text style={[styles.pkgPrice, { color: colors.primary }]}>
                          Mulai Rp {Number(pkg.price || 0).toLocaleString('id-ID')}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Pressable onPress={() => handleToggleImeiPkg(pkg)} style={{ marginRight: 10 }}>
                          {isVisible ? (
                            <ToggleRight size={28} color={colors.success} />
                          ) : (
                            <ToggleLeft size={28} color={colors.textDim} />
                          )}
                        </Pressable>

                        <Pressable
                          style={[styles.iconActionBtn, { backgroundColor: colors.surfaceElevated }]}
                          onPress={() => {
                            let spObj: any = { fast: '', semi: '', slow: '' };
                            if (pkg.speed_prices) {
                              try {
                                const p = typeof pkg.speed_prices === 'string' ? JSON.parse(pkg.speed_prices) : pkg.speed_prices;
                                if (p) spObj = { fast: String(p.fast || ''), semi: String(p.semi || ''), slow: String(p.slow || '') };
                              } catch (e) {}
                            }
                            setEditingPkg({
                              ...pkg,
                              allowed_speeds: pkg.allowed_speeds ? (typeof pkg.allowed_speeds === 'string' ? JSON.parse(pkg.allowed_speeds) : pkg.allowed_speeds) : ['fast', 'semi', 'slow'],
                              speed_prices: spObj,
                              wholesale_enabled: Boolean(spPrices?.wholesale_enabled),
                              wholesale_min_qty: spPrices?.wholesale_min_qty || 2,
                              wholesale_prices: spPrices?.wholesale_prices || {},
                              wholesale_promo_note: spPrices?.wholesale_promo_note || '',
                              open_hour: pkg.open_hour !== null && pkg.open_hour !== undefined ? String(pkg.open_hour) : '',
                              close_hour: pkg.close_hour !== null && pkg.close_hour !== undefined ? String(pkg.close_hour) : '',
                            });
                          }}
                        >
                          <Edit2 size={16} color={colors.primary} />
                        </Pressable>

                        <Pressable
                          style={[styles.iconActionBtn, { backgroundColor: colors.surfaceElevated, marginLeft: 6 }]}
                          onPress={() => handleDeleteImeiPkg(pkg)}
                        >
                          <Trash2 size={16} color={colors.danger} />
                        </Pressable>
                      </View>
                    </View>

                    {/* Speed Prices Summary */}
                    <View style={styles.speedPillsRow}>
                      {['fast', 'semi', 'slow'].map((s) => {
                        const val = spPrices?.[s];
                        if (!val) return null;
                        return (
                          <View
                            key={s}
                            style={[styles.speedMiniBadge, { backgroundColor: colors.surfaceElevated }]}
                          >
                            <Text style={[styles.speedMiniLabel, { color: colors.textMuted }]}>
                              {s.toUpperCase()}:
                            </Text>
                            <Text style={[styles.speedMiniVal, { color: colors.text }]}>
                              Rp {Number(val).toLocaleString('id-ID')}
                            </Text>
                          </View>
                        );
                      })}
                    </View>

                    {spPrices?.wholesale_enabled && (
                      <View style={[styles.wholesaleBadge, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                        <Tag size={12} color={colors.success} style={{ marginRight: 4 }} />
                        <Text style={[styles.wholesaleText, { color: colors.success }]}>
                          Grosir min {spPrices.wholesale_min_qty || 2} IMEI aktif
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}

          {activeTab === 'ceir' && (
            <>
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.sectionHeader}>
                  <Server size={18} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Layanan Server Pusat CEIR</Text>
                </View>
                <Text style={[styles.cardSubtitle, { color: colors.textMuted, marginBottom: 16 }]}>
                  Atur sakelar visibilitas, nama tampilan kustom, dan tarif jual layanan CEIR & Barcode.
                </Text>

                {ceirgoServices.map((svc) => {
                  const isDisplayed = ceirgoDisplayCodes.has(svc.code);
                  const customName = ceirgoCustomNames[svc.code] || svc.customName || svc.name;
                  const currentPrice = ceirgoPricing[svc.code] ?? svc.modalPrice;

                  return (
                    <View
                      key={svc.code}
                      style={[
                        styles.ceirItem,
                        {
                          backgroundColor: colors.surfaceElevated,
                          borderColor: isDisplayed ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <View style={styles.ceirItemTop}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                          <Text style={[styles.ceirName, { color: colors.text }]}>{customName}</Text>
                          <Text style={[styles.ceirCode, { color: colors.primary }]}>{svc.code}</Text>
                          <Text style={[styles.ceirModal, { color: colors.textMuted }]}>
                            Modal Provider: Rp {Number(svc.modalPrice || 0).toLocaleString('id-ID')}
                          </Text>
                        </View>

                        <Switch
                          value={isDisplayed}
                          onValueChange={(val) => {
                            const newSet = new Set(ceirgoDisplayCodes);
                            if (val) newSet.add(svc.code);
                            else newSet.delete(svc.code);
                            setCeirgoDisplayCodes(newSet);
                          }}
                          thumbColor="#ffffff"
                          trackColor={{ false: '#334155', true: colors.primary }}
                        />
                      </View>

                      {/* Custom Name & Price Inputs */}
                      <View style={{ marginTop: 10 }}>
                        <Text style={[styles.miniLabel, { color: colors.textMuted }]}>Nama Tampilan</Text>
                        <TextInput
                          style={[
                            styles.miniInput,
                            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                          ]}
                          value={customName}
                          onChangeText={(t) =>
                            setCeirgoCustomNames({ ...ceirgoCustomNames, [svc.code]: t })
                          }
                        />

                        <Text style={[styles.miniLabel, { color: colors.textMuted, marginTop: 8 }]}>
                          Harga Jual (Rp)
                        </Text>
                        <TextInput
                          style={[
                            styles.miniInput,
                            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                          ]}
                          keyboardType="numeric"
                          value={String(currentPrice)}
                          onChangeText={(t) =>
                            setCeirgoPricing({ ...ceirgoPricing, [svc.code]: parseInt(t, 10) || 0 })
                          }
                        />
                      </View>
                    </View>
                  );
                })}

                <Pressable
                  style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
                  onPress={handleSaveCeirSettings}
                  disabled={savingCeir}
                >
                  {savingCeir ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Simpan Pengaturan Server Pusat</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* Modal Add Package */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Tambah Paket IMEI Baru</Text>
              <Pressable onPress={() => setShowAddModal(false)} hitSlop={10}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 450 }}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Durasi Paket</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                placeholder="Contoh: 3 Bulan (Masa Aktif Sinyal)"
                placeholderTextColor={colors.textDim}
                value={newImeiPkg.duration}
                onChangeText={(t) => setNewImeiPkg({ ...newImeiPkg, duration: t })}
              />

              <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 12 }]}>Harga Tiap Kecepatan (Rp)</Text>
              {['fast', 'semi', 'slow'].map((sp) => (
                <View key={sp} style={{ marginBottom: 8 }}>
                  <Text style={[styles.miniLabel, { color: colors.textMuted }]}>{sp.toUpperCase()}</Text>
                  <TextInput
                    style={[styles.miniInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                    placeholder="Contoh: 150000"
                    placeholderTextColor={colors.textDim}
                    keyboardType="numeric"
                    value={newImeiPkg.speed_prices[sp as 'fast' | 'semi' | 'slow']}
                    onChangeText={(t) =>
                      setNewImeiPkg({
                        ...newImeiPkg,
                        speed_prices: { ...newImeiPkg.speed_prices, [sp]: t },
                      })
                    }
                  />
                </View>
              ))}

              <View style={[styles.toggleRow, { borderColor: colors.border, marginVertical: 12 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleTitle, { color: colors.text }]}>Harga Grosir Multi-IMEI</Text>
                  <Text style={[styles.toggleDesc, { color: colors.textMuted }]}>Diskon otomatis pemesanan &ge; 2 IMEI</Text>
                </View>
                <Switch
                  value={newImeiPkg.wholesale_enabled}
                  onValueChange={(val) => setNewImeiPkg({ ...newImeiPkg, wholesale_enabled: val })}
                  thumbColor="#ffffff"
                  trackColor={{ false: '#334155', true: colors.primary }}
                />
              </View>

              {newImeiPkg.wholesale_enabled && (
                <View style={{ padding: 12, backgroundColor: colors.surfaceElevated, borderRadius: 12, marginBottom: 12 }}>
                  <Text style={[styles.miniLabel, { color: colors.textMuted }]}>Harga Grosir Satuan Fast (Rp)</Text>
                  <TextInput
                    style={[styles.miniInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, marginBottom: 8 }]}
                    placeholder="Contoh: 130000"
                    placeholderTextColor={colors.textDim}
                    keyboardType="numeric"
                    value={newImeiPkg.wholesale_prices.fast}
                    onChangeText={(t) =>
                      setNewImeiPkg({
                        ...newImeiPkg,
                        wholesale_prices: { ...newImeiPkg.wholesale_prices, fast: t },
                      })
                    }
                  />
                  <Text style={[styles.miniLabel, { color: colors.textMuted }]}>Catatan Promo</Text>
                  <TextInput
                    style={[styles.miniInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    placeholder="Cth: Hemat Rp 20.000 / IMEI"
                    placeholderTextColor={colors.textDim}
                    value={newImeiPkg.wholesale_promo_note}
                    onChangeText={(t) => setNewImeiPkg({ ...newImeiPkg, wholesale_promo_note: t })}
                  />
                </View>
              )}
            </ScrollView>

            <Pressable
              style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
              onPress={handleCreateImeiPkg}
              disabled={savingImeiPkg}
            >
              {savingImeiPkg ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Simpan Paket Baru</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal Edit Package */}
      {editingPkg && (
        <Modal visible={!!editingPkg} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Paket IMEI</Text>
                <Pressable onPress={() => setEditingPkg(null)} hitSlop={10}>
                  <X size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 450 }}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Durasi Paket</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                  value={editingPkg.duration}
                  onChangeText={(t) => setEditingPkg({ ...editingPkg, duration: t })}
                />

                <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 12 }]}>Tarif Kecepatan (Rp)</Text>
                {['fast', 'semi', 'slow'].map((sp) => (
                  <View key={sp} style={{ marginBottom: 8 }}>
                    <Text style={[styles.miniLabel, { color: colors.textMuted }]}>{sp.toUpperCase()}</Text>
                    <TextInput
                      style={[styles.miniInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                      keyboardType="numeric"
                      value={editingPkg.speed_prices?.[sp] || ''}
                      onChangeText={(t) =>
                        setEditingPkg({
                          ...editingPkg,
                          speed_prices: { ...editingPkg.speed_prices, [sp]: t },
                        })
                      }
                    />
                  </View>
                ))}
              </ScrollView>

              <Pressable
                style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
                onPress={handleSaveEditingPkg}
                disabled={savingImeiPkg}
              >
                {savingImeiPkg ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Simpan Perubahan</Text>
                )}
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
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
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    marginTop: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  statusBadgeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 12,
  },
  saveBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  tierItem: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  tierTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tierLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  tierStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tierStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  tierInputs: {
    flexDirection: 'row',
  },
  miniLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  miniInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  toggleDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  pkgListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  pkgCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  pkgCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pkgDuration: {
    fontSize: 14,
    fontWeight: '800',
  },
  pkgPrice: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  iconActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  speedMiniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  speedMiniLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  speedMiniVal: {
    fontSize: 10,
    fontWeight: '800',
  },
  wholesaleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  wholesaleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  ceirItem: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  ceirItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ceirName: {
    fontSize: 13,
    fontWeight: '800',
  },
  ceirCode: {
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  ceirModal: {
    fontSize: 11,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
});
