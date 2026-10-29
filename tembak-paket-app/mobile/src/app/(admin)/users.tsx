import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import {
  ArrowLeft,
  Users,
  Search,
  Wallet,
  Shield,
  Coins,
  CheckCircle2,
  XCircle,
  MoreVertical,
  RotateCw,
  Trash2,
  X,
  UserCheck,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';

export default function AdminUsersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors.dark;

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');

  // Modals
  const [balanceModalUser, setBalanceModalUser] = useState<any | null>(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [savingBalance, setSavingBalance] = useState(false);

  const [coinModalUser, setCoinModalUser] = useState<any | null>(null);
  const [coinAmount, setCoinAmount] = useState('');
  const [savingCoins, setSavingCoins] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/users');
      if (res.data?.status && Array.isArray(res.data.data)) {
        setUsers(res.data.data);
      } else {
        setUsers([]);
      }
    } catch (e) {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleUpdateBalance = async () => {
    if (!balanceModalUser || !balanceAmount) return;
    setSavingBalance(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.post('/admin/update-balance', {
        userId: balanceModalUser.id,
        amount: parseInt(balanceAmount.replace(/\D/g, ''), 10),
      });

      if (res.data?.status || res.status === 200) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        Alert.alert('Berhasil', 'Saldo pengguna berhasil diperbarui.');
        setBalanceModalUser(null);
        setBalanceAmount('');
        loadUsers();
      } else {
        Alert.alert('Gagal', res.data?.message || 'Gagal mengubah saldo.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Gagal menghubungi server.');
    } finally {
      setSavingBalance(false);
    }
  };

  const handleUpdateCoins = async () => {
    if (!coinModalUser || !coinAmount) return;
    setSavingCoins(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.post('/admin/update-coins', {
        userId: coinModalUser.id,
        amount: parseInt(coinAmount.replace(/\D/g, ''), 10),
      });

      if (res.data?.status || res.status === 200) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        Alert.alert('Berhasil', 'Koin pengguna berhasil diperbarui.');
        setCoinModalUser(null);
        setCoinAmount('');
        loadUsers();
      } else {
        Alert.alert('Gagal', res.data?.message || 'Gagal mengubah koin.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Gagal menghubungi server.');
    } finally {
      setSavingCoins(false);
    }
  };

  const handleDeleteZeroBalance = () => {
    Alert.alert(
      'Hapus Akun Saldo 0?',
      'Semua akun non-admin dengan saldo Rp 0 akan dihapus permanen untuk membersihkan database.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              const res = await apiClient.post('/admin/delete-zero-balance-users');
              if (res.data?.status) {
                Alert.alert('Selesai', res.data.message || 'Pembersihan akun saldo 0 berhasil.');
                loadUsers();
              } else {
                Alert.alert('Gagal', res.data?.message || 'Gagal menghapus akun.');
              }
            } catch (e) {
              Alert.alert('Error', 'Kesalahan sistem saat menghapus akun.');
            }
          },
        },
      ]
    );
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'all') {
        if (roleFilter === 'admin' && u.role !== 'admin') return false;
        if (roleFilter === 'user' && u.role === 'admin') return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = u.name && u.name.toLowerCase().includes(q);
        const matchEmail = u.email && u.email.toLowerCase().includes(q);
        const matchPhone = u.phone && u.phone.includes(q);
        const matchId = String(u.id).includes(q);
        return matchName || matchEmail || matchPhone || matchId;
      }
      return true;
    });
  }, [users, roleFilter, search]);

  const formatRupiah = (val: number) => {
    return 'Rp ' + (val || 0).toLocaleString('id-ID');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Nav */}
      <View style={[styles.topNav, { borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.surface }]}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.navTitle, { color: colors.text }]}>Kelola Pengguna</Text>
          <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>
            {users.length} Member Terdaftar
          </Text>
        </View>
        <Pressable
          style={[styles.refreshBtn, { backgroundColor: colors.surface }]}
          onPress={loadUsers}
        >
          <RotateCw size={18} color={colors.primary} />
        </Pressable>
      </View>

      {/* Search & Actions Bar */}
      <View style={styles.filterSection}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={16} color={colors.textDim} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Cari ID, nama, email, atau no HP..."
            placeholderTextColor={colors.textDim}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <X size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <View style={styles.rowSpace}>
          {/* Role Filter Chips */}
          <View style={styles.roleChips}>
            {[
              { id: 'all', label: 'Semua' },
              { id: 'user', label: 'Member' },
              { id: 'admin', label: 'Admin' },
            ].map((rf) => {
              const active = roleFilter === rf.id;
              return (
                <Pressable
                  key={rf.id}
                  style={[
                    styles.roleChip,
                    active
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  onPress={() => setRoleFilter(rf.id as any)}
                >
                  <Text style={[styles.roleChipText, { color: active ? '#fff' : colors.text }]}>
                    {rf.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Delete 0 Balance Button */}
          <Pressable
            style={[styles.cleanBtn, { backgroundColor: '#ef444418', borderColor: '#ef444444' }]}
            onPress={handleDeleteZeroBalance}
          >
            <Trash2 size={13} color="#ef4444" />
            <Text style={styles.cleanBtnText}>Bersihkan Saldo 0</Text>
          </Pressable>
        </View>
      </View>

      {/* Users List */}
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>Memuat pengguna...</Text>
          </View>
        ) : filteredUsers.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Tidak ada pengguna yang cocok.</Text>
          </View>
        ) : (
          <FlashList
            data={filteredUsers}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
            renderItem={({ item }) => {
              const isAdmin = item.role === 'admin';
              return (
                <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.rowSpace}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.rowAlign}>
                        <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
                        {isAdmin && (
                          <View style={styles.adminBadge}>
                            <Text style={styles.adminBadgeText}>ADMIN</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.userEmail, { color: colors.textMuted }]}>
                        {item.email || item.phone || `User #${item.id}`}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.balanceVal, { color: colors.primary }]}>
                        {formatRupiah(item.balance || 0)}
                      </Text>
                      <Text style={[styles.coinsVal, { color: '#eab308' }]}>
                        {item.coins || 0} Koin
                      </Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.actionRow}>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                      onPress={() => {
                        setBalanceModalUser(item);
                        setBalanceAmount(String(item.balance || 0));
                      }}
                    >
                      <Wallet size={13} color={colors.primary} />
                      <Text style={[styles.actionBtnText, { color: colors.text }]}>Ubah Saldo</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                      onPress={() => {
                        setCoinModalUser(item);
                        setCoinAmount(String(item.coins || 0));
                      }}
                    >
                      <Coins size={13} color="#eab308" />
                      <Text style={[styles.actionBtnText, { color: colors.text }]}>Ubah Koin</Text>
                    </Pressable>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>

      {/* Modal: Ubah Saldo */}
      <Modal visible={Boolean(balanceModalUser)} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.rowSpace}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Ubah Saldo: {balanceModalUser?.name}
              </Text>
              <Pressable onPress={() => setBalanceModalUser(null)}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <Text style={[styles.modalLabel, { color: colors.textMuted }]}>Masukkan Jumlah Saldo Baru (Rp):</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
              value={balanceAmount}
              onChangeText={setBalanceAmount}
              placeholder="Contoh: 50000"
              placeholderTextColor={colors.textDim}
              keyboardType="numeric"
            />

            <Pressable
              style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: 10 }]}
              onPress={handleUpdateBalance}
              disabled={savingBalance}
            >
              {savingBalance ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Simpan Saldo</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal: Ubah Koin */}
      <Modal visible={Boolean(coinModalUser)} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.rowSpace}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Ubah Koin: {coinModalUser?.name}
              </Text>
              <Pressable onPress={() => setCoinModalUser(null)}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <Text style={[styles.modalLabel, { color: colors.textMuted }]}>Masukkan Jumlah Koin Baru:</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
              value={coinAmount}
              onChangeText={setCoinAmount}
              placeholder="Contoh: 150"
              placeholderTextColor={colors.textDim}
              keyboardType="numeric"
            />

            <Pressable
              style={[styles.saveBtn, { backgroundColor: '#eab308', marginTop: 10 }]}
              onPress={handleUpdateCoins}
              disabled={savingCoins}
            >
              {savingCoins ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Simpan Koin</Text>
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
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  navSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
  },
  roleChips: {
    flexDirection: 'row',
    gap: 6,
  },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cleanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  cleanBtnText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '800',
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  userCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    gap: 8,
  },
  userName: {
    fontSize: 13,
    fontWeight: '800',
  },
  adminBadge: {
    backgroundColor: '#8b5cf622',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  adminBadgeText: {
    color: '#8b5cf6',
    fontSize: 9,
    fontWeight: '900',
  },
  userEmail: {
    fontSize: 10,
    marginTop: 2,
  },
  balanceVal: {
    fontSize: 13,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  coinsVal: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowSpace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    padding: 16,
  },
  modalBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  modalLabel: {
    fontSize: 11,
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  saveBtn: {
    height: 44,
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
