import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Barcode as BarcodeIcon,
  Copy,
  Check,
  Share2,
  Moon,
  Sun,
  ShieldCheck,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '../../theme/colors';

const BARCODE_MODES = [
  { id: 'create_barcode', name: 'Universal Code128' },
  { id: 'create_barcode_samsung', name: 'Barcode Samsung' },
  { id: 'create_barcode_redmi', name: 'Barcode Redmi' },
  { id: 'create_barcode_ios26', name: 'Barcode iOS 26' },
];

export default function BarcodeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors.dark;

  const [imei1, setImei1] = useState('358912345678901');
  const [imei2, setImei2] = useState('');
  const [selectedMode, setSelectedMode] = useState('create_barcode');
  const [copied, setCopied] = useState(false);
  const [cardTheme, setCardTheme] = useState<'light' | 'dark'>('light');

  const barcodeText = imei2 ? `${imei1} / ${imei2}` : imei1;
  const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(
    imei1
  )}&scale=3&height=12&includetext`;

  const barcode2Url = imei2
    ? `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(
        imei2
      )}&scale=3&height=12&includetext`
    : null;

  const handleCopy = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Clipboard.setStringAsync(barcodeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await Share.share({
        title: 'Kode Barcode IMEI',
        message: `Nomor Barcode IMEI Code128:\nIMEI 1: ${imei1}${imei2 ? `\nIMEI 2: ${imei2}` : ''}`,
      });
    } catch {}
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.canvas }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Nav */}
        <View style={styles.topNav}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}
            onPress={() => router.back()}
            hitSlop={10}
          >
            <ArrowLeft size={18} color={colors.ink} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.navTitle, { color: colors.ink }]}>Generator Barcode IMEI</Text>
            <Text style={[styles.navSubtitle, { color: colors.inkMuted }]}>
              Standar Code128 & Scanner Resmi
            </Text>
          </View>
        </View>

        {/* Mode Selector */}
        <Text style={[styles.sectionHeading, { color: colors.ink }]}>Format Barcode</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modeRow}>
          {BARCODE_MODES.map((mode) => {
            const active = selectedMode === mode.id;
            return (
              <Pressable
                key={mode.id}
                style={[
                  styles.modeChip,
                  {
                    backgroundColor: active ? colors.primary : colors.parchment,
                    borderColor: active ? colors.primary : colors.hairline,
                  },
                ]}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  setSelectedMode(mode.id);
                }}
              >
                <Text
                  style={[
                    styles.modeChipText,
                    { color: active ? '#ffffff' : colors.ink },
                  ]}
                >
                  {mode.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Input IMEI 1 & IMEI 2 */}
        <View style={[styles.card, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}>
          <Text style={[styles.label, { color: colors.inkMuted }]}>Nomor IMEI 1 (Wajib)</Text>
          <View
            style={[
              styles.inputBox,
              { backgroundColor: colors.canvas, borderColor: colors.hairline },
            ]}
          >
            <BarcodeIcon size={18} color={colors.primary} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.input, { color: colors.ink }]}
              placeholder="Contoh: 358912345678901"
              placeholderTextColor={colors.inkMuted}
              value={imei1}
              onChangeText={(t) => setImei1(t.replace(/\D/g, '').slice(0, 15))}
              keyboardType="numeric"
              maxLength={15}
            />
          </View>

          <Text style={[styles.label, { color: colors.inkMuted, marginTop: 12 }]}>
            Nomor IMEI 2 (Opsional / Dual SIM)
          </Text>
          <View
            style={[
              styles.inputBox,
              { backgroundColor: colors.canvas, borderColor: colors.hairline },
            ]}
          >
            <BarcodeIcon size={18} color={colors.inkMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.input, { color: colors.ink }]}
              placeholder="Contoh: 358912345678902"
              placeholderTextColor={colors.inkMuted}
              value={imei2}
              onChangeText={(t) => setImei2(t.replace(/\D/g, '').slice(0, 15))}
              keyboardType="numeric"
              maxLength={15}
            />
          </View>
        </View>

        {/* Barcode Render Visual Card */}
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.sectionHeading, { color: colors.ink, marginBottom: 0 }]}>
            Hasil Visual Barcode
          </Text>
          <Pressable
            onPress={() => setCardTheme(cardTheme === 'light' ? 'dark' : 'light')}
            style={styles.themeToggleBtn}
          >
            {cardTheme === 'light' ? (
              <Moon size={14} color={colors.inkMuted} />
            ) : (
              <Sun size={14} color={colors.inkMuted} />
            )}
            <Text style={[styles.themeToggleText, { color: colors.inkMuted }]}>
              {cardTheme === 'light' ? 'Dark' : 'Light'}
            </Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.barcodeCard,
            {
              backgroundColor: cardTheme === 'light' ? '#ffffff' : '#1c1c1e',
              borderColor: colors.hairline,
            },
          ]}
        >
          <Text style={[styles.barcodeMeta, { color: cardTheme === 'light' ? '#666' : '#999' }]}>
            IMEI 1 - CODE 128
          </Text>
          <Image
            source={{ uri: barcodeUrl }}
            style={styles.barcodeImg}
            resizeMode="contain"
          />

          {barcode2Url && (
            <>
              <View style={[styles.divider, { backgroundColor: cardTheme === 'light' ? '#eee' : '#333' }]} />
              <Text style={[styles.barcodeMeta, { color: cardTheme === 'light' ? '#666' : '#999' }]}>
                IMEI 2 - CODE 128
              </Text>
              <Image
                source={{ uri: barcode2Url }}
                style={styles.barcodeImg}
                resizeMode="contain"
              />
            </>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
            ]}
            onPress={handleCopy}
          >
            {copied ? <Check size={16} color="#fff" /> : <Copy size={16} color="#fff" />}
            <Text style={styles.actionBtnText}>{copied ? 'Disalin' : 'Salin Nomor'}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionBtnOutline,
              { backgroundColor: colors.parchment, borderColor: colors.hairline, opacity: pressed ? 0.88 : 1 },
            ]}
            onPress={handleShare}
          >
            <Share2 size={16} color={colors.ink} />
            <Text style={[styles.actionBtnOutlineText, { color: colors.ink }]}>Bagikan</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  navSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  modeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 8,
  },
  modeChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  themeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  themeToggleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  barcodeCard: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  barcodeMeta: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  barcodeImg: {
    width: '100%',
    height: 80,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  actionBtnOutline: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnOutlineText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
