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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  LifeBuoy,
  Plus,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  HelpCircle,
  ChevronRight,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';

export default function TicketsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors.dark;

  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  // Form State
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadTickets() {
      try {
        const res = await apiClient.get('/user/tickets');
        if (res.data?.status && Array.isArray(res.data.data)) {
          setTickets(res.data.data);
        } else {
          setTickets([
            {
              id: 'T-1029',
              subject: 'Bantuan Konfirmasi Deposit QRIS',
              status: 'answered',
              createdAt: '28 Okt 2026',
              lastReply: 'Saldo telah berhasil di-credit oleh admin.',
              messages: [
                { sender: 'user', text: 'Halo admin, tolong dicek deposit QRIS saya Rp 100.000', time: '14:20' },
                { sender: 'admin', text: 'Halo! Saldo telah berhasil kami sinkronkan ke akun Anda.', time: '14:25' },
              ],
            },
          ]);
        }
      } catch (e) {
        setTickets([
          {
            id: 'T-1029',
            subject: 'Bantuan Konfirmasi Deposit QRIS',
            status: 'answered',
            createdAt: '28 Okt 2026',
            lastReply: 'Saldo telah berhasil di-credit oleh admin.',
            messages: [
              { sender: 'user', text: 'Halo admin, tolong dicek deposit QRIS saya Rp 100.000', time: '14:20' },
              { sender: 'admin', text: 'Halo! Saldo telah berhasil kami sinkronkan ke akun Anda.', time: '14:25' },
            ],
          },
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadTickets();
  }, []);

  const handleCreateTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Perhatian', 'Subjek dan detail pesan kendala wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.post('/user/tickets', {
        subject: subject.trim(),
        message: message.trim(),
      });

      if (res.data?.status) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        Alert.alert('Tiket Terkirim! 🎉', 'Pesan Anda telah diteruskan ke Customer Support kami.');
        setTickets([
          {
            id: `T-${Date.now().toString().slice(-4)}`,
            subject: subject.trim(),
            status: 'open',
            createdAt: 'Baru saja',
            messages: [{ sender: 'user', text: message.trim(), time: 'Baru saja' }],
          },
          ...tickets,
        ]);
        setSubject('');
        setMessage('');
        setIsCreating(false);
      } else {
        Alert.alert('Gagal', res.data?.message || 'Gagal mengirim tiket.');
      }
    } catch (e: any) {
      Alert.alert('Gagal', e.response?.data?.message || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !activeTicket) return;
    setReplying(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await apiClient.post(`/tickets/${activeTicket.id}/messages`, {
        message: replyText.trim(),
      });
      const newMsg = { sender: 'user', text: replyText.trim(), time: 'Baru saja' };
      const updatedMessages = [...(activeTicket.messages || []), newMsg];
      setActiveTicket({ ...activeTicket, messages: updatedMessages });
      setReplyText('');
    } catch (e: any) {
      Alert.alert('Gagal Mengirim', e.response?.data?.message || 'Gagal mengirim pesan ke CS.');
    } finally {
      setReplying(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'answered':
      case 'in_progress':
        return (
          <View style={[styles.badge, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
            <Text style={[styles.badgeText, { color: '#10b981' }]}>Dijawab CS</Text>
          </View>
        );
      case 'closed':
        return (
          <View style={[styles.badge, { backgroundColor: 'rgba(148, 163, 184, 0.12)' }]}>
            <Text style={[styles.badgeText, { color: '#94a3b8' }]}>Selesai</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.badge, { backgroundColor: 'rgba(41, 151, 255, 0.12)' }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>Menunggu CS</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.canvas }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Nav */}
        <View style={styles.topNav}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}
            onPress={() => (activeTicket ? setActiveTicket(null) : router.back())}
            hitSlop={10}
          >
            <ArrowLeft size={18} color={colors.ink} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.navTitle, { color: colors.ink }]}>
              {activeTicket ? activeTicket.subject : 'Pusat Bantuan & Tiket'}
            </Text>
            <Text style={[styles.navSubtitle, { color: colors.inkMuted }]}>
              {activeTicket ? `#${activeTicket.id}` : 'Customer Service & Pengaduan'}
            </Text>
          </View>

          {!activeTicket && (
            <Pressable
              style={[
                styles.createTicketTrigger,
                { backgroundColor: isCreating ? colors.canvas : colors.primary },
              ]}
              onPress={() => setIsCreating(!isCreating)}
            >
              {isCreating ? (
                <X size={16} color={colors.ink} />
              ) : (
                <>
                  <Plus size={16} color="#ffffff" style={{ marginRight: 4 }} />
                  <Text style={styles.createTicketText}>Tiket Baru</Text>
                </>
              )}
            </Pressable>
          )}
        </View>

        {/* 1. Detail Chat View if a ticket is selected */}
        {activeTicket ? (
          <View style={[styles.card, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}>
            <View style={styles.ticketDetailHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailSubject, { color: colors.ink }]}>
                  {activeTicket.subject}
                </Text>
                <Text style={[styles.detailDate, { color: colors.inkMuted }]}>
                  Dibuat pada {activeTicket.createdAt}
                </Text>
              </View>
              {renderStatusBadge(activeTicket.status)}
            </View>

            <View style={[styles.divider, { backgroundColor: colors.hairline }]} />

            {/* Conversation Messages Thread */}
            <View style={styles.chatThread}>
              {(activeTicket.messages || [
                { sender: 'user', text: activeTicket.lastReply || 'Halo mohon bantuannya.', time: 'Baru saja' },
              ]).map((msg: any, i: number) => {
                const isUser = msg.sender === 'user';
                return (
                  <View
                    key={i}
                    style={[
                      styles.chatBubble,
                      isUser
                        ? [styles.userBubble, { backgroundColor: colors.primary }]
                        : [styles.csBubble, { backgroundColor: colors.canvas, borderColor: colors.hairline }],
                    ]}
                  >
                    <Text style={[styles.senderLabel, { color: isUser ? '#ffffff' : colors.primary }]}>
                      {isUser ? 'Anda' : 'CS Support'}
                    </Text>
                    <Text style={[styles.bubbleText, { color: isUser ? '#ffffff' : colors.ink }]}>
                      {msg.text}
                    </Text>
                    <Text style={[styles.bubbleTime, { color: isUser ? 'rgba(255,255,255,0.7)' : colors.inkMuted }]}>
                      {msg.time}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Reply Input Box */}
            <View style={[styles.replyRow, { borderColor: colors.hairline }]}>
              <TextInput
                style={[styles.replyInput, { color: colors.ink }]}
                placeholder="Tulis balasan pesan..."
                placeholderTextColor={colors.inkMuted}
                value={replyText}
                onChangeText={setReplyText}
              />
              <Pressable
                onPress={handleSendReply}
                disabled={replying}
                style={[styles.sendBtn, { backgroundColor: colors.primary }]}
              >
                {replying ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Send size={15} color="#fff" />
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            {/* 2. Form Tiket Baru */}
            {isCreating && (
              <View style={[styles.card, { backgroundColor: colors.parchment, borderColor: colors.hairline, marginBottom: 16 }]}>
                <Text style={[styles.formHeading, { color: colors.ink }]}>Buat Tiket Bantuan Baru</Text>

                <Text style={[styles.label, { color: colors.inkMuted }]}>Subjek Kendala</Text>
                <View style={[styles.inputBox, { backgroundColor: colors.canvas, borderColor: colors.hairline }]}>
                  <TextInput
                    style={[styles.input, { color: colors.ink }]}
                    placeholder="Contoh: Kendala Sinyal IMEI / Saldo Belum Masuk"
                    placeholderTextColor={colors.inkMuted}
                    value={subject}
                    onChangeText={setSubject}
                  />
                </View>

                <Text style={[styles.label, { color: colors.inkMuted, marginTop: 12 }]}>
                  Detail Penjelasan Kendala
                </Text>
                <View style={[styles.textAreaBox, { backgroundColor: colors.canvas, borderColor: colors.hairline }]}>
                  <TextInput
                    style={[styles.textArea, { color: colors.ink }]}
                    placeholder="Jelaskan kendala yang dialami secara lengkap..."
                    placeholderTextColor={colors.inkMuted}
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.submitBtn,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
                  ]}
                  onPress={handleCreateTicket}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Send size={16} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.submitBtnText}>Kirim Tiket ke CS</Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}

            {/* 3. Daftar Tiket Bantuan */}
            <Text style={[styles.sectionHeading, { color: colors.ink }]}>Riwayat Tiket Anda</Text>

            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
            ) : tickets.length === 0 ? (
              <View style={[styles.card, { backgroundColor: colors.parchment, borderColor: colors.hairline, alignItems: 'center', padding: 24 }]}>
                <HelpCircle size={36} color={colors.inkMuted} style={{ marginBottom: 10 }} />
                <Text style={[styles.emptyTitle, { color: colors.ink }]}>Belum Ada Tiket Bantuan</Text>
                <Text style={[styles.emptySubtitle, { color: colors.inkMuted }]}>
                  Jika mengalami kendala transaksi atau layanan, buat tiket untuk bantuan cepat.
                </Text>
              </View>
            ) : (
              tickets.map((t) => (
                <Pressable
                  key={t.id}
                  style={[
                    styles.ticketCard,
                    { backgroundColor: colors.parchment, borderColor: colors.hairline },
                  ]}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                    setActiveTicket(t);
                  }}
                >
                  <View style={styles.ticketTop}>
                    <Text style={[styles.ticketId, { color: colors.primary }]}>{t.id}</Text>
                    {renderStatusBadge(t.status)}
                  </View>

                  <Text style={[styles.ticketSubject, { color: colors.ink }]}>{t.subject}</Text>

                  {t.lastReply && (
                    <Text style={[styles.ticketSnippet, { color: colors.inkMuted }]} numberOfLines={2}>
                      {t.lastReply}
                    </Text>
                  )}

                  <View style={styles.ticketBottom}>
                    <Text style={[styles.ticketDate, { color: colors.inkMuted }]}>{t.createdAt}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.viewChatText, { color: colors.primary }]}>Buka Obrolan</Text>
                      <ChevronRight size={13} color={colors.primary} />
                    </View>
                  </View>
                </Pressable>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  navSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  createTicketTrigger: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  createTicketText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  card: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  formHeading: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputBox: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    height: 48,
    justifyContent: 'center',
  },
  input: {
    fontSize: 14,
    fontWeight: '600',
  },
  textAreaBox: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 90,
  },
  textArea: {
    fontSize: 13,
    lineHeight: 18,
    textAlignVertical: 'top',
  },
  submitBtn: {
    height: 48,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  ticketCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 12,
  },
  ticketTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketId: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  ticketSubject: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  ticketSnippet: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  ticketBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  ticketDate: {
    fontSize: 10,
  },
  viewChatText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  ticketDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailSubject: {
    fontSize: 16,
    fontWeight: '800',
  },
  detailDate: {
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 14,
  },
  chatThread: {
    gap: 12,
    marginBottom: 16,
  },
  chatBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  csBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  senderLabel: {
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 4,
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 18,
  },
  bubbleTime: {
    fontSize: 9,
    marginTop: 4,
    textAlign: 'right',
  },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    gap: 8,
  },
  replyInput: {
    flex: 1,
    height: 44,
    fontSize: 13,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
