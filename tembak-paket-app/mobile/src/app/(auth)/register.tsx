import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User as UserIcon, Mail, Lock, Gift, ArrowLeft, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';

export default function RegisterScreen() {
  const router = useRouter();
  const colors = Colors.dark;

  // Step state: 'form' | 'otp'
  const [step, setStep] = useState<'form' | 'otp'>('form');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');

  // OTP State
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);

  // Timer countdown for OTP resend
  useEffect(() => {
    let interval: any = null;
    if (step === 'otp' && resendTimer > 0) {
      setCanResend(false);
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, resendTimer]);

  // Step 1: Request OTP from backend (/auth/register-request-otp)
  const handleRequestOtp = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Perhatian', 'Nama, email, dan kata sandi wajib diisi.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Perhatian', 'Kata sandi minimal 6 karakter.');
      return;
    }

    setLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const response = await apiClient.post('/auth/register-request-otp', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        referral_code: referralCode.trim().toUpperCase() || undefined,
      });

      const data = response.data;
      if (data.status) {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        setStep('otp');
        setResendTimer(60);
        setCanResend(false);
        Alert.alert(
          'Kode OTP Terkirim! 📬',
          data.message || `Kode verifikasi 6 digit telah dikirim ke ${email}. Cek inbox atau folder spam.`
        );
      } else {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {}
        Alert.alert('Gagal Mengirim OTP', data.message || 'Terjadi kesalahan saat meminta kode verifikasi.');
      }
    } catch (error: any) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      const errMsg = error.response?.data?.message || error.message || 'Gagal terhubung ke server.';
      Alert.alert('Gagal Mengirim OTP', errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP & Complete Registration (/auth/register-verify-otp)
  const handleVerifyOtp = async () => {
    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      Alert.alert('Perhatian', 'Masukkan 6 digit kode OTP verifikasi.');
      return;
    }

    setLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const response = await apiClient.post('/auth/register-verify-otp', {
        email: email.trim().toLowerCase(),
        otp: cleanOtp,
      });

      const data = response.data;
      if (data.status) {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        Alert.alert(
          'Pendaftaran Berhasil! 🎉',
          data.message || 'Akun Anda berhasil diverifikasi & diaktifkan.',
          [{ text: 'Masuk Sekarang', onPress: () => router.replace('/(auth)/login') }]
        );
      } else {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {}
        Alert.alert('Verifikasi Gagal', data.message || 'Kode verifikasi salah atau kedaluwarsa.');
      }
    } catch (error: any) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      const errMsg = error.response?.data?.message || error.message || 'Gagal memverifikasi OTP.';
      Alert.alert('Verifikasi Gagal', errMsg);
    } finally {
      setLoading(false);
    }
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
          {/* Back Button */}
          <Pressable
            style={[styles.backButton, { backgroundColor: colors.surface }]}
            onPress={() => (step === 'otp' ? setStep('form') : router.back())}
            hitSlop={10}
          >
            <ArrowLeft size={20} color={colors.text} />
          </Pressable>

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {step === 'form' ? 'Buat Akun Baru' : 'Verifikasi Email'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {step === 'form'
                ? 'Bergabunglah dengan RY IT Solutions untuk kemudahan transaksi digital'
                : `Masukkan 6 digit kode OTP yang telah dikirim ke ${email}`}
            </Text>
          </View>

          {/* Form Step */}
          {step === 'form' ? (
            <View style={styles.form}>
              {/* Nama */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Nama Lengkap</Text>
                <View
                  style={[
                    styles.inputContainer,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <UserIcon size={20} color={colors.textDim} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Nama lengkap Anda"
                    placeholderTextColor={colors.textDim}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Email Aktif</Text>
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

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Kata Sandi</Text>
                <View
                  style={[
                    styles.inputContainer,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <Lock size={20} color={colors.textDim} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Minimal 6 karakter"
                    placeholderTextColor={colors.textDim}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Kode Referral (Opsional) */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>
                  Kode Referral (Opsional)
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <Gift size={20} color={colors.textDim} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Contoh: RYVIP"
                    placeholderTextColor={colors.textDim}
                    value={referralCode}
                    onChangeText={(val) => setReferralCode(val.toUpperCase())}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              {/* Submit Request OTP Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.registerButton,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={handleRequestOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.registerButtonText}>Lanjutkan & Kirim OTP</Text>
                    <ArrowRight size={18} color="#fff" style={{ marginLeft: 8 }} />
                  </>
                )}
              </Pressable>
            </View>
          ) : (
            /* OTP Verification Step */
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Kode Verifikasi OTP</Text>
                <View
                  style={[
                    styles.inputContainer,
                    { backgroundColor: colors.surface, borderColor: colors.border, height: 60 },
                  ]}
                >
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: colors.text,
                        textAlign: 'center',
                        fontSize: 24,
                        letterSpacing: 8,
                        fontWeight: '800',
                      },
                    ]}
                    placeholder="123456"
                    placeholderTextColor={colors.textDim}
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                </View>
              </View>

              {/* Countdown & Resend */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Pressable
                  disabled={!canResend || loading}
                  onPress={handleRequestOtp}
                  hitSlop={8}
                >
                  <Text style={{ color: canResend ? colors.primary : colors.textDim, fontSize: 13, fontWeight: '600' }}>
                    {canResend ? 'Kirim Ulang Kode OTP' : `Kirim Ulang (${resendTimer}s)`}
                  </Text>
                </Pressable>

                <Pressable onPress={() => setStep('form')} hitSlop={8}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>Ubah Data</Text>
                </Pressable>
              </View>

              {/* Submit Verify Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.registerButton,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={handleVerifyOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <ShieldCheck size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.registerButtonText}>Verifikasi & Aktivasi Akun</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

          {/* Footer Login Link */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              Sudah memiliki akun?{' '}
            </Text>
            <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={10}>
              <Text style={[styles.loginLink, { color: colors.primary }]}>Masuk di sini</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingTop: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
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
  registerButton: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});