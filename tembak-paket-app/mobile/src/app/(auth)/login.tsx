import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Mail, Lock, Eye, EyeOff, ArrowRight, KeyRound, CheckCircle2, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/api';
import { storage } from '../../utils/storage';
import { Colors } from '../../theme/colors';

const SAVED_EMAIL_KEY = 'ry_saved_email';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [showForgotNewPass, setShowForgotNewPass] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotTimer, setForgotTimer] = useState(60);
  const [canResendForgot, setCanResendForgot] = useState(false);

  const colors = Colors.dark;

  useEffect(() => {
    async function loadSavedEmail() {
      try {
        const saved = await storage.getItem(SAVED_EMAIL_KEY);
        if (saved) {
          setEmail(saved);
          setRememberMe(true);
        }
      } catch {}
    }
    loadSavedEmail();
  }, []);

  // Countdown timer for forgot password OTP resend
  useEffect(() => {
    let interval: any = null;
    if (showForgotModal && forgotStep === 'verify' && forgotTimer > 0) {
      setCanResendForgot(false);
      interval = setInterval(() => {
        setForgotTimer((prev) => {
          if (prev <= 1) {
            setCanResendForgot(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showForgotModal, forgotStep, forgotTimer]);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Perhatian', 'Silakan masukkan email dan password Anda.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email.trim().toLowerCase(), password);
      if (result.success) {
        if (rememberMe) {
          await storage.setItem(SAVED_EMAIL_KEY, email.trim().toLowerCase());
        } else {
          await storage.removeItem(SAVED_EMAIL_KEY);
        }
        router.replace('/(tabs)');
      } else {
        Alert.alert('Login Gagal', result.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestForgotOtp = async () => {
    if (!forgotEmail.trim()) {
      Alert.alert('Perhatian', 'Masukkan alamat email Anda.');
      return;
    }

    setForgotLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.post('/auth/forgot-password-request', {
        email: forgotEmail.trim().toLowerCase(),
      });
      if (res.data?.status) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        setForgotStep('verify');
        setForgotTimer(60);
        setCanResendForgot(false);
        Alert.alert('Kode Terkirim! 📬', res.data.message || 'Cek kotak masuk atau folder spam email Anda.');
      } else {
        Alert.alert('Gagal', res.data?.message || 'Email tidak ditemukan.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menghubungi server untuk reset password.';
      Alert.alert('Gagal', msg);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyForgotOtp = async () => {
    if (!forgotOtp.trim() || forgotOtp.trim().length < 6) {
      Alert.alert('Perhatian', 'Masukkan 6 digit kode OTP verifikasi.');
      return;
    }
    if (!forgotNewPass || forgotNewPass.length < 6) {
      Alert.alert('Perhatian', 'Password baru minimal 6 karakter.');
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      Alert.alert('Perhatian', 'Konfirmasi password tidak cocok.');
      return;
    }

    setForgotLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.post('/auth/forgot-password-verify', {
        email: forgotEmail.trim().toLowerCase(),
        otp: forgotOtp.trim(),
        newPassword: forgotNewPass,
      });

      if (res.data?.status) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        Alert.alert('Berhasil! 🎉', 'Password Anda berhasil diperbarui. Silakan login kembali.', [
          {
            text: 'OK',
            onPress: () => {
              setShowForgotModal(false);
              setEmail(forgotEmail.trim().toLowerCase());
              setPassword(forgotNewPass);
            },
          },
        ]);
      } else {
        Alert.alert('Gagal', res.data?.message || 'Kode OTP tidak valid.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Terjadi kesalahan saat memverifikasi reset password.';
      Alert.alert('Gagal', msg);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleRegisterPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.push('/(auth)/register');
  };

  const handleGuestPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header & Brand */}
          <View style={styles.header}>
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>RY STORE</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Selamat Datang</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Masuk ke akun Anda untuk bertransaksi paket data, cek CEIR, dan hiburan
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Email Akun</Text>
              <View
                style={[
                  styles.inputContainer,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Mail size={20} color={colors.textDim} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="nama@email.com"
                  placeholderTextColor={colors.textDim}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordHeaderRow}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Kata Sandi</Text>
                <Pressable
                  onPress={() => {
                    setForgotEmail(email);
                    setForgotStep('request');
                    setShowForgotModal(true);
                  }}
                  hitSlop={8}
                >
                  <Text style={[styles.forgotText, { color: colors.primary }]}>Lupa Kata Sandi?</Text>
                </Pressable>
              </View>

              <View
                style={[
                  styles.inputContainer,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Lock size={20} color={colors.textDim} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Masukkan kata sandi"
                  placeholderTextColor={colors.textDim}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Pressable
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={10}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={colors.textDim} />
                  ) : (
                    <Eye size={20} color={colors.textDim} />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Remember Me Toggle */}
            <Pressable
              style={styles.rememberRow}
              onPress={() => setRememberMe(!rememberMe)}
              hitSlop={6}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: rememberMe ? colors.primary : colors.border,
                    backgroundColor: rememberMe ? colors.primary : 'transparent',
                  },
                ]}
              >
                {rememberMe && <CheckCircle2 size={13} color="#fff" />}
              </View>
              <Text style={[styles.rememberLabel, { color: colors.textMuted }]}>
                Ingat alamat email saya
              </Text>
            </Pressable>

            {/* Login Button (Min 44dp height) */}
            <Pressable
              style={({ pressed }) => [
                styles.loginButton,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={handleLogin}
              disabled={loading}
              android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Masuk Sekarang</Text>
                  <ArrowRight size={18} color="#fff" style={{ marginLeft: 8 }} />
                </>
              )}
            </Pressable>

            {/* Guest Browsing */}
            <Pressable
              style={({ pressed }) => [
                styles.guestButton,
                { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={handleGuestPress}
            >
              <Text style={[styles.guestButtonText, { color: colors.textMuted }]}>
                Jelajahi Dulu Tanpa Login
              </Text>
            </Pressable>
          </View>

          {/* Footer Register Link */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              Belum memiliki akun?{' '}
            </Text>
            <Pressable onPress={handleRegisterPress} hitSlop={10}>
              <Text style={[styles.registerLink, { color: colors.primary }]}>Daftar di sini</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <KeyRound size={20} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {forgotStep === 'request' ? 'Lupa Kata Sandi' : 'Reset Kata Sandi'}
                </Text>
              </View>
              <Pressable
                onPress={() => setShowForgotModal(false)}
                hitSlop={8}
                style={[styles.closeBtn, { backgroundColor: colors.background }]}
              >
                <X size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            {forgotStep === 'request' ? (
              <View style={{ gap: 14, marginTop: 12 }}>
                <Text style={[styles.modalDesc, { color: colors.textMuted }]}>
                  Masukkan alamat email yang terdaftar. Kami akan mengirimkan 6 digit kode OTP verifikasi untuk mengatur ulang password Anda.
                </Text>

                <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Mail size={18} color={colors.textDim} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="nama@email.com"
                    placeholderTextColor={colors.textDim}
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <Pressable
                  style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                  onPress={handleRequestForgotOtp}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.actionBtnText}>Kirim Kode OTP</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 14, marginTop: 12 }}>
                <Text style={[styles.modalDesc, { color: colors.textMuted }]}>
                  Kode OTP telah dikirim ke <Text style={{ color: colors.text, fontWeight: '700' }}>{forgotEmail}</Text>. Masukkan kode dan kata sandi baru.
                </Text>

                <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.input, { color: colors.text, textAlign: 'center', letterSpacing: 6, fontWeight: '800', fontSize: 18 }]}
                    placeholder="123456"
                    placeholderTextColor={colors.textDim}
                    value={forgotOtp}
                    onChangeText={setForgotOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>

                <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Lock size={18} color={colors.textDim} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Kata sandi baru (min 6 karakter)"
                    placeholderTextColor={colors.textDim}
                    value={forgotNewPass}
                    onChangeText={setForgotNewPass}
                    secureTextEntry={!showForgotNewPass}
                  />
                  <Pressable onPress={() => setShowForgotNewPass(!showForgotNewPass)} hitSlop={8}>
                    {showForgotNewPass ? <EyeOff size={18} color={colors.textDim} /> : <Eye size={18} color={colors.textDim} />}
                  </Pressable>
                </View>

                <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Lock size={18} color={colors.textDim} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Konfirmasi kata sandi baru"
                    placeholderTextColor={colors.textDim}
                    value={forgotConfirmPass}
                    onChangeText={setForgotConfirmPass}
                    secureTextEntry={!showForgotNewPass}
                  />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Pressable
                    disabled={!canResendForgot || forgotLoading}
                    onPress={handleRequestForgotOtp}
                  >
                    <Text style={{ color: canResendForgot ? colors.primary : colors.textDim, fontSize: 12, fontWeight: '600' }}>
                      {canResendForgot ? 'Kirim Ulang Kode' : `Kirim Ulang (${forgotTimer}s)`}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => setForgotStep('request')}>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>Ganti Email</Text>
                  </Pressable>
                </View>

                <Pressable
                  style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                  onPress={handleVerifyForgotOtp}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.actionBtnText}>Simpan Kata Sandi Baru</Text>
                  )}
                </Pressable>
              </View>
            )}
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 16,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    gap: 18,
  },
  inputGroup: {
    gap: 8,
  },
  passwordHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '600',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
  },
  eyeButton: {
    padding: 6,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: -4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rememberLabel: {
    fontSize: 13,
  },
  loginButton: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  guestButton: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 36,
  },
  footerText: {
    fontSize: 14,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});