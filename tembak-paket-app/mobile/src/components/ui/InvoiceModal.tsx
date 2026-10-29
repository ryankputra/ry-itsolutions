import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Share,
  Clipboard,
  Alert,
} from 'react-native';
import {
  X,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Share2,
  ShieldCheck,
  Smartphone,
  Calendar,
  CreditCard,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../theme/colors';
import { analyzeImei } from '../../utils/imeiHelper';

export interface InvoiceData {
  trxId?: string;
  id?: string;
  imei?: string;
  packageName?: string;
  title?: string;
  service?: string;
  serviceType?: string;
  createdAt?: string;
  date?: string;
  amount?: number;
  status?: string;
  targetPhone?: string;
  paymentMethod?: string;
  warranty?: {
    hasWarranty?: boolean;
    remainingDays?: number | string;
  };
  adminNote?: string;
}

export interface InvoiceModalProps {
  isOpen?: boolean;
  visible?: boolean;
  onClose: () => void;
  data?: InvoiceData | null;
  invoice?: InvoiceData | null;
}

export function InvoiceModal({ isOpen, visible, onClose, data, invoice }: InvoiceModalProps) {
  const colors = Colors.dark;
  const isModalOpen = isOpen !== undefined ? isOpen : !!visible;
  const targetData = data || invoice;

  if (!isModalOpen || !targetData) return null;

  const resolvedTrxId = targetData.trxId || targetData.id || '-';
  const resolvedTitle = targetData.packageName || targetData.title || 'Layanan Digital RY';
  const resolvedDate = targetData.createdAt || targetData.date || 'Hari ini';

  const imeiAnalysis = targetData.imei ? analyzeImei(targetData.imei) : null;
  const isSuccess = targetData.status === 'success' || targetData.status === 'completed';
  const isPending = targetData.status === 'pending' || targetData.status === 'waiting';

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    Alert.alert('Tersalin', `${label} berhasil disalin ke clipboard.`);
  };

  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await Share.share({
        title: `Nota Transaksi #${resolvedTrxId.substring(0, 10)}`,
        message: `*NOTA DIGITAL RY-ITSOLUTIONS*\n\n` +
          `ID Pesanan: #${resolvedTrxId}\n` +
          `Layanan: ${resolvedTitle}\n` +
          `IMEI / Target: ${targetData.imei || targetData.targetPhone || '-'}\n` +
          `Perangkat: ${imeiAnalysis?.brand ? `${imeiAnalysis.brand} ${imeiAnalysis.model}` : '-'}\n` +
          `Total Bayar: Rp ${(targetData.amount || 0).toLocaleString('id-ID')}\n` +
          `Status: ${(targetData.status || 'SUCCESS').toUpperCase()}\n` +
          `Tanggal: ${resolvedDate}\n\n` +
          `Verifikasi & Garansi Resmi: https://ry-itsolutions.web.id/cek-garansi?imei=${targetData.imei || ''}`,
      });
    } catch {}
  };

  return (
    <Modal visible={isModalOpen} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.headerTitle, { color: colors.ink }]}>Nota Digital Resmi</Text>
              <Text style={[styles.headerSub, { color: colors.inkMuted }]}>
                #{resolvedTrxId.substring(0, 14)}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                onClose();
              }}
              style={styles.closeBtn}
            >
              <X size={20} color={colors.inkMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Status Card */}
            <View
              style={[
                styles.statusBanner,
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
              {isSuccess ? (
                <CheckCircle2 size={24} color="#30D158" />
              ) : isPending ? (
                <Clock size={24} color="#FF9F0A" />
              ) : (
                <XCircle size={24} color="#FF453A" />
              )}
              <View style={styles.statusTextWrap}>
                <Text
                  style={[
                    styles.statusTitle,
                    { color: isSuccess ? '#30D158' : isPending ? '#FF9F0A' : '#FF453A' },
                  ]}
                >
                  {isSuccess ? 'Transaksi Berhasil' : isPending ? 'Menunggu Proses' : 'Gagal / Dibatalkan'}
                </Text>
                <Text style={[styles.statusSubtitle, { color: colors.inkMuted }]}>
                  {resolvedDate}
                </Text>
              </View>
            </View>

            {/* Details List */}
            <View style={[styles.detailsBox, { backgroundColor: colors.canvas, borderColor: colors.border }]}>
              {/* Service */}
              <View style={styles.row}>
                <Text style={[styles.label, { color: colors.inkMuted }]}>Layanan</Text>
                <Text style={[styles.value, { color: colors.ink }]}>{resolvedTitle}</Text>
              </View>

              {/* IMEI */}
              {targetData.imei && (
                <View style={styles.row}>
                  <Text style={[styles.label, { color: colors.inkMuted }]}>Nomor IMEI</Text>
                  <Pressable
                    onPress={() => copyToClipboard(targetData.imei!, 'Nomor IMEI')}
                    style={styles.copyValue}
                  >
                    <Text style={[styles.monoValue, { color: colors.primary }]}>{targetData.imei}</Text>
                    <Copy size={13} color={colors.primary} />
                  </Pressable>
                </View>
              )}

              {/* Device Model */}
              {imeiAnalysis?.brand ? (
                <View style={styles.row}>
                  <Text style={[styles.label, { color: colors.inkMuted }]}>Model Perangkat</Text>
                  <Text style={[styles.value, { color: colors.ink }]}>
                    {imeiAnalysis.brand} {imeiAnalysis.model}
                  </Text>
                </View>
              ) : null}

              {/* Price */}
              <View style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 10, marginTop: 4 }]}>
                <Text style={[styles.labelBold, { color: colors.ink }]}>Total Pembayaran</Text>
                <Text style={[styles.priceValue, { color: colors.primary }]}>
                  Rp {(targetData.amount || 0).toLocaleString('id-ID')}
                </Text>
              </View>
            </View>

            {/* Warranty Badge if applicable */}
            {targetData.warranty?.hasWarranty && (
              <View style={[styles.warrantyBox, { backgroundColor: 'rgba(41, 151, 255, 0.08)', borderColor: 'rgba(41, 151, 255, 0.25)' }]}>
                <ShieldCheck size={18} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.warrantyTitle, { color: colors.primary }]}>Garansi Aktif</Text>
                  <Text style={[styles.warrantySub, { color: colors.inkMuted }]}>
                    Sisa masa aktif garansi: {targetData.warranty.remainingDays || 30} Hari. Nota ini diakui resmi di sistem kami.
                  </Text>
                </View>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionRow}>
              <Pressable
                onPress={() => copyToClipboard(resolvedTrxId, 'ID Transaksi')}
                style={[styles.outlineBtn, { borderColor: colors.border, backgroundColor: colors.canvas }]}
              >
                <Copy size={15} color={colors.ink} />
                <Text style={[styles.btnText, { color: colors.ink }]}>Salin ID</Text>
              </Pressable>

              <Pressable
                onPress={handleShare}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              >
                <Share2 size={15} color="#fff" />
                <Text style={styles.primaryBtnText}>Bagikan Nota</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusTextWrap: {
    marginLeft: 12,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  detailsBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
  },
  labelBold: {
    fontSize: 13,
    fontWeight: '700',
  },
  value: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  monoValue: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  copyValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  warrantyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  warrantyTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  warrantySub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  btnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  primaryBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
