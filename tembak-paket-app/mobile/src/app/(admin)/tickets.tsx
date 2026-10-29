import React, { useState, useEffect, useRef } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  LifeBuoy,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCw,
  X,
  MessageSquare,
  User,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';

export default function AdminTicketsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors.dark;

  const [adminTickets, setAdminTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'closed'>('all');

  // Detail & Chat State
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [adminReply, setAdminReply] = useState('');
  const [replying, setReplying] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const scrollViewRef = useRef<any>(null);

  const loadAdminTickets = async () => {
    setLoadingTickets(true);
    try {
      const res = await apiClient.get('/admin/tickets');
      if (res.data?.status && Array.isArray(res.data.data)) {
        setAdminTickets(res.data.data);
      } else if (Array.isArray(res.data)) {
        setAdminTickets(res.data);
      } else {
        setAdminTickets([]);
      }
    } catch (e) {
      setAdminTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  };

  const loadTicketDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await apiClient.get(`/tickets/${id}`);
      if (res.data?.status && res.data.data) {
        setActiveTicket(res.data.data.ticket);
        setTicketMessages(res.data.data.messages || []);
      }
    } catch (e) {
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    loadAdminTickets();
  }, []);

  const handleAdminReplyTicket = async () => {
    if (!adminReply.trim() || !activeTicket) return;
    setReplying(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await apiClient.post(`/tickets/${activeTicket.id}/messages`, {
        message: adminReply.trim(),
      });
      if (res.data?.status !== false) {
        setAdminReply('');
        loadTicketDetail(activeTicket.id);
        loadAdminTickets();
      } else {
        Alert.alert('Gagal', res.data?.message || 'Gagal mengirim balasan.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setReplying(false);
    }
  };

  const handleAdminCloseTicket = () => {
    if (!activeTicket) return;
    Alert.alert(
      'Tutup Tiket Bantuan?',
      'Tandai kendala pelanggan ini sebagai selesai?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Tutup Tiket',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              const res = await apiClient.put(`/admin/tickets/${activeTicket.id}/status`, {
                status: 'closed',
              });
              if (res.data?.status !== false) {
                try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
                Alert.alert('Selesai', 'Tiket bantuan berhasil ditutup.');
                setActiveTicket(null);
                loadAdminTickets();
              }
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const filteredTickets = adminTickets.filter((t) => {
    if (ticketFilter === 'open') return t.status === 'open' || t.status === 'pending';
    if (ticketFilter === 'closed') return t.status === 'closed' || t.status === 'resolved';
    return true;
  });

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
          <Text style={[styles.navTitle, { color: colors.text }]}>Pusat Bantuan & Tiket CS</Text>
          <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>
            {adminTickets.length} Tiket Masuk
          </Text>
        </View>
        <Pressable
          style={[styles.refreshBtn, { backgroundColor: colors.surface }]}
          onPress={loadAdminTickets}
          hitSlop={10}
        >
          <RotateCw size={18} color={colors.primary} />
        </Pressable>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabBar}>
        {[
          { key: 'all', label: 'Semua Tiket' },
          { key: 'open', label: 'Perlu Respon' },
          { key: 'closed', label: 'Selesai' },
        ].map((tab) => {
          const active = ticketFilter === tab.key;
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
                setTicketFilter(tab.key as any);
              }}
            >
              <Text style={[styles.tabText, { color: active ? '#ffffff' : colors.textMuted }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loadingTickets ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Memuat tiket bantuan...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {filteredTickets.length === 0 ? (
            <View style={[styles.emptyBox, { borderColor: colors.border }]}>
              <LifeBuoy size={36} color={colors.textDim} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Tidak Ada Tiket</Text>
              <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                Semua keluhan pelanggan sudah tertangani dengan baik.
              </Text>
            </View>
          ) : (
            filteredTickets.map((t) => {
              const isOpen = t.status === 'open' || t.status === 'pending';
              return (
                <Pressable
                  key={t.id}
                  style={[styles.ticketCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                    loadTicketDetail(t.id);
                  }}
                >
                  <View style={styles.ticketCardTop}>
                    <Text style={[styles.ticketId, { color: colors.primary }]}>#{t.id}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: isOpen ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: isOpen ? colors.warning : colors.success },
                        ]}
                      >
                        {isOpen ? 'Menunggu CS' : 'Selesai'}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.ticketSubject, { color: colors.text }]}>{t.subject}</Text>
                  <Text style={[styles.ticketUser, { color: colors.textMuted }]}>
                    Pengguna: {t.userName || t.user_name || t.userEmail || `User #${t.user_id}`}
                  </Text>
                  {t.message && (
                    <Text style={[styles.ticketMsg, { color: colors.textDim }]} numberOfLines={2}>
                      {t.message}
                    </Text>
                  )}

                  <View style={styles.ticketFooter}>
                    <Text style={[styles.ticketDate, { color: colors.textDim }]}>
                      {t.created_at ? new Date(t.created_at).toLocaleDateString('id-ID') : ''}
                    </Text>
                    <Text style={[styles.openChatText, { color: colors.primary }]}>Buka Percakapan →</Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Modal Percakapan Tiket */}
      {activeTicket && (
        <Modal visible={!!activeTicket} animationType="slide" transparent>
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                    {activeTicket.subject}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                    Tiket #{activeTicket.id} • {activeTicket.userName || 'Member'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {activeTicket.status !== 'closed' && (
                    <Pressable
                      style={[styles.closeTicketBtn, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}
                      onPress={handleAdminCloseTicket}
                    >
                      <CheckCircle2 size={14} color={colors.success} style={{ marginRight: 4 }} />
                      <Text style={[styles.closeTicketText, { color: colors.success }]}>Selesai</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => setActiveTicket(null)} hitSlop={10} style={{ marginLeft: 8 }}>
                    <X size={20} color={colors.textMuted} />
                  </Pressable>
                </View>
              </View>

              {/* Messages Content */}
              <ScrollView
                ref={scrollViewRef}
                style={{ flex: 1, maxHeight: 400 }}
                contentContainerStyle={{ paddingVertical: 10 }}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              >
                {/* Initial Ticket Message */}
                <View
                  style={[
                    styles.chatBubble,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.bubbleSender, { color: colors.primary }]}>
                    {activeTicket.userName || 'Member'} (Keluhan Awal)
                  </Text>
                  <Text style={[styles.bubbleBody, { color: colors.text }]}>{activeTicket.message}</Text>
                  <Text style={[styles.bubbleTime, { color: colors.textDim }]}>
                    {activeTicket.created_at ? new Date(activeTicket.created_at).toLocaleTimeString('id-ID') : ''}
                  </Text>
                </View>

                {ticketMessages.map((msg: any) => {
                  const isAdmin = msg.sender_role === 'admin' || msg.is_admin === 1 || msg.sender === 'admin';
                  return (
                    <View
                      key={msg.id}
                      style={[
                        styles.chatBubble,
                        isAdmin
                          ? [styles.bubbleMe, { backgroundColor: colors.primary }]
                          : [styles.bubbleOther, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }],
                      ]}
                    >
                      <Text
                        style={[
                          styles.bubbleSender,
                          { color: isAdmin ? '#ffffff' : colors.primary },
                        ]}
                      >
                        {isAdmin ? 'Admin CS Support' : activeTicket.userName || 'Member'}
                      </Text>
                      <Text style={[styles.bubbleBody, { color: isAdmin ? '#ffffff' : colors.text }]}>
                        {msg.message || msg.body}
                      </Text>
                      <Text
                        style={[
                          styles.bubbleTime,
                          { color: isAdmin ? 'rgba(255,255,255,0.7)' : colors.textDim },
                        ]}
                      >
                        {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('id-ID') : ''}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>

              {/* Reply Input Bar */}
              <View style={[styles.replyRow, { borderColor: colors.border }]}>
                <TextInput
                  style={[
                    styles.replyTextInput,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text },
                  ]}
                  placeholder="Ketik balasan CS ke pelanggan..."
                  placeholderTextColor={colors.textDim}
                  value={adminReply}
                  onChangeText={setAdminReply}
                />
                <Pressable
                  style={[
                    styles.sendBtn,
                    { backgroundColor: adminReply.trim() ? colors.primary : colors.surfaceElevated },
                  ]}
                  onPress={handleAdminReplyTicket}
                  disabled={replying || !adminReply.trim()}
                >
                  {replying ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Send size={16} color={adminReply.trim() ? '#fff' : colors.textDim} />
                  )}
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
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
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
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
  },
  loadingText: {
    fontSize: 13,
    marginTop: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
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
  ticketCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  ticketCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  ticketId: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  ticketSubject: {
    fontSize: 14,
    fontWeight: '800',
  },
  ticketUser: {
    fontSize: 12,
    marginTop: 2,
  },
  ticketMsg: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  ticketDate: {
    fontSize: 11,
  },
  openChatText: {
    fontSize: 11,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 18,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  closeTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  closeTicketText: {
    fontSize: 11,
    fontWeight: '800',
  },
  chatBubble: {
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    maxWidth: '85%',
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  bubbleSender: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  bubbleBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  bubbleTime: {
    fontSize: 9,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  replyTextInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
