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
  RotateCw,
  Package,
  Search,
  CheckCircle2,
  AlertCircle,
  Edit2,
  X,
  Layers,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';

export default function AdminPackagesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors.dark;

  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');

  // Edit Modal State
  const [editingPkg, setEditingPkg] = useState<any | null>(null);
  const [savingPkg, setSavingPkg] = useState(false);

  const loadPackages = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/packages');
      if (res.data?.status && Array.isArray(res.data.data)) {
        setPackages(res.data.data);
      } else if (Array.isArray(res.data)) {
        setPackages(res.data);
      } else {
        setPackages([]);
      }
    } catch (e) {
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const handleSyncKmsp = async () => {
    setSyncing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.post('/admin/sync-packages');
      if (res.data?.status !== false) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        Alert.alert('Sinkronisasi Sukses', res.data?.message || 'Paket kuota berhasil disinkronkan dari server KMSP.');
        loadPackages();
      } else {
        Alert.alert('Gagal Sinkron', res.data?.message || 'Gagal sinkronisasi data.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleVisible = async (pkg: any) => {
    const nextVal = pkg.isVisible === 1 || pkg.isVisible === true ? 0 : 1;
    const updated = { ...pkg, isVisible: nextVal };
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await apiClient.put('/admin/packages/bulk-update', { packages: [updated] });
      setPackages((prev) => prev.map((p) => (p.package_code === pkg.package_code ? updated : p)));
    } catch (e) {}
  };

  const handleSaveSinglePkg = async () => {
    if (!editingPkg) return;
    setSavingPkg(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.put('/admin/packages/bulk-update', {
        packages: [editingPkg],
      });
      if (res.data?.status !== false) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        Alert.alert('Tersimpan', 'Pengaturan paket berhasil disimpan.');
        setPackages((prev) =>
          prev.map((p) => (p.package_code === editingPkg.package_code ? editingPkg : p))
        );
        setEditingPkg(null);
      } else {
        Alert.alert('Gagal', res.data?.message || 'Gagal memperbarui paket.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingPkg(false);
    }
  };

  const filteredPackages = packages.filter((p) => {
    const q = search.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.package_code && p.package_code.toLowerCase().includes(q)) ||
      (p.provider && p.provider.toLowerCase().includes(q))
    );
  });

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
          <Text style={[styles.navTitle, { color: colors.text }]}>Kelola Paket Kuota</Text>
          <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>
            {packages.length} Paket Provider KMSP
          </Text>
        </View>
        <Pressable
          style={[styles.syncBtn, { backgroundColor: colors.primary }]}
          onPress={handleSyncKmsp}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <RotateCw size={14} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.syncBtnText}>Sync KMSP</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={16} color={colors.textDim} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Cari nama atau kode paket kuota..."
            placeholderTextColor={colors.textDim}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Memuat paket data...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {filteredPackages.length === 0 ? (
            <View style={[styles.emptyBox, { borderColor: colors.border }]}>
              <Package size={36} color={colors.textDim} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Tidak Ditemukan</Text>
              <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                Tidak ada paket kuota yang cocok dengan pencarian Anda.
              </Text>
            </View>
          ) : (
            filteredPackages.map((pkg) => {
              const isVisible = pkg.isVisible === 1 || pkg.isVisible === true || pkg.isVisible === undefined;
              return (
                <View
                  key={pkg.package_code}
                  style={[styles.pkgCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={styles.pkgTop}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.pkgName, { color: colors.text }]}>{pkg.name}</Text>
                      <Text style={[styles.pkgCode, { color: colors.primary }]}>{pkg.package_code}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Switch
                        value={isVisible}
                        onValueChange={() => handleToggleVisible(pkg)}
                        thumbColor="#ffffff"
                        trackColor={{ false: '#334155', true: colors.success }}
                      />
                      <Pressable
                        style={[styles.editIconBtn, { backgroundColor: colors.surfaceElevated, marginLeft: 8 }]}
                        onPress={() => setEditingPkg({ ...pkg })}
                      >
                        <Edit2 size={16} color={colors.primary} />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.priceRow}>
                    <View>
                      <Text style={[styles.priceLabel, { color: colors.textMuted }]}>Harga Jual</Text>
                      <Text style={[styles.priceValue, { color: colors.primary }]}>
                        {formatRupiah(pkg.price)}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.priceLabel, { color: colors.textMuted }]}>Status</Text>
                      <Text style={[styles.statusText, { color: isVisible ? colors.success : colors.textDim }]}>
                        {isVisible ? 'Tampil di App' : 'Disembunyikan'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Modal Edit Paket */}
      {editingPkg && (
        <Modal visible={!!editingPkg} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Paket Kuota</Text>
                <Pressable onPress={() => setEditingPkg(null)} hitSlop={10}>
                  <X size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Nama Paket</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text },
                ]}
                value={editingPkg.name}
                onChangeText={(t) => setEditingPkg({ ...editingPkg, name: t })}
              />

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Harga Jual Pelanggan (Rp)</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text },
                ]}
                keyboardType="numeric"
                value={String(editingPkg.price || '')}
                onChangeText={(t) => setEditingPkg({ ...editingPkg, price: parseInt(t, 10) || 0 })}
              />

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Deskripsi Tambahan</Text>
              <TextInput
                style={[
                  styles.textArea,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text },
                ]}
                multiline
                numberOfLines={3}
                value={editingPkg.description || ''}
                onChangeText={(t) => setEditingPkg({ ...editingPkg, description: t })}
              />

              <Pressable
                style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: 14 }]}
                onPress={handleSaveSinglePkg}
                disabled={savingPkg}
              >
                {savingPkg ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Simpan Pengaturan</Text>
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
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  syncBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
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
  pkgCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  pkgTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pkgName: {
    fontSize: 14,
    fontWeight: '800',
  },
  pkgCode: {
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  editIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
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
    height: 70,
    textAlignVertical: 'top',
  },
  saveBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
