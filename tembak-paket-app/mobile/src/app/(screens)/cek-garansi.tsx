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
  Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle2,
  Smartphone,
  Shield,
  Send,
  Calendar,
  AlertCircle,
  Copy,
  Check,
  Share2,
  ShieldAlert,
  ShieldCheck,
  X,
  FileText,
  Clock,
  RotateCw,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';
import { InvoiceModal, InvoiceData } from '../../components/ui/InvoiceModal';

export default function CekGaransiScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors.dark;
  const params = useLocalSearchParams<{ imei?: string; action?: string }>();

  const [serialOrImei, setSerialOrImei] = useState(params.imei || '');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // Digital Invoice Modal
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);

  // Claim Warranty Modal
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimName, setClaimName] = useState('');
  const [claimPhone, setClaimPhone] = useState('');
  const [claimIssue, setClaimIssue] = useState('Sinyal tiba-tiba hilang (No Service / Tidak Ada Layanan)');
  const [submittingClaim, setSubmittingClaim] = useState(false);

  useEffect(() => {
    if (params.imei) {
      handleCheckWarranty(params.imei);
    }
  }, [params.imei]);

  const handleCheckWarranty = async (imeiToCheck?: string) => {
    const raw = (imeiToCheck || serialOrImei).trim();
    const clean = raw.replace(/\D/g, '');
    if (!clean || clean.length < 8) {
      Alert.alert('Perhatian', 'Masukkan nomor IMEI minimal 8 digit angka.');
      return;
    }

    setSubmitting(true);
    setResult(null);
    setErrorMessage('');

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.get(`/public/check-warranty?imei=${clean}`);
      const data = res.data;

      if (data?.status && data?.data) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        setResult(data.data);
      } else {
        setErrorMessage(data?.message || 'Data pelacakan IMEI tidak ditemukan di database resmi.');
      }
    } catch (e: any) {
      setErrorMessage(
        e.response?.data?.message || 'Nomor IMEI belum terdaftar atau tidak ditemukan dalam catatan garansi.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitClaim = async () => {
    if (!claimName.trim()) {
      Alert.alert('Perhatian', 'Mohon masukkan nama lengkap Anda.');
      return;
    }
    const cleanPhone = claimPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      Alert.alert('Perhatian', 'Mohon masukkan nomor WhatsApp yang aktif untuk konfirmasi.');
      return;
    }

    setSubmittingClaim(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.post('/public/claim-warranty', {
        imei: result?.imei || serialOrImei,
        customerName: claimName.trim(),
        customerPhone: cleanPhone,
        issueDescription: claimIssue.trim(),
      });

      if (res.data?.status) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        setShowClaimModal(false);
        setClaimName('');
        setClaimPhone('');
        Alert.alert(
          'Klaim Garansi Terkirim! 🎉',
          `Nomor Tiket Antrean: #${res.data.ticketId}\n\nNotifikasi prioritas telah diteruskan ke WhatsApp Tim Admin kami. Perangkat Anda akan segera diperiksa dan ditembak ulang sinyalnya.`
        );
      } else {
        Alert.alert('Gagal Mengajukan Klaim', res.data?.message || 'Terjadi kesalahan saat mengajukan klaim.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || e.message || 'Gagal menghubungi server.');
    } finally {
      setSubmittingClaim(false);
    }
  };

  const handleCopyImei = async () => {
    if (!result?.imei) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Clipboard.setStringAsync(result.imei);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleShareReport = async () => {
    if (!result) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const msg =
        `LAPORAN GARANSI SINYAL RY-ITSOLUTIONS\n` +
        `Nomor IMEI: ${result.imei}\n` +
        `Tipe Perangkat: ${result.brand || 'Smartphone'}\n` +
        `Paket Layanan: ${result.service_name || result.packageName || 'Add Roamer Resmi'}\n` +
        `Masa Aktif: ${result.activeUntil || 'Aktif Permanen'}\n` +
        `Status: ${result.warrantyStatus || result.status || 'Aktif Terverifikasi'}\n\n` +
        `Cek Garansi Resmi: https://ry-itsolutions.web.id/cek-garansi?imei=${result.imei}`;
      await Share.share({ title: 'Laporan Garansi IMEI', message: msg });
    } catch {}
  };

  const handleOpenDigitalInvoice = () => {
    if (!result) return;
    setSelectedInvoice({
      id: result.order_id || result.id || 'TRX-GARANSI',
      service: result.service_name || 'Aktivasi Sinyal Add Roamer',
      packageName: result.packageName || result.service_name,
      imei: result.imei,
      targetPhone: result.customerPhone || result.phone || '-',
      amount: result.price || result.amount || 0,
      status: 'completed',
      createdAt: result.registeredAt || result.createdAt || new Date().toISOString(),
      paymentMethod: result.paymentMethod || 'RyPay Balance',
    });
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
          <Text style={[styles.navTitle, { color: colors.text }]}>Lacak Nota & Garansi Sinyal</Text>
          <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>
            Verifikasi Database Resmi & Klaim Sinyal
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Form Pengecekan IMEI */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Masukkan Nomor IMEI Perangkat</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
            Cek status klaim garansi sinyal aktif dan unduh nota invoice digital perangkat Anda.
          </Text>

          <View style={[styles.inputBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Smartphone size={18} color={colors.primary} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              placeholder="Ketik 15 digit IMEI (dial *#06#)"
              placeholderTextColor={colors.textDim}
              keyboardType="numeric"
              maxLength={17}
              value={serialOrImei}
              onChangeText={setSerialOrImei}
            />
          </View>

          <Pressable
            style={[styles.checkBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
            onPress={() => handleCheckWarranty()}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <ShieldCheck size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.checkBtnText}>Lacak Status Garansi</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Error Message Box */}
        {errorMessage ? (
          <View style={[styles.errorCard, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: colors.danger }]}>
            <AlertCircle size={20} color={colors.danger} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.errorTitle, { color: colors.danger }]}>Data Tidak Ditemukan</Text>
              <Text style={[styles.errorDesc, { color: colors.textMuted }]}>{errorMessage}</Text>
            </View>
          </View>
        ) : null}

        {/* Hasil Pelacakan Resmi */}
        {result && (
          <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.success }]}>
            <View style={styles.resultHeader}>
              <View style={[styles.iconSuccessBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <ShieldCheck size={24} color={colors.success} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.resultTitle, { color: colors.text }]}>
                  {result.service_name || result.packageName || 'Garansi Add Roamer Resmi'}
                </Text>
                <Text style={[styles.resultImei, { color: colors.primary }]}>IMEI: {result.imei}</Text>
              </View>
              <Pressable
                style={[styles.copyImeiBtn, { backgroundColor: colors.surfaceElevated }]}
                onPress={handleCopyImei}
              >
                {copied ? <Check size={14} color={colors.success} /> : <Copy size={14} color={colors.textMuted} />}
              </Pressable>
            </View>

            {/* Rincian Tabel Garansi */}
            <View style={[styles.tableBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={styles.tableRow}>
                <Text style={[styles.tableLabel, { color: colors.textMuted }]}>Status Garansi</Text>
                <View style={[styles.activeStatusPill, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Text style={[styles.activeStatusText, { color: colors.success }]}>
                    {result.warrantyStatus || 'Aktif & Terproteksi'}
                  </Text>
                </View>
              </View>

              <View style={styles.tableRow}>
                <Text style={[styles.tableLabel, { color: colors.textMuted }]}>Perangkat / Tipe</Text>
                <Text style={[styles.tableVal, { color: colors.text }]}>{result.brand || 'Apple / Android'}</Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={[styles.tableLabel, { color: colors.textMuted }]}>Masa Aktif Garansi</Text>
                <Text style={[styles.tableVal, { color: colors.primary }]}>
                  {result.activeUntil || 'Permanen / Whitelist Bea Cukai'}
                </Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={[styles.tableLabel, { color: colors.textMuted }]}>Tanggal Pendaftaran</Text>
                <Text style={[styles.tableVal, { color: colors.text }]}>
                  {result.registeredAt || new Date().toLocaleDateString('id-ID')}
                </Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={[styles.tableLabel, { color: colors.textMuted }]}>Jangkauan Sinyal</Text>
                <Text style={[styles.tableVal, { color: colors.text }]}>
                  {result.provider || 'All Operator (Telkomsel, Indosat, XL, Tri, SF)'}
                </Text>
              </View>
            </View>

            {/* Tombol Aksi */}
            <View style={styles.actionButtonsCol}>
              <Pressable
                style={[styles.invoiceBtn, { backgroundColor: colors.primary }]}
                onPress={handleOpenDigitalInvoice}
              >
                <FileText size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.invoiceBtnText}>Lihat Nota Digital Resmi</Text>
              </Pressable>

              <Pressable
                style={[styles.claimTriggerBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: colors.danger }]}
                onPress={() => setShowClaimModal(true)}
              >
                <ShieldAlert size={16} color={colors.danger} style={{ marginRight: 6 }} />
                <Text style={[styles.claimTriggerBtnText, { color: colors.danger }]}>
                  Ajukan Klaim Garansi Sinyal
                </Text>
              </Pressable>

              <Pressable
                style={[styles.shareBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                onPress={handleShareReport}
              >
                <Share2 size={16} color={colors.text} style={{ marginRight: 6 }} />
                <Text style={[styles.shareBtnText, { color: colors.text }]}>Bagikan Bukti Garansi</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal Ajukan Klaim Garansi */}
      <Modal visible={showClaimModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Ajukan Klaim Sinyal</Text>
              <Pressable onPress={() => setShowClaimModal(false)} hitSlop={10}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
              IMEI Terklaim: <Text style={{ color: colors.primary, fontWeight: '800' }}>{result?.imei}</Text>
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 10 }]}>Nama Lengkap Anda</Text>
            <TextInput
              style={[
                styles.formInput,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Contoh: Budi Santoso"
              placeholderTextColor={colors.textDim}
              value={claimName}
              onChangeText={setClaimName}
            />

            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Nomor WhatsApp Aktif</Text>
            <TextInput
              style={[
                styles.formInput,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="08xxxxxxxxxx"
              placeholderTextColor={colors.textDim}
              keyboardType="phone-pad"
              value={claimPhone}
              onChangeText={setClaimPhone}
            />

            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Kendala yang Dialami</Text>
            <TextInput
              style={[
                styles.formInput,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text },
              ]}
              value={claimIssue}
              onChangeText={setClaimIssue}
            />

            <Pressable
              style={[styles.submitClaimBtn, { backgroundColor: colors.primary, marginTop: 14 }]}
              onPress={handleSubmitClaim}
              disabled={submittingClaim}
            >
              {submittingClaim ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Send size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.submitClaimBtnText}>Kirim Tiket Klaim Prioritas</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Digital Invoice Modal */}
      {selectedInvoice && (
        <InvoiceModal
          visible={!!selectedInvoice}
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
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
    marginBottom: 14,
    lineHeight: 16,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  checkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  checkBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  errorDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  resultCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconSuccessBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  resultImei: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  copyImeiBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tableLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tableVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  activeStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  actionButtonsCol: {
    gap: 8,
  },
  invoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  invoiceBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  claimTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  claimTriggerBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  shareBtnText: {
    fontSize: 13,
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
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    marginBottom: 10,
  },
  submitClaimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  submitClaimBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
