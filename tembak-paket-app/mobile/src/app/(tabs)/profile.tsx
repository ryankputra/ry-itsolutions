import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User as UserIcon,
  Wallet,
  Gift,
  MessageCircle,
  Lock,
  LogOut,
  ChevronRight,
  Shield,
  Smartphone,
  ShoppingCart,
  Ticket,
  Sparkles,
  HelpCircle,
  ShieldCheck,
  Settings,
  CreditCard,
  Clock,
  CheckCircle2,
  Package,
  RotateCcw,
  Zap,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { storage, STORAGE_KEYS } from '../../utils/storage';
import { CartItem } from '../../types';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';
import { useFocusEffect } from 'expo-router';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout, isAuthenticated, refreshUser } = useAuth();
  const colors = Colors.dark;

  const [cartCount, setCartCount] = useState(0);
  const [vouchersCount, setVouchersCount] = useState(0);
  const [orderCounts, setOrderCounts] = useState({
    unpaid: 0,
    waiting: 0,
    processing: 0,
    completed: 0,
    canceled: 0,
  });

  const loadProfileData = React.useCallback(async () => {
    try {
      await refreshUser();
      const cartItems = await storage.getObject<CartItem[]>(STORAGE_KEYS.CART_ITEMS);
      if (cartItems && Array.isArray(cartItems)) {
        setCartCount(cartItems.length);
      }
      const res = await apiClient.get('/coupons/public');
      if (res.data?.status && Array.isArray(res.data.data)) {
        setVouchersCount(res.data.data.length);
      }
      const trxRes = await apiClient.get('/user/transactions');
      if (trxRes.data?.status && Array.isArray(trxRes.data.data)) {
        const counts = { unpaid: 0, waiting: 0, processing: 0, completed: 0, canceled: 0 };
        trxRes.data.data.forEach((t: any) => {
          const st = (t.status || '').toLowerCase();
          const paySt = (t.payment_status || '').toLowerCase();
          if (paySt === 'unpaid' || st === 'unpaid') {
            counts.unpaid++;
          } else if (st === 'pending' || st === 'in_queue' || st === 'waiting') {
            counts.waiting++;
          } else if (st === 'processing' || st === 'on_process') {
            counts.processing++;
          } else if (st === 'completed' || st === 'success') {
            counts.completed++;
          } else if (st === 'cancelled' || st === 'canceled' || st === 'failed' || st === 'refund') {
            counts.canceled++;
          }
        });
        setOrderCounts(counts);
      }
    } catch (e) {}
  }, [refreshUser]);

  useFocusEffect(
    React.useCallback(() => {
      loadProfileData();
    }, [loadProfileData])
  );

  const handleLogout = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    Alert.alert('Konfirmasi Keluar', 'Apakah Anda yakin ingin keluar dari akun?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleContactWhatsApp = (phone: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    Linking.openURL(`https://wa.me/${phone}`).catch(() => {
      Alert.alert('Gagal', 'Tidak dapat membuka aplikasi WhatsApp.');
    });
  };

  const rawUsername = user?.name || user?.email?.split('@')[0] || 'Pengguna RY';
  const username = rawUsername.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim() || 'Pengguna RY';
  const userPhone = user?.verifiedPhone || user?.phone || '';
  const initialChar = (username[0] || 'R').toUpperCase();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.canvas }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================================ */}
        {/* 1. TOP PROFILE HEADER CARD (Apple ID Clean Style)             */}
        {/* ============================================================ */}
        <View style={[styles.profileCard, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}>
          {/* Top Quick Actions (Cart, CS, Settings) */}
          <View style={styles.topActionsRow}>
            <Pressable
              onPress={() => router.push('/(screens)/cart' as any)}
              style={[styles.actionIconBtn, { backgroundColor: colors.canvas, borderColor: colors.hairline }]}
            >
              <ShoppingCart size={17} color={colors.ink} />
              {cartCount > 0 && (
                <View style={styles.badgeCount}>
                  <Text style={styles.badgeCountText}>{cartCount}</Text>
                </View>
              )}
            </Pressable>

            <Pressable
              onPress={() => router.push('/(screens)/tickets' as any)}
              style={[styles.actionIconBtn, { backgroundColor: colors.canvas, borderColor: colors.hairline }]}
            >
              <HelpCircle size={17} color={colors.ink} />
            </Pressable>

            <Pressable
              onPress={() => router.push('/(screens)/profile-settings' as any)}
              style={[styles.actionIconBtn, { backgroundColor: colors.canvas, borderColor: colors.hairline }]}
            >
              <Settings size={17} color={colors.ink} />
            </Pressable>
          </View>

          {/* User Info Row */}
          <View style={styles.userInfoRow}>
            <Pressable
              onPress={() => router.push('/(screens)/profile-settings' as any)}
              style={[styles.avatarCircle, { backgroundColor: colors.canvas, borderColor: colors.hairline }]}
            >
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
              ) : (
                <Text style={[styles.avatarText, { color: colors.primary }]}>{initialChar}</Text>
              )}
            </Pressable>

            <View style={styles.userDetails}>
              <View style={styles.nameRow}>
                <Text style={[styles.userName, { color: colors.ink }]} numberOfLines={1}>
                  {username}
                </Text>
                <View style={[styles.roleBadge, { backgroundColor: 'rgba(41, 151, 255, 0.12)' }]}>
                  <Text style={[styles.roleBadgeText, { color: colors.primary }]}>
                    {user?.role ? user.role.toUpperCase() : 'VIP MEMBER'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.userEmail, { color: colors.inkMuted }]} numberOfLines={1}>
                {user?.email || 'Belum ada email'}
              </Text>

              {/* Connected WA Pill */}
              <Pressable
                onPress={() => router.push({ pathname: '/(screens)/profile-settings', params: { tab: 'whatsapp' } } as any)}
                style={[styles.waPill, { borderColor: 'rgba(16, 185, 129, 0.3)' }]}
              >
                <View style={styles.waDot} />
                <Text style={styles.waText}>WA: {userPhone || 'Belum diatur'}</Text>
                <ChevronRight size={12} color="#10b981" />
              </Pressable>
            </View>
          </View>

          {/* Edit Profile Button */}
          <Pressable
            style={[styles.editProfileBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(screens)/profile-settings' as any)}
          >
            <Text style={styles.editProfileBtnText}>Pengaturan Akun & Keamanan</Text>
            <ChevronRight size={14} color="#ffffff" />
          </Pressable>
        </View>

        {/* ============================================================ */}
        {/* 1.5. DEDICATED ADMIN CONTROL CARD (Owner only)                */}
        {/* ============================================================ */}
        {user?.role === 'admin' && (
          <View style={[styles.adminCard, { backgroundColor: '#0f172a', borderColor: '#1e293b' }]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#f8fafc' }}>
                  Panel Kontrol Admin (Owner)
                </Text>
                <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 8, fontWeight: '800', color: '#10b981' }}>AKTIF</Text>
                </View>
              </View>
              <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                Manajemen server, pengerjaan pesanan & database CEIR
              </Text>
            </View>
            <Pressable
              style={styles.adminOpenBtn}
              onPress={() => router.push('/(admin)' as any)}
            >
              <Text style={styles.adminOpenBtnText}>Buka Panel</Text>
            </Pressable>
          </View>
        )}

        {/* ============================================================ */}
        {/* 2. PESANAN SAYA CARD (5 Status Items Mirror Web)             */}
        {/* ============================================================ */}
        <View style={[styles.sectionCard, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.ink }]}>Pesanan Saya</Text>
            <Pressable
              onPress={() => router.push({ pathname: '/(tabs)/history', params: { tab: 'all' } } as any)}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <Text style={[styles.viewAllText, { color: colors.primary }]}>Lihat Semua</Text>
              <ChevronRight size={13} color={colors.primary} />
            </Pressable>
          </View>

          <View style={styles.orderStatusGrid}>
            {[
              { key: 'unpaid', label: 'Belum Bayar', icon: CreditCard, count: orderCounts.unpaid },
              { key: 'waiting', label: 'Menunggu', icon: Clock, count: orderCounts.waiting },
              { key: 'processing', label: 'Diproses', icon: Package, count: orderCounts.processing },
              { key: 'completed', label: 'Selesai', icon: CheckCircle2, count: orderCounts.completed },
              { key: 'canceled', label: 'Refund', icon: RotateCcw, count: orderCounts.canceled },
            ].map((st) => (
              <Pressable
                key={st.key}
                style={styles.statusCol}
                onPress={() => router.push({ pathname: '/(tabs)/history', params: { tab: st.key } } as any)}
              >
                <View style={[styles.statusIconWrap, { backgroundColor: colors.canvas, borderColor: colors.hairline }]}>
                  <st.icon size={18} color={colors.inkMuted} />
                  {st.count > 0 && (
                    <View style={styles.orderBadge}>
                      <Text style={styles.orderBadgeText}>{st.count > 99 ? '99+' : st.count}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.statusText, { color: colors.ink }]}>{st.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Quick Shortcuts */}
          <View style={[styles.divider, { backgroundColor: colors.hairline }]} />

          <Pressable
            style={styles.shortcutRow}
            onPress={() => router.push('/(screens)/add-roamer' as any)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.shortcutIcon, { backgroundColor: 'rgba(41, 151, 255, 0.12)' }]}>
                <Smartphone size={15} color={colors.primary} />
              </View>
              <Text style={[styles.shortcutTitle, { color: colors.ink }]}>Aktivasi IMEI & CEIR</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.shortcutAction, { color: colors.primary }]}>Order Sekarang</Text>
              <ChevronRight size={13} color={colors.primary} />
            </View>
          </Pressable>

          <Pressable
            style={styles.shortcutRow}
            onPress={() => router.push('/(screens)/cek-garansi' as any)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.shortcutIcon, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                <ShieldCheck size={15} color="#10b981" />
              </View>
              <Text style={[styles.shortcutTitle, { color: colors.ink }]}>Lacak Nota & Garansi Digital</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.shortcutAction, { color: '#10b981' }]}>Garansi Resmi</Text>
              <ChevronRight size={13} color="#10b981" />
            </View>
          </Pressable>
        </View>

        {/* ============================================================ */}
        {/* 3. DOMPET & KEUANGAN SAYA (4 Grid Items)                     */}
        {/* ============================================================ */}
        <View style={[styles.sectionCard, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}>
          <Text style={[styles.sectionTitle, { color: colors.ink, marginBottom: 12 }]}>
            Dompet & Keuangan Saya
          </Text>

          <View style={styles.walletGrid}>
            {/* 1. RyPay */}
            <Pressable
              style={styles.walletTile}
              onPress={() => router.push('/(screens)/topup' as any)}
            >
              <View style={[styles.walletTileIcon, { backgroundColor: 'rgba(41, 151, 255, 0.12)' }]}>
                <Wallet size={18} color={colors.primary} />
              </View>
              <Text style={[styles.walletTileName, { color: colors.ink }]}>RyPay</Text>
              <Text style={[styles.walletTileVal, { color: colors.primary }]}>
                Rp {(user?.balance || 0).toLocaleString('id-ID')}
              </Text>
            </Pressable>

            {/* 2. RyPoints */}
            <Pressable
              style={styles.walletTile}
              onPress={() => router.push('/(screens)/games' as any)}
            >
              <View style={[styles.walletTileIcon, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                <Sparkles size={18} color="#f59e0b" />
              </View>
              <Text style={[styles.walletTileName, { color: colors.ink }]}>RyPoints</Text>
              <Text style={[styles.walletTileVal, { color: '#f59e0b' }]}>
                {(user?.coins || 0).toLocaleString('id-ID')} Koin
              </Text>
            </Pressable>

            {/* 3. Voucher */}
            <Pressable
              style={styles.walletTile}
              onPress={() => router.push('/(screens)/vouchers' as any)}
            >
              <View style={[styles.walletTileIcon, { backgroundColor: 'rgba(6, 182, 212, 0.12)' }]}>
                <Ticket size={18} color="#06b6d4" />
              </View>
              <Text style={[styles.walletTileName, { color: colors.ink }]}>Voucher</Text>
              <Text style={[styles.walletTileVal, { color: '#06b6d4' }]}>
                {vouchersCount} Kupon
              </Text>
            </Pressable>

            {/* 4. Referral */}
            <Pressable
              style={styles.walletTile}
              onPress={() => router.push('/(screens)/referral' as any)}
            >
              <View style={[styles.walletTileIcon, { backgroundColor: 'rgba(168, 85, 247, 0.12)' }]}>
                <Gift size={18} color="#a855f7" />
              </View>
              <Text style={[styles.walletTileName, { color: colors.ink }]}>Referral</Text>
              <Text style={[styles.walletTileVal, { color: '#a855f7' }]}>Komisi Saldo</Text>
            </Pressable>
          </View>
        </View>

        {/* ============================================================ */}
        {/* 4. FITUR & LAYANAN TAMBAHAN (Identik Web Mode)              */}
        {/* ============================================================ */}
        <View style={[styles.sectionCard, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}>
          <Text style={[styles.sectionTitle, { color: colors.ink, marginBottom: 12 }]}>
            Fitur & Layanan Tambahan
          </Text>

          {/* Program Referral Reseller */}
          <Pressable
            style={styles.menuRow}
            onPress={() => router.push('/(screens)/referral' as any)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                <Gift size={16} color="#f59e0b" />
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.menuTitle, { color: colors.ink }]}>Program Referral Reseller</Text>
                  <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#f59e0b' }}>KOMISI SALDO</Text>
                  </View>
                </View>
                <Text style={[styles.menuSub, { color: colors.inkMuted }]}>Ajak teman dan dapatkan komisi saldo otomatis</Text>
              </View>
            </View>
            <ChevronRight size={14} color={colors.inkMuted} />
          </Pressable>

          {/* Payment Gateway SaaS */}
          <Pressable
            style={styles.menuRow}
            onPress={() => router.push('/(screens)/gateway' as any)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(6, 182, 212, 0.12)' }]}>
                <CreditCard size={16} color="#06b6d4" />
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.menuTitle, { color: colors.ink }]}>Payment Gateway GoPay & QRIS</Text>
                  <View style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#06b6d4' }}>RP 10RB/BLN</Text>
                  </View>
                </View>
                <Text style={[styles.menuSub, { color: colors.inkMuted }]}>Terima pembayaran QRIS otomatis di website / bot Anda</Text>
              </View>
            </View>
            <ChevronRight size={14} color={colors.inkMuted} />
          </Pressable>
        </View>

        {/* ============================================================ */}
        {/* 5. MENU PENGATURAN AKUN & KEAMANAN                            */}
        {/* ============================================================ */}
        <View style={[styles.sectionCard, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}>
          <Text style={[styles.sectionTitle, { color: colors.ink, marginBottom: 12 }]}>
            Akun & Keamanan
          </Text>

          <Pressable
            style={styles.menuRow}
            onPress={() => router.push({ pathname: '/(screens)/profile-settings', params: { tab: 'profile' } } as any)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(41, 151, 255, 0.12)' }]}>
                <UserIcon size={16} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: colors.ink }]}>Pengaturan Profil & Data Diri</Text>
                <Text style={[styles.menuSub, { color: colors.inkMuted }]}>Ubah foto profil, nama lengkap, dan data akun</Text>
              </View>
            </View>
            <ChevronRight size={14} color={colors.inkMuted} />
          </Pressable>

          <Pressable
            style={styles.menuRow}
            onPress={() => router.push({ pathname: '/(screens)/profile-settings', params: { tab: 'whatsapp' } } as any)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                <Smartphone size={16} color="#10b981" />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: colors.ink }]}>Nomor WhatsApp Notifikasi</Text>
                <Text style={[styles.menuSub, { color: colors.inkMuted }]}>Terima nota invoice QRIS dan status pesanan otomatis</Text>
              </View>
            </View>
            <ChevronRight size={14} color={colors.inkMuted} />
          </Pressable>

          <Pressable
            style={styles.menuRow}
            onPress={() => router.push({ pathname: '/(screens)/profile-settings', params: { tab: 'password' } } as any)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                <Lock size={16} color="#f59e0b" />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: colors.ink }]}>Keamanan & Kata Sandi</Text>
                <Text style={[styles.menuSub, { color: colors.inkMuted }]}>Kelola kata sandi akun dan verifikasi email OTP</Text>
              </View>
            </View>
            <ChevronRight size={14} color={colors.inkMuted} />
          </Pressable>
        </View>

        {/* ============================================================ */}
        {/* 6. PUSAT BANTUAN & CS WHATSAPP 24 JAM                        */}
        {/* ============================================================ */}
        <View style={[styles.sectionCard, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}>
          <Text style={[styles.sectionTitle, { color: colors.ink, marginBottom: 12 }]}>
            Pusat Bantuan & Layanan
          </Text>

          <Pressable
            style={styles.menuRow}
            onPress={() => handleContactWhatsApp('6288706611370')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                <MessageCircle size={16} color="#10b981" />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: colors.ink }]}>CS Admin 1 (WhatsApp)</Text>
                <Text style={[styles.menuSub, { color: colors.inkMuted }]}>+62 887-0661-1370</Text>
              </View>
            </View>
            <ChevronRight size={14} color={colors.inkMuted} />
          </Pressable>

          <Pressable
            style={styles.menuRow}
            onPress={() => handleContactWhatsApp('6287767287284')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(6, 182, 212, 0.12)' }]}>
                <MessageCircle size={16} color="#06b6d4" />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: colors.ink }]}>CS Admin 2 (WhatsApp)</Text>
                <Text style={[styles.menuSub, { color: colors.inkMuted }]}>+62 877-6728-7284</Text>
              </View>
            </View>
            <ChevronRight size={14} color={colors.inkMuted} />
          </Pressable>

          <Pressable
            style={styles.menuRow}
            onPress={() => router.push('/(screens)/tickets' as any)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(41, 151, 255, 0.12)' }]}>
                <HelpCircle size={16} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: colors.ink }]}>Tiket Bantuan Resmi</Text>
                <Text style={[styles.menuSub, { color: colors.inkMuted }]}>Kirim pertanyaan / komplain</Text>
              </View>
            </View>
            <ChevronRight size={14} color={colors.inkMuted} />
          </Pressable>

          <Pressable
            style={styles.menuRow}
            onPress={() => router.push('/(screens)/cek-garansi' as any)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                <ShieldCheck size={16} color="#10b981" />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: colors.ink }]}>Cek Status & Garansi Layanan</Text>
                <Text style={[styles.menuSub, { color: colors.inkMuted }]}>Verifikasi IMEI, masa aktif sinyal & nota</Text>
              </View>
            </View>
            <ChevronRight size={14} color={colors.inkMuted} />
          </Pressable>

          {/* Logout Button */}
          <Pressable
            style={[styles.logoutBtn, { borderColor: 'rgba(255, 69, 58, 0.25)' }]}
            onPress={handleLogout}
          >
            <LogOut size={16} color="#ff453a" style={{ marginRight: 8 }} />
            <Text style={styles.logoutBtnText}>Keluar dari Akun</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  orderBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ff453a',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  profileCard: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    marginBottom: 16,
  },
  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 12,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeCount: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ff453a',
    borderRadius: 8,
    minWidth: 15,
    height: 15,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCountText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '800',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
  },
  userDetails: {
    flex: 1,
    marginLeft: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
    flexShrink: 1,
  },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 8,
    fontWeight: '800',
  },
  userEmail: {
    fontSize: 12,
    marginBottom: 6,
  },
  waPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 5,
  },
  waDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10b981',
  },
  waText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
  },
  editProfileBtn: {
    height: 42,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  editProfileBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  adminCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  adminOpenBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  adminOpenBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionCard: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '700',
  },
  orderStatusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusCol: {
    alignItems: 'center',
    width: '18%',
  },
  statusIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 14,
  },
  shortcutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  shortcutIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  shortcutAction: {
    fontSize: 11,
    fontWeight: '700',
  },
  walletGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  walletTile: {
    alignItems: 'center',
    width: '23%',
  },
  walletTileIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  walletTileName: {
    fontSize: 11,
    fontWeight: '700',
  },
  walletTileVal: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
    textAlign: 'center',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  menuSub: {
    fontSize: 10,
    marginTop: 1,
  },
  logoutBtn: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 69, 58, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  logoutBtnText: {
    color: '#ff453a',
    fontSize: 13,
    fontWeight: '700',
  },
});
