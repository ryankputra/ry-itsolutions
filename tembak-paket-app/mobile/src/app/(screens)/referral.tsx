import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Users,
  Copy,
  Share2,
  Check,
  TrendingUp,
  Wallet,
  Zap,
  Sparkles,
  RotateCw,
  MessageCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';

export default function ReferralScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const colors = Colors.dark;

  const [loading, setLoading] = useState(true);
  const [referralData, setReferralData] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchReferralInfo = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/user/referral-info');
      if (res.data?.status && res.data.data) {
        setReferralData(res.data.data);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferralInfo();
  }, []);

  const referralCode =
    referralData?.referralCode ||
    referralData?.referral_code ||
    (user?.id ? 'RY' + user.id.slice(0, 6).toUpperCase() : 'RYVIP');

  const downlinesList: any[] =
    referralData?.downlines ||
    referralData?.referredUsers ||
    [];

  const referralLink = `https://ry-itsolutions.web.id/register?ref=${referralCode}`;

  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Clipboard.setStringAsync(text);
      if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch {}
  };

  const shareToWhatsapp = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const text = `Halo! Mau Add Roamer atau cek status garansi HP tanpa ribet & cepat? Daftar di Ry-ITSolutions lewat link aku dapat promo potongan harga lho: ${referralLink}`;
      Linking.openURL(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`).catch(() => {
        Share.share({ message: text });
      });
    } catch {}
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
          <Text style={[styles.navTitle, { color: colors.text }]}>Program Referral & Komisi</Text>
          <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>
            Ajak Teman & Dapatkan Komisi Saldo Otomatis
          </Text>
        </View>
        <Pressable
          style={[styles.refreshBtn, { backgroundColor: colors.surface }]}
          onPress={fetchReferralInfo}
          hitSlop={10}
        >
          <RotateCw size={18} color={colors.primary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Memuat data referral...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Stats Grid */}
          <View style={styles.statsGrid}>
            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.surface, borderColor: 'rgba(59, 130, 246, 0.3)' },
              ]}
            >
              <Text style={[styles.statLabel, { color: colors.primary }]}>TOTAL KOMISI DIDAPAT</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatRupiah(referralData?.totalEarned ?? referralData?.totalEarnings ?? 0)}
              </Text>
              <Text style={[styles.statSub, { color: colors.textMuted }]}>
                Langsung masuk ke saldo akun
              </Text>
            </View>

            <View style={styles.statsRow}>
              <View
                style={[
                  styles.miniStatCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.miniStatLabel, { color: colors.textMuted }]}>Teman Terdaftar</Text>
                <Text style={[styles.miniStatVal, { color: colors.text }]}>
                  {referralData?.totalDownlines ?? referralData?.referredUsersCount ?? downlinesList.length}{' '}
                  <Text style={{ fontSize: 13, fontWeight: 'normal', color: colors.textMuted }}>Orang</Text>
                </Text>
                <Text style={[styles.miniStatSub, { color: colors.textDim }]}>Via link undangan</Text>
              </View>

              <View
                style={[
                  styles.miniStatCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.miniStatLabel, { color: colors.textMuted }]}>Komisi Per Transaksi</Text>
                <Text style={[styles.miniStatVal, { color: colors.success }]}>
                  {formatRupiah(
                    referralData?.commissionValue ??
                    referralData?.settings?.referral_commission_value ??
                    5000
                  )}
                </Text>
                <Text style={[styles.miniStatSub, { color: colors.textDim }]}>Otomatis per order</Text>
              </View>
            </View>
          </View>

          {/* Share Box */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Kode & Tautan Undangan Anda</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
              Bagikan kode atau tautan ini kepada teman, pelanggan, atau relasi Anda.
            </Text>

            {/* Kode Referral Box */}
            <View
              style={[
                styles.codeBox,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.boxLabel, { color: colors.textMuted }]}>Kode Referral</Text>
              <View style={styles.boxContentRow}>
                <Text style={[styles.codeText, { color: colors.primary }]}>{referralCode}</Text>
                <Pressable
                  style={[styles.copyBtn, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}
                  onPress={() => copyToClipboard(referralCode, 'code')}
                >
                  {copiedCode ? (
                    <>
                      <Check size={14} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={[styles.copyBtnText, { color: colors.primary }]}>Tersalin</Text>
                    </>
                  ) : (
                    <>
                      <Copy size={14} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={[styles.copyBtnText, { color: colors.primary }]}>Salin Kode</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>

            {/* Tautan Langsung Box */}
            <View
              style={[
                styles.codeBox,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border, marginTop: 10 },
              ]}
            >
              <Text style={[styles.boxLabel, { color: colors.textMuted }]}>Tautan Undangan Langsung</Text>
              <View style={styles.boxContentRow}>
                <Text style={[styles.linkText, { color: colors.textMuted }]} numberOfLines={1}>
                  {referralLink}
                </Text>
                <Pressable
                  style={[styles.copyBtn, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}
                  onPress={() => copyToClipboard(referralLink, 'link')}
                >
                  {copiedLink ? (
                    <>
                      <Check size={14} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={[styles.copyBtnText, { color: colors.primary }]}>Tersalin</Text>
                    </>
                  ) : (
                    <>
                      <Copy size={14} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={[styles.copyBtnText, { color: colors.primary }]}>Salin Link</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>

            {/* WhatsApp Share Button */}
            <Pressable
              style={[styles.waShareBtn, { backgroundColor: '#10b981', marginTop: 14 }]}
              onPress={shareToWhatsapp}
            >
              <MessageCircle size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.waShareBtnText}>Bagikan ke WhatsApp</Text>
            </Pressable>
          </View>

          {/* Cara Kerja Referral */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Zap size={18} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Cara Kerja Referral</Text>
            </View>

            {[
              {
                step: '1',
                title: 'Bagikan Link',
                desc: 'Kirimkan tautan undangan atau kode referral Anda ke teman maupun grup media sosial.',
              },
              {
                step: '2',
                title: 'Teman Mendaftar',
                desc: 'Teman Anda mendaftar akun dan melakukan pesanan Add Roamer atau layanan lainnya.',
              },
              {
                step: '3',
                title: 'Dapatkan Saldo Otomatis',
                desc: 'Komisi langsung masuk secara otomatis ke saldo akun Anda tanpa potongan.',
              },
            ].map((item, idx) => (
              <View
                key={idx}
                style={[
                  styles.stepCard,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                ]}
              >
                <View style={[styles.stepNumberBadge, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                  <Text style={[styles.stepNumberText, { color: colors.primary }]}>{item.step}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.stepTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.stepDesc, { color: colors.textMuted }]}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Downlines Table / List */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Teman Yang Anda Ajak ({downlinesList.length})
              </Text>
            </View>

            {downlinesList.length === 0 ? (
              <View style={[styles.emptyDownlinesBox, { borderColor: colors.border }]}>
                <Users size={32} color={colors.textDim} />
                <Text style={[styles.emptyDownlinesTitle, { color: colors.text }]}>
                  Belum Ada Teman Terdaftar
                </Text>
                <Text style={[styles.emptyDownlinesDesc, { color: colors.textMuted }]}>
                  Bagikan kode referral Anda sekarang dan nikmati komisi saldo di setiap transaksi mereka!
                </Text>
              </View>
            ) : (
              downlinesList.map((u: any, idx: number) => (
                <View
                  key={u.id || idx}
                  style={[
                    styles.downlineItem,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                  ]}
                >
                  <View style={[styles.avatarLetter, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.avatarLetterText, { color: colors.text }]}>
                      {(u.name || 'U')[0].toUpperCase()}
                    </Text>
                  </View>

                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.downlineName, { color: colors.text }]}>{u.name || 'Member'}</Text>
                    <Text style={[styles.downlineDate, { color: colors.textDim }]}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID') : 'Member Baru'}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.downlineStatus, { color: colors.success }]}>Aktif</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
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
  statsGrid: {
    marginBottom: 16,
  },
  statCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 4,
  },
  statSub: {
    fontSize: 11,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  miniStatCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  miniStatLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  miniStatVal: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  miniStatSub: {
    fontSize: 10,
    marginTop: 2,
  },
  card: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 3,
    marginBottom: 12,
    lineHeight: 16,
  },
  codeBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  boxLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  boxContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeText: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  linkText: {
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  waShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
  },
  waShareBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  stepNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '900',
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  stepDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  emptyDownlinesBox: {
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyDownlinesTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 8,
  },
  emptyDownlinesDesc: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  downlineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  avatarLetter: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetterText: {
    fontSize: 14,
    fontWeight: '800',
  },
  downlineName: {
    fontSize: 13,
    fontWeight: '800',
  },
  downlineDate: {
    fontSize: 11,
    marginTop: 1,
  },
  downlineStatus: {
    fontSize: 11,
    fontWeight: '700',
  },
});
