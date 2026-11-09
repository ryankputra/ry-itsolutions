import { useAppTheme } from '../../context/ThemeContext';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, QrCode, Copy, Check, ShieldCheck, Clock, RefreshCw } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';

interface InstantQrisModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  orderTitle?: string;
  onSuccess: () => void;
}

export function InstantQrisModal({
  isOpen,
  onClose,
  amount,
  orderTitle = 'Pembayaran Direct QRIS',
  onSuccess,
}: InstantQrisModalProps) {
  const { colors } = useAppTheme();
  const [loading, setLoading] = useState(false);
  const [qrisData, setQrisData] = useState<{
    qris_image: string;
    qris_code: string;
    unique_amount: number;
    topup_id: string;
    merchant?: string;
  } | null>(null);

  const [timeLeft, setTimeLeft] = useState(300);
  const [copied, setCopied] = useState(false);

  // 1. Request QRIS on Modal Open
  useEffect(() => {
    if (!isOpen || amount <= 0) {
      setQrisData(null);
      setTimeLeft(300);
      return;
    }

    let isMounted = true;
    setLoading(true);

    async function createQris() {
      try {
        const res = await apiClient.post('/topup/request-qris', {
          amount,
          gateway: 'auto',
          provider: 'auto',
        });

        if (!isMounted) return;

        const data = res.data;
        if (data?.status && (data.data || data.qrisData)) {
          const qData = data.data || {};
          const qInfo = data.qrisData || {};

          const rawImg = qData.qris_image || qInfo.base64Image || '';
          const rawCode = qData.qris_code || qInfo.qrisCode || '';

          let resolvedImage = rawImg;
          if (!resolvedImage && rawCode) {
            resolvedImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&ecc=H&margin=4&data=${encodeURIComponent(rawCode)}`;
          }

          setQrisData({
            qris_image: resolvedImage,
            qris_code: rawCode,
            unique_amount: qData.unique_amount || qInfo.uniqueAmount || amount,
            topup_id: qData.topup_id || data.topUpId || `TU-${Date.now()}`,
            merchant: qData.merchant || qInfo.merchant || 'Direct QRIS Otomatis',
          });
          setTimeLeft(300);
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
        } else {
          Alert.alert('Gagal Membuat QRIS', data?.message || 'Layanan pembayaran QRIS sedang sibuk.');
          onClose();
        }
      } catch (err: any) {
        if (!isMounted) return;
        Alert.alert('Error Jaringan', 'Gagal terhubung ke gateway pembayaran QRIS.');
        onClose();
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    createQris();

    return () => {
      isMounted = false;
    };
  }, [isOpen, amount]);

  // 2. Realtime Timer Countdown & Polling Status
  useEffect(() => {
    if (!isOpen || !qrisData) return;

    // Timer Interval
    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Polling Interval (Every 3 seconds)
    const pollingInterval = setInterval(async () => {
      try {
        const res = await apiClient.get(`/topup/status/${qrisData.topup_id}`);
        const data = res.data;
        if (data?.status && (data.transactionStatus === 'completed' || data.transactionStatus === 'success')) {
          clearInterval(pollingInterval);
          clearInterval(timerInterval);
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
          Alert.alert('Pembayaran Berhasil! 🎉', 'Pembayaran QRIS Anda telah diterima dan pesanan diproses otomatis.');
          onSuccess();
        }
      } catch (e) {}
    }, 3000);

    return () => {
      clearInterval(timerInterval);
      clearInterval(pollingInterval);
    };
  }, [isOpen, qrisData]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const formatRupiah = (val: number) => 'Rp ' + (val || 0).toLocaleString('id-ID');

  const handleCopyAmount = async () => {
    if (!qrisData) return;
    try {
      await Clipboard.setStringAsync(qrisData.unique_amount.toString());
      setCopied(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.qrisBadge}>
                <QrCode size={18} color="#10b981" />
              </View>
              <View>
                <Text style={styles.title}>Direct QRIS Otomatis</Text>
                <Text style={styles.subtitle}>{orderTitle}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#94a3b8" />
            </Pressable>
          </View>

          {/* Body */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={styles.loadingText}>Membuat Kode QRIS Real-time...</Text>
            </View>
          ) : qrisData ? (
            <View style={styles.content}>
              {/* Expiry Timer Badge */}
              <View style={styles.timerBadge}>
                <Clock size={14} color="#f59e0b" />
                <Text style={styles.timerText}>
                  Selesaikan Pembayaran: <Text style={styles.timerHighlight}>{formattedTime}</Text>
                </Text>
              </View>

              {/* QR Code Image Card */}
              <View style={styles.qrCard}>
                {qrisData.qris_image ? (
                  <Image source={{ uri: qrisData.qris_image }} style={styles.qrImage} resizeMode="contain" />
                ) : (
                  <View style={styles.qrFallback}>
                    <QrCode size={64} color="#64748b" />
                  </View>
                )}
                <Text style={styles.merchantText}>{qrisData.merchant || 'RY STORE OFFICIAL'}</Text>
                <Text style={styles.supportText}>BCA Mobile • GoPay • OVO • Dana • ShopeePay • LinkAja</Text>
              </View>

              {/* Unique Nominal Card */}
              <Pressable onPress={handleCopyAmount} style={styles.amountCard}>
                <View>
                  <Text style={styles.amountLabel}>Total Tagihan (Wajib Tepat)</Text>
                  <Text style={styles.amountValue}>{formatRupiah(qrisData.unique_amount)}</Text>
                </View>
                <View style={styles.copyBtn}>
                  {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} color="#94a3b8" />}
                  <Text style={[styles.copyBtnText, copied && { color: '#10b981' }]}>
                    {copied ? 'Tersalin' : 'Salin'}
                  </Text>
                </View>
              </Pressable>

              {/* Live Polling Status */}
              <View style={styles.pollingNotice}>
                <RefreshCw size={13} color="#10b981" />
                <Text style={styles.pollingText}>Menunggu verifikasi transfer otomatis (3s polling)...</Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: Math.min(width - 32, 400),
    backgroundColor: '#0f172a',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qrisBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  loadingContainer: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 16,
  },
  timerText: {
    fontSize: 12,
    color: '#fcd34d',
  },
  timerHighlight: {
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  qrCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 16,
  },
  qrImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
  },
  qrFallback: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  merchantText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 10,
    letterSpacing: 0.5,
  },
  supportText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  amountCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#34d399',
    fontFamily: 'monospace',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyBtnText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  pollingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pollingText: {
    fontSize: 11,
    color: '#6ee7b7',
    fontStyle: 'italic',
  },
});
