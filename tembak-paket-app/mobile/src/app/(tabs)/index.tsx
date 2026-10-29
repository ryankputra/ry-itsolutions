import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
  Dimensions,
  TextInput,
  Image,
  Animated,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Search,
  ShoppingCart,
  Wallet,
  Coins,
  Ticket,
  Plus,
  Eye,
  EyeOff,
  Smartphone,
  ShieldCheck,
  FileCheck,
  Sparkles,
  QrCode,
  Music,
  HelpCircle,
  ChevronRight,
  Flame,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Share2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';
import { analyzeImei, ImeiAnalysis } from '../../utils/imeiHelper';
import { InvoiceModal, InvoiceData } from '../../components/ui/InvoiceModal';

const { width } = Dimensions.get('window');

// 9 Hero Promo Carousel Slides (Identical to frontend-v2/src/app/(main)/dashboard/page.tsx)
const HERO_SLIDES = [
  {
    title: 'INSTANT DEALS ADD ROAMER KILAT',
    subtitle: 'Aktivasi IMEI All Operator kilat 24 jam dengan garansi digital resmi & nota transaksi.',
    badge: 'LAYANAN UTAMA',
    ctaText: 'BELI SEKARANG >',
    ctaLink: '/(screens)/add-roamer',
    bgGradient: ['#0f172a', '#1e3a8a'],
    accent: '#2997ff',
  },
  {
    title: '🚀 Ingin Pasang Banner Iklan Bisnis Anda di Sini?',
    subtitle: 'Dilihat puluhan ribu pengguna aktif transaksi setiap hari. Promosikan toko, bot WhatsApp, atau produk Anda!',
    badge: 'SPONSOR RESMI & PROMO',
    ctaText: 'HUBUNGI PASANG IKLAN >',
    ctaLink: 'https://wa.me/6287767287284?text=Halo%20Admin,%20saya%20ingin%20pasang%20banner%20iklan%20di%20Ry-ITSolutions',
    bgGradient: ['#1e1b4b', '#172554'],
    accent: '#60a5fa',
    isWa: true,
  },
  {
    title: 'PAYMENT GATEWAY GOPAY & QRIS',
    subtitle: 'Terima pembayaran QRIS otomatis di web & bot toko Anda. Uang langsung masuk rekening GoPay.',
    badge: 'UNOFFICIAL SAAS',
    ctaText: 'MULAI INTEGRASI >',
    ctaLink: '/(screens)/gateway',
    bgGradient: ['#042f2e', '#0f172a'],
    accent: '#2dd4bf',
  },
  {
    title: 'PENDAFTARAN & CEK STATUS CEIR',
    subtitle: 'Verifikasi status CEIR resmi Kemenperin & pendaftaran Bea Cukai perangkat Anda.',
    badge: 'CEIR RESMI',
    ctaText: 'CEK STATUS >',
    ctaLink: '/(screens)/cek-ceir',
    bgGradient: ['#064e3b', '#0f172a'],
    accent: '#34d399',
  },
  {
    title: 'GARANSI & NOTA DIGITAL RESMI',
    subtitle: 'Lacak sisa masa aktif garansi IMEI dan unduh cetak nota transaksi kapan saja.',
    badge: 'GARANSI AKTIF',
    ctaText: 'CEK GARANSI >',
    ctaLink: '/(screens)/cek-garansi',
    bgGradient: ['#312e81', '#0f172a'],
    accent: '#818cf8',
  },
  {
    title: 'AJAK TEMAN & DAPATKAN KOMISI',
    subtitle: 'Bagikan link referral Anda dan peroleh komisi saldo otomatis dari tiap transaksi.',
    badge: 'BONUS REFERRAL',
    ctaText: 'KLAIM CUAN >',
    ctaLink: '/(screens)/referral',
    bgGradient: ['#78350f', '#451a03'],
    accent: '#fbbf24',
  },
  {
    title: 'VOUCHER DISKON TRANSAKSI',
    subtitle: 'Klaim kupon diskon tambahan sebelum checkout untuk hemat belanja maksimal.',
    badge: 'PROMO SPESIAL',
    ctaText: 'KLAIM VOUCHER >',
    ctaLink: '/(screens)/vouchers',
    bgGradient: ['#581c87', '#3b0764'],
    accent: '#c084fc',
  },
  {
    title: 'CHECK-IN HARIAN & PUTAR RODA HOKI',
    subtitle: 'Kumpulkan RyPoints gratis setiap hari untuk potongan harga saat order.',
    badge: 'REWARD KOIN',
    ctaText: 'MAIN SEKARANG >',
    ctaLink: '/(tabs)/games',
    bgGradient: ['#164e63', '#083344'],
    accent: '#22d3ee',
  },
  {
    title: 'HIBURAN SPOTIFY & MUSIK TOP HITS',
    subtitle: 'Putar 160+ lagu hits Spotify: Bernadya, Rizky Febian, Njan, Adrian Khalif & Top Charts.',
    badge: 'SPOTIFY HITS',
    ctaText: 'PUTAR SPOTIFY >',
    ctaLink: '/(screens)/hiburan',
    bgGradient: ['#064e3b', '#022c22'],
    accent: '#1ed760',
  },
];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const colors = Colors.dark;

  const [refreshing, setRefreshing] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [vouchersCount, setVouchersCount] = useState(0);
  const [recentTrx, setRecentTrx] = useState<any[]>([]);
  const [allTrx, setAllTrx] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [cartCount, setCartCount] = useState(0);

  // Auto-rotate Carousel every 6s
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      await refreshUser();
      
      // Fetch vouchers
      try {
        const vRes = await apiClient.get('/coupons/public');
        if (vRes.data?.status && Array.isArray(vRes.data.data)) {
          setVouchersCount(vRes.data.data.length);
        }
      } catch {}

      // Fetch user transactions
      try {
        const tRes = await apiClient.get('/user/transactions');
        if (tRes.data?.status && Array.isArray(tRes.data.data)) {
          const sorted = [...tRes.data.data].sort((a, b) => {
            const timeA = new Date(a.createdAt || 0).getTime() || 0;
            const timeB = new Date(b.createdAt || 0).getTime() || 0;
            return timeB - timeA;
          });
          setAllTrx(sorted);
          setRecentTrx(sorted.slice(0, 5));
        }
      } catch {}

      // Fetch cart count
      try {
        const cRes = await apiClient.get('/user/cart');
        if (cRes.data?.status && Array.isArray(cRes.data.data)) {
          setCartCount(cRes.data.data.length);
        }
      } catch {}
    } catch (e) {
      // Graceful
    }
  }, [refreshUser]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await fetchDashboardData();
    setRefreshing(false);
  };

  const toggleBalance = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setShowBalance((prev) => !prev);
  };

  // Instant Search & IMEI analysis
  const cleanSearch = searchQuery.trim().toLowerCase();
  const detectedDevice = cleanSearch.length >= 8 ? analyzeImei(cleanSearch) : null;
  const filteredTrx = cleanSearch.length >= 3
    ? allTrx.filter((t) => {
        const matchId = t.id && t.id.toLowerCase().includes(cleanSearch);
        const matchImei = t.imei && t.imei.toLowerCase().includes(cleanSearch);
        const matchPhone = t.targetPhone && t.targetPhone.toLowerCase().includes(cleanSearch);
        return matchId || matchImei || matchPhone;
      }).slice(0, 5)
    : [];

  const handleCtaPress = (slide: typeof HERO_SLIDES[0]) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (slide.isWa) {
      Linking.openURL(slide.ctaLink);
    } else {
      router.push(slide.ctaLink as any);
    }
  };

  // 8 Active Service Grid Items from web (No Beli Paket)
  const serviceGrid = [
    {
      id: 'add-roamer',
      name: 'Add Roamer',
      icon: Smartphone,
      iconColor: colors.primary,
      iconBg: 'rgba(41, 151, 255, 0.12)',
      route: '/(screens)/add-roamer',
    },
    {
      id: 'cek-ceir',
      name: 'Layanan CEIR',
      icon: ShieldCheck,
      iconColor: colors.success,
      iconBg: 'rgba(48, 209, 88, 0.12)',
      route: '/(screens)/cek-ceir',
    },
    {
      id: 'cek-garansi',
      name: 'Cek Garansi',
      icon: FileCheck,
      iconColor: colors.indigo,
      iconBg: 'rgba(94, 92, 230, 0.12)',
      route: '/(screens)/cek-garansi',
    },
    {
      id: 'vouchers',
      name: 'Voucher',
      icon: Ticket,
      iconColor: colors.pink,
      iconBg: 'rgba(255, 55, 95, 0.12)',
      route: '/(screens)/vouchers',
    },
    {
      id: 'games',
      name: 'Game Koin',
      icon: Sparkles,
      iconColor: colors.warning,
      iconBg: 'rgba(255, 159, 10, 0.12)',
      route: '/(tabs)/games',
    },
    {
      id: 'gateway',
      name: 'Gateway GoPay',
      badge: 'Unoff',
      icon: QrCode,
      iconColor: colors.info,
      iconBg: 'rgba(100, 210, 255, 0.12)',
      route: '/(screens)/gateway',
    },
    {
      id: 'hiburan',
      name: 'Hiburan',
      badge: 'Spotify',
      icon: Music,
      iconColor: colors.spotify,
      iconBg: 'rgba(30, 215, 96, 0.12)',
      route: '/(screens)/hiburan',
    },
    {
      id: 'panduan',
      name: 'Panduan',
      icon: HelpCircle,
      iconColor: colors.purple,
      iconBg: 'rgba(191, 90, 242, 0.12)',
      route: '/(screens)/tickets',
    },
  ];

  const currentHero = HERO_SLIDES[currentSlide];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.canvas }]} edges={['top']}>
      {/* ============================================================ */}
      {/* MOBILE TOP HEADER (EcommerceHeader 1:1 Parity)               */}
      {/* ============================================================ */}
      <View style={[styles.topHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchPill, { backgroundColor: colors.searchBg }]}>
          <Search size={16} color={colors.inkMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari layanan, ketik IMEI..."
            placeholderTextColor={colors.inkMuted}
            style={[styles.searchInput, { color: colors.ink }]}
            returnKeyType="search"
          />
        </View>

        <Pressable
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
            router.push('/(screens)/cart');
          }}
          style={styles.cartIconBtn}
        >
          <ShoppingCart size={22} color={colors.ink} />
          {cartCount > 0 && (
            <View style={[styles.cartBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ============================================================ */}
        {/* 1. FLOATING WALLET STRIP (Apple/Fintech Minimalist)           */}
        {/* ============================================================ */}
        <View style={[styles.walletCard, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}>
          {/* Top Row: RyPay Balance + Top Up Button */}
          <View style={styles.walletTopRow}>
            <Pressable
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                router.push('/(screens)/topup');
              }}
              style={styles.walletInfoWrap}
            >
              <View style={styles.walletLabelRow}>
                <View style={[styles.walletIconSmall, { backgroundColor: 'rgba(41, 151, 255, 0.12)' }]}>
                  <Wallet size={12} color={colors.primary} />
                </View>
                <Text style={[styles.walletTitle, { color: colors.ink }]}>RyPay</Text>
              </View>

              <View style={styles.balanceRow}>
                <Text style={[styles.balanceText, { color: colors.ink }]}>
                  {showBalance ? `Rp ${(user?.balance || 0).toLocaleString('id-ID')}` : 'Rp ••••••••'}
                </Text>
                <Pressable onPress={toggleBalance} hitSlop={12} style={styles.eyeBtn}>
                  {showBalance ? (
                    <Eye size={16} color={colors.inkMuted} />
                  ) : (
                    <EyeOff size={16} color={colors.inkMuted} />
                  )}
                </Pressable>
              </View>
            </Pressable>

            {/* Top Up Pill Button */}
            <Pressable
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
                router.push('/(screens)/topup');
              }}
              style={[styles.topupBtn, { backgroundColor: colors.primary }]}
            >
              <Plus size={14} color="#ffffff" strokeWidth={2.5} />
              <Text style={styles.topupBtnText}>Top Up</Text>
            </Pressable>
          </View>

          {/* Divider */}
          <View style={[styles.walletDivider, { backgroundColor: colors.border }]} />

          {/* Bottom Row: RyPoints & Voucher (50-50 Split) */}
          <View style={styles.walletBottomRow}>
            {/* RyPoints */}
            <Pressable
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                router.push('/(tabs)/games');
              }}
              style={styles.walletHalfCol}
            >
              <View style={styles.walletMiniIconRow}>
                <View style={[styles.walletMiniBox, { backgroundColor: 'rgba(255, 159, 10, 0.12)' }]}>
                  <Coins size={14} color={colors.warning} />
                </View>
                <View>
                  <Text style={[styles.walletMiniLabel, { color: colors.inkMuted }]}>RyPoints</Text>
                  <Text style={[styles.walletMiniVal, { color: colors.ink }]}>
                    {(user?.coins || 0).toLocaleString('id-ID')}
                  </Text>
                </View>
              </View>
              <Text style={[styles.walletActionLink, { color: colors.primary }]}>Klaim →</Text>
            </Pressable>

            {/* Voucher */}
            <Pressable
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                router.push('/(screens)/vouchers');
              }}
              style={[styles.walletHalfCol, styles.walletHalfRight, { borderLeftColor: colors.border }]}
            >
              <View style={styles.walletMiniIconRow}>
                <View style={[styles.walletMiniBox, { backgroundColor: 'rgba(255, 55, 95, 0.12)' }]}>
                  <Ticket size={14} color={colors.pink} />
                </View>
                <View>
                  <Text style={[styles.walletMiniLabel, { color: colors.inkMuted }]}>Voucher</Text>
                  <Text style={[styles.walletMiniVal, { color: colors.ink }]}>
                    {vouchersCount > 0 ? `${vouchersCount} Kupon` : 'Klaim'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.walletActionLink, { color: colors.primary }]}>Promo →</Text>
            </Pressable>
          </View>
        </View>

        {/* ============================================================ */}
        {/* 2. 8-GRID FEATURE SERVICE (1:1 Web Parity)                    */}
        {/* ============================================================ */}
        <View style={[styles.gridCard, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}>
          <View style={styles.gridRow}>
            {serviceGrid.map((item) => {
              const IconComp = item.icon;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                    router.push(item.route as any);
                  }}
                  style={styles.gridItem}
                >
                  <View style={[styles.gridIconBox, { backgroundColor: item.iconBg }]}>
                    <IconComp size={22} color={item.iconColor} strokeWidth={2} />
                    {item.badge && (
                      <View style={[styles.gridBadge, { backgroundColor: colors.surfaceTile }]}>
                        <Text style={styles.gridBadgeText}>{item.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.gridItemLabel, { color: colors.ink }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ============================================================ */}
        {/* 3. HERO PROMO DEALS BANNER SLIDER                           */}
        {/* ============================================================ */}
        <Pressable
          onPress={() => handleCtaPress(currentHero)}
          style={[styles.heroBannerWrap, { borderColor: colors.hairline, backgroundColor: currentHero.bgGradient[0] }]}
        >
          {/* Subtle Glow Accent */}
          <View style={[styles.bannerAccentGlow, { backgroundColor: currentHero.accent }]} />

          <View style={styles.bannerContent}>
            <View style={styles.bannerBadgeWrap}>
              <View style={[styles.bannerBadge, { backgroundColor: 'rgba(0, 0, 0, 0.45)', borderColor: 'rgba(255, 255, 255, 0.2)' }]}>
                <Text style={styles.bannerBadgeText}>{currentHero.badge}</Text>
              </View>
            </View>

            <Text style={styles.bannerTitle} numberOfLines={2}>
              {currentHero.title}
            </Text>
            <Text style={styles.bannerSubtitle} numberOfLines={2}>
              {currentHero.subtitle}
            </Text>

            <View style={styles.bannerFooter}>
              <View style={styles.bannerCtaBtn}>
                <Text style={[styles.bannerCtaText, { color: colors.primary }]}>{currentHero.ctaText}</Text>
              </View>

              {/* Slide Indicators */}
              <View style={styles.indicatorsWrap}>
                {HERO_SLIDES.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.indicatorDot,
                      currentSlide === idx ? styles.indicatorActive : styles.indicatorInactive,
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>
        </Pressable>

        {/* ============================================================ */}
        {/* 4. 2-COLUMN DISCOVERY SECTION                               */}
        {/* ============================================================ */}
        <View style={styles.discoveryRow}>
          {/* Left: Sinyal Live */}
          <Pressable
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              router.push('/(screens)/add-roamer');
            }}
            style={[styles.discoveryCard, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}
          >
            <View style={styles.discoveryHeader}>
              <View style={styles.discoveryHeaderLeft}>
                <Text style={[styles.discoveryTitle, { color: colors.ink }]}>Sinyal Live</Text>
                <ChevronRight size={13} color={colors.primary} />
              </View>
              <View style={styles.badge24Jam}>
                <View style={styles.pulseDot} />
                <Text style={styles.badge24JamText}>24 JAM</Text>
              </View>
            </View>

            <View style={[styles.discoveryInnerBox, { backgroundColor: 'rgba(41, 151, 255, 0.08)', borderColor: 'rgba(41, 151, 255, 0.2)' }]}>
              <View style={[styles.discoveryInnerIcon, { backgroundColor: 'rgba(41, 151, 255, 0.15)' }]}>
                <Smartphone size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.discoveryInnerTitle, { color: colors.ink }]} numberOfLines={1}>ADD ROAMER</Text>
                <Text style={[styles.discoveryInnerSub, { color: colors.inkMuted }]} numberOfLines={1}>Semua Operator</Text>
              </View>
            </View>
          </Pressable>

          {/* Right: Garansi & Nota */}
          <Pressable
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              router.push('/(screens)/cek-garansi');
            }}
            style={[styles.discoveryCard, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}
          >
            <View style={styles.discoveryHeader}>
              <View style={styles.discoveryHeaderLeft}>
                <Text style={[styles.discoveryTitle, { color: colors.ink }]}>Garansi & Nota</Text>
                <ChevronRight size={13} color="#30D158" />
              </View>
              <View style={styles.badgeResmi}>
                <Text style={styles.badgeResmiText}>RESMI</Text>
              </View>
            </View>

            <View style={[styles.discoveryInnerBox, { backgroundColor: 'rgba(48, 209, 88, 0.08)', borderColor: 'rgba(48, 209, 88, 0.2)' }]}>
              <View style={[styles.discoveryInnerIcon, { backgroundColor: 'rgba(48, 209, 88, 0.15)' }]}>
                <FileCheck size={16} color="#30D158" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.discoveryInnerTitle, { color: colors.ink }]} numberOfLines={1}>LACAK MASA AKTIF</Text>
                <Text style={[styles.discoveryInnerSub, { color: colors.inkMuted }]} numberOfLines={1}>Cetak Nota Digital</Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* ============================================================ */}
        {/* 5. VOUCHER & BEST SELLER SECTION                            */}
        {/* ============================================================ */}
        <View style={styles.discoveryRow}>
          {/* Left: Voucher Obsidian */}
          <Pressable
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              router.push('/(screens)/vouchers');
            }}
            style={[styles.voucherObsidianCard, { backgroundColor: '#111827', borderColor: '#1f2937' }]}
          >
            <View>
              <View style={styles.voucherWhiteBadge}>
                <Text style={[styles.voucherWhiteBadgeText, { color: colors.primary }]}>VOUCHER DISKON</Text>
              </View>
              <Text style={styles.voucherCardTitle}>KLAIM KUPON HEMAT</Text>
              <Text style={styles.voucherCardSub}>Gunakan saat checkout pesanan</Text>
            </View>

            <View style={styles.voucherLihatBtn}>
              <Text style={[styles.voucherLihatBtnText, { color: colors.primary }]}>LIHAT KUPON</Text>
              <ChevronRight size={12} color={colors.primary} />
            </View>
          </Pressable>

          {/* Right: Best Seller Product */}
          <Pressable
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              router.push('/(screens)/add-roamer');
            }}
            style={[styles.productCard, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}
          >
            <View>
              <View style={[styles.productVisualBox, { backgroundColor: 'rgba(41, 151, 255, 0.1)' }]}>
                <Smartphone size={28} color={colors.primary} />
              </View>

              <View style={styles.populerBadge}>
                <Text style={styles.populerBadgeText}>POPULER</Text>
              </View>

              <Text style={[styles.productTitle, { color: colors.ink }]} numberOfLines={1}>
                Paket Add Roamer All Operator
              </Text>
              <Text style={[styles.productRating, { color: colors.inkMuted }]}>
                ⭐ 4.9/5.0 • 1 Bln Resmi
              </Text>
            </View>

            <Text style={[styles.productPrice, { color: colors.primary }]}>Mulai Rp 155RB</Text>
          </Pressable>
        </View>

        {/* ============================================================ */}
        {/* 6. BONUS REFERRAL BANNER                                    */}
        {/* ============================================================ */}
        <Pressable
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
            router.push('/(screens)/referral');
          }}
          style={styles.referralBanner}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <View style={styles.referralBadge}>
              <Text style={styles.referralBadgeText}>BONUS REFERRAL</Text>
            </View>
            <Text style={styles.referralTitle}>Ajak Teman & Dapatkan Komisi Saldo</Text>
            <Text style={styles.referralSub}>Bagikan link referral dan peroleh bonus komisi tiap transaksi</Text>
          </View>

          <View style={styles.referralBtn}>
            <Text style={styles.referralBtnText}>Klaim Cuan &gt;</Text>
          </View>
        </Pressable>

        {/* ============================================================ */}
        {/* 7. INSTANT SEARCH BAR / IMEI SCANNER                        */}
        {/* ============================================================ */}
        <View style={styles.scannerSection}>
          <View style={[styles.scannerInputBox, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}>
            <Search size={16} color={colors.inkMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Cari cepat: Ketik/Paste IMEI (15 digit) atau ID Trx..."
              placeholderTextColor={colors.inkMuted}
              style={[styles.scannerInput, { color: colors.ink }]}
            />
          </View>

          {/* Quick Detected Brand Result */}
          {detectedDevice?.brand ? (
            <View style={[styles.deviceDetectBox, { backgroundColor: 'rgba(41, 151, 255, 0.08)', borderColor: 'rgba(41, 151, 255, 0.25)' }]}>
              <View style={styles.deviceDetectLeft}>
                <View style={[styles.deviceIconBox, { backgroundColor: colors.primary }]}>
                  <Smartphone size={16} color="#ffffff" />
                </View>
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={[styles.deviceDetectName, { color: colors.ink }]}>
                    {detectedDevice.brand} {detectedDevice.model}
                  </Text>
                  <Text style={[styles.deviceDetectImei, { color: colors.inkMuted }]}>
                    IMEI: {cleanSearch}
                  </Text>
                </View>
              </View>

              <View style={styles.deviceDetectActions}>
                <Pressable
                  onPress={() => router.push(`/(screens)/cek-garansi?imei=${cleanSearch}` as any)}
                  style={[styles.detectBtnOutline, { borderColor: colors.border }]}
                >
                  <Text style={[styles.detectBtnOutlineText, { color: colors.ink }]}>Garansi</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push(`/(screens)/add-roamer?imei=${cleanSearch}` as any)}
                  style={[styles.detectBtnPrimary, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.detectBtnPrimaryText}>Unblock</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* Live Matching Transactions */}
          {filteredTrx.length > 0 && (
            <View style={[styles.searchResultBox, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}>
              <Text style={[styles.searchResultHead, { color: colors.inkMuted }]}>TRANSAKSI DITEMUKAN:</Text>
              {filteredTrx.map((trx) => (
                <View key={trx.id} style={[styles.searchResultItem, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.searchTrxTitle, { color: colors.ink }]}>{trx.packageName || 'Add Roamer'}</Text>
                    <Text style={[styles.searchTrxSub, { color: colors.inkMuted }]}>
                      IMEI: {trx.imei || trx.targetPhone} • #{trx.id?.substring(0, 10)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setSelectedInvoice(trx)}
                    style={[styles.notaBtn, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.notaBtnText, { color: colors.primary }]}>Nota</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ============================================================ */}
        {/* 8. RIWAYAT TRANSAKSI TERAKHIR                               */}
        {/* ============================================================ */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <View style={styles.historyTitleWrap}>
              <Clock size={16} color={colors.primary} />
              <Text style={[styles.historyTitle, { color: colors.ink }]}>Riwayat Transaksi Terakhir</Text>
            </View>
            <Pressable
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                router.push('/(tabs)/history');
              }}
              style={styles.seeAllBtn}
            >
              <Text style={[styles.seeAllText, { color: colors.primary }]}>Lihat Semua</Text>
              <ChevronRight size={13} color={colors.primary} />
            </Pressable>
          </View>

          {recentTrx.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}>
              <Text style={[styles.emptyText, { color: colors.inkMuted }]}>Belum ada transaksi.</Text>
            </View>
          ) : (
            <View style={styles.trxList}>
              {recentTrx.map((trx, idx) => {
                const isSuccess = trx.status === 'success' || trx.status === 'completed';
                const isPending = trx.status === 'pending';
                return (
                  <Pressable
                    key={trx.id || idx}
                    onPress={() => setSelectedInvoice(trx)}
                    style={[styles.trxCard, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}
                  >
                    <View style={styles.trxLeft}>
                      <View style={[styles.trxIconBox, { backgroundColor: colors.searchBg, borderColor: colors.border }]}>
                        <Smartphone size={16} color={colors.ink} strokeWidth={1.8} />
                      </View>
                      <View style={styles.trxTexts}>
                        <Text style={[styles.trxName, { color: colors.ink }]} numberOfLines={1}>
                          {trx.packageName || 'Layanan IMEI'}
                        </Text>
                        <Text style={[styles.trxSub, { color: colors.inkMuted }]} numberOfLines={1}>
                          {trx.imei ? (trx.imei.split(',').length > 1 ? `${trx.imei.split(',')[0]} (+${trx.imei.split(',').length - 1})` : trx.imei) : trx.targetPhone || '-'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.trxRight}>
                      <Text style={[styles.trxAmount, { color: colors.ink }]}>
                        Rp {(trx.amount || trx.price || 0).toLocaleString('id-ID')}
                      </Text>
                      <View
                        style={[
                          styles.trxStatusBadge,
                          {
                            backgroundColor: isSuccess
                              ? 'rgba(48, 209, 88, 0.12)'
                              : isPending
                              ? 'rgba(255, 159, 10, 0.12)'
                              : 'rgba(255, 69, 58, 0.12)',
                            borderColor: isSuccess
                              ? 'rgba(48, 209, 88, 0.3)'
                              : isPending
                              ? 'rgba(255, 159, 10, 0.3)'
                              : 'rgba(255, 69, 58, 0.3)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.trxStatusText,
                            { color: isSuccess ? '#30D158' : isPending ? '#FF9F0A' : '#FF453A' },
                          ]}
                        >
                          {(trx.status === 'completed' ? 'SUCCESS' : trx.status || 'SUCCESS').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Interactive Invoice Modal */}
      <InvoiceModal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        data={selectedInvoice}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchPill: {
    flex: 1,
    height: 38,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 8,
    fontSize: 12,
  },
  cartIconBtn: {
    padding: 6,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 14,
  },
  // Wallet
  walletCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 2,
  },
  walletTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletInfoWrap: {
    flex: 1,
  },
  walletLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  walletIconSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  balanceText: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: -0.3,
  },
  eyeBtn: {
    padding: 4,
  },
  topupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: '#0071e3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  topupBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  walletDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  walletBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletHalfCol: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 10,
  },
  walletHalfRight: {
    paddingRight: 0,
    paddingLeft: 10,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  walletMiniIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walletMiniBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletMiniLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  walletMiniVal: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginTop: 1,
  },
  walletActionLink: {
    fontSize: 10,
    fontWeight: '700',
  },
  // Grid
  gridCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 10,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  gridItem: {
    width: '25%',
    alignItems: 'center',
  },
  gridIconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gridBadge: {
    position: 'absolute',
    top: -5,
    right: -6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  gridBadgeText: {
    color: '#ffffff',
    fontSize: 7,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  gridItemLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  // Hero Banner
  heroBannerWrap: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 165,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 3,
  },
  bannerAccentGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.18,
  },
  bannerContent: {
    padding: 16,
    justifyContent: 'space-between',
    flex: 1,
  },
  bannerBadgeWrap: {
    flexDirection: 'row',
  },
  bannerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  bannerBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
    marginTop: 8,
    letterSpacing: -0.2,
  },
  bannerSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
    marginTop: 4,
  },
  bannerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  bannerCtaBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  bannerCtaText: {
    fontSize: 10,
    fontWeight: '800',
  },
  indicatorsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  indicatorDot: {
    height: 5,
    borderRadius: 3,
  },
  indicatorActive: {
    width: 16,
    backgroundColor: '#ffffff',
  },
  indicatorInactive: {
    width: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  // Discovery 2-Col
  discoveryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  discoveryCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  discoveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  discoveryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  discoveryTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  badge24Jam: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dc2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pulseDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
  badge24JamText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '800',
  },
  badgeResmi: {
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeResmiText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '800',
  },
  discoveryInnerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  discoveryInnerIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoveryInnerTitle: {
    fontSize: 10,
    fontWeight: '800',
  },
  discoveryInnerSub: {
    fontSize: 9,
    marginTop: 1,
  },
  // Voucher Obsidian & Product
  voucherObsidianCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  voucherWhiteBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  voucherWhiteBadgeText: {
    fontSize: 8,
    fontWeight: '800',
  },
  voucherCardTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
  },
  voucherCardSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 9,
    marginTop: 3,
  },
  voucherLihatBtn: {
    backgroundColor: '#ffffff',
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
  },
  voucherLihatBtnText: {
    fontSize: 9,
    fontWeight: '800',
  },
  productCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  productVisualBox: {
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  populerBadge: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  populerBadgeText: {
    color: '#ffffff',
    fontSize: 7,
    fontWeight: '800',
  },
  productTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  productRating: {
    fontSize: 9,
    marginTop: 2,
  },
  productPrice: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
    marginTop: 6,
  },
  // Referral Banner
  referralBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#d97706',
  },
  referralBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  referralBadgeText: {
    color: '#78350f',
    fontSize: 8,
    fontWeight: '800',
  },
  referralTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  referralSub: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 9,
    marginTop: 2,
  },
  referralBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  referralBtnText: {
    color: '#78350f',
    fontSize: 11,
    fontWeight: '800',
  },
  // Scanner
  scannerSection: {
    gap: 8,
  },
  scannerInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  scannerInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
  },
  deviceDetectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  deviceDetectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceDetectName: {
    fontSize: 12,
    fontWeight: '700',
  },
  deviceDetectImei: {
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 1,
  },
  deviceDetectActions: {
    flexDirection: 'row',
    gap: 6,
  },
  detectBtnOutline: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  detectBtnOutlineText: {
    fontSize: 10,
    fontWeight: '700',
  },
  detectBtnPrimary: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  detectBtnPrimaryText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  searchResultBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  searchResultHead: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchTrxTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  searchTrxSub: {
    fontSize: 9,
    fontFamily: 'monospace',
    marginTop: 1,
  },
  notaBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  notaBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  // History
  historySection: {
    gap: 10,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  historyTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyBox: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
  },
  trxList: {
    gap: 8,
  },
  trxCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  trxLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  trxIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trxTexts: {
    flex: 1,
  },
  trxName: {
    fontSize: 12,
    fontWeight: '700',
  },
  trxSub: {
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  trxRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  trxAmount: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  trxStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  trxStatusText: {
    fontSize: 8,
    fontWeight: '800',
  },
});
