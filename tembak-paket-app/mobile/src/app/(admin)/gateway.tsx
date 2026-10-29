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
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Server,
  Key,
  Shield,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  RefreshCw,
  X,
  CreditCard,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';

interface GatewayKey {
  id: string;
  userId: string;
  name: string;
  apiKey: string;
  apiKeyPrefix: string;
  phone: string;
  username: string;
  expiresAt: string;
  status: string;
  isActive: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  amountPaid: number;
  daysRemaining: number;
  isGopayConnected: boolean;
}

export default function AdminGatewayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors.dark;

  const [activeTab, setActiveTab] = useState<'rotator' | 'keys'>('rotator');
  const [loading, setLoading] = useState(true);

  // Rotator Status
  const [dualGwStatus, setDualGwStatus] = useState<any>({
    activeGateway: 'ShopeePay QRIS',
    shopeeStatus: 'Online',
    gopayStatus: 'Online',
    rotationCount: 42,
  });

  // API Keys Management
  const [keys, setKeys] = useState<GatewayKey[]>([]);
  const [metrics, setMetrics] = useState({
    totalKeys: 0,
    activeKeys: 0,
    expiringSoonKeys: 0,
    expiredKeys: 0,
    totalRevenue: 0,
  });

  // Renew Modal
  const [renewKey, setRenewKey] = useState<GatewayKey | null>(null);
  const [renewDays, setRenewDays] = useState('30');
  const [renewing, setRenewing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rotatorRes, keysRes] = await Promise.all([
        apiClient.get('/admin/dual-gateway/health').catch(() => null),
        apiClient.get('/admin/gateway-keys').catch(() => null),
      ]);

      if (rotatorRes?.data?.status && rotatorRes.data.data) {
        setDualGwStatus(rotatorRes.data.data);
      }

      if (keysRes?.data?.status) {
        setKeys(keysRes.data.data || []);
        if (keysRes.data.metrics) setMetrics(keysRes.data.metrics);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResetCounter = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await apiClient.post('/admin/dual-gateway/reset-counter');
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      Alert.alert('Sukses', 'Penghitung rotasi gateway berhasil direset.');
      loadData();
    } catch (e: any) {
      Alert.alert('Gagal', e.message);
    }
  };

  const handleToggleKey = async (id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await apiClient.post(`/admin/gateway-keys/${id}/toggle`);
      if (res.data?.status) {
        loadData();
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleConfirmRenew = async () => {
    if (!renewKey || !renewDays) return;
    const days = parseInt(renewDays, 10);
    if (isNaN(days) || days <= 0) {
      Alert.alert('Perhatian', 'Masukkan jumlah hari perpanjangan yang valid.');
      return;
    }

    setRenewing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.post(`/admin/gateway-keys/${renewKey.id}/renew`, { days });
      if (res.data?.status) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        Alert.alert('Sukses', res.data.message || 'Masa aktif API Key berhasil diperpanjang.');
        setRenewKey(null);
        loadData();
      } else {
        Alert.alert('Gagal', res.data?.message || 'Gagal memperpanjang masa aktif.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setRenewing(false);
    }
  };

  const formatRupiah = (val: number) => {
    return 'Rp ' + (val || 0).toLocaleString('id-ID');
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
          <Text style={[styles.navTitle, { color: colors.text }]}>Gateway & API Payment</Text>
          <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>
            Rotator Dual Gateway & Lisensi Merchant
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

      {/* Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          style={[
            styles.tabItem,
            {
              backgroundColor: activeTab === 'rotator' ? colors.primary : colors.surface,
              borderColor: activeTab === 'rotator' ? colors.primary : colors.border,
            },
          ]}
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
            setActiveTab('rotator');
          }}
        >
          <Text style={[styles.tabText, { color: activeTab === 'rotator' ? '#ffffff' : colors.textMuted }]}>
            Dual Gateway Rotator
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.tabItem,
            {
              backgroundColor: activeTab === 'keys' ? colors.primary : colors.surface,
              borderColor: activeTab === 'keys' ? colors.primary : colors.border,
            },
          ]}
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
            setActiveTab('keys');
          }}
        >
          <Text style={[styles.tabText, { color: activeTab === 'keys' ? '#ffffff' : colors.textMuted }]}>
            Lisensi API Key ({keys.length})
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Memuat status gateway...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'rotator' ? (
            <>
              {/* Active Gateway Card */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.headerRow}>
                  <Server size={20} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Gateway Sedang Digunakan</Text>
                </View>
                <Text style={[styles.activeGatewayText, { color: colors.primary }]}>
                  {dualGwStatus.activeGateway || 'ShopeePay QRIS (Auto Rotate)'}
                </Text>
                <Text style={[styles.counterText, { color: colors.textMuted }]}>
                  Total Transaksi Terotasi: {dualGwStatus.rotationCount || 0} kali
                </Text>

                <Pressable
                  style={[styles.resetBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                  onPress={handleResetCounter}
                >
                  <RefreshCw size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
                  <Text style={[styles.resetBtnText, { color: colors.textMuted }]}>Reset Penghitung</Text>
                </Pressable>
              </View>

              {/* Providers Status */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>
                  Status Node Provider
                </Text>

                <View style={[styles.nodeRow, { borderColor: colors.border }]}>
                  <Text style={[styles.nodeName, { color: colors.text }]}>ShopeePay Gateway</Text>
                  <View style={[styles.badge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <CheckCircle2 size={12} color={colors.success} style={{ marginRight: 4 }} />
                    <Text style={[styles.badgeText, { color: colors.success }]}>Online</Text>
                  </View>
                </View>

                <View style={[styles.nodeRow, { borderColor: colors.border }]}>
                  <Text style={[styles.nodeName, { color: colors.text }]}>GoPay Merchant Gateway</Text>
                  <View style={[styles.badge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <CheckCircle2 size={12} color={colors.success} style={{ marginRight: 4 }} />
                    <Text style={[styles.badgeText, { color: colors.success }]}>Online</Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            <>
              {/* Metrics Grid */}
              <View style={styles.metricsRow}>
                <View style={[styles.metricBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Total Lisensi</Text>
                  <Text style={[styles.metricVal, { color: colors.text }]}>{metrics.totalKeys}</Text>
                </View>
                <View style={[styles.metricBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Lisensi Aktif</Text>
                  <Text style={[styles.metricVal, { color: colors.success }]}>{metrics.activeKeys}</Text>
                </View>
              </View>

              {keys.length === 0 ? (
                <View style={[styles.emptyBox, { borderColor: colors.border }]}>
                  <Key size={36} color={colors.textDim} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>Belum Ada API Key</Text>
                  <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                    Pengguna belum membuat lisensi gateway API eksternal.
                  </Text>
                </View>
              ) : (
                keys.map((k) => (
                  <View
                    key={k.id}
                    style={[styles.keyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <View style={styles.keyCardTop}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={[styles.keyName, { color: colors.text }]}>{k.name}</Text>
                        <Text style={[styles.keyPhone, { color: colors.primary }]}>{k.phone} ({k.username})</Text>
                        <Text style={[styles.keyPrefix, { color: colors.textDim }]}>Prefix: {k.apiKeyPrefix}••••••••</Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Switch
                          value={k.isActive}
                          onValueChange={() => handleToggleKey(k.id)}
                          thumbColor="#ffffff"
                          trackColor={{ false: '#334155', true: colors.success }}
                        />
                        <Pressable
                          style={[styles.renewBtn, { backgroundColor: colors.primary }]}
                          onPress={() => setRenewKey(k)}
                        >
                          <Clock size={12} color="#fff" style={{ marginRight: 4 }} />
                          <Text style={styles.renewBtnText}>Perpanjang</Text>
                        </Pressable>
                      </View>
                    </View>

                    <View style={styles.keyFooter}>
                      <Text style={[styles.keyExpiry, { color: colors.textMuted }]}>
                        Sisa: {k.daysRemaining > 0 ? `${k.daysRemaining} Hari` : 'Expired'}
                      </Text>
                      <View
                        style={[
                          styles.gopayBadge,
                          {
                            backgroundColor: k.isGopayConnected
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.gopayBadgeText,
                            { color: k.isGopayConnected ? colors.success : colors.danger },
                          ]}
                        >
                          {k.isGopayConnected ? 'GoPay Linked' : 'GoPay Unlinked'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* Renew Modal */}
      {renewKey && (
        <Modal visible={!!renewKey} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Perpanjang Lisensi</Text>
                <Pressable onPress={() => setRenewKey(null)} hitSlop={10}>
                  <X size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                Perpanjang masa aktif lisensi untuk '{renewKey.name}'
              </Text>

              <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 12 }]}>
                Durasi Tambahan (Hari)
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text },
                ]}
                keyboardType="numeric"
                value={renewDays}
                onChangeText={setRenewDays}
              />

              <Pressable
                style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: 14 }]}
                onPress={handleConfirmRenew}
                disabled={renewing}
              >
                {renewing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Perpanjang Sekarang</Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  activeGatewayText: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  counterText: {
    fontSize: 12,
    marginTop: 4,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  nodeName: {
    fontSize: 13,
    fontWeight: '600',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  metricBox: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  emptyBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  keyCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  keyCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  keyName: {
    fontSize: 14,
    fontWeight: '800',
  },
  keyPhone: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  keyPrefix: {
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  renewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  renewBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  keyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  keyExpiry: {
    fontSize: 11,
    fontWeight: '600',
  },
  gopayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gopayBadgeText: {
    fontSize: 10,
    fontWeight: '700',
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
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 12,
    marginBottom: 12,
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
});
