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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Activity,
  RotateCw,
  Search,
  Trash2,
  Globe,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';

const ACTIONS = [
  'ALL',
  'LOGIN',
  'REGISTER',
  'ORDER',
  'DEPOSIT',
  'TICKET',
  'ADMIN',
  'VOUCHER',
];

export default function AdminLogsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors.dark;

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Clear Logs Modal
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchLogs = async (targetPage = page, targetAction = actionFilter, targetSearch = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('limit', '20');
      if (targetAction && targetAction !== 'ALL') params.set('action', targetAction);
      if (targetSearch && targetSearch.trim()) params.set('search', targetSearch.trim());

      const res = await apiClient.get(`/admin/user-logs?${params.toString()}`);
      if (res.data?.status && Array.isArray(res.data.data)) {
        setLogs(res.data.data);
        setTotalPages(res.data.totalPages || 1);
        setTotalCount(res.data.total || 0);
      } else if (Array.isArray(res.data)) {
        setLogs(res.data);
      } else {
        setLogs([]);
      }
    } catch (e) {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page, actionFilter, search);
  }, [page, actionFilter]);

  const handleClearLogs = async (days: number | 'all') => {
    setClearing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const payload = days === 'all' ? {} : { olderThanDays: days };
      const res = await apiClient.delete('/admin/user-logs', { data: payload });
      if (res.data?.status !== false) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        Alert.alert('Sukses', 'Log aktivitas lama berhasil dibersihkan.');
        setShowClearModal(false);
        setPage(1);
        fetchLogs(1, actionFilter, search);
      } else {
        Alert.alert('Gagal', res.data?.message || 'Gagal membersihkan log.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setClearing(false);
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
          <Text style={[styles.navTitle, { color: colors.text }]}>Audit Log Sistem</Text>
          <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>
            {totalCount} Total Aktivitas Tercatat
          </Text>
        </View>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: colors.surface }]}
          onPress={() => fetchLogs(page, actionFilter, search)}
          hitSlop={10}
        >
          <RotateCw size={18} color={colors.primary} />
        </Pressable>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)', marginLeft: 8 }]}
          onPress={() => setShowClearModal(true)}
          hitSlop={10}
        >
          <Trash2 size={18} color={colors.danger} />
        </Pressable>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={16} color={colors.textDim} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Cari user, email, atau aktivitas..."
            placeholderTextColor={colors.textDim}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => {
              setPage(1);
              fetchLogs(1, actionFilter, search);
            }}
          />
        </View>
      </View>

      {/* Horizontal Action Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.actionPillsScroll}
      >
        {ACTIONS.map((act) => {
          const active = actionFilter === act;
          return (
            <Pressable
              key={act}
              style={[
                styles.actionPill,
                {
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                setActionFilter(act);
                setPage(1);
              }}
            >
              <Text style={[styles.actionPillText, { color: active ? '#ffffff' : colors.textMuted }]}>
                {act}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Memuat log aktivitas...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {logs.length === 0 ? (
            <View style={[styles.emptyBox, { borderColor: colors.border }]}>
              <Activity size={36} color={colors.textDim} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Belum Ada Log</Text>
              <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                Tidak ada data aktivitas yang sesuai dengan filter saat ini.
              </Text>
            </View>
          ) : (
            logs.map((log) => {
              const actionName = (log.action || 'INFO').toUpperCase();
              return (
                <View
                  key={log.id}
                  style={[styles.logCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={styles.logCardTop}>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor:
                            actionName.includes('LOGIN') || actionName.includes('REGISTER')
                              ? 'rgba(59, 130, 246, 0.15)'
                              : actionName.includes('ORDER') || actionName.includes('DEPOSIT')
                              ? 'rgba(16, 185, 129, 0.15)'
                              : actionName.includes('ADMIN')
                              ? 'rgba(239, 68, 68, 0.15)'
                              : 'rgba(245, 158, 11, 0.15)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          {
                            color:
                              actionName.includes('LOGIN') || actionName.includes('REGISTER')
                                ? colors.primary
                                : actionName.includes('ORDER') || actionName.includes('DEPOSIT')
                                ? colors.success
                                : actionName.includes('ADMIN')
                                ? colors.danger
                                : colors.warning,
                          },
                        ]}
                      >
                        {actionName}
                      </Text>
                    </View>

                    <Text style={[styles.logTime, { color: colors.textDim }]}>
                      {log.created_at ? new Date(log.created_at).toLocaleString('id-ID') : ''}
                    </Text>
                  </View>

                  <Text style={[styles.logUser, { color: colors.text }]}>
                    {log.userName || log.user_name || log.email || `User #${log.user_id || '-'}`}
                  </Text>
                  <Text style={[styles.logDesc, { color: colors.textMuted }]}>
                    {log.description || log.details || log.action}
                  </Text>

                  {log.ip_address && (
                    <View style={styles.logMetaRow}>
                      <Globe size={11} color={colors.textDim} style={{ marginRight: 4 }} />
                      <Text style={[styles.logIp, { color: colors.textDim }]}>IP: {log.ip_address}</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <View style={styles.paginationRow}>
              <Pressable
                style={[
                  styles.pageBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border, opacity: page <= 1 ? 0.4 : 1 },
                ]}
                disabled={page <= 1}
                onPress={() => setPage(page - 1)}
              >
                <ChevronLeft size={16} color={colors.text} />
                <Text style={[styles.pageBtnText, { color: colors.text }]}>Prev</Text>
              </Pressable>

              <Text style={[styles.pageInfoText, { color: colors.textMuted }]}>
                Hal {page} dari {totalPages}
              </Text>

              <Pressable
                style={[
                  styles.pageBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border, opacity: page >= totalPages ? 0.4 : 1 },
                ]}
                disabled={page >= totalPages}
                onPress={() => setPage(page + 1)}
              >
                <Text style={[styles.pageBtnText, { color: colors.text }]}>Next</Text>
                <ChevronRight size={16} color={colors.text} />
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}

      {/* Modal Bersihkan Log */}
      <Modal visible={showClearModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Bersihkan Log Aktivitas</Text>
              <Pressable onPress={() => setShowClearModal(false)} hitSlop={10}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
              Pilih rentang waktu log aktivitas yang ingin dihapus untuk menghemat ruang database:
            </Text>

            {[
              { label: 'Hapus log lebih lama dari 7 hari', val: 7 },
              { label: 'Hapus log lebih lama dari 14 hari', val: 14 },
              { label: 'Hapus log lebih lama dari 30 hari', val: 30 },
              { label: 'Hapus SEMUA riwayat log', val: 'all' },
            ].map((opt) => (
              <Pressable
                key={String(opt.val)}
                style={[styles.retentionBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                onPress={() => handleClearLogs(opt.val as any)}
                disabled={clearing}
              >
                <Text style={[styles.retentionText, { color: opt.val === 'all' ? colors.danger : colors.text }]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}

            {clearing && (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 12 }} />
            )}
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
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  actionPillsScroll: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  actionPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionPillText: {
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
    paddingTop: 6,
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
  logCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  logCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  logTime: {
    fontSize: 11,
  },
  logUser: {
    fontSize: 14,
    fontWeight: '800',
  },
  logDesc: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  logMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  logIp: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pageInfoText: {
    fontSize: 12,
    fontWeight: '600',
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
    marginBottom: 14,
    lineHeight: 16,
  },
  retentionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  retentionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
