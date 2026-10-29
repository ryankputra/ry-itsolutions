import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Users,
  Package,
  ShoppingCart,
  Shield,
  CreditCard,
  Bell,
  MessageSquare,
  Ticket,
  LifeBuoy,
  Settings,
  FileText,
  Activity,
  DollarSign,
  TrendingUp,
  Clock,
  Smartphone,
  Headphones,
  Megaphone,
  Share2,
  Palette,
  Server,
  RotateCw,
  Zap,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const colors = Colors.dark;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Executive Metrics
  const [metrics, setMetrics] = useState<{
    pendingOrders: number;
    processingOrders: number;
    openTickets: number;
    totalUsers: number;
    activeCoupons: number;
    activeGatewayKeys: number;
  }>({
    pendingOrders: 0,
    processingOrders: 0,
    openTickets: 0,
    totalUsers: 0,
    activeCoupons: 0,
    activeGatewayKeys: 0,
  });

  // Balances
  const [balances, setBalances] = useState<{ kmsp: number; ceirgo: number }>({
    kmsp: 0,
    ceirgo: 0,
  });

  const loadAdminData = async () => {
    try {
      const [ordersRes, ticketsRes, usersRes, couponsRes, ceirRes, kmspRes] = await Promise.all([
        apiClient.get('/admin/manual-orders').catch(() => null),
        apiClient.get('/admin/tickets').catch(() => null),
        apiClient.get('/admin/users').catch(() => null),
        apiClient.get('/admin/coupons').catch(() => null),
        apiClient.get('/admin/ceirgo-balance').catch(() => null),
        apiClient.get('/admin/kmsp-balance').catch(() => null),
      ]);

      let pendingOrders = 0;
      let processingOrders = 0;
      if (ordersRes?.data?.status && Array.isArray(ordersRes.data.data)) {
        pendingOrders = ordersRes.data.data.filter((o: any) => o.status === 'pending' || o.status === 'in_queue').length;
        processingOrders = ordersRes.data.data.filter((o: any) => o.status === 'processing').length;
      }

      let openTickets = 0;
      if (ticketsRes?.data?.status && Array.isArray(ticketsRes.data.data)) {
        openTickets = ticketsRes.data.data.filter((t: any) => t.status === 'open' || t.status === 'replied').length;
      }

      let totalUsers = 0;
      if (usersRes?.data?.status && Array.isArray(usersRes.data.data)) {
        totalUsers = usersRes.data.data.length;
      }

      let activeCoupons = 0;
      if (couponsRes?.data?.status && Array.isArray(couponsRes.data.data)) {
        activeCoupons = couponsRes.data.data.filter((c: any) => c.is_active === 1 || c.is_active === true).length;
      }

      setMetrics({
        pendingOrders,
        processingOrders,
        openTickets,
        totalUsers,
        activeCoupons,
        activeGatewayKeys: 1,
      });

      const ceirBal = ceirRes?.data?.ceirgoBalance ?? ceirRes?.data?.balance ?? 0;
      const kmspBal = kmspRes?.data?.kmspBalance ?? kmspRes?.data?.balance ?? 0;
      setBalances({
        ceirgo: Number(ceirBal) || 0,
        kmsp: Number(kmspBal) || 0,
      });
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    await loadAdminData();
    setRefreshing(false);
  };

  const formatRupiah = (val: number) => {
    return 'Rp ' + (val || 0).toLocaleString('id-ID');
  };

  const adminFeatureCards = [
    {
      title: 'Antrean Pesanan',
      desc: 'Pengerjaan IMEI manual, verifikasi, nota & Serial Number.',
      badge: metrics.pendingOrders > 0 ? `${metrics.pendingOrders} Antrean` : 'Semua Beres',
      badgeColor: metrics.pendingOrders > 0 ? '#ef4444' : '#10b981',
      icon: Clock,
      color: '#f59e0b',
      route: '/(admin)/orders',
    },
    {
      title: 'Layanan IMEI & CEIR',
      desc: 'Buka/tutup layanan, tarif kecepatan & konfigurasi CEIR.',
      badge: 'Layanan Inti',
      badgeColor: colors.primary,
      icon: Smartphone,
      color: '#3b82f6',
      route: '/(admin)/imei',
    },
    {
      title: 'Kelola Pengguna',
      desc: 'Data member, hak akses, saldo & koin, serta audit log.',
      badge: `${metrics.totalUsers} Pengguna`,
      badgeColor: '#06b6d4',
      icon: Users,
      color: '#06b6d4',
      route: '/(admin)/users',
    },
    {
      title: 'Paket Kuota KMSP',
      desc: 'Sinkronisasi paket kuota server pusat KMSP & setting margin.',
      badge: 'KMSP Store',
      badgeColor: '#6366f1',
      icon: Package,
      color: '#6366f1',
      route: '/(admin)/packages',
    },
    {
      title: 'Pusat Bantuan CS',
      desc: 'Layanan live ticket pelanggan & thread kendala transaksi.',
      badge: metrics.openTickets > 0 ? `${metrics.openTickets} Terbuka` : '0 Kendala',
      badgeColor: metrics.openTickets > 0 ? '#f59e0b' : '#10b981',
      icon: Headphones,
      color: '#10b981',
      route: '/(admin)/tickets',
    },
    {
      title: 'Kupon Diskon',
      desc: 'Kode voucher promosi, potongan nominal & kuota pemakaian.',
      badge: `${metrics.activeCoupons} Kupon Aktif`,
      badgeColor: '#8b5cf6',
      icon: Ticket,
      color: '#8b5cf6',
      route: '/(admin)/vouchers',
    },
    {
      title: 'Broadcast Promo',
      desc: 'Sebar pesan massal WhatsApp, Telegram, push & banner.',
      badge: 'Multi-Kanal',
      badgeColor: '#ec4899',
      icon: Megaphone,
      color: '#ec4899',
      route: '/(admin)/broadcast',
    },
    {
      title: 'Bot WhatsApp Baileys',
      desc: 'Engine resmi toko kirim nota PDF otomatis & pairing QR.',
      badge: 'Engine Bot',
      badgeColor: '#10b981',
      icon: MessageSquare,
      color: '#10b981',
      route: '/(admin)/whatsapp',
    },
    {
      title: 'Gateway Pembayaran',
      desc: 'Dual rotator GoPay & ShopeePay, Nobu Orkut & QRIS.',
      badge: 'Gateway QRIS',
      badgeColor: colors.primary,
      icon: CreditCard,
      color: colors.primary,
      route: '/(admin)/gateway',
    },
    {
      title: 'Log Aktivitas Sistem',
      desc: 'Audit trail seluruh mutasi, login, dan aksi admin.',
      badge: 'Audit Trail',
      badgeColor: '#64748b',
      icon: Activity,
      color: '#64748b',
      route: '/(admin)/logs',
    },
    {
      title: 'Pengaturan & Server',
      desc: 'Auto deploy PM2, backup database, maintenance mode.',
      badge: 'Server Inti',
      badgeColor: '#eab308',
      icon: Settings,
      color: '#eab308',
      route: '/(admin)/settings',
    },
    {
      title: 'Ulasan Testimoni',
      desc: 'Manajemen ulasan pelanggan & generator screenshot sinyal.',
      badge: 'Ulasan',
      badgeColor: '#f97316',
      icon: MessageSquare,
      color: '#f97316',
      route: '/(admin)/reviews',
    },
  ];

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
          <Text style={[styles.navTitle, { color: colors.text }]}>Admin Executive Dashboard</Text>
          <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>
            Kontrol Penuh Sistem, Layanan & Keuangan
          </Text>
        </View>
        <Pressable
          style={[styles.refreshBtn, { backgroundColor: colors.surface }]}
          onPress={onRefresh}
        >
          <RotateCw size={18} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Executive Metrics Overview */}
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.rowSpace}>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Antrean Pesanan</Text>
              <Clock size={16} color={metrics.pendingOrders > 0 ? '#ef4444' : '#10b981'} />
            </View>
            <Text style={[styles.metricVal, { color: metrics.pendingOrders > 0 ? '#ef4444' : colors.text }]}>
              {metrics.pendingOrders}
            </Text>
            <Text style={[styles.metricSub, { color: colors.textMuted }]}>
              {metrics.processingOrders} sedang diproses
            </Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.rowSpace}>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Tiket Kendala</Text>
              <Headphones size={16} color={metrics.openTickets > 0 ? '#f59e0b' : '#10b981'} />
            </View>
            <Text style={[styles.metricVal, { color: metrics.openTickets > 0 ? '#f59e0b' : colors.text }]}>
              {metrics.openTickets}
            </Text>
            <Text style={[styles.metricSub, { color: colors.textMuted }]}>Menunggu tanggapan</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.rowSpace}>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Total Member</Text>
              <Users size={16} color="#06b6d4" />
            </View>
            <Text style={[styles.metricVal, { color: colors.text }]}>{metrics.totalUsers}</Text>
            <Text style={[styles.metricSub, { color: colors.textMuted }]}>Pengguna terdaftar</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.rowSpace}>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Kupon Aktif</Text>
              <Ticket size={16} color="#8b5cf6" />
            </View>
            <Text style={[styles.metricVal, { color: colors.text }]}>{metrics.activeCoupons}</Text>
            <Text style={[styles.metricSub, { color: colors.textMuted }]}>Voucher berjalan</Text>
          </View>
        </View>

        {/* Provider Balances Banner */}
        <View style={[styles.balanceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.rowSpace}>
            <View style={styles.rowAlign}>
              <Server size={18} color={colors.primary} />
              <Text style={[styles.balanceHeading, { color: colors.text, marginLeft: 8 }]}>
                Saldo Modal Provider Server
              </Text>
            </View>
            <Pressable
              style={styles.balanceSettingsLink}
              onPress={() => router.push('/(admin)/settings' as any)}
            >
              <Text style={[styles.balanceSettingsText, { color: colors.primary }]}>Kelola & Isi Saldo</Text>
            </Pressable>
          </View>

          <View style={styles.balanceRow}>
            <View style={[styles.balanceBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text style={[styles.balanceBoxLabel, { color: colors.textMuted }]}>Server Pusat (CEIR)</Text>
              <Text style={[styles.balanceBoxVal, { color: colors.primary }]}>
                {formatRupiah(balances.ceirgo)}
              </Text>
            </View>
            <View style={[styles.balanceBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text style={[styles.balanceBoxLabel, { color: colors.textMuted }]}>KMSP Store (Paket Kuota)</Text>
              <Text style={[styles.balanceBoxVal, { color: '#10b981' }]}>
                {formatRupiah(balances.kmsp)}
              </Text>
            </View>
          </View>
        </View>

        {/* Feature Cards Grid (12 Modules) */}
        <Text style={[styles.sectionHeading, { color: colors.text }]}>Menu Kontrol & Modul Admin</Text>

        <View style={styles.menuGrid}>
          {adminFeatureCards.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Pressable
                key={idx}
                style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                  router.push(item.route as any);
                }}
              >
                <View style={styles.rowSpace}>
                  <View style={[styles.menuIconCircle, { backgroundColor: item.color + '22' }]}>
                    <Icon size={18} color={item.color} />
                  </View>
                  <View style={[styles.menuBadge, { backgroundColor: item.badgeColor + '18', borderColor: item.badgeColor + '44' }]}>
                    <Text style={[styles.menuBadgeText, { color: item.badgeColor }]}>{item.badge}</Text>
                  </View>
                </View>

                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.menuDesc, { color: colors.textMuted }]} numberOfLines={2}>
                    {item.desc}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCard: {
    width: '48.5%',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 2,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  metricVal: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  metricSub: {
    fontSize: 10,
    marginTop: 1,
  },
  balanceCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  balanceHeading: {
    fontSize: 13,
    fontWeight: '800',
  },
  balanceSettingsLink: {
    paddingVertical: 2,
  },
  balanceSettingsText: {
    fontSize: 11,
    fontWeight: '700',
  },
  balanceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  balanceBox: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
  },
  balanceBoxLabel: {
    fontSize: 10,
  },
  balanceBoxVal: {
    fontSize: 13,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  menuGrid: {
    gap: 8,
  },
  menuCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 2,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  menuBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  menuDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
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
});
