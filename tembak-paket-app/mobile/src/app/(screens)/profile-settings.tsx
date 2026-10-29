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
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Lock,
  User,
  Save,
  PhoneCall,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  Camera,
  Send,
  ShieldCheck,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';

type TabType = 'profile' | 'whatsapp' | 'email' | 'password';

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const colors = Colors.dark;
  const params = useLocalSearchParams<{ tab?: string }>();

  const initialTab = (params.tab as TabType) || 'profile';
  const [activeTab, setActiveTab] = useState<TabType>(
    ['profile', 'whatsapp', 'email', 'password'].includes(initialTab) ? initialTab : 'profile'
  );

  // Form states
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.verifiedPhone || user?.phone || '');
  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Loading states
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.verifiedPhone || user.phone || '');
    }
  }, [user]);

  // Countdown timer for email OTP
  useEffect(() => {
    let timer: any;
    if (otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpCountdown]);

  // Avatar Image Picker & Upload
  const handlePickAvatar = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        const localUri = res.assets[0].uri;
        const filename = localUri.split('/').pop() || 'avatar.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        const formData = new FormData();
        formData.append('avatar', {
          uri: localUri,
          name: filename,
          type,
        } as any);

        setUploadingAvatar(true);
        const uploadRes = await apiClient.post('/user/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (uploadRes.data?.status && uploadRes.data.avatar) {
          try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
          await refreshUser();
          Alert.alert('Sukses', 'Foto profil akun Anda berhasil diperbarui.');
        } else {
          Alert.alert('Gagal', uploadRes.data?.message || 'Gagal mengunggah foto profil.');
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Gagal memilih foto.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // 1. Update Name
  const handleUpdateName = async () => {
    if (!name.trim()) {
      Alert.alert('Perhatian', 'Nama lengkap tidak boleh kosong.');
      return;
    }

    setSavingProfile(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.put('/user/profile', { name: name.trim() });
      if (res.data?.status !== false) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        await refreshUser();
        Alert.alert('Berhasil! 🎉', 'Nama akun profil berhasil disimpan.');
      } else {
        Alert.alert('Gagal', res.data?.message || 'Gagal menyimpan nama profil.');
      }
    } catch (e: any) {
      Alert.alert('Gagal', e.response?.data?.message || e.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // 2. Update WhatsApp Number
  const handleUpdateWhatsApp = async () => {
    const clean = phone.replace(/\D/g, '');
    if (!clean || clean.length < 9) {
      Alert.alert('Perhatian', 'Masukkan nomor WhatsApp aktif yang valid.');
      return;
    }

    setSavingPhone(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.post('/user/bind-phone', { phone: clean });
      if (res.data?.status !== false) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        await refreshUser();
        Alert.alert(
          'WhatsApp Terhubung! 🎉',
          res.data?.message || 'Nomor WhatsApp berhasil disimpan untuk pengiriman invoice & notifikasi transaksi.'
        );
      } else {
        Alert.alert('Gagal', res.data?.message || 'Gagal menyimpan nomor WhatsApp.');
      }
    } catch (e: any) {
      Alert.alert('Gagal', e.response?.data?.message || e.message);
    } finally {
      setSavingPhone(false);
    }
  };

  // 3. Request Email OTP
  const handleRequestEmailOtp = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      Alert.alert('Perhatian', 'Masukkan alamat email baru yang valid.');
      return;
    }

    setSendingOtp(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.post('/user/request-email-otp', {
        newEmail: newEmail.trim(),
      });
      if (res.data?.status !== false) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        setOtpSent(true);
        setOtpCountdown(60);
        Alert.alert('Kode OTP Terkirim', `Kode verifikasi telah dikirim ke ${newEmail.trim()}. Silakan cek kotak masuk atau folder spam Anda.`);
      } else {
        Alert.alert('Gagal', res.data?.message || 'Gagal mengirim kode OTP.');
      }
    } catch (e: any) {
      Alert.alert('Gagal', e.response?.data?.message || e.message);
    } finally {
      setSendingOtp(false);
    }
  };

  // 3. Verify Email OTP
  const handleVerifyEmailOtp = async () => {
    if (!emailOtp.trim()) {
      Alert.alert('Perhatian', 'Masukkan kode verifikasi OTP 6 digit.');
      return;
    }

    setVerifyingOtp(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.post('/user/verify-email-otp', {
        newEmail: newEmail.trim(),
        otp: emailOtp.trim(),
      });
      if (res.data?.status !== false) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        await refreshUser();
        Alert.alert('Email Berhasil Diubah! 🎉', 'Email akun Anda telah diperbarui di database.');
        setOtpSent(false);
        setNewEmail('');
        setEmailOtp('');
      } else {
        Alert.alert('Gagal Verifikasi', res.data?.message || 'Kode OTP salah atau telah kadaluarsa.');
      }
    } catch (e: any) {
      Alert.alert('Gagal', e.response?.data?.message || e.message);
    } finally {
      setVerifyingOtp(false);
    }
  };

  // 4. Change Password
  const handleChangePassword = async () => {
    if (!currentPassword) {
      Alert.alert('Perhatian', 'Kata sandi saat ini wajib diisi.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Perhatian', 'Kata sandi baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Perhatian', 'Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setSavingPassword(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.post('/user/change-password', {
        currentPassword,
        newPassword,
      });

      if (res.data?.status !== false) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        Alert.alert('Berhasil! 🔒', 'Kata sandi akun Anda berhasil diperbarui.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Gagal', res.data?.message || 'Gagal mengubah kata sandi.');
      }
    } catch (e: any) {
      Alert.alert('Gagal', e.response?.data?.message || e.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const username = user?.name || user?.email?.split('@')[0] || 'User RY';
  const initialChar = (username[0] || 'U').toUpperCase();

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
          <Text style={[styles.navTitle, { color: colors.text }]}>Pengaturan Akun & Profil</Text>
          <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>
            Kelola Biodata, WhatsApp & Keamanan
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {[
          { key: 'profile', label: 'Profil' },
          { key: 'whatsapp', label: 'WhatsApp' },
          { key: 'email', label: 'Email' },
          { key: 'password', label: 'Password' },
        ].map((tab) => {
          const active = activeTab === tab.key;
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
                setActiveTab(tab.key as TabType);
              }}
            >
              <Text style={[styles.tabText, { color: active ? '#ffffff' : colors.textMuted }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* TAB 1: PROFIL & FOTO */}
        {activeTab === 'profile' && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.avatarSection}>
              <Pressable
                style={[styles.avatarCircle, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                onPress={handlePickAvatar}
                disabled={uploadingAvatar}
              >
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                ) : (
                  <Text style={[styles.avatarText, { color: colors.primary }]}>{initialChar}</Text>
                )}
                <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
                  {uploadingAvatar ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Camera size={14} color="#fff" />
                  )}
                </View>
              </Pressable>
              <Text style={[styles.avatarHint, { color: colors.textMuted }]}>
                Ketuk foto untuk mengganti avatar profil
              </Text>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Nama Lengkap</Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Masukkan nama lengkap Anda"
              placeholderTextColor={colors.textDim}
              value={name}
              onChangeText={setName}
            />

            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Alamat Email Akun</Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textDim },
              ]}
              value={user?.email || '-'}
              editable={false}
            />

            <Pressable
              style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
              onPress={handleUpdateName}
              disabled={savingProfile}
            >
              {savingProfile ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Save size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.saveBtnText}>Simpan Nama Profil</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* TAB 2: WHATSAPP NOTIFIKASI */}
        {activeTab === 'whatsapp' && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <PhoneCall size={20} color="#10b981" style={{ marginRight: 8 }} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>WhatsApp Notifikasi</Text>
            </View>
            <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
              Kuitansi pembayaran, status order Add Roamer, dan notifikasi tiket bantuan akan otomatis dikirimkan ke nomor ini.
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 12 }]}>
              Nomor WhatsApp (Aktif)
            </Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Contoh: 08123456789 atau 628123456789"
              placeholderTextColor={colors.textDim}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <Pressable
              style={[styles.saveBtn, { backgroundColor: '#10b981', marginTop: 12 }]}
              onPress={handleUpdateWhatsApp}
              disabled={savingPhone}
            >
              {savingPhone ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <CheckCircle2 size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.saveBtnText}>Simpan & Hubungkan WhatsApp</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* TAB 3: UBAH EMAIL DENGAN OTP */}
        {activeTab === 'email' && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Mail size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Ubah Email Akun</Text>
            </View>
            <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
              Email saat ini:{' '}
              <Text style={{ color: colors.text, fontWeight: '700' }}>{user?.email || '-'}</Text>
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 14 }]}>
              Alamat Email Baru
            </Text>
            <View style={styles.otpRow}>
              <TextInput
                style={[
                  styles.otpInput,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text },
                ]}
                placeholder="emailbaru@domain.com"
                placeholderTextColor={colors.textDim}
                keyboardType="email-address"
                autoCapitalize="none"
                value={newEmail}
                onChangeText={setNewEmail}
              />
              <Pressable
                style={[
                  styles.sendOtpBtn,
                  {
                    backgroundColor:
                      otpCountdown > 0 ? colors.surfaceElevated : colors.primary,
                  },
                ]}
                onPress={handleRequestEmailOtp}
                disabled={sendingOtp || otpCountdown > 0}
              >
                {sendingOtp ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.sendOtpBtnText,
                      { color: otpCountdown > 0 ? colors.textDim : '#ffffff' },
                    ]}
                  >
                    {otpCountdown > 0 ? `${otpCountdown}s` : 'Kirim OTP'}
                  </Text>
                )}
              </Pressable>
            </View>

            {otpSent && (
              <>
                <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 12 }]}>
                  Masukkan Kode OTP (6 Digit)
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                      color: colors.text,
                      fontFamily: 'monospace',
                      letterSpacing: 4,
                      textAlign: 'center',
                    },
                  ]}
                  placeholder="••••••"
                  placeholderTextColor={colors.textDim}
                  keyboardType="numeric"
                  maxLength={6}
                  value={emailOtp}
                  onChangeText={setEmailOtp}
                />

                <Pressable
                  style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
                  onPress={handleVerifyEmailOtp}
                  disabled={verifyingOtp}
                >
                  {verifyingOtp ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <CheckCircle2 size={16} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={styles.saveBtnText}>Verifikasi & Simpan Email</Text>
                    </>
                  )}
                </Pressable>
              </>
            )}
          </View>
        )}

        {/* TAB 4: GANTI PASSWORD */}
        {activeTab === 'password' && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Lock size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Ganti Kata Sandi</Text>
            </View>
            <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
              Perbarui kata sandi secara berkala untuk menjaga keamanan akun Anda.
            </Text>

            {/* Current Password */}
            <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 12 }]}>
              Kata Sandi Saat Ini
            </Text>
            <View
              style={[
                styles.passInputWrapper,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
            >
              <TextInput
                style={[styles.passInput, { color: colors.text }]}
                placeholder="Masukkan kata sandi lama"
                placeholderTextColor={colors.textDim}
                secureTextEntry={!showCurrentPass}
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <Pressable onPress={() => setShowCurrentPass(!showCurrentPass)} hitSlop={10}>
                {showCurrentPass ? (
                  <EyeOff size={18} color={colors.textDim} />
                ) : (
                  <Eye size={18} color={colors.textDim} />
                )}
              </Pressable>
            </View>

            {/* New Password */}
            <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 12 }]}>
              Kata Sandi Baru (Min. 6 Karakter)
            </Text>
            <View
              style={[
                styles.passInputWrapper,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
            >
              <TextInput
                style={[styles.passInput, { color: colors.text }]}
                placeholder="Masukkan kata sandi baru"
                placeholderTextColor={colors.textDim}
                secureTextEntry={!showNewPass}
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <Pressable onPress={() => setShowNewPass(!showNewPass)} hitSlop={10}>
                {showNewPass ? (
                  <EyeOff size={18} color={colors.textDim} />
                ) : (
                  <Eye size={18} color={colors.textDim} />
                )}
              </Pressable>
            </View>

            {/* Confirm New Password */}
            <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 12 }]}>
              Konfirmasi Kata Sandi Baru
            </Text>
            <View
              style={[
                styles.passInputWrapper,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
            >
              <TextInput
                style={[styles.passInput, { color: colors.text }]}
                placeholder="Ulangi kata sandi baru"
                placeholderTextColor={colors.textDim}
                secureTextEntry={!showConfirmPass}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <Pressable onPress={() => setShowConfirmPass(!showConfirmPass)} hitSlop={10}>
                {showConfirmPass ? (
                  <EyeOff size={18} color={colors.textDim} />
                ) : (
                  <Eye size={18} color={colors.textDim} />
                )}
              </Pressable>
            </View>

            <Pressable
              style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
              onPress={handleChangePassword}
              disabled={savingPassword}
            >
              {savingPassword ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Lock size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.saveBtnText}>Perbarui Kata Sandi</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  card: {
    padding: 18,
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
    marginTop: 2,
    lineHeight: 16,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '900',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  avatarHint: {
    fontSize: 11,
    marginTop: 8,
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
  passInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 12,
  },
  passInput: {
    flex: 1,
    fontSize: 13,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  otpInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    fontSize: 13,
  },
  sendOtpBtn: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOtpBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
