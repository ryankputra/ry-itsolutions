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
  Modal,
  Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import {
  ArrowLeft,
  ShoppingCart,
  RotateCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  Smartphone,
  Cpu,
  X,
  Send,
  Eye,
  AlertTriangle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';

export default function AdminOrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors.dark;

  // Sub-tabs: manual (Add Roamer) vs automated (Cek Log CEIR)
  const [orderSubTab, setOrderSubTab] = useState<'manual' | 'automated'>('manual');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Processing Action Modal
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [actionStatus, setActionStatus] = useState<'pending' | 'processing' | 'success' | 'failed'>('success');
  const [adminNote, setAdminNote] = useState('');
  const [updating, setUpdating] = useState(false);

  // Copied state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/manual-orders');
      if (res.data?.status && Array.isArray(res.data.data)) {
        setOrders(res.data.data);
      } else {
        setOrders([]);
      }
    } catch (e) {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleCopyReport = (o: any) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const imeis = (typeof o?.imei === 'string' ? o.imei : '')
        .split(/[\n,;]+/)
        .map((s: string) => s.trim())
        .filter(Boolean)
        .join(', ');
      const text = `*LAPORAN PESANAN - RY-ITSOLUTIONS*\nID: #${o.id}\nLayanan: ${o.packageName || 'Add Roamer'}\nPelanggan: ${o.userName || '-'}\nNo HP: ${o.targetPhone || '-'}\nIMEI: ${imeis || '-'}\nKecepatan: ${o.speed_label || o.speed_option || 'Regular'}\nStatus: ${o.status?.toUpperCase() || 'PENDING'}\n${o.admin_note ? `Catatan/SN: ${o.admin_note}\n` : ''}Waktu: ${o.createdAt ? new Date(o.createdAt).toLocaleString('id-ID') : '-'}`;
      Clipboard.setStringAsync(text);
      setCopiedId(o.id);
      setTimeout(() => setCopiedId(null), 2000);
      Alert.alert('Format Laporan Tersalin', 'Format laporan pesanan disalin ke clipboard.');
    } catch (e) {}
  };

  const handleSaveAction = async () => {
    if (!selectedOrder) return;
    setUpdating(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.put(`/admin/manual-orders/${selectedOrder.id}`, {
        status: actionStatus,
        admin_note: adminNote,
      });

      if (res.data?.status) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        Alert.alert('Berhasil', 'Status pesanan dan catatan berhasil diperbarui.');
        setSelectedOrder(null);
        setAdminNote('');
        loadOrders();
      } else {
        Alert.alert('Gagal', res.data?.message || 'Gagal update status pesanan.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Gagal menghubungi server.');
    } finally {
      setUpdating(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Tab filter
      const isCeir = o.service_type === 'ceir' || (o.service && o.service.includes('ceir'));
      if (orderSubTab === 'manual' && isCeir) return false;
      if (orderSubTab === 'automated' && !isCeir) return false;

      // Status filter
      if (statusFilter !== 'all') {
        if (o.status !== statusFilter) return false;
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = o.userName && o.userName.toLowerCase().includes(q);
        const matchPhone = o.targetPhone && o.targetPhone.includes(q);
        const matchImei = o.imei && o.imei.includes(q);
        const matchId = String(o.id).includes(q);
        return matchName || matchPhone || matchImei || matchId;
      }
      return true;
    });
  }, [orders, orderSubTab, statusFilter, search]);

  const formatRupiah = (val: number) => {
    return 'Rp ' + (val || 0).toLocaleString('id-ID');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Nav */}
      <View style={[styles.topNav, { borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.surface }]}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.navTitle, { color: colors.text }]}>Antrean & Pesanan</Text>
          <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>
            Kelola Transaksi Add Roamer & CEIR
          </Text>
        </View>
        <Pressable
          style={[styles.refreshBtn, { backgroundColor: colors.surface }]}
          onPress={loadOrders}
        >
          <RotateCw size={18} color={colors.primary} />
        </Pressable>
      </View>

      {/* Sub-Tabs Switcher */}
      <View style={styles.tabSwitcher}>
        <Pressable
          style={[
            styles.tabBtn,
            orderSubTab === 'manual'
              ? { backgroundColor: colors.primary }
              : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
          ]}
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
            setOrderSubTab('manual');
          }}
        >
          <Smartphone size={14} color={orderSubTab === 'manual' ? '#fff' : colors.textMuted} />
          <Text style={[styles.tabBtnText, { color: orderSubTab === 'manual' ? '#fff' : colors.text }]}>
            Antrean Add Roamer
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.tabBtn,
            orderSubTab === 'automated'
              ? { backgroundColor: colors.primary }
              : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
          ]}
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
            setOrderSubTab('automated');
          }}
        >
          <Cpu size={14} color={orderSubTab === 'automated' ? '#fff' : colors.textMuted} />
          <Text style={[styles.tabBtnText, { color: orderSubTab === 'automated' ? '#fff' : colors.text }]}>
            Cek Log CEIR
          </Text>
        </Pressable>
      </View>

      {/* Search & Filter Header */}
      <View style={styles.filterSection}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={16} color={colors.textDim} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Cari ID, nama pelanggan, no WA, atau IMEI..."
            placeholderTextColor={colors.textDim}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <X size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusPills}>
          {[
            { id: 'all', label: 'Semua Status' },
            { id: 'pending', label: 'Menunggu' },
            { id: 'processing', label: 'Diproses' },
            { id: 'success', label: 'Sukses' },
            { id: 'failed', label: 'Gagal' },
          ].map((st) => {
            const active = statusFilter === st.id;
            return (
              <Pressable
                key={st.id}
                style={[
                  styles.statusPill,
                  active
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => setStatusFilter(st.id)}
              >
                <Text style={[styles.statusPillText, { color: active ? '#fff' : colors.text }]}>
                  {st.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Orders List */}
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>Memuat data pesanan...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Tidak ada pesanan yang sesuai filter.</Text>
          </View>
        ) : (
          <FlashList
            data={filteredOrders}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
            renderItem={({ item }) => {
              const statusColor =
                item.status === 'success'
                  ? '#10b981'
                  : item.status === 'processing'
                  ? '#3b82f6'
                  : item.status === 'pending'
                  ? '#f59e0b'
                  : '#ef4444';

              return (
                <View style={[styles.orderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.rowSpace}>
                    <View>
                      <Text style={[styles.orderServiceTitle, { color: colors.text }]}>
                        {item.packageName || item.service || 'Add Roamer IMEI'}
                      </Text>
                      <Text style={[styles.orderId, { color: colors.textMuted }]}>
                        Order #{item.id} • {item.userName || 'Member'}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
                      <Text style={[styles.badgeText, { color: statusColor }]}>
                        {item.status?.toUpperCase() || 'PENDING'}
                      </Text>
                    </View>
                  </View>

                  {/* Detail Meta */}
                  <View style={[styles.metaBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                    <View style={styles.rowSpace}>
                      <Text style={[styles.metaLabel, { color: colors.textMuted }]}>No. WhatsApp:</Text>
                      <Text style={[styles.metaVal, { color: colors.text }]}>{item.targetPhone || '-'}</Text>
                    </View>
                    <View style={styles.rowSpace}>
                      <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Nomor IMEI:</Text>
                      <Text style={[styles.metaVal, { color: colors.primary, fontFamily: 'monospace' }]}>
                        {item.imei || '-'}
                      </Text>
                    </View>
                    <View style={styles.rowSpace}>
                      <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Biaya Transaksi:</Text>
                      <Text style={[styles.metaVal, { color: colors.text, fontWeight: '800' }]}>
                        {formatRupiah(item.amount || item.price)}
                      </Text>
                    </View>
                    {item.admin_note && (
                      <View style={[styles.rowSpace, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 4 }]}>
                        <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Catatan / SN:</Text>
                        <Text style={[styles.metaVal, { color: '#10b981' }]}>{item.admin_note}</Text>
                      </View>
                    )}
                  </View>

                  {/* Actions */}
                  <View style={styles.actionBtnRow}>
                    <Pressable
                      style={[styles.smallActionBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                      onPress={() => handleCopyReport(item)}
                    >
                      {copiedId === item.id ? <Check size={14} color="#10b981" /> : <Copy size={14} color={colors.text} />}
                      <Text style={[styles.smallActionBtnText, { color: colors.text }]}>Salin Format WA</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.smallActionBtn, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        setSelectedOrder(item);
                        setActionStatus(item.status || 'success');
                        setAdminNote(item.admin_note || '');
                      }}
                    >
                      <Text style={[styles.smallActionBtnText, { color: '#ffffff' }]}>Kelola Status</Text>
                    </Pressable>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>

      {/* Modal: Kelola Status Pesanan */}
      <Modal visible={Boolean(selectedOrder)} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.rowSpace}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Kelola Pesanan #{selectedOrder?.id}
              </Text>
              <Pressable onPress={() => setSelectedOrder(null)}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <Text style={[styles.label, { color: colors.text }]}>Pilih Status Baru:</Text>
            <View style={styles.statusSelectRow}>
              {[
                { id: 'pending', label: 'Menunggu', color: '#f59e0b' },
                { id: 'processing', label: 'Diproses', color: '#3b82f6' },
                { id: 'success', label: 'Sukses', color: '#10b981' },
                { id: 'failed', label: 'Gagal / Refund', color: '#ef4444' },
              ].map((s) => (
                <Pressable
                  key={s.id}
                  style={[
                    styles.statusOption,
                    actionStatus === s.id
                      ? { backgroundColor: s.color, borderColor: s.color }
                      : { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                  ]}
                  onPress={() => setActionStatus(s.id as any)}
                >
                  <Text style={[styles.statusOptionText, { color: actionStatus === s.id ? '#fff' : colors.text }]}>
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.text, marginTop: 8 }]}>Catatan Admin / SN / Bukti:</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
              value={adminNote}
              onChangeText={setAdminNote}
              placeholder="Contoh: SN: 8291482819 - Sinyal sudah aktif"
              placeholderTextColor={colors.textDim}
            />

            <Pressable
              style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: 10 }]}
              onPress={handleSaveAction}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Simpan Pembaruan Pesanan</Text>
              )}
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
  tabSwitcher: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 12,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
  },
  statusPills: {
    gap: 6,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  orderCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    gap: 10,
  },
  orderServiceTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  orderId: {
    fontSize: 10,
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  metaBox: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  metaLabel: {
    fontSize: 11,
  },
  metaVal: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionBtnRow: {
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
  smallActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
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
    gap: 10,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusSelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusOptionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 12,
  },
  saveBtn: {
    height: 44,
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
