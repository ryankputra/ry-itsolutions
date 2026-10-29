import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import {
  Receipt,
  CheckCircle2,
  Clock,
  XCircle,
  Smartphone,
  ChevronRight,
  Filter,
  FileText,
  Copy,
  RotateCw,
  CreditCard,
  MessageCircle,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiClient } from '../../services/api';
import { InvoiceModal, InvoiceData } from '../../components/ui/InvoiceModal';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../theme/colors';

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors.dark;
  const { updateUserBalance } = useAuth();
  const params = useLocalSearchParams<{ tab?: string }>();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);

  // Sync tab from params if provided
  useEffect(() => {
    if (params.tab) {
      setFilter(params.tab.toLowerCase());
    }
  }, [params.tab]);

  // Fetch transactions from database - zero mock data
  const fetchTransactions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiClient.get('/user/transactions');
      if (res.data?.status && Array.isArray(res.data.data)) {
        setTransactions(res.data.data);
      } else if (res.data?.status && Array.isArray(res.data.transactions)) {
        setTransactions(res.data.transactions);
      } else if (Array.isArray(res.data)) {
        setTransactions(res.data);
      } else {
        setTransactions([]);
      }
    } catch (e) {
      setTransactions([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();

    // Live auto-polling every 4 seconds for two-way database synchronization
    const timer = setInterval(() => {
      fetchTransactions(true);
    }, 4000);

    return () => clearInterval(timer);
  }, [fetchTransactions]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await fetchTransactions();
    setRefreshing(false);
  };

  const handleCancelTransaction = (trx: any) => {
    Alert.alert(
      'Batalkan Transaksi?',
      `Apakah Anda yakin ingin membatalkan transaksi ${trx.package_name || trx.packageName || trx.id}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Batalkan',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              const isTopup = String(trx.id || '').startsWith('TU-');
              const url = isTopup ? '/topup/cancel' : `/user/transactions/${trx.id}/cancel`;
              const payload = isTopup ? { topup_id: trx.id } : {};

              const res = await apiClient.post(url, payload);
              if (res.data?.status !== false) {
                if (typeof res.data.newBalance === 'number') {
                  updateUserBalance(res.data.newBalance);
                }
                Alert.alert('Dibatalkan!', res.data.message || 'Transaksi telah dibatalkan.');
                fetchTransactions();
                setFilter('canceled');
              } else {
                Alert.alert('Gagal', res.data?.message || 'Gagal membatalkan transaksi.');
              }
            } catch (e: any) {
              Alert.alert('Error', e.response?.data?.message || e.message);
            }
          },
        },
      ]
    );
  };

  const handleShareWhatsApp = (trx: any) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const primaryImei = trx.imei ? trx.imei.split(/[\n,]+/)[0].trim().replace(/\D/g, '') : '';
      const text =
        `Halo Kak, berikut bukti transaksi dari *Ry-ITSolutions*:\n\n` +
        `*ID Transaksi:* #${String(trx.id).substring(0, 14)}\n` +
        `*Layanan:* ${trx.package_name || trx.service_type || 'Aktivasi IMEI'}\n` +
        `*IMEI:* ${trx.imei || '-'}\n` +
        `*Status:* ${String(trx.status).toUpperCase()}\n` +
        `*Tanggal:* ${new Date(trx.createdAt || trx.created_at || Date.now()).toLocaleDateString('id-ID')}\n\n` +
        (primaryImei ? `*Cek Garansi Digital:* \nhttps://ry-itsolutions.web.id/cek-garansi?imei=${primaryImei}\n\n` : '') +
        `Terima kasih atas kepercayaannya!`;

      Linking.openURL(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`).catch(() => {
        Share.share({ message: text });
      });
    } catch {}
  };

  const formatRupiah = (val: number) => {
    return 'Rp ' + (val || 0).toLocaleString('id-ID');
  };

  // Normalization logic matching web frontend-v2 exactly
  const normalizedHistory = transactions.map((trx) => {
    const isBalancePaid = trx.payment_method === 'balance' || trx.paymentMethod === 'balance';
    const lowStatus = (trx.status || '').toLowerCase();
    const rawNote = (trx.admin_note || trx.adminNote || '').toLowerCase();

    const isExplicitError =
      rawNote.includes('retry error') ||
      rawNote.includes('balance-mu tidak mencukupi') ||
      rawNote.includes('insufficient_balance') ||
      rawNote.includes('tidak mencukupi untuk melakukan transaksi');

    if (isExplicitError && lowStatus !== 'cancelled' && lowStatus !== 'refunded') {
      return { ...trx, status: 'cancelled' };
    }

    const isCompleted = ['success', 'completed', 'selesai', 'done', 'active', 'approved'].includes(lowStatus);
    const isFailed = ['failed', 'canceled', 'cancelled', 'rejected', 'refunded'].includes(lowStatus);
    const isProcessing = ['processing', 'in_progress'].includes(lowStatus);

    const isWaitingAdmin =
      lowStatus === 'in_queue' ||
      lowStatus === 'waiting' ||
      lowStatus === 'waiting_admin' ||
      (isBalancePaid && (lowStatus === 'pending' || lowStatus === 'unpaid'));

    if (isWaitingAdmin && !isProcessing && !isCompleted && !isFailed) {
      return { ...trx, status: 'in_queue' };
    }
    return trx;
  });

  const filtered = normalizedHistory.filter((trx) => {
    if (filter === 'all') return true;
    const status = (trx.status || '').toLowerCase();
    const isBalancePaid = trx.payment_method === 'balance' || trx.paymentMethod === 'balance';

    if (filter === 'unpaid') {
      return (status === 'pending' || status === 'unpaid') && !isBalancePaid;
    }
    if (filter === 'waiting') {
      return status === 'in_queue' || status === 'waiting';
    }
    if (filter === 'processing') {
      return status === 'processing' || status === 'in_progress';
    }
    if (filter === 'completed') {
      return ['success', 'completed', 'selesai', 'done'].includes(status);
    }
    if (filter === 'canceled') {
      return ['canceled', 'cancelled', 'failed', 'refunded', 'rejected'].includes(status);
    }
    return true;
  });

  const tabs = [
    { key: 'all', label: 'Semua' },
    { key: 'unpaid', label: 'Belum Bayar' },
    { key: 'waiting', label: 'Menunggu' },
    { key: 'processing', label: 'Diproses' },
    { key: 'completed', label: 'Selesai' },
    { key: 'canceled', label: 'Pengembalian' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header */}
      <View style={styles.topNav}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.navTitle, { color: colors.text }]}>Riwayat & Pesanan Saya</Text>
          <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>
            Sinkronisasi Database Real-time (Auto Sync)
          </Text>
        </View>
        <Pressable
          style={[styles.refreshBtn, { backgroundColor: colors.surface }]}
          onPress={() => fetchTransactions()}
          hitSlop={10}
        >
          <RotateCw size={18} color={colors.primary} />
        </Pressable>
      </View>

      {/* Filter Tabs (Horizontal Scroll) */}
      <View style={{ paddingBottom: 10 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroll}
        >
          {tabs.map((tab) => {
            const active = filter === tab.key;
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
                  setFilter(tab.key);
                }}
              >
                <Text style={[styles.tabText, { color: active ? '#ffffff' : colors.textMuted }]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Main List */}
      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              Menghubungkan ke database transaksi...
            </Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={[styles.emptyBox, { borderColor: colors.border }]}>
            <Receipt size={40} color={colors.textDim} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Tidak Ada Riwayat</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
              Belum ada transaksi pada kategori ini di database Anda.
            </Text>
          </View>
        ) : (
          <FlashList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[styles.listContent, { paddingBottom: 100 + insets.bottom }]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            renderItem={({ item }) => {
              const status = (item.status || '').toLowerCase();
              const isSuccess = ['success', 'completed', 'selesai', 'done'].includes(status);
              const isWaiting = status === 'in_queue' || status === 'waiting';
              const isProcessing = status === 'processing' || status === 'in_progress';
              const isUnpaid = (status === 'pending' || status === 'unpaid') && item.payment_method !== 'balance';
              const isCanceled = ['canceled', 'cancelled', 'failed', 'refunded'].includes(status);

              const serviceTitle =
                item.package_name ||
                item.packageName ||
                item.service_type ||
                item.service ||
                'Transaksi Ry-ITSolutions';

              const amountNum = Number(item.amount || item.total_amount || item.price || 0);

              return (
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.cardId, { color: colors.primary }]}>
                        #{String(item.id).substring(0, 16)}
                      </Text>
                      <Text style={[styles.cardTime, { color: colors.textDim }]}>
                        {item.created_at || item.createdAt
                          ? new Date(item.created_at || item.createdAt).toLocaleString('id-ID')
                          : ''}
                      </Text>
                    </View>

                    {/* Status Pill */}
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: isSuccess
                            ? 'rgba(16, 185, 129, 0.15)'
                            : isWaiting
                            ? 'rgba(245, 158, 11, 0.15)'
                            : isProcessing
                            ? 'rgba(59, 130, 246, 0.15)'
                            : isUnpaid
                            ? 'rgba(249, 115, 22, 0.15)'
                            : 'rgba(239, 68, 68, 0.15)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          {
                            color: isSuccess
                              ? colors.success
                              : isWaiting
                              ? colors.warning
                              : isProcessing
                              ? colors.primary
                              : isUnpaid
                              ? '#f97316'
                              : colors.danger,
                          },
                        ]}
                      >
                        {isSuccess
                          ? 'SELESAI'
                          : isWaiting
                          ? 'MENUNGGU'
                          : isProcessing
                          ? 'DIPROSES'
                          : isUnpaid
                          ? 'BELUM BAYAR'
                          : 'PENGEMBALIAN'}
                      </Text>
                    </View>
                  </View>

                  {/* Service & Price */}
                  <Text style={[styles.serviceTitle, { color: colors.text }]}>{serviceTitle}</Text>

                  {item.imei ? (
                    <Text style={[styles.metaImei, { color: colors.textMuted }]}>
                      IMEI: <Text style={{ fontFamily: 'monospace', color: colors.text }}>{item.imei}</Text>
                    </Text>
                  ) : null}

                  {item.phone || item.targetPhone ? (
                    <Text style={[styles.metaImei, { color: colors.textMuted }]}>
                      No. Tujuan:{' '}
                      <Text style={{ color: colors.text }}>{item.phone || item.targetPhone}</Text>
                    </Text>
                  ) : null}

                  <View style={styles.priceRow}>
                    <Text style={[styles.priceLabel, { color: colors.textMuted }]}>Total Pembayaran</Text>
                    <Text style={[styles.priceValue, { color: colors.primary }]}>
                      {formatRupiah(amountNum)}
                    </Text>
                  </View>

                  {/* Actions Row */}
                  <View style={styles.actionsRow}>
                    <Pressable
                      style={[styles.invoiceBtn, { backgroundColor: colors.surfaceElevated }]}
                      onPress={() => {
                        setSelectedInvoice({
                          id: String(item.id),
                          service: serviceTitle,
                          packageName: serviceTitle,
                          imei: item.imei,
                          targetPhone: item.phone || item.targetPhone || '-',
                          amount: amountNum,
                          status: isSuccess ? 'completed' : isCanceled ? 'failed' : 'pending',
                          createdAt: item.createdAt || item.created_at || new Date().toISOString(),
                          paymentMethod: item.payment_method || item.paymentMethod || 'RyPay Balance',
                        });
                      }}
                    >
                      <FileText size={14} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={[styles.invoiceBtnText, { color: colors.primary }]}>Nota Digital</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.waQuickBtn, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}
                      onPress={() => handleShareWhatsApp(item)}
                    >
                      <MessageCircle size={14} color={colors.success} style={{ marginRight: 4 }} />
                      <Text style={[styles.waQuickBtnText, { color: colors.success }]}>Kirim WA</Text>
                    </Pressable>

                    {isUnpaid && (
                      <Pressable
                        style={[styles.cancelBtn, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}
                        onPress={() => handleCancelTransaction(item)}
                      >
                        <Text style={[styles.cancelBtnText, { color: colors.danger }]}>Batalkan</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>

      {/* Invoice Modal */}
      {selectedInvoice && (
        <InvoiceModal
          visible={!!selectedInvoice}
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
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
  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  navSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  tabScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
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
    padding: 20,
  },
  loadingText: {
    fontSize: 13,
    marginTop: 10,
  },
  emptyBox: {
    margin: 20,
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  card: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardId: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  cardTime: {
    fontSize: 10,
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  metaImei: {
    fontSize: 12,
    marginBottom: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  invoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  invoiceBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  waQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  waQuickBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
