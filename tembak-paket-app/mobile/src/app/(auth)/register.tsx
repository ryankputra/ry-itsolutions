import React, { useState } from 'react';
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
import { User as UserIcon, Mail, Lock, Gift, ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';

export default function RegisterScreen() {
  const router = useRouter();
  const colors = Colors.dark;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
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
      const response = await apiClient.post('/auth/register', {
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
        Alert.alert(
          'Pendaftaran Berhasil',
          data.message || 'Akun Anda berhasil dibuat. Silakan login.',
          [{ text: 'Masuk Sekarang', onPress: () => router.replace('/(auth)/login') }]
        );
      } else {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {}
        Alert.alert('Gagal Mendaftar', data.message || 'Terjadi kesalahan saat membuat akun.');
      }
    } catch (error: any) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      const errMsg = error.response?.data?.message || error.message || 'Gagal terhubung ke server.';
      Alert.alert('Gagal Mendaftar', errMsg);
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
            onPress={() => router.back()}
            hitSlop={10}
          >
            <ArrowLeft size={20} color={colors.text} />
          </Pressable>

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Buat Akun Baru</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Bergabunglah dengan RY IT Solutions untuk kemudahan transaksi digital
            </Text>
          </View>

          {/* Form */}
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
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Email</Text>
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

            {/* Referral Code */}
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
                  placeholder="Masukkan kode referral jika ada"
                  placeholderTextColor={colors.textDim}
                  value={referralCode}
                  onChangeText={setReferralCode}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* Submit Button */}
            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={handleRegister}
              disabled={loading}
              android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Daftar Sekarang</Text>
              )}
            </Pressable>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              Sudah memiliki akun?{' '}
            </Text>
            <Pressable onPress={() => router.push('/(auth)/login')} hitSlop={10}>
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
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
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
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 52, // >= 44dp touch target
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
  },
  submitButton: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  footerText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
