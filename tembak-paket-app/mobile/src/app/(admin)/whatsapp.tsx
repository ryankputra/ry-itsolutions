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
  MessageSquare,
  Send,
  RotateCw,
  Search,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  PhoneCall,
  User,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';

interface Conversation {
  remoteJid: string;
  senderPhone: string;
  pushName: string;
  fromMe: number;
  messageType: string;
  body: string;
  timestamp: number;
  unreadCount: number;
}

interface Message {
  id: number;
  msg_id: string;
  remoteJid: string;
  senderPhone: string;
  pushName: string;
  fromMe: number;
  messageType: string;
  body: string;
  timestamp: number;
  isRead: number;
}

export default function AdminWhatsAppScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors.dark;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Active Chat State
  const [activeJid, setActiveJid] = useState<string | null>(null);
  const [activePhone, setActivePhone] = useState<string | null>(null);
  const [activeName, setActiveName] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyInput, setReplyInput] = useState('');
  const [sending, setSending] = useState(false);

  // Status
  const [waStatus, setWaStatus] = useState<string>('connecting');
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);

  // New Chat Modal
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatMessage, setNewChatMessage] = useState('');
  const [startingChat, setStartingChat] = useState(false);

  const scrollViewRef = useRef<any>(null);

  const checkStatus = async () => {
    try {
      const res = await apiClient.get('/admin/whatsapp/status');
      if (res.data?.status) {
        const isConn = Boolean(
          res.data.data?.connected ||
          res.data.data?.isConnected ||
          res.data.connected ||
          res.data.isConnected
        );
        setWaStatus(isConn ? 'open' : res.data.data?.state || 'connecting');
        setConnectedPhone(res.data.data?.connectedPhone || res.data.connectedPhone || null);
      }
    } catch (e) {}
  };

  const loadConversations = async (silent = false) => {
    if (!silent) setLoadingConversations(true);
    try {
      const res = await apiClient.get('/admin/whatsapp/conversations');
      if (res.data?.status && Array.isArray(res.data.data)) {
        setConversations(res.data.data);
      } else if (Array.isArray(res.data)) {
        setConversations(res.data);
      }
    } catch (e) {
    } finally {
      if (!silent) setLoadingConversations(false);
    }
  };

  const loadMessages = async (jid: string, silent = false) => {
    if (!jid) return;
    if (!silent) setLoadingMessages(true);
    try {
      const res = await apiClient.get(`/admin/whatsapp/messages/${encodeURIComponent(jid)}`);
      if (res.data?.status && Array.isArray(res.data.data)) {
        setMessages(res.data.data);
      } else if (Array.isArray(res.data)) {
        setMessages(res.data);
      }
    } catch (e) {
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  useEffect(() => {
    checkStatus();
    loadConversations();
  }, []);

  const handleSelectConversation = (conv: Conversation) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    setActiveJid(conv.remoteJid);
    setActivePhone(conv.senderPhone);
    setActiveName(conv.pushName || conv.senderPhone);
    loadMessages(conv.remoteJid);
  };

  const handleSendMessage = async () => {
    if (!replyInput.trim() || !activeJid) return;
    setSending(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await apiClient.post('/admin/whatsapp/send', {
        jid: activeJid,
        message: replyInput.trim(),
      });
      if (res.data?.status) {
        setReplyInput('');
        loadMessages(activeJid, true);
        loadConversations(true);
      } else {
        Alert.alert('Gagal Mengirim', res.data?.message || 'Bot WA offline.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSending(false);
    }
  };

  const handleStartNewChat = async () => {
    if (!newChatPhone.trim() || !newChatMessage.trim()) {
      Alert.alert('Perhatian', 'Nomor telepon dan pesan wajib diisi.');
      return;
    }

    setStartingChat(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const cleanPhone = newChatPhone.replace(/\D/g, '');
      const formattedJid = `${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}@s.whatsapp.net`;

      const res = await apiClient.post('/admin/whatsapp/send', {
        jid: formattedJid,
        message: newChatMessage.trim(),
      });

      if (res.data?.status) {
        setShowNewChatModal(false);
        setNewChatPhone('');
        setNewChatMessage('');
        setActiveJid(formattedJid);
        setActivePhone(cleanPhone);
        setActiveName(cleanPhone);
        loadMessages(formattedJid);
        loadConversations(true);
      } else {
        Alert.alert('Gagal', res.data?.message || 'Gagal mengirim pesan WhatsApp.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setStartingChat(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      (c.senderPhone && c.senderPhone.toLowerCase().includes(q)) ||
      (c.pushName && c.pushName.toLowerCase().includes(q)) ||
      (c.body && c.body.toLowerCase().includes(q))
    );
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Nav */}
      <View style={styles.topNav}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.surface }]}
          onPress={() => {
            if (activeJid) {
              setActiveJid(null);
            } else {
              router.back();
            }
          }}
          hitSlop={10}
        >
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.navTitle, { color: colors.text }]} numberOfLines={1}>
            {activeJid ? activeName || activePhone : 'WhatsApp Bot & Chat'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: waStatus === 'open' ? colors.success : colors.warning },
              ]}
            />
            <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>
              {waStatus === 'open' ? `Online (${connectedPhone || 'Bot Terhubung'})` : 'Menghubungkan...'}
            </Text>
          </View>
        </View>

        {!activeJid && (
          <Pressable
            style={[styles.addChatBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowNewChatModal(true)}
            hitSlop={10}
          >
            <Plus size={18} color="#fff" />
          </Pressable>
        )}
      </View>

      {/* Main View: If chat open show messages, else show conversation list */}
      {activeJid ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={[styles.chatMessagesContent, { paddingBottom: 20 }]}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {loadingMessages ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
            ) : messages.length === 0 ? (
              <Text style={[styles.emptyChatText, { color: colors.textDim }]}>
                Belum ada riwayat pesan percakapan ini.
              </Text>
            ) : (
              messages.map((m) => {
                const isMe = m.fromMe === 1;
                return (
                  <View
                    key={m.id || m.msg_id}
                    style={[
                      styles.msgBubble,
                      isMe
                        ? [styles.msgBubbleMe, { backgroundColor: colors.primary }]
                        : [styles.msgBubbleOther, { backgroundColor: colors.surface, borderColor: colors.border }],
                    ]}
                  >
                    {!isMe && m.pushName && (
                      <Text style={[styles.senderPushName, { color: colors.primary }]}>{m.pushName}</Text>
                    )}
                    <Text style={[styles.msgBody, { color: isMe ? '#ffffff' : colors.text }]}>{m.body}</Text>
                    <Text
                      style={[
                        styles.msgTime,
                        { color: isMe ? 'rgba(255,255,255,0.7)' : colors.textDim },
                      ]}
                    >
                      {new Date(m.timestamp * 1000).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Reply Bar */}
          <View
            style={[
              styles.replyBar,
              { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 },
            ]}
          >
            <TextInput
              style={[
                styles.replyInput,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Ketik balasan WhatsApp..."
              placeholderTextColor={colors.textDim}
              value={replyInput}
              onChangeText={setReplyInput}
            />
            <Pressable
              style={[
                styles.sendChatBtn,
                { backgroundColor: replyInput.trim() ? colors.primary : colors.surfaceElevated },
              ]}
              onPress={handleSendMessage}
              disabled={sending || !replyInput.trim()}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Send size={16} color={replyInput.trim() ? '#fff' : colors.textDim} />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <>
          {/* Search Box */}
          <View style={styles.searchContainer}>
            <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Search size={16} color={colors.textDim} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Cari kontak atau nomor WhatsApp..."
                placeholderTextColor={colors.textDim}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {loadingConversations ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                Memuat obrolan WhatsApp...
              </Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={[styles.convListContent, { paddingBottom: insets.bottom + 40 }]}
              showsVerticalScrollIndicator={false}
            >
              {filteredConversations.length === 0 ? (
                <View style={[styles.emptyBox, { borderColor: colors.border }]}>
                  <MessageSquare size={36} color={colors.textDim} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>Belum Ada Obrolan</Text>
                  <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                    Tekan tombol '+' di atas untuk memulai chat WhatsApp baru.
                  </Text>
                </View>
              ) : (
                filteredConversations.map((conv) => (
                  <Pressable
                    key={conv.remoteJid}
                    style={[styles.convItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => handleSelectConversation(conv)}
                  >
                    <View style={[styles.avatarBox, { backgroundColor: colors.surfaceElevated }]}>
                      <User size={20} color={colors.primary} />
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={styles.convItemTop}>
                        <Text style={[styles.convName, { color: colors.text }]} numberOfLines={1}>
                          {conv.pushName || conv.senderPhone}
                        </Text>
                        <Text style={[styles.convTime, { color: colors.textDim }]}>
                          {conv.timestamp
                            ? new Date(conv.timestamp * 1000).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </Text>
                      </View>

                      <View style={styles.convItemBottom}>
                        <Text style={[styles.convSnippet, { color: colors.textMuted }]} numberOfLines={1}>
                          {conv.body || 'Pesan terkirim'}
                        </Text>
                        {conv.unreadCount > 0 && (
                          <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.unreadCountText}>{conv.unreadCount}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
          )}
        </>
      )}

      {/* Modal Mulai Chat Baru */}
      <Modal visible={showNewChatModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Mulai Chat WhatsApp Baru</Text>
              <Pressable onPress={() => setShowNewChatModal(false)} hitSlop={10}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Nomor WhatsApp Tujuan</Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Contoh: 08123456789 atau 628123456789"
              placeholderTextColor={colors.textDim}
              keyboardType="phone-pad"
              value={newChatPhone}
              onChangeText={setNewChatPhone}
            />

            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Pesan Pembuka</Text>
            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Ketik pesan yang ingin dikirimkan..."
              placeholderTextColor={colors.textDim}
              multiline
              numberOfLines={3}
              value={newChatMessage}
              onChangeText={setNewChatMessage}
            />

            <Pressable
              style={[styles.startChatBtn, { backgroundColor: colors.primary }]}
              onPress={handleStartNewChat}
              disabled={startingChat}
            >
              {startingChat ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Send size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.startChatBtnText}>Kirim Pesan WhatsApp</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
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
  addChatBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  navSubtitle: {
    fontSize: 11,
    marginLeft: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
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
  convListContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
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
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  convName: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    marginRight: 6,
  },
  convTime: {
    fontSize: 10,
  },
  convItemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  convSnippet: {
    fontSize: 12,
    flex: 1,
  },
  unreadBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  unreadCountText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  chatMessagesContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  emptyChatText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 30,
  },
  msgBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  msgBubbleMe: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  msgBubbleOther: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  senderPushName: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  msgBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  msgTime: {
    fontSize: 9,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  replyInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
  },
  sendChatBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
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
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  startChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  startChatBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
