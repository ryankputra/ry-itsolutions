import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Info,
  Clock,
  Sparkles,
  Ticket,
  Package,
  Receipt,
  FileText,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { apiClient } from '../../services/api';
import { InvoiceModal, InvoiceData } from '../../components/ui/InvoiceModal';
import { Colors } from '../../theme/colors';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'promo' | 'system';
  time: string;
  trxData?: any;
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const colors = Colors.dark;

  const [activeTab, setActiveTab] = useState<'all' | 'order' | 'promo' | 'system'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: '1',
      title: 'Pesanan Selesai • Add Roamer Asia Pasifik',
      message: 'IMEI: 358912345678901 | Total: Rp 75.000. Paket sinyal aktif terverifikasi.',
      type: 'order',
      time: 'Baru saja',
      trxData: {
        id: 'TX-10291',
        title: 'Add Roamer Asia Pasifik',
        amount: 75000,
        status: 'success',
        date: '28 Okt 2026, 14:20',
        imei: '358912345678901',
      },
    },
    {
      id: '2',
      title: 'Voucher Promo Aktif',
      message: 'Klaim diskon Rp 10.000 menggunakan kode promo HEMAT10 saat checkout!',
      type: 'promo',
      time: '2 jam lalu',
    },
    {
      id: '3',
      title: 'Sistem Terhubung Realtime',
      message: 'Aplikasi mobile berhasil disinkronkan dengan gateway server RY IT Solutions.',
      type: 'system',
      time: 'Hari ini',
    },
    {
      id: '4',
      title: 'Deposit Saldo QRIS Berhasil',
      message: 'Top up saldo sebesar Rp 100.000 telah masuk ke saldo RyPay Anda.',
      type: 'order',
      time: 'Kemarin',
      trxData: {
        id: 'TU-9921',
        title: 'Top Up Saldo QRIS',
        amount: 100000,
        status: 'success',
        date: '27 Okt 2026, 19:42',
      },
    },
  ]);

  const loadNotifications = async () => {
    try {
      const res = await apiClient.get('/user/transactions');
      if (res.data?.status && Array.isArray(res.data.data)) {
        const trxs = res.data.data.slice(0, 10);
        const dynamicItems: NotificationItem[] = trxs.map((t: any) => ({
          id: `trx-${t.id}`,
          title: `Pesanan Selesai • ${t.packageName || t.service || 'Aktivasi Layanan'}`,
          message: `IMEI/Target: ${t.imei || t.targetPhone || '-'} | Total: Rp ${(t.amount || 0).toLocaleString('id-ID')}`,
          type: 'order',
          time: t.createdAt || 'Baru saja',
          trxData: {
            id: t.id,
            title: t.packageName || t.service || 'Aktivasi Layanan',
            amount: t.amount,
            status: t.status,
            date: t.createdAt,
            imei: t.imei,
          },
        }));

        setNotifications((prev) => {
          const nonOrders = prev.filter((n) => n.type !== 'order');
          return [...dynamicItems, ...nonOrders];
        });
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await loadNotifications();
    setRefreshing(false);
  };

  const filtered = notifications.filter((item) => {
    if (activeTab === 'all') return true;
    return item.type === activeTab;
  });

  const renderIcon = (type: string) => {
    switch (type) {
      case 'order':
        return (
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
            <CheckCircle2 size={18} color="#10b981" />
          </View>
        );
      case 'promo':
        return (
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
            <Sparkles size={18} color="#f59e0b" />
          </View>
        );
      default:
        return (
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(41, 151, 255, 0.12)' }]}>
            <Info size={18} color={colors.primary} />
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.canvas }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.ink }]}>Notifikasi</Text>
        <Text style={[styles.subtitle, { color: colors.inkMuted }]}>
          Pemberitahuan pesanan & update sistem penting
        </Text>
      </View>

      {/* Horizontal Tabs */}
      <View style={styles.tabRow}>
        {[
          { id: 'all', label: 'Semua' },
          { id: 'order', label: 'Pesanan' },
          { id: 'promo', label: 'Promo' },
          { id: 'system', label: 'Sistem' },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={[
                styles.tabBtn,
                {
                  backgroundColor: active ? colors.primary : colors.parchment,
                  borderColor: active ? colors.primary : colors.hairline,
                },
              ]}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setActiveTab(tab.id as any);
              }}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  { color: active ? '#ffffff' : colors.ink },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* FlashList Feed */}
      <View style={{ flex: 1 }}>
        <FlashList
          data={filtered}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 110 + insets.bottom,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.itemCard,
                { backgroundColor: colors.parchment, borderColor: colors.hairline },
              ]}
              onPress={() => {
                if (item.trxData) {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  setSelectedInvoice({
                    id: item.trxData.id,
                    title: item.trxData.title,
                    amount: item.trxData.amount,
                    status: item.trxData.status || 'success',
                    date: item.trxData.date,
                    imei: item.trxData.imei,
                  });
                }
              }}
            >
              {renderIcon(item.type)}

              <View style={styles.textCol}>
                <View style={styles.titleRow}>
                  <Text style={[styles.itemTitle, { color: colors.ink }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.itemTime, { color: colors.inkMuted }]}>{item.time}</Text>
                </View>

                <Text style={[styles.itemMessage, { color: colors.inkMuted }]} numberOfLines={2}>
                  {item.message}
                </Text>

                {item.trxData && (
                  <View style={styles.notaLinkRow}>
                    <FileText size={11} color={colors.primary} style={{ marginRight: 3 }} />
                    <Text style={[styles.notaLinkText, { color: colors.primary }]}>
                      Buka Rincian Nota Digital
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Bell size={40} color={colors.inkMuted} />
              <Text style={[styles.emptyText, { color: colors.inkMuted }]}>
                Belum ada notifikasi pada kategori ini
              </Text>
            </View>
          }
        />
      </View>

      {/* Invoice Modal if triggered */}
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    height: 36,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  itemCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
    marginRight: 6,
  },
  itemTime: {
    fontSize: 10,
  },
  itemMessage: {
    fontSize: 11,
    lineHeight: 16,
  },
  notaLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  notaLinkText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    paddingTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
  },
});
