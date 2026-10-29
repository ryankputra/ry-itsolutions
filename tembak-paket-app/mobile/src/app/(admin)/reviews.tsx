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
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Star,
  Trash2,
  Plus,
  RotateCw,
  MessageSquare,
  ShieldCheck,
  X,
  User,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';

export default function AdminReviewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors.dark;

  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [newReview, setNewReview] = useState({
    userName: '',
    rating: 5,
    comment: '',
    productId: 'unblock-imei',
    serviceType: 'imei',
    variation: 'GARANSI 3 BULAN (MASA AKTIF SINYAL)',
    userRole: 'Pembeli Terverifikasi',
  });

  const loadReviews = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/reviews?productId=all');
      if (res.data?.status && Array.isArray(res.data.reviews)) {
        setReviews(res.data.reviews);
      } else if (Array.isArray(res.data?.data)) {
        setReviews(res.data.data);
      } else {
        setReviews([]);
      }
    } catch (e) {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleDeleteReview = (id: string) => {
    Alert.alert('Hapus Ulasan?', 'Hapus ulasan ini secara permanen dari website dan aplikasi?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            const res = await apiClient.delete(`/admin/reviews/${id}`);
            if (res.data?.status !== false) {
              Alert.alert('Terhapus', 'Ulasan berhasil dihapus.');
              loadReviews();
            }
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const handleCreateReview = async () => {
    if (!newReview.userName.trim() || !newReview.comment.trim()) {
      Alert.alert('Perhatian', 'Nama pengguna dan komentar ulasan wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.post('/admin/reviews', {
        ...newReview,
        transactionDate: new Date().toISOString().substring(0, 10),
      });

      if (res.data?.status !== false) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        Alert.alert('Berhasil', 'Ulasan baru berhasil ditambahkan.');
        setShowAddModal(false);
        setNewReview({
          userName: '',
          rating: 5,
          comment: '',
          productId: 'unblock-imei',
          serviceType: 'imei',
          variation: 'GARANSI 3 BULAN (MASA AKTIF SINYAL)',
          userRole: 'Pembeli Terverifikasi',
        });
        loadReviews();
      } else {
        Alert.alert('Gagal', res.data?.message || 'Gagal menyimpan ulasan.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
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
          <Text style={[styles.navTitle, { color: colors.text }]}>Ulasan & Testimoni</Text>
          <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>
            {reviews.length} Ulasan Pengguna
          </Text>
        </View>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: colors.surface }]}
          onPress={loadReviews}
          hitSlop={10}
        >
          <RotateCw size={18} color={colors.primary} />
        </Pressable>
        <Pressable
          style={[styles.addBtn, { backgroundColor: colors.primary, marginLeft: 8 }]}
          onPress={() => setShowAddModal(true)}
          hitSlop={10}
        >
          <Plus size={18} color="#fff" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Memuat ulasan testimoni...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {reviews.length === 0 ? (
            <View style={[styles.emptyBox, { borderColor: colors.border }]}>
              <Star size={36} color={colors.textDim} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Belum Ada Ulasan</Text>
              <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                Tekan tombol '+' di pojok kanan atas untuk menambahkan testimoni baru.
              </Text>
            </View>
          ) : (
            reviews.map((r) => (
              <View
                key={r.id}
                style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.reviewTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.userName, { color: colors.text }]}>{r.userName || r.user_name}</Text>
                    <View style={styles.starRow}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={13}
                          color="#f59e0b"
                          fill={s <= (r.rating || 5) ? '#f59e0b' : 'transparent'}
                          style={{ marginRight: 2 }}
                        />
                      ))}
                    </View>
                  </View>

                  <Pressable
                    style={[styles.deleteIconBtn, { backgroundColor: colors.surfaceElevated }]}
                    onPress={() => handleDeleteReview(r.id)}
                  >
                    <Trash2 size={15} color={colors.danger} />
                  </Pressable>
                </View>

                <Text style={[styles.commentText, { color: colors.textMuted }]}>{r.comment}</Text>

                {r.variation && (
                  <View style={[styles.varBadge, { backgroundColor: colors.surfaceElevated }]}>
                    <Text style={[styles.varText, { color: colors.textDim }]}>{r.variation}</Text>
                  </View>
                )}

                <View style={styles.footerRow}>
                  <Text style={[styles.dateText, { color: colors.textDim }]}>
                    {r.transactionDate || r.created_at ? new Date(r.transactionDate || r.created_at).toLocaleDateString('id-ID') : ''}
                  </Text>
                  <View style={styles.verifiedRow}>
                    <ShieldCheck size={12} color={colors.success} style={{ marginRight: 4 }} />
                    <Text style={[styles.verifiedText, { color: colors.success }]}>
                      {r.userRole || 'Pembeli Terverifikasi'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Modal Tambah Ulasan */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Tambah Ulasan Testimoni</Text>
              <Pressable onPress={() => setShowAddModal(false)} hitSlop={10}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 450 }}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Nama Pelanggan</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text },
                ]}
                placeholder="Contoh: Dimas Pratama"
                placeholderTextColor={colors.textDim}
                value={newReview.userName}
                onChangeText={(t) => setNewReview({ ...newReview, userName: t })}
              />

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Rating Bintang</Text>
              <View style={styles.ratingPickerRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable
                    key={star}
                    onPress={() => {
                      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                      setNewReview({ ...newReview, rating: star });
                    }}
                    style={{ padding: 4 }}
                  >
                    <Star
                      size={28}
                      color="#f59e0b"
                      fill={star <= newReview.rating ? '#f59e0b' : 'transparent'}
                    />
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 12 }]}>
                Isi Komentar Testimoni
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text },
                ]}
                placeholder="Tulis ulasan pengalaman pelanggan..."
                placeholderTextColor={colors.textDim}
                multiline
                numberOfLines={3}
                value={newReview.comment}
                onChangeText={(t) => setNewReview({ ...newReview, comment: t })}
              />

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Variasi / Layanan</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text },
                ]}
                placeholder="GARANSI 3 BULAN (MASA AKTIF SINYAL)"
                placeholderTextColor={colors.textDim}
                value={newReview.variation}
                onChangeText={(t) => setNewReview({ ...newReview, variation: t })}
              />
            </ScrollView>

            <Pressable
              style={[styles.submitBtn, { backgroundColor: colors.primary, marginTop: 14 }]}
              onPress={handleCreateReview}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Publikasikan Ulasan</Text>
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
  actionBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
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
  reviewCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  reviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: '800',
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  deleteIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentText: {
    fontSize: 13,
    lineHeight: 18,
  },
  varBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
  },
  varText: {
    fontSize: 10,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  dateText: {
    fontSize: 11,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
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
    fontSize: 16,
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
    height: 75,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  ratingPickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  submitBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
