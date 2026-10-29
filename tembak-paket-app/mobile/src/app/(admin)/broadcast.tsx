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
  Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Megaphone,
  Send,
  Trash2,
  Bell,
  Users,
  RotateCw,
  MessageSquare,
  Smartphone,
  Tag,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';

export default function AdminBroadcastScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors.dark;

  const [broadcastData, setBroadcastData] = useState({
    title: 'PROMO SPESIAL PLATFORM',
    message: '',
    voucherCode: '',
    targetWhatsApp: true,
    targetInApp: true,
    targetWebPush: true,
    targetTelegram: false,
    bgColor: '#0066cc',
  });

  const [pushSubscribersCount, setPushSubscribersCount] = useState<number | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [webBroadcasts, setWebBroadcasts] = useState<any[]>([]);
  const [loadingBroadcasts, setLoadingBroadcasts] = useState(false);

  const loadPushSubscribers = async () => {
    try {
      const res = await apiClient.get('/admin/push/stats');
      if (res.data?.status && typeof res.data.totalSubscribers === 'number') {
        setPushSubscribersCount(res.data.totalSubscribers);
      }
    } catch (e) {}
  };

  const fetchWebBroadcasts = async () => {
    setLoadingBroadcasts(true);
    try {
      const res = await apiClient.get('/admin/announcements');
      if (res.data?.status && Array.isArray(res.data.data)) {
        setWebBroadcasts(res.data.data);
      } else if (Array.isArray(res.data)) {
        setWebBroadcasts(res.data);
      }
    } catch (e) {
    } finally {
      setLoadingBroadcasts(false);
    }
  };

  useEffect(() => {
    fetchWebBroadcasts();
    loadPushSubscribers();
  }, []);

  const handleSendBroadcast = () => {
    if (!broadcastData.message.trim()) {
      Alert.alert('Perhatian', 'Isi pesan broadcast wajib diisi.');
      return;
    }

    Alert.alert(
      'Kirim Broadcast Promo?',
      'Pesan promo akan dipublikasikan ke semua saluran yang telah dicentang.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Kirim Sekarang',
          onPress: async () => {
            setBroadcasting(true);
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              const res = await apiClient.post('/admin/broadcast', broadcastData);
              if (res.data?.status) {
                try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
                Alert.alert('Sukses', res.data.message || 'Broadcast berhasil disiarkan.');
                setBroadcastData((prev) => ({ ...prev, message: '', voucherCode: '' }));
                fetchWebBroadcasts();
              } else {
                Alert.alert('Gagal', res.data?.message || 'Gagal mengirim broadcast.');
              }
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setBroadcasting(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAnnouncement = (id: string) => {
    Alert.alert('Hapus Pengumuman?', 'Hapus siaran ini dari dashboard member?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            const res = await apiClient.delete(`/admin/announcements/${id}`);
            if (res.data?.status) {
              Alert.alert('Terhapus', 'Pengumuman berhasil dihapus.');
              fetchWebBroadcasts();
            }
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
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
          <Text style={[styles.navTitle, { color: colors.text }]}>Broadcast & Notifikasi Massal</Text>
          <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>
            Kirim Pengumuman ke Pelanggan & WA
          </Text>
        </View>
        <Pressable
          style={[styles.refreshBtn, { backgroundColor: colors.surface }]}
          onPress={() => {
            fetchWebBroadcasts();
            loadPushSubscribers();
          }}
          hitSlop={10}
        >
          <RotateCw size={18} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Push Subscribers Stat Card */}
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statIconBox}>
            <Bell size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.statTitle, { color: colors.text }]}>Device Push Aktif</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {pushSubscribersCount !== null ? `${pushSubscribersCount} Perangkat` : 'Menghitung...'}
            </Text>
          </View>
        </View>

        {/* Form Broadcast */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Buat Pesan Siaran</Text>

          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Judul Pengumuman</Text>
          <TextInput
            style={[
              styles.textInput,
              { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text },
            ]}
            placeholder="Contoh: PROMO SPESIAL GAJIAN"
            placeholderTextColor={colors.textDim}
            value={broadcastData.title}
            onChangeText={(t) => setBroadcastData({ ...broadcastData, title: t })}
          />

          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Isi Pesan Broadcast</Text>
          <TextInput
            style={[
              styles.textArea,
              { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text },
            ]}
            placeholder="Tulis pesan pengumuman atau promo yang ingin disampaikan ke seluruh member..."
            placeholderTextColor={colors.textDim}
            multiline
            numberOfLines={4}
            value={broadcastData.message}
            onChangeText={(t) => setBroadcastData({ ...broadcastData, message: t })}
          />

          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Kode Kupon Terlampir (Opsional)</Text>
          <TextInput
            style={[
              styles.textInput,
              { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text },
            ]}
            placeholder="Contoh: HEMAT10"
            placeholderTextColor={colors.textDim}
            autoCapitalize="characters"
            value={broadcastData.voucherCode}
            onChangeText={(t) => setBroadcastData({ ...broadcastData, voucherCode: t.toUpperCase() })}
          />

          {/* Saluran Target Switches */}
          <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 4 }]}>Saluran Pengiriman</Text>

          <View style={[styles.targetRow, { borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MessageSquare size={16} color={colors.success} style={{ marginRight: 8 }} />
              <Text style={[styles.targetText, { color: colors.text }]}>Bot WhatsApp Pelanggan</Text>
            </View>
            <Switch
              value={broadcastData.targetWhatsApp}
              onValueChange={(val) => setBroadcastData({ ...broadcastData, targetWhatsApp: val })}
              thumbColor="#ffffff"
              trackColor={{ false: '#334155', true: colors.primary }}
            />
          </View>

          <View style={[styles.targetRow, { borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Smartphone size={16} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.targetText, { color: colors.text }]}>Banner Dashboard App</Text>
            </View>
            <Switch
              value={broadcastData.targetInApp}
              onValueChange={(val) => setBroadcastData({ ...broadcastData, targetInApp: val })}
              thumbColor="#ffffff"
              trackColor={{ false: '#334155', true: colors.primary }}
            />
          </View>

          <View style={[styles.targetRow, { borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Bell size={16} color="#f59e0b" style={{ marginRight: 8 }} />
              <Text style={[styles.targetText, { color: colors.text }]}>Push Notification Device</Text>
            </View>
            <Switch
              value={broadcastData.targetWebPush}
              onValueChange={(val) => setBroadcastData({ ...broadcastData, targetWebPush: val })}
              thumbColor="#ffffff"
              trackColor={{ false: '#334155', true: colors.primary }}
            />
          </View>

          <Pressable
            style={[styles.sendBtn, { backgroundColor: colors.primary }]}
            onPress={handleSendBroadcast}
            disabled={broadcasting}
          >
            {broadcasting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Send size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.sendBtnText}>Kirim Broadcast Sekarang</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Daftar Broadcast Aktif */}
        <View style={{ marginTop: 8 }}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 10 }]}>
            Pengumuman Aktif di Dashboard ({webBroadcasts.length})
          </Text>

          {loadingBroadcasts ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
          ) : webBroadcasts.length === 0 ? (
            <View style={[styles.emptyBox, { borderColor: colors.border }]}>
              <Text style={[styles.emptyText, { color: colors.textDim }]}>Belum ada pengumuman aktif.</Text>
            </View>
          ) : (
            webBroadcasts.map((b) => (
              <View
                key={b.id}
                style={[styles.announceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.announceTitle, { color: colors.text }]}>{b.title}</Text>
                  <Text style={[styles.announceMsg, { color: colors.textMuted }]}>{b.message}</Text>
                  {b.voucher_code && (
                    <View style={styles.voucherTag}>
                      <Tag size={12} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={[styles.voucherTagText, { color: colors.primary }]}>{b.voucher_code}</Text>
                    </View>
                  )}
                </View>

                <Pressable
                  style={[styles.deleteIconBtn, { backgroundColor: colors.surfaceElevated }]}
                  onPress={() => handleDeleteAnnouncement(b.id)}
                >
                  <Trash2 size={16} color={colors.danger} />
                </Pressable>
              </View>
            ))
          )}
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 14,
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
    marginBottom: 12,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    height: 85,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  targetText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  sendBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptyBox: {
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
  },
  announceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  announceTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  announceMsg: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  voucherTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
  },
  voucherTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  deleteIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
});
