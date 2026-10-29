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
  Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Ticket,
  Plus,
  Trash2,
  Edit2,
  RotateCw,
  Search,
  CheckCircle2,
  X,
  Users,
  Copy,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';

export default function AdminVouchersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors.dark;

  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discount_type: 'fixed',
    discount_value: '',
    min_order_amount: '',
    max_discount_amount: '',
    max_usage_limit: '100',
    max_claim_limit: '100',
    max_per_user: '1',
    is_public: '1',
  });

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/coupons');
      if (res.data?.status && Array.isArray(res.data.data)) {
        setCoupons(res.data.data);
      } else if (Array.isArray(res.data)) {
        setCoupons(res.data);
      } else {
        setCoupons([]);
      }
    } catch (e) {
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCopyCode = async (code: string, id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Clipboard.setStringAsync(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const handleCreateCoupon = async () => {
    if (!newCoupon.code.trim() || !newCoupon.discount_value) {
      Alert.alert('Perhatian', 'Kode kupon dan nilai diskon wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.post('/admin/coupons', {
        ...newCoupon,
        code: newCoupon.code.trim().toUpperCase(),
        discount_value: parseInt(newCoupon.discount_value.replace(/\D/g, ''), 10),
        min_order_amount: parseInt(newCoupon.min_order_amount.replace(/\D/g, '') || '0', 10),
        max_discount_amount: parseInt(newCoupon.max_discount_amount.replace(/\D/g, '') || '0', 10),
      });

      if (res.data?.status) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        Alert.alert('Sukses', 'Kupon diskon baru berhasil diterbitkan.');
        setShowCreateModal(false);
        setNewCoupon({
          code: '',
          discount_type: 'fixed',
          discount_value: '',
          min_order_amount: '',
          max_discount_amount: '',
          max_usage_limit: '100',
          max_claim_limit: '100',
          max_per_user: '1',
          is_public: '1',
        });
        loadCoupons();
      } else {
        Alert.alert('Gagal', res.data?.message || 'Gagal membuat kupon.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleCoupon = async (c: any) => {
    const nextStatus = c.is_active === 1 || c.is_active === true ? 0 : 1;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await apiClient.put(`/admin/coupons/${c.id}`, {
        is_active: nextStatus,
      });
      if (res.data?.status) {
        loadCoupons();
      }
    } catch (e) {}
  };

  const handleDeleteCoupon = (c: any) => {
    Alert.alert(
      'Hapus Kupon Diskon?',
      `Hapus kupon '${c.code}' secara permanen? Kupon tidak akan bisa dipakai lagi.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              const res = await apiClient.delete(`/admin/coupons/${c.id}`);
              if (res.data?.status) {
                Alert.alert('Terhapus', 'Kupon berhasil dihapus.');
                loadCoupons();
              }
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const handleUpdateCoupon = async () => {
    if (!editingCoupon) return;
    setSubmitting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.put(`/admin/coupons/${editingCoupon.id}`, editingCoupon);
      if (res.data?.status) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        Alert.alert('Sukses', 'Kupon berhasil diperbarui.');
        setEditingCoupon(null);
        loadCoupons();
      } else {
        Alert.alert('Gagal', res.data?.message || 'Gagal menyimpan pembaruan.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCoupons = coupons.filter((c) =>
    (c.code && c.code.toLowerCase().includes(search.toLowerCase()))
  );

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
          <Text style={[styles.navTitle, { color: colors.text }]}>Kelola Voucher Promo</Text>
          <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>
            {coupons.length} Kupon Diskon Terdaftar
          </Text>
        </View>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: colors.surface }]}
          onPress={loadCoupons}
          hitSlop={10}
        >
          <RotateCw size={18} color={colors.primary} />
        </Pressable>
        <Pressable
          style={[styles.addBtn, { backgroundColor: colors.primary, marginLeft: 8 }]}
          onPress={() => setShowCreateModal(true)}
          hitSlop={10}
        >
          <Plus size={18} color="#ffffff" />
        </Pressable>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={16} color={colors.textDim} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Cari kode kupon..."
            placeholderTextColor={colors.textDim}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Memuat voucher kupon...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {filteredCoupons.length === 0 ? (
            <View style={[styles.emptyCard, { borderColor: colors.border }]}>
              <Ticket size={36} color={colors.textDim} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Belum Ada Voucher</Text>
              <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                Tekan tombol tambah di atas untuk membuat voucher promo baru.
              </Text>
            </View>
          ) : (
            filteredCoupons.map((c) => {
              const isActive = c.is_active === 1 || c.is_active === true;
              const isCopied = copiedId === c.id;

              return (
                <View
                  key={c.id}
                  style={[
                    styles.couponCard,
                    { backgroundColor: colors.surface, borderColor: isActive ? colors.border : colors.hairline },
                  ]}
                >
                  <View style={styles.cardTop}>
                    <Pressable
                      style={[styles.codeBadge, { backgroundColor: colors.surfaceElevated }]}
                      onPress={() => handleCopyCode(c.code, c.id)}
                    >
                      <Ticket size={14} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text style={[styles.codeText, { color: colors.text }]}>{c.code}</Text>
                      {isCopied ? (
                        <Check size={14} color={colors.success} style={{ marginLeft: 6 }} />
                      ) : (
                        <Copy size={14} color={colors.textDim} style={{ marginLeft: 6 }} />
                      )}
                    </Pressable>

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Switch
                        value={isActive}
                        onValueChange={() => handleToggleCoupon(c)}
                        thumbColor="#ffffff"
                        trackColor={{ false: '#334155', true: colors.success }}
                      />
                      <Pressable
                        style={[styles.iconBtn, { backgroundColor: colors.surfaceElevated, marginLeft: 8 }]}
                        onPress={() => setEditingCoupon({ ...c })}
                      >
                        <Edit2 size={15} color={colors.primary} />
                      </Pressable>
                      <Pressable
                        style={[styles.iconBtn, { backgroundColor: colors.surfaceElevated, marginLeft: 6 }]}
                        onPress={() => handleDeleteCoupon(c)}
                      >
                        <Trash2 size={15} color={colors.danger} />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.detailsRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.discountValue, { color: colors.primary }]}>
                        {c.discount_type === 'percent'
                          ? `Diskon ${c.discount_value}%`
                          : `Diskon ${formatRupiah(c.discount_value)}`}
                      </Text>
                      <Text style={[styles.minSpendText, { color: colors.textMuted }]}>
                        Min. belanja: {formatRupiah(c.min_order_amount || 0)}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <View
                        style={[
                          styles.publicBadge,
                          {
                            backgroundColor:
                              c.is_public === 1 || c.is_public === '1'
                                ? 'rgba(59, 130, 246, 0.15)'
                                : 'rgba(100, 116, 139, 0.15)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.publicBadgeText,
                            {
                              color:
                                c.is_public === 1 || c.is_public === '1' ? colors.primary : colors.textDim,
                            },
                          ]}
                        >
                          {c.is_public === 1 || c.is_public === '1' ? 'Publik' : 'Private'}
                        </Text>
                      </View>
                      <Text style={[styles.usageStats, { color: colors.textDim }]}>
                        Terpakai: {c.used_count || 0} / {c.max_usage_limit || '∞'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Modal Buat Kupon Baru */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Buat Kupon Diskon</Text>
              <Pressable onPress={() => setShowCreateModal(false)} hitSlop={10}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 450 }}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Kode Kupon (Uppercase)</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                placeholder="Contoh: FLASH50"
                placeholderTextColor={colors.textDim}
                autoCapitalize="characters"
                value={newCoupon.code}
                onChangeText={(t) => setNewCoupon({ ...newCoupon, code: t.toUpperCase() })}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <Pressable
                  style={[
                    styles.typePill,
                    {
                      backgroundColor: newCoupon.discount_type === 'fixed' ? colors.primary : colors.surfaceElevated,
                      borderColor: newCoupon.discount_type === 'fixed' ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setNewCoupon({ ...newCoupon, discount_type: 'fixed' })}
                >
                  <Text style={[styles.typeText, { color: newCoupon.discount_type === 'fixed' ? '#fff' : colors.textMuted }]}>
                    Nominal Tetap (Rp)
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.typePill,
                    {
                      backgroundColor: newCoupon.discount_type === 'percent' ? colors.primary : colors.surfaceElevated,
                      borderColor: newCoupon.discount_type === 'percent' ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setNewCoupon({ ...newCoupon, discount_type: 'percent' })}
                >
                  <Text style={[styles.typeText, { color: newCoupon.discount_type === 'percent' ? '#fff' : colors.textMuted }]}>
                    Persentase (%)
                  </Text>
                </Pressable>
              </View>

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                {newCoupon.discount_type === 'fixed' ? 'Nominal Diskon (Rp)' : 'Besar Diskon (%)'}
              </Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                placeholder={newCoupon.discount_type === 'fixed' ? 'Contoh: 10000' : 'Contoh: 15'}
                placeholderTextColor={colors.textDim}
                keyboardType="numeric"
                value={newCoupon.discount_value}
                onChangeText={(t) => setNewCoupon({ ...newCoupon, discount_value: t })}
              />

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Minimal Order Belanja (Rp)</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                placeholder="Contoh: 50000 (0 jika tanpa min. order)"
                placeholderTextColor={colors.textDim}
                keyboardType="numeric"
                value={newCoupon.min_order_amount}
                onChangeText={(t) => setNewCoupon({ ...newCoupon, min_order_amount: t })}
              />

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Batas Maksimal Penggunaan Kupon</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                placeholder="Contoh: 100"
                placeholderTextColor={colors.textDim}
                keyboardType="numeric"
                value={newCoupon.max_usage_limit}
                onChangeText={(t) => setNewCoupon({ ...newCoupon, max_usage_limit: t })}
              />

              <View style={[styles.switchRow, { borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchTitle, { color: colors.text }]}>Tampilkan di Halaman Publik</Text>
                  <Text style={[styles.switchDesc, { color: colors.textMuted }]}>
                    Member dapat melihat & mengklaim kupon di halaman klaim voucher
                  </Text>
                </View>
                <Switch
                  value={newCoupon.is_public === '1'}
                  onValueChange={(val) => setNewCoupon({ ...newCoupon, is_public: val ? '1' : '0' })}
                  thumbColor="#ffffff"
                  trackColor={{ false: '#334155', true: colors.primary }}
                />
              </View>
            </ScrollView>

            <Pressable
              style={[styles.submitBtn, { backgroundColor: colors.primary, marginTop: 14 }]}
              onPress={handleCreateCoupon}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Terbitkan Kupon</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal Edit Kupon */}
      {editingCoupon && (
        <Modal visible={!!editingCoupon} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Kupon {editingCoupon.code}</Text>
                <Pressable onPress={() => setEditingCoupon(null)} hitSlop={10}>
                  <X size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 450 }}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Nilai Diskon</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                  keyboardType="numeric"
                  value={String(editingCoupon.discount_value)}
                  onChangeText={(t) => setEditingCoupon({ ...editingCoupon, discount_value: parseInt(t, 10) || 0 })}
                />

                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Minimal Belanja (Rp)</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                  keyboardType="numeric"
                  value={String(editingCoupon.min_order_amount || '')}
                  onChangeText={(t) => setEditingCoupon({ ...editingCoupon, min_order_amount: parseInt(t, 10) || 0 })}
                />

                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Batas Maksimal Penggunaan</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                  keyboardType="numeric"
                  value={String(editingCoupon.max_usage_limit || '')}
                  onChangeText={(t) => setEditingCoupon({ ...editingCoupon, max_usage_limit: parseInt(t, 10) || 100 })}
                />
              </ScrollView>

              <Pressable
                style={[styles.submitBtn, { backgroundColor: colors.primary, marginTop: 14 }]}
                onPress={handleUpdateCoupon}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Simpan Perubahan</Text>
                )}
              </Pressable>
            </View>
          </View>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  emptyCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
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
    lineHeight: 18,
  },
  couponCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  codeText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  discountValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  minSpendText: {
    fontSize: 11,
    marginTop: 2,
  },
  publicBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  publicBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  usageStats: {
    fontSize: 10,
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
  typePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  switchDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
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
