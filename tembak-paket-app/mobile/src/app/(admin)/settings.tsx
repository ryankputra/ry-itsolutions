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
  Modal,
  Switch,
  Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Settings,
  RotateCw,
  MessageSquare,
  QrCode,
  Server,
  Database,
  ShieldCheck,
  Terminal,
  Download,
  Send,
  Power,
  CreditCard,
  Layers,
  X,
  AlertTriangle,
  Activity,
  Key,
  Check,
  Smartphone,
  CheckCircle2,
  HelpCircle,
  Clock,
  Zap,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';

export default function AdminSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors.dark;

  // Active section tab
  const [activeTab, setActiveTab] = useState<'wa' | 'payment' | 'providers' | 'system'>('wa');

  // Baileys WhatsApp State
  const [baileysStatus, setBaileysStatus] = useState<any>({
    isConnected: false,
    state: 'disconnected',
    connectedPhone: null,
    qrCode: null,
  });
  const [loadingBaileys, setLoadingBaileys] = useState(false);
  const [showTestWaModal, setShowTestWaModal] = useState(false);
  const [testWaPhone, setTestWaPhone] = useState('');
  const [sendingTestWa, setSendingTestWa] = useState(false);

  // External WhatsApp Gateway (Fonnte)
  const [waToken, setWaToken] = useState('');
  const [waUrl, setWaUrl] = useState('https://api.fonnte.com/send');
  const [waAutoSend, setWaAutoSend] = useState(true);
  const [savingWhatsApp, setSavingWhatsApp] = useState(false);

  // Payment Gateway
  const [paymentGateway, setPaymentGateway] = useState<'orkut' | 'gopay'>('orkut');
  const [savingGateway, setSavingGateway] = useState(false);

  // Dual Gateway Rotator
  const [dualMode, setDualMode] = useState<string>('rotate');
  const [rotateStart, setRotateStart] = useState<string>('gopay');
  const [paymentCounter, setPaymentCounter] = useState<number>(0);
  const [shoppepayUrl, setShoppepayUrl] = useState<string>('http://127.0.0.1:3003');
  const [savingDual, setSavingDual] = useState<boolean>(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [testingHealth, setTestingHealth] = useState<boolean>(false);

  // ShopeePay Merchant State
  const [inputShopeeToken, setInputShopeeToken] = useState('');
  const [inputShopeeQris, setInputShopeeQris] = useState('');
  const [savingShopee, setSavingShopee] = useState(false);

  // GoPay Merchant State
  const [gopayPhone, setGopayPhone] = useState('082342392781');
  const [gopayOtp, setGopayOtp] = useState('');
  const [gopayOtpSent, setGopayOtpSent] = useState(false);
  const [requestingGopayOtp, setRequestingGopayOtp] = useState(false);
  const [verifyingGopayOtp, setVerifyingGopayOtp] = useState(false);

  // Provider Balances
  const [providerBalances, setProviderBalances] = useState<{ kmsp: number | null; ceirgo: number | null }>({
    kmsp: null,
    ceirgo: null,
  });
  const [ceirgoConnected, setCeirgoConnected] = useState(false);
  const [refreshingBalances, setRefreshingBalances] = useState(false);

  // Top Up Modal Server Pusat
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [depositProviders, setDepositProviders] = useState<any[]>([]);
  const [depositProviderCode, setDepositProviderCode] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupPaymentData, setTopupPaymentData] = useState<any>(null);

  // Announcements & Menus
  const [announcement, setAnnouncement] = useState('');
  const [savingAnn, setSavingAnn] = useState(false);
  const [showBeliPaket, setShowBeliPaket] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [savingMenu, setSavingMenu] = useState(false);

  // Auto Deploy Console Modal
  const [showDeployConsole, setShowDeployConsole] = useState(false);
  const [deployLogs, setDeployLogs] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);

  // 1. Load Baileys Status
  const loadBaileysStatus = async () => {
    try {
      const res = await apiClient.get('/admin/baileys/status');
      if (res.data?.status) {
        const payload = res.data.data || res.data;
        const isConn = Boolean(payload.isConnected || payload.connected || payload.state === 'open');
        setBaileysStatus((prev: any) => ({
          ...payload,
          isConnected: isConn,
          connected: isConn,
          qrCode: isConn ? null : payload.qrCode || prev.qrCode,
        }));
        return isConn;
      }
    } catch (e) {
      // ignore
    }
    return false;
  };

  const handleInitBaileys = async (forceNew = false) => {
    setLoadingBaileys(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await apiClient.post('/admin/baileys/init', { forceNew });
      const initialConnected = await loadBaileysStatus();
      if (initialConnected) {
        setLoadingBaileys(false);
        return;
      }

      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        const connected = await loadBaileysStatus();
        if (connected || attempts >= 15) {
          clearInterval(interval);
          setLoadingBaileys(false);
        }
      }, 1500);
    } catch (e) {
      setLoadingBaileys(false);
      Alert.alert('Error', 'Gagal inisialisasi Baileys WhatsApp bot.');
    }
  };

  const handleLogoutBaileys = () => {
    Alert.alert(
      'Putus Koneksi WhatsApp?',
      'WhatsApp Bot toko akan logout dari server.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Putus',
          style: 'destructive',
          onPress: async () => {
            setLoadingBaileys(true);
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              const res = await apiClient.post('/admin/baileys/logout');
              if (res.data?.status || res.data?.success) {
                setBaileysStatus({ isConnected: false, connected: false, state: 'disconnected', connectedPhone: null, qrCode: null });
                Alert.alert('Terputus', 'WhatsApp bot telah logout.');
                await loadBaileysStatus();
              } else {
                Alert.alert('Gagal', res.data?.message || 'Gagal logout WhatsApp.');
              }
            } catch (e) {
              Alert.alert('Error', 'Gagal menghubungi server.');
            } finally {
              setLoadingBaileys(false);
            }
          },
        },
      ]
    );
  };

  const handleSendTestWa = async () => {
    if (!testWaPhone.trim() || testWaPhone.replace(/\D/g, '').length < 9) {
      Alert.alert('Nomor Tidak Valid', 'Masukkan nomor WhatsApp tujuan minimal 9 digit.');
      return;
    }

    setSendingTestWa(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await apiClient.post('/admin/baileys/test', { targetPhone: testWaPhone });
      if (res.data?.status) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        setShowTestWaModal(false);
        Alert.alert('Berhasil! 🎉', res.data.message || 'Pesan tes berhasil dikirim.');
      } else {
        Alert.alert('Gagal', res.data?.message || 'Gagal mengirim pesan tes.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Kesalahan jaringan.');
    } finally {
      setSendingTestWa(false);
    }
  };

  // 2. Load Balances
  const loadBalances = async () => {
    setRefreshingBalances(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const [ceirRes, kmspRes] = await Promise.all([
        apiClient.get('/admin/ceirgo-balance').catch(() => null),
        apiClient.get('/admin/kmsp-balance').catch(() => null),
      ]);

      if (ceirRes?.data) {
        const b = ceirRes.data.ceirgoBalance ?? ceirRes.data.balance ?? ceirRes.data.data?.balance;
        if (b != null && !isNaN(Number(b))) {
          setProviderBalances((prev) => ({ ...prev, ceirgo: Number(b) }));
        }
        setCeirgoConnected(Boolean(ceirRes.data.connected ?? ceirRes.data.status ?? false));
      }

      if (kmspRes?.data) {
        const bal = kmspRes.data.kmspBalance ?? kmspRes.data.balance ?? kmspRes.data.data?.balance;
        if (bal != null && !isNaN(Number(bal))) {
          setProviderBalances((prev) => ({ ...prev, kmsp: Number(bal) }));
        }
      }
    } finally {
      setRefreshingBalances(false);
    }
  };

  // 3. Load Initial Settings
  useEffect(() => {
    loadBaileysStatus();
    loadBalances();

    // WhatsApp settings
    apiClient.get('/admin/whatsapp-settings').then((res) => {
      if (res.data?.status && res.data.data) {
        setWaToken(res.data.data.token || '');
        setWaUrl(res.data.data.url || 'https://api.fonnte.com/send');
        setWaAutoSend(res.data.data.autoSend ?? true);
      }
    }).catch(() => {});

    // Payment gateway active
    apiClient.get('/admin/payment-gateway').then((res) => {
      if (res.data?.status && res.data.gateway) {
        setPaymentGateway(res.data.gateway);
      }
    }).catch(() => {});

    // Dual gateway
    apiClient.get('/admin/dual-gateway').then((res) => {
      if (res.data?.status) {
        setDualMode(res.data.mode || 'rotate');
        setRotateStart(res.data.rotate_start || 'gopay');
        setPaymentCounter(res.data.counter ?? 0);
        setShoppepayUrl(res.data.shoppepay_url || 'http://127.0.0.1:3003');
      }
    }).catch(() => {});

    // Announcement
    apiClient.get('/admin/announcement').then((res) => {
      if (res.data?.status && res.data.data) {
        setAnnouncement(res.data.data.message || '');
      }
    }).catch(() => {});

    // Menu settings & Maintenance
    apiClient.get('/admin/menu-settings').then((res) => {
      if (res.data?.status && res.data.data) {
        setShowBeliPaket(Boolean(res.data.data.showBeliPaket));
      }
    }).catch(() => {});

    apiClient.get('/admin/maintenance-status').then((res) => {
      if (res.data?.status) {
        setMaintenanceMode(Boolean(res.data.maintenanceMode));
      }
    }).catch(() => {});

    // Ceirgo deposit providers
    apiClient.get('/admin/ceirgo-deposit-providers').then((res) => {
      if (res.data?.status && Array.isArray(res.data.data)) {
        setDepositProviders(res.data.data);
      }
    }).catch(() => {});
  }, []);

  const checkGatewayHealth = async () => {
    setTestingHealth(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await apiClient.get('/admin/dual-gateway/health');
      if (res.data?.status && res.data.data) {
        setHealthData(res.data.data);
        Alert.alert('Cek Kesehatan Gateway', 'Pemeriksaan status koneksi gateway selesai.');
      }
    } catch (e) {
      Alert.alert('Gagal', 'Tidak dapat memeriksa gateway health.');
    } finally {
      setTestingHealth(false);
    }
  };

  const handleSavePaymentGateway = async () => {
    setSavingGateway(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.put('/admin/payment-gateway', { gateway: paymentGateway });
      if (res.data?.status) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        Alert.alert('Berhasil', res.data.message || 'Payment gateway aktif disimpan.');
      } else {
        Alert.alert('Gagal', res.data?.message || 'Gagal menyimpan gateway.');
      }
    } catch (e) {
      Alert.alert('Error', 'Kesalahan jaringan.');
    } finally {
      setSavingGateway(false);
    }
  };

  const handleSaveDualGateway = async () => {
    setSavingDual(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.put('/admin/dual-gateway', {
        mode: dualMode,
        rotate_start: rotateStart,
        shoppepay_url: shoppepayUrl,
      });
      if (res.data?.status) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        Alert.alert('Berhasil', 'Konfigurasi Dual Gateway Rotator berhasil disimpan.');
      } else {
        Alert.alert('Gagal', res.data?.message || 'Gagal menyimpan dual gateway.');
      }
    } catch (e) {
      Alert.alert('Error', 'Kesalahan jaringan.');
    } finally {
      setSavingDual(false);
    }
  };

  const handleSaveWhatsAppSettings = async () => {
    setSavingWhatsApp(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.put('/admin/whatsapp-settings', {
        token: waToken,
        url: waUrl,
        autoSend: waAutoSend,
      });
      if (res.data?.status) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        Alert.alert('Berhasil', 'Pengaturan WhatsApp Gateway Eksternal berhasil disimpan.');
      } else {
        Alert.alert('Gagal', res.data?.message || 'Gagal menyimpan pengaturan WhatsApp.');
      }
    } catch (e) {
      Alert.alert('Error', 'Kesalahan jaringan.');
    } finally {
      setSavingWhatsApp(false);
    }
  };

  const handleSaveAnnouncement = async () => {
    setSavingAnn(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.post('/admin/announcement', {
        message: announcement,
        isEnabled: true,
      });
      if (res.data?.status) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        Alert.alert('Berhasil', 'Pengumuman banner dashboard berhasil disimpan.');
      } else {
        Alert.alert('Gagal', 'Gagal menyimpan pengumuman.');
      }
    } catch (e) {
      Alert.alert('Error', 'Kesalahan jaringan.');
    } finally {
      setSavingAnn(false);
    }
  };

  const handleSaveMenuSettings = async () => {
    setSavingMenu(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.put('/admin/menu-settings', { showBeliPaket });
      if (res.data?.status) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        Alert.alert('Berhasil', 'Pengaturan visibilitas menu sidebar berhasil disimpan.');
      } else {
        Alert.alert('Gagal', 'Gagal menyimpan menu settings.');
      }
    } catch (e) {
      Alert.alert('Error', 'Kesalahan jaringan.');
    } finally {
      setSavingMenu(false);
    }
  };

  const handleToggleMaintenance = async (val: boolean) => {
    setMaintenanceMode(val);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const res = await apiClient.put('/admin/maintenance-status', { maintenanceMode: val });
      if (res.data?.status) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        Alert.alert('Status Maintenance Diubah', res.data.message || (val ? 'Mode Maintenance Aktif.' : 'Akses Publik Dibuka.'));
      }
    } catch (e) {
      setMaintenanceMode(!val);
      Alert.alert('Error', 'Gagal memperbarui status maintenance.');
    }
  };

  const startDeploy = async () => {
    Alert.alert(
      'Mulai Auto Deploy?',
      'Server akan menarik commit terbaru dari GitHub dan restart PM2 secara instan.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Jalankan Deploy',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              const res = await apiClient.post('/admin/deploy');
              if (res.data?.status) {
                setShowDeployConsole(true);
                setIsDeploying(true);
                setDeployLogs('Menghubungi server dan menyiapkan proses deploy...\n');

                const interval = setInterval(async () => {
                  try {
                    const statusRes = await apiClient.get('/admin/deploy-status');
                    if (statusRes.data?.status && statusRes.data?.log) {
                      setDeployLogs(statusRes.data.log);
                      if (statusRes.data.log.includes('SELESAI DENGAN KODE')) {
                        clearInterval(interval);
                        setIsDeploying(false);
                      }
                    }
                  } catch (err) {
                    setDeployLogs((prev) => prev + '\n[SISTEM] Server sedang proses pembaruan. Menunggu koneksi...\n');
                    clearInterval(interval);
                    setIsDeploying(false);
                  }
                }, 2000);
              } else {
                Alert.alert('Gagal', res.data?.message || 'Gagal memulai auto deploy.');
              }
            } catch (err) {
              Alert.alert('Error', 'Gagal menghubungi server deploy.');
            }
          },
        },
      ]
    );
  };

  const handleCeirgoTopup = async () => {
    const amountNum = parseInt(depositAmount, 10);
    if (isNaN(amountNum) || amountNum < 10000) {
      Alert.alert('Perhatian', 'Minimal deposit Rp 10.000.');
      return;
    }
    if (!depositProviderCode) {
      Alert.alert('Perhatian', 'Pilih provider pembayaran.');
      return;
    }

    setTopupLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.post('/admin/ceirgo-topup', {
        amount: amountNum,
        provider_code: depositProviderCode,
      });

      if (res.data?.status && res.data.data) {
        setTopupPaymentData(res.data.data);
        loadBalances();
      } else {
        Alert.alert('Gagal', res.data?.message || 'Gagal membuat tagihan top up.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Gagal memproses top up pusat.');
    } finally {
      setTopupLoading(false);
    }
  };

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
          <Text style={[styles.navTitle, { color: colors.text }]}>Pengaturan & Server</Text>
          <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>
            WhatsApp Bot, Gateway, Saldo & Auto-Deploy
          </Text>
        </View>
        <Pressable
          style={[styles.refreshBtn, { backgroundColor: colors.surface }]}
          onPress={() => {
            loadBaileysStatus();
            loadBalances();
          }}
        >
          <RotateCw size={18} color={colors.primary} />
        </Pressable>
      </View>

      {/* Segmented Category Filter Tabs */}
      <View style={styles.segmentContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentScroll}>
          {[
            { id: 'wa', label: 'WhatsApp Bot', icon: MessageSquare },
            { id: 'payment', label: 'Payment Gateway', icon: CreditCard },
            { id: 'providers', label: 'Saldo Modal', icon: Server },
            { id: 'system', label: 'Sistem & Deploy', icon: Terminal },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[
                  styles.tabChip,
                  active
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => {
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                  setActiveTab(tab.id as any);
                }}
              >
                <Icon size={14} color={active ? '#fff' : colors.textMuted} />
                <Text style={[styles.tabChipText, { color: active ? '#fff' : colors.text }]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================================== */}
        {/* TAB 1: WHATSAPP BOT & GATEWAY */}
        {/* ============================================================== */}
        {activeTab === 'wa' && (
          <View style={styles.tabSection}>
            {/* WhatsApp Bot Toko (Baileys Engine) */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: '#10b98133' }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowAlign}>
                    <MessageSquare size={18} color="#10b981" />
                    <Text style={[styles.cardTitle, { color: colors.text, marginLeft: 8 }]}>
                      WhatsApp Bot Toko (Baileys)
                    </Text>
                  </View>
                  <Text style={[styles.cardDesc, { color: colors.textMuted }]}>
                    Kirim nota & update pesanan otomatis via nomor resmi toko.
                  </Text>
                </View>

                {baileysStatus.isConnected ? (
                  <View style={[styles.statusBadge, { backgroundColor: '#10b98122', borderColor: '#10b981' }]}>
                    <View style={styles.pulseDot} />
                    <Text style={[styles.statusText, { color: '#10b981' }]}>
                      +{baileysStatus.connectedPhone}
                    </Text>
                  </View>
                ) : baileysStatus.qrCode ? (
                  <View style={[styles.statusBadge, { backgroundColor: '#f59e0b22', borderColor: '#f59e0b' }]}>
                    <Text style={[styles.statusText, { color: '#f59e0b' }]}>Scan QR</Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, { backgroundColor: '#64748b22', borderColor: '#64748b' }]}>
                    <Text style={[styles.statusText, { color: '#94a3b8' }]}>Belum Login</Text>
                  </View>
                )}
              </View>

              {/* Bot State Area */}
              {baileysStatus.isConnected ? (
                <View style={[styles.connectedBox, { backgroundColor: '#10b98115', borderColor: '#10b98133' }]}>
                  <Text style={[styles.boxTitle, { color: '#10b981' }]}>
                    WhatsApp Bot Aktif (+{baileysStatus.connectedPhone})
                  </Text>
                  <Text style={[styles.boxDesc, { color: colors.textMuted }]}>
                    Nota transaksi dan notifikasi otomatis diteruskan secara langsung ke nomor pelanggan.
                  </Text>

                  <View style={styles.actionBtnRow}>
                    <Pressable
                      style={[styles.primaryActionBtn, { backgroundColor: '#10b981' }]}
                      onPress={() => setShowTestWaModal(true)}
                    >
                      <Send size={14} color="#fff" />
                      <Text style={styles.primaryActionBtnText}>Tes Kirim Pesan</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.dangerActionBtn, { backgroundColor: '#ef444422', borderColor: '#ef4444' }]}
                      onPress={handleLogoutBaileys}
                    >
                      <Power size={14} color="#ef4444" />
                      <Text style={[styles.dangerActionBtnText, { color: '#ef4444' }]}>Putus Koneksi</Text>
                    </Pressable>
                  </View>
                </View>
              ) : baileysStatus.qrCode ? (
                <View style={[styles.qrContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                  <Text style={[styles.qrHeading, { color: colors.text }]}>Pindai QR dengan WhatsApp</Text>
                  <Text style={[styles.qrSub, { color: colors.textMuted }]}>
                    Buka WhatsApp &gt; Perangkat Tertaut &gt; Tautkan Perangkat
                  </Text>

                  <View style={styles.qrWrapper}>
                    <Image
                      source={{ uri: baileysStatus.qrCode }}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                  </View>

                  <View style={styles.rowGap}>
                    <Pressable
                      style={[styles.smallBtn, { backgroundColor: colors.primary }]}
                      onPress={() => handleInitBaileys(true)}
                    >
                      <Text style={styles.smallBtnText}>Buat QR Baru</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.smallBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                      onPress={loadBaileysStatus}
                    >
                      <Text style={[styles.smallBtnText, { color: colors.text }]}>Cek Status</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={[styles.promptBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.promptTitle, { color: colors.text }]}>Engine WhatsApp Siap</Text>
                    <Text style={[styles.promptDesc, { color: colors.textMuted }]}>
                      Tekan tombol untuk menghasilkan kode QR login WhatsApp.
                    </Text>
                  </View>
                  <Pressable
                    style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleInitBaileys(false)}
                    disabled={loadingBaileys}
                  >
                    {loadingBaileys ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.primaryActionBtnText}>Tautkan WhatsApp</Text>
                    )}
                  </Pressable>
                </View>
              )}
            </View>

            {/* External WhatsApp Gateway (Fonnte API) */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>WhatsApp Gateway Eksternal (Fonnte)</Text>
                  <Text style={[styles.cardDesc, { color: colors.textMuted }]}>
                    Cadangan API pihak ketiga untuk auto-send nota PDF & teks.
                  </Text>
                </View>
              </View>

              <Text style={[styles.inputLabel, { color: colors.text }]}>API Token Fonnte</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                value={waToken}
                onChangeText={setWaToken}
                placeholder="Masukkan API Token Fonnte"
                placeholderTextColor={colors.textDim}
                secureTextEntry
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Endpoint URL</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                value={waUrl}
                onChangeText={setWaUrl}
                placeholder="https://api.fonnte.com/send"
                placeholderTextColor={colors.textDim}
              />

              <View style={[styles.switchRow, { borderTopColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchTitle, { color: colors.text }]}>Auto-Send Nota Transaksi</Text>
                  <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                    Kirim pesan konfirmasi otomatis setelah transaksi sukses.
                  </Text>
                </View>
                <Switch
                  value={waAutoSend}
                  onValueChange={setWaAutoSend}
                  trackColor={{ false: '#334155', true: colors.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <Pressable
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveWhatsAppSettings}
                disabled={savingWhatsApp}
              >
                {savingWhatsApp ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Simpan Pengaturan Gateway WA</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* ============================================================== */}
        {/* TAB 2: PAYMENT GATEWAY & DUAL ROTATOR */}
        {/* ============================================================== */}
        {activeTab === 'payment' && (
          <View style={styles.tabSection}>
            {/* Primary Gateway Selector */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Payment Gateway Aktif (Deposit)</Text>
              <Text style={[styles.cardDesc, { color: colors.textMuted }]}>
                Pilih sistem QRIS otomatis yang aktif untuk melayani deposit saldo.
              </Text>

              <View style={styles.gatewayGrid}>
                <Pressable
                  style={[
                    styles.gatewayCard,
                    paymentGateway === 'orkut'
                      ? { borderColor: colors.primary, backgroundColor: colors.primary + '15' }
                      : { borderColor: colors.border, backgroundColor: colors.surfaceElevated },
                  ]}
                  onPress={() => setPaymentGateway('orkut')}
                >
                  <View style={styles.rowSpace}>
                    <Text style={[styles.gatewayCardTitle, { color: colors.text }]}>Nobu / Orkut</Text>
                    {paymentGateway === 'orkut' && <CheckCircle2 size={16} color={colors.primary} />}
                  </View>
                  <Text style={[styles.gatewayCardDesc, { color: colors.textMuted }]}>
                    Merchant: RYYSTORE OK2285905
                  </Text>
                  <Text style={[styles.gatewayBadge, { color: '#10b981' }]}>Polling Mutasi Otomatis</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.gatewayCard,
                    paymentGateway === 'gopay'
                      ? { borderColor: colors.primary, backgroundColor: colors.primary + '15' }
                      : { borderColor: colors.border, backgroundColor: colors.surfaceElevated },
                  ]}
                  onPress={() => setPaymentGateway('gopay')}
                >
                  <View style={styles.rowSpace}>
                    <Text style={[styles.gatewayCardTitle, { color: colors.text }]}>GoPay Direct Gateway</Text>
                    {paymentGateway === 'gopay' && <CheckCircle2 size={16} color={colors.primary} />}
                  </View>
                  <Text style={[styles.gatewayCardDesc, { color: colors.textMuted }]}>
                    Merchant: RyyStore IT Solutions
                  </Text>
                  <Text style={[styles.gatewayBadge, { color: '#3b82f6' }]}>Port 3002 / Dynamic QRIS</Text>
                </Pressable>
              </View>

              <Pressable
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSavePaymentGateway}
                disabled={savingGateway}
              >
                {savingGateway ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Simpan Gateway Aktif</Text>
                )}
              </Pressable>
            </View>

            {/* Dual Gateway Rotator Card */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: '#3b82f644' }]}>
              <View style={styles.rowSpace}>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Dual Gateway Rotator</Text>
                  <Text style={[styles.cardDesc, { color: colors.textMuted }]}>
                    Sistem rotasi cerdas antara GoPay Direct & ShopeePay QRIS.
                  </Text>
                </View>
                <Pressable
                  style={[styles.smallBtn, { backgroundColor: '#3b82f6', height: 32 }]}
                  onPress={checkGatewayHealth}
                  disabled={testingHealth}
                >
                  {testingHealth ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.smallBtnText}>Cek Health</Text>
                  )}
                </Pressable>
              </View>

              {/* Mode Selection */}
              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 12 }]}>Mode Rotasi</Text>
              <View style={styles.rowWrap}>
                {[
                  { id: 'rotate', label: 'Rotasi Bergantian (50:50)' },
                  { id: 'failover', label: 'Failover Otomatis' },
                  { id: 'gopay_only', label: 'Hanya GoPay' },
                  { id: 'shoppepay_only', label: 'Hanya ShopeePay' },
                ].map((m) => (
                  <Pressable
                    key={m.id}
                    style={[
                      styles.modePill,
                      dualMode === m.id
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                    ]}
                    onPress={() => setDualMode(m.id)}
                  >
                    <Text style={[styles.modePillText, { color: dualMode === m.id ? '#fff' : colors.text }]}>
                      {m.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={[styles.metaRow, { borderColor: colors.border }]}>
                <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Total Rotasi Terproses:</Text>
                <Text style={[styles.metaVal, { color: colors.primary }]}>{paymentCounter} transaksi</Text>
              </View>

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 8 }]}>ShopeePay Gateway URL</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                value={shoppepayUrl}
                onChangeText={setShoppepayUrl}
                placeholder="http://127.0.0.1:3003"
                placeholderTextColor={colors.textDim}
              />

              <Pressable
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveDualGateway}
                disabled={savingDual}
              >
                {savingDual ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Simpan Pengaturan Dual Rotator</Text>
                )}
              </Pressable>
            </View>

            {/* ShopeePay Merchant QRIS Static Payload */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>ShopeePay Merchant QRIS</Text>
              <Text style={[styles.cardDesc, { color: colors.textMuted }]}>
                Update auth token dan payload string QRIS statis ShopeePay.
              </Text>

              <Text style={[styles.inputLabel, { color: colors.text }]}>Token Auth ShopeePay</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                value={inputShopeeToken}
                onChangeText={setInputShopeeToken}
                placeholder="Masukkan token sesi ShopeePay"
                placeholderTextColor={colors.textDim}
                secureTextEntry
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>String QRIS Statis ShopeePay</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                value={inputShopeeQris}
                onChangeText={setInputShopeeQris}
                multiline
                placeholder="00020101021126670016ID.CO.SHOPEE.WWW..."
                placeholderTextColor={colors.textDim}
              />

              <Pressable
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  if (!inputShopeeToken && !inputShopeeQris) {
                    Alert.alert('Perhatian', 'Isi token atau string QRIS.');
                    return;
                  }
                  setSavingShopee(true);
                  try {
                    const res = await apiClient.post('/admin/shoppepay/update-token', {
                      shoppepayToken: inputShopeeToken,
                      qrisStatic: inputShopeeQris,
                    });
                    if (res.data?.status) {
                      Alert.alert('Berhasil', 'ShopeePay berhasil diperbarui.');
                      setInputShopeeToken('');
                    } else {
                      Alert.alert('Gagal', res.data?.message || 'Gagal update ShopeePay.');
                    }
                  } catch (e) {
                    Alert.alert('Error', 'Kesalahan koneksi.');
                  } finally {
                    setSavingShopee(false);
                  }
                }}
                disabled={savingShopee}
              >
                {savingShopee ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Perbarui ShopeePay Merchant</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* ============================================================== */}
        {/* TAB 3: SALDO MODAL PROVIDER */}
        {/* ============================================================== */}
        {activeTab === 'providers' && (
          <View style={styles.tabSection}>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.rowSpace}>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Saldo Modal Provider Server</Text>
                  <Text style={[styles.cardDesc, { color: colors.textMuted }]}>
                    Pantau sisa deposit server penyedia layanan kuota dan CEIR.
                  </Text>
                </View>
                <Pressable
                  style={[styles.smallBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }]}
                  onPress={loadBalances}
                >
                  <RotateCw size={14} color={colors.text} />
                </Pressable>
              </View>

              {/* Provider 1: KMSP Store */}
              <View style={[styles.providerTile, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <View>
                  <Text style={[styles.providerName, { color: colors.text }]}>KMSP Store (Paket Kuota)</Text>
                  <Text style={[styles.providerDesc, { color: colors.textMuted }]}>Penyedia paket data internet & voucher</Text>
                </View>
                <Text style={[styles.balanceNumber, { color: colors.primary }]}>
                  Rp {providerBalances.kmsp != null ? Number(providerBalances.kmsp).toLocaleString('id-ID') : '...'}
                </Text>
              </View>

              {/* Provider 2: Server Pusat CEIR */}
              <View style={[styles.providerTile, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowAlign}>
                    <Text style={[styles.providerName, { color: colors.text }]}>Server Pusat (CEIR / IMEI)</Text>
                    <View
                      style={[
                        styles.miniBadge,
                        { backgroundColor: ceirgoConnected ? '#10b98122' : '#ef444422' },
                      ]}
                    >
                      <Text style={[styles.miniBadgeText, { color: ceirgoConnected ? '#10b981' : '#ef4444' }]}>
                        {ceirgoConnected ? 'Terkoneksi' : 'Terputus'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.balanceNumber, { color: colors.primary, marginTop: 4 }]}>
                    Rp {Number(providerBalances.ceirgo || 0).toLocaleString('id-ID')}
                  </Text>
                </View>

                <Pressable
                  style={[styles.smallBtn, { backgroundColor: colors.primary, height: 36, paddingHorizontal: 14 }]}
                  onPress={() => setShowTopUpModal(true)}
                >
                  <Text style={styles.smallBtnText}>Isi Saldo</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* ============================================================== */}
        {/* TAB 4: SISTEM, PENGUMUMAN & AUTO DEPLOY */}
        {/* ============================================================== */}
        {activeTab === 'system' && (
          <View style={styles.tabSection}>
            {/* Banner Announcement */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Pengumuman Banner Dashboard</Text>
              <Text style={[styles.cardDesc, { color: colors.textMuted }]}>
                Teks berjalan / alert pengumuman penting di layar pelanggan.
              </Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                value={announcement}
                onChangeText={setAnnouncement}
                placeholder="Masukkan pesan pengumuman untuk seluruh pengguna..."
                placeholderTextColor={colors.textDim}
                multiline
              />
              <Pressable
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveAnnouncement}
                disabled={savingAnn}
              >
                {savingAnn ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Simpan Pengumuman</Text>
                )}
              </Pressable>
            </View>

            {/* Menu Visibility & Maintenance */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Visibilitas Menu & Akses</Text>

              <View style={[styles.switchRow, { borderTopWidth: 0, paddingBottom: 12 }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.switchTitle, { color: colors.text }]}>Menu Suntik Kuota</Text>
                  <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                    Tampilkan menu Suntik Kuota pada katalog dashboard pengguna.
                  </Text>
                </View>
                <Switch
                  value={showBeliPaket}
                  onValueChange={setShowBeliPaket}
                  trackColor={{ false: '#334155', true: colors.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <Pressable
                style={[styles.saveBtn, { backgroundColor: colors.primary, marginBottom: 12 }]}
                onPress={handleSaveMenuSettings}
                disabled={savingMenu}
              >
                {savingMenu ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Simpan Pengaturan Menu</Text>
                )}
              </Pressable>

              <View style={[styles.switchRow, { borderTopColor: colors.border, paddingTop: 14 }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.switchTitle, { color: '#f59e0b' }]}>Mode Pemeliharaan (Maintenance)</Text>
                  <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                    Kunci akses publik umum transaksi aplikasi (hanya admin yang dapat masuk).
                  </Text>
                </View>
                <Switch
                  value={maintenanceMode}
                  onValueChange={handleToggleMaintenance}
                  trackColor={{ false: '#334155', true: '#f59e0b' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* Database & Auto-Deploy */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Database & Pembaruan Sistem</Text>
              <Text style={[styles.cardDesc, { color: colors.textMuted }]}>
                Backup database atau deploy commit terbaru dari repository GitHub.
              </Text>

              <View style={styles.actionBtnRow}>
                <Pressable
                  style={[styles.secondaryActionBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                  onPress={() => {
                    Alert.alert(
                      'Unduh Database Backup',
                      'URL backup database: /api/admin/backup-database.\nSilakan buka via browser browser admin untuk mengunduh berkas .sqlite.',
                      [
                        { text: 'Salin URL', onPress: () => Clipboard.setStringAsync('https://ry-itsolutionts.web.id/api/admin/backup-database') },
                        { text: 'Tutup', style: 'cancel' },
                      ]
                    );
                  }}
                >
                  <Download size={14} color={colors.text} />
                  <Text style={[styles.secondaryActionBtnText, { color: colors.text }]}>Backup DB (.sqlite)</Text>
                </Pressable>

                <Pressable
                  style={[styles.primaryActionBtn, { backgroundColor: '#2563eb' }]}
                  onPress={startDeploy}
                >
                  <Terminal size={14} color="#fff" />
                  <Text style={styles.primaryActionBtnText}>Auto-Deploy PM2</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ============================================================== */}
      {/* MODAL: TES WHATSAPP */}
      {/* ============================================================== */}
      <Modal visible={showTestWaModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.rowSpace}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Tes WhatsApp Bot</Text>
              <Pressable onPress={() => setShowTestWaModal(false)}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            <Text style={[styles.modalDesc, { color: colors.textMuted }]}>
              Masukkan nomor WA tujuan untuk menguji respon pengiriman pesan bot.
            </Text>

            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text, marginTop: 12 }]}
              value={testWaPhone}
              onChangeText={setTestWaPhone}
              placeholder="08123456789"
              placeholderTextColor={colors.textDim}
              keyboardType="phone-pad"
            />

            <Pressable
              style={[styles.saveBtn, { backgroundColor: '#10b981', marginTop: 14 }]}
              onPress={handleSendTestWa}
              disabled={sendingTestWa}
            >
              {sendingTestWa ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Kirim Pesan Tes Sekarang</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL: TOP UP SALDO PUSAT */}
      {/* ============================================================== */}
      <Modal visible={showTopUpModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.rowSpace}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Top Up Saldo Server Pusat</Text>
              <Pressable onPress={() => { setShowTopUpModal(false); setTopupPaymentData(null); }}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            {!topupPaymentData ? (
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Nominal Deposit (Rp)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                  value={depositAmount}
                  onChangeText={setDepositAmount}
                  placeholder="Minimal 10.000"
                  placeholderTextColor={colors.textDim}
                  keyboardType="numeric"
                />

                <Text style={[styles.inputLabel, { color: colors.text, marginTop: 10 }]}>Pilih Provider Pembayaran</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 6 }}>
                  {depositProviders.length === 0 ? (
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>Memuat provider pembayaran...</Text>
                  ) : (
                    depositProviders.map((p) => {
                      const sel = depositProviderCode === p.code;
                      return (
                        <Pressable
                          key={p.code}
                          style={[
                            styles.providerPill,
                            sel
                              ? { backgroundColor: colors.primary, borderColor: colors.primary }
                              : { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                          ]}
                          onPress={() => setDepositProviderCode(p.code)}
                        >
                          <Text style={[styles.providerPillText, { color: sel ? '#fff' : colors.text }]}>
                            {p.display_name || p.name}
                          </Text>
                        </Pressable>
                      );
                    })
                  )}
                </ScrollView>

                <Pressable
                  style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: 14 }]}
                  onPress={handleCeirgoTopup}
                  disabled={topupLoading}
                >
                  {topupLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Lanjutkan Pembayaran Deposit</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <View style={{ marginTop: 12, alignItems: 'center' }}>
                <Text style={[styles.qrHeading, { color: colors.text }]}>Scan QRIS Deposit Saldo Pusat</Text>
                <Text style={[styles.modalDesc, { color: colors.textMuted, textAlign: 'center' }]}>
                  Selesaikan pembayaran sebesar Rp {Number(topupPaymentData.amount || depositAmount).toLocaleString('id-ID')}
                </Text>

                {topupPaymentData.qr_image || topupPaymentData.qr_url ? (
                  <View style={styles.qrWrapper}>
                    <Image
                      source={{ uri: topupPaymentData.qr_image || topupPaymentData.qr_url }}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                  </View>
                ) : (
                  <Text style={{ color: colors.text, marginVertical: 20 }}>
                    Payload: {topupPaymentData.qris_string || topupPaymentData.pay_code}
                  </Text>
                )}

                <Pressable
                  style={[styles.saveBtn, { backgroundColor: colors.primary, width: '100%', marginTop: 12 }]}
                  onPress={() => { setShowTopUpModal(false); setTopupPaymentData(null); loadBalances(); }}
                >
                  <Text style={styles.saveBtnText}>Selesai & Tutup</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL: AUTO-DEPLOY CONSOLE */}
      {/* ============================================================== */}
      <Modal visible={showDeployConsole} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: '#090d16', borderColor: '#1e293b', maxHeight: '85%' }]}>
            <View style={styles.rowSpace}>
              <View style={styles.rowAlign}>
                <Terminal size={18} color="#3b82f6" />
                <Text style={[styles.modalTitle, { color: '#ffffff', marginLeft: 8 }]}>Konsol Auto-Deploy</Text>
              </View>
              <Pressable onPress={() => setShowDeployConsole(false)}>
                <X size={20} color="#94a3b8" />
              </Pressable>
            </View>

            <View style={styles.deployConsoleBody}>
              <ScrollView style={styles.terminalScroll}>
                <Text style={styles.terminalText}>{deployLogs || 'Menghubungkan ke PM2...'}</Text>
              </ScrollView>
            </View>

            {isDeploying && (
              <View style={[styles.rowAlign, { marginTop: 10 }]}>
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text style={{ color: '#93c5fd', fontSize: 12, marginLeft: 8 }}>
                  Sedang menarik commit dan restart proses...
                </Text>
              </View>
            )}

            <Pressable
              style={[styles.smallBtn, { backgroundColor: '#1e293b', marginTop: 12, height: 40 }]}
              onPress={() => setShowDeployConsole(false)}
            >
              <Text style={[styles.smallBtnText, { color: '#ffffff' }]}>Tutup Konsol</Text>
            </Pressable>
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
  refreshBtn: {
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
  segmentContainer: {
    paddingVertical: 10,
  },
  segmentScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  tabSection: {
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  cardDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
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
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  rowGap: {
    flexDirection: 'row',
    gap: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  connectedBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    marginTop: 4,
  },
  boxTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  boxDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 10,
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dangerActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
  },
  dangerActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  qrContainer: {
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    marginTop: 6,
  },
  qrHeading: {
    fontSize: 13,
    fontWeight: '800',
  },
  qrSub: {
    fontSize: 11,
    textAlign: 'center',
  },
  qrWrapper: {
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 12,
    marginVertical: 4,
  },
  qrImage: {
    width: 180,
    height: 180,
  },
  promptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginTop: 4,
  },
  promptTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  promptDesc: {
    fontSize: 10,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  textArea: {
    minHeight: 76,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    fontSize: 12,
    textAlignVertical: 'top',
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
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  saveBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  gatewayGrid: {
    gap: 10,
    marginTop: 4,
  },
  gatewayCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  gatewayCardTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  gatewayCardDesc: {
    fontSize: 11,
  },
  gatewayBadge: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  modePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  modePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  metaLabel: {
    fontSize: 11,
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  providerTile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  providerName: {
    fontSize: 13,
    fontWeight: '800',
  },
  providerDesc: {
    fontSize: 10,
    marginTop: 2,
  },
  balanceNumber: {
    fontSize: 14,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  miniBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  smallBtn: {
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
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
    gap: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  providerPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  providerPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deployConsoleBody: {
    height: 300,
    backgroundColor: '#030712',
    borderRadius: 12,
    padding: 10,
    marginTop: 6,
  },
  terminalScroll: {
    flex: 1,
  },
  terminalText: {
    color: '#4ade80',
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
});
