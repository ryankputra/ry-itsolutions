import { useAppTheme } from '../../context/ThemeContext';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  Search,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiClient } from '../../services/api';
import { InvoiceModal, InvoiceData } from '../../components/ui/InvoiceModal';
import { InstantQrisModal } from '../../components/ui/InstantQrisModal';
import { WriteReviewModal } from '../../components/ui/WriteReviewModal';
import { parseCeirResponse } from '../../utils/ceirParser';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../theme/colors';

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { updateUserBalance } = useAuth();
  const params = useLocalSearchParams<{ tab?: string }>();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [resumePayment, setResumePayment] = useState<{ id: string; amount: number; title: string } | null>(null);
  const [reviewTarget, setReviewTarget] = useState<any | null>(null);

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
  const normalizedHistory = useMemo(() => {
    return transactions.map((trx) => {
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
  }, [transactions]);

  // Dynamic counter badges per status tab
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: normalizedHistory.length,
      unpaid: 0,
      waiting: 0,
      processing: 0,
      completed: 0,
      canceled: 0,
    };

    normalizedHistory.forEach((trx) => {
      const status = (trx.status || '').toLowerCase();
      const isBalancePaid = trx.payment_method === 'balance' || trx.paymentMethod === 'balance';

      if ((status === 'pending' || status === 'unpaid') && !isBalancePaid) {
        counts.unpaid += 1;
      } else if (status === 'in_queue' || status === 'waiting' || status === 'waiting_admin') {
        counts.waiting += 1;
      } else if (status === 'processing' || status === 'in_progress') {
        counts.processing += 1;
      } else if (['success', 'completed', 'selesai', 'done'].includes(status)) {
        counts.completed += 1;
      } else if (['canceled', 'cancelled', 'failed', 'refunded', 'rejected'].includes(status)) {
        counts.canceled += 1;
      }
    });

    return counts;
  }, [normalizedHistory]);

  const filtered = useMemo(() => {
    return normalizedHistory.filter((trx) => {
      if (filter === 'all') return true;
      const status = (trx.status || '').toLowerCase();
      const isBalancePaid = trx.payment_method === 'balance' || trx.paymentMethod === 'balance';

      if (filter === 'unpaid') {
        return (status === 'pending' || status === 'unpaid') && !isBalancePaid;
      }
      if (filter === 'waiting') {
        return status === 'in_queue' || status === 'waiting' || status === 'waiting_admin';
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
  }, [normalizedHistory, filter]);

  const tabs = [
    { key: 'all', label: 'Semua', count: tabCounts.all },
    { key: 'unpaid', label: 'Belum Bayar', count: tabCounts.unpaid },
    { key: 'waiting', label: 'Menunggu', count: tabCounts.waiting },
    { key: 'processing', label: 'Diproses', count: tabCounts.processing },
    { key: 'completed', label: 'Selesai', count: tabCounts.completed },
    { key: 'canceled', label: 'Pengembalian', count: tabCounts.canceled },
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
                  {tab.count > 0 ? ` (${tab.count})` : ''}
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
              const isWaiting = status === 'in_queue' || status === 'waiting' || status === 'waiting_admin';
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
              const primaryImei = item.imei ? item.imei.split(/[\n,]+/)[0].trim().replace(/\D/g, '') : '';

              // CEIR Inspection parsing
              const isCeir =
                item.service_type === 'ceir' ||
                item.service_type === 'barcode' ||
                String(serviceTitle).toLowerCase().includes('ceir') ||
                String(serviceTitle).toLowerCase().includes('barcode');

              const ceirParsed = isCeir
                ? parseCeirResponse(item.admin_note || item.adminNote || item.api_response, undefined, item.api_response)
                : null;

              // Safe Admin note display (no server leaks)
              const rawNote = String(item.admin_note || item.adminNote || '').trim();
              const isLeaked = /sedang dikerjakan oleh admin|sedang diproses oleh admin|berhasil kami proses|ceirgo|balance|upps|provider|api|sqlite|exception|auto-submit/i.test(rawNote);
              const safeNote = isLeaked ? null : rawNote;

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

                  {/* CEIR Result Summary Card if CEIR item */}
                  {ceirParsed && (
                    <View style={[styles.ceirBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                      <View style={styles.ceirHeader}>
                        <ShieldCheck size={14} color={colors.primary} />
                        <Text style={[styles.ceirTitle, { color: colors.primary }]}>Hasil Database CEIR</Text>
                        <View style={[styles.ceirStatusBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                          <Text style={[styles.ceirStatusText, { color: colors.success }]}>
                            {ceirParsed.status || 'TERDAFTAR DI CEIR'}
                          </Text>
                        </View>
                      </View>
                      {ceirParsed.rows && ceirParsed.rows.length > 0 ? (
                        <Text style={[styles.ceirRowsCount, { color: colors.textMuted }]}>
                          Terdata {ceirParsed.rows.length} riwayat peristiwa di jaringan operator.
                        </Text>
                      ) : null}
                    </View>
                  )}

                  {/* Safe Admin Note if exists */}
                  {safeNote ? (
                    <View style={[styles.noteBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                      <Text style={[styles.noteLabel, { color: colors.primary }]}>Catatan Pesanan:</Text>
                      <Text style={[styles.noteText, { color: colors.text }]}>{safeNote}</Text>
                    </View>
                  ) : null}

                  <View style={styles.priceRow}>
                    <Text style={[styles.priceLabel, { color: colors.textMuted }]}>Total Pembayaran</Text>
                    <Text style={[styles.priceValue, { color: colors.primary }]}>
                      {formatRupiah(amountNum)}
                    </Text>
                  </View>

                  {/* Actions Row */}
                  <View style={styles.actionsRow}>
                    {/* Unpaid Actions: Pay Now + Cancel */}
                    {isUnpaid && (
                      <>
                        <Pressable
                          style={[styles.payNowBtn, { backgroundColor: colors.primary }]}
                          onPress={() => {
                            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
                            setResumePayment({
                              id: String(item.id),
                              amount: amountNum,
                              title: serviceTitle,
                            });
                          }}
                        >
                          <CreditCard size={14} color="#ffffff" style={{ marginRight: 4 }} />
                          <Text style={styles.payNowBtnText}>Bayar Sekarang</Text>
                        </Pressable>

                        <Pressable
                          style={[styles.cancelBtn, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}
                          onPress={() => handleCancelTransaction(item)}
                        >
                          <Text style={[styles.cancelBtnText, { color: colors.danger }]}>Batalkan</Text>
                        </Pressable>
                      </>
                    )}

                    {/* Waiting Actions: Track + CS + Cancel */}
                    {isWaiting && (
                      <>
                        {primaryImei ? (
                          <Pressable
                            style={[styles.actionOutlineBtn, { borderColor: colors.border }]}
                            onPress={() => router.push({ pathname: '/(screens)/cek-garansi', params: { imei: primaryImei } })}
                          >
                            <Search size={13} color={colors.text} style={{ marginRight: 4 }} />
                            <Text style={[styles.actionOutlineText, { color: colors.text }]}>Lacak IMEI</Text>
                          </Pressable>
                        ) : null}

                        <Pressable
                          style={[styles.actionOutlineBtn, { borderColor: 'rgba(245, 158, 11, 0.4)' }]}
                          onPress={() => router.push('/(screens)/tickets')}
                        >
                          <MessageCircle size={13} color={colors.warning} style={{ marginRight: 4 }} />
                          <Text style={[styles.actionOutlineText, { color: colors.warning }]}>Chat CS</Text>
                        </Pressable>

                        <Pressable
                          style={[styles.cancelBtn, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}
                          onPress={() => handleCancelTransaction(item)}
                        >
                          <Text style={[styles.cancelBtnText, { color: colors.danger }]}>Batalkan</Text>
                        </Pressable>
                      </>
                    )}

                    {/* Processing Actions */}
                    {isProcessing && (
                      <>
                        {primaryImei ? (
                          <Pressable
                            style={[styles.actionOutlineBtn, { borderColor: colors.border }]}
                            onPress={() => router.push({ pathname: '/(screens)/cek-garansi', params: { imei: primaryImei } })}
                          >
                            <Search size={13} color={colors.text} style={{ marginRight: 4 }} />
                            <Text style={[styles.actionOutlineText, { color: colors.text }]}>Lacak IMEI</Text>
                          </Pressable>
                        ) : null}

                        <Pressable
                          style={[styles.actionOutlineBtn, { borderColor: 'rgba(59, 130, 246, 0.4)' }]}
                          onPress={() => router.push('/(screens)/tickets')}
                        >
                          <MessageCircle size={13} color="#3b82f6" style={{ marginRight: 4 }} />
                          <Text style={[styles.actionOutlineText, { color: '#3b82f6' }]}>Chat CS</Text>
                        </Pressable>
                      </>
                    )}

                    {/* Completed Actions: Nota + WA + Lacak Garansi + Beli Lagi */}
                    {isSuccess && (
                      <>
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
                              status: 'completed',
                              createdAt: item.createdAt || item.created_at || new Date().toISOString(),
                              paymentMethod: item.payment_method || item.paymentMethod || 'RyPay Balance',
                            });
                          }}
                        >
                          <FileText size={13} color={colors.primary} style={{ marginRight: 4 }} />
                          <Text style={[styles.invoiceBtnText, { color: colors.primary }]}>Nota</Text>
                        </Pressable>

                        <Pressable
                          style={[styles.waQuickBtn, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}
                          onPress={() => handleShareWhatsApp(item)}
                        >
                          <MessageCircle size={13} color={colors.success} style={{ marginRight: 4 }} />
                          <Text style={[styles.waQuickBtnText, { color: colors.success }]}>WA</Text>
                        </Pressable>

                        {primaryImei ? (
                          <Pressable
                            style={[styles.actionOutlineBtn, { borderColor: colors.border }]}
                            onPress={() => router.push({ pathname: '/(screens)/cek-garansi', params: { imei: primaryImei } })}
                          >
                            <ShieldCheck size={13} color={colors.text} style={{ marginRight: 4 }} />
                            <Text style={[styles.actionOutlineText, { color: colors.text }]}>Garansi</Text>
                          </Pressable>
                        ) : null}

                        <Pressable
                          style={[styles.actionOutlineBtn, { borderColor: 'rgba(245, 158, 11, 0.4)' }]}
                          onPress={() => setReviewTarget(item)}
                        >
                          <Text style={[styles.actionOutlineText, { color: colors.warning }]}>⭐ Ulas</Text>
                        </Pressable>

                        <Pressable
                          style={[styles.buyAgainBtn, { backgroundColor: colors.primary }]}
                          onPress={() => router.push('/(screens)/add-roamer')}
                        >
                          <Text style={styles.buyAgainText}>Beli Lagi</Text>
                        </Pressable>
                      </>
                    )}

                    {/* Canceled Actions: Tanya CS + Order Ulang */}
                    {isCanceled && (
                      <>
                        <Pressable
                          style={[styles.actionOutlineBtn, { borderColor: colors.border }]}
                          onPress={() => router.push('/(screens)/tickets')}
                        >
                          <MessageCircle size={13} color={colors.text} style={{ marginRight: 4 }} />
                          <Text style={[styles.actionOutlineText, { color: colors.text }]}>Tanya CS</Text>
                        </Pressable>

                        <Pressable
                          style={[styles.buyAgainBtn, { backgroundColor: colors.primary }]}
                          onPress={() => router.push('/(screens)/add-roamer')}
                        >
                          <Text style={styles.buyAgainText}>Order Ulang</Text>
                        </Pressable>
                      </>
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

      {/* Instant QRIS Payment Resume Modal */}
      {resumePayment && (
        <InstantQrisModal
          isOpen={!!resumePayment}
          amount={resumePayment.amount}
          orderTitle={resumePayment.title}
          onClose={() => setResumePayment(null)}
          onSuccess={() => {
            setResumePayment(null);
            fetchTransactions();
            Alert.alert('Sukses', 'Pembayaran berhasil dikonfirmasi! Pesanan Anda segera diproses.');
          }}
        />
      )}

      {/* Review Modal */}
      <WriteReviewModal
        isOpen={Boolean(reviewTarget)}
        onClose={() => setReviewTarget(null)}
        orderId={String(reviewTarget?.id || '')}
        packageName={reviewTarget?.package_name || reviewTarget?.packageName || 'Aktivasi IMEI'}
        onSuccess={() => fetchTransactions()}
      />
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
  ceirBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  ceirHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ceirTitle: {
    fontSize: 11,
    fontWeight: '800',
    flex: 1,
  },
  ceirStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ceirStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  ceirRowsCount: {
    fontSize: 10,
    marginTop: 4,
  },
  noteBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  noteLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 2,
  },
  noteText: {
    fontSize: 11,
    lineHeight: 15,
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
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'flex-end',
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  payNowBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  buyAgainBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  buyAgainText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  actionOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionOutlineText: {
    fontSize: 11,
    fontWeight: '700',
  },
  invoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
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
