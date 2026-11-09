import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { Star, X, CheckCircle2, MessageSquare } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';

interface WriteReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  packageName?: string;
  onSuccess?: () => void;
}

export function WriteReviewModal({
  isOpen,
  onClose,
  orderId,
  packageName = 'Aktivasi IMEI All Operator',
  onSuccess,
}: WriteReviewModalProps) {
  const colors = Colors.dark;

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!comment.trim()) {
      Alert.alert('Perhatian', 'Silakan tuliskan ulasan pengalaman Anda.');
      return;
    }

    setSubmitting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.post('/reviews', {
        orderId,
        productId: 'unblock-imei',
        rating,
        comment: comment.trim(),
        variation: packageName,
      });

      if (res.data?.status) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        Alert.alert('Terima Kasih! 🎉', 'Ulasan dan bintang rating Anda berhasil dikirim.');
        onSuccess?.();
        onClose();
      } else {
        Alert.alert('Gagal', res.data?.message || 'Gagal mengirimkan ulasan.');
      }
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Terjadi kesalahan sistem saat mengirim ulasan.';
      Alert.alert('Gagal', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MessageSquare size={18} color={colors.primary} />
              <Text style={[styles.title, { color: colors.text }]}>Beri Ulasan Layanan</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={[styles.closeBtn, { backgroundColor: colors.background }]}>
              <X size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={[styles.packageName, { color: colors.textMuted }]}>{packageName}</Text>

          {/* Star Rating */}
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((star) => {
              const active = star <= rating;
              return (
                <Pressable
                  key={star}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                    setRating(star);
                  }}
                  hitSlop={8}
                >
                  <Star
                    size={32}
                    color={active ? '#f59e0b' : colors.textDim}
                    fill={active ? '#f59e0b' : 'transparent'}
                  />
                </Pressable>
              );
            })}
          </View>

          {/* Comment input */}
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="Ceritakan kepuasan sinyal atau respon admin kami..."
            placeholderTextColor={colors.textDim}
            multiline
            numberOfLines={4}
            value={comment}
            onChangeText={setComment}
          />

          {/* Submit Button */}
          <Pressable
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Kirim Ulasan</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageName: {
    fontSize: 12,
    marginBottom: 16,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 18,
  },
  input: {
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 14,
    marginBottom: 16,
  },
  submitBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
