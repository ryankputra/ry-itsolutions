import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageCircle, Users, Headphones, X, ExternalLink } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMusic } from '../../context/MusicContext';
import { useAppTheme } from '../../context/ThemeContext';

const WA_ADMIN_1 = '6288706611370';
const WA_ADMIN_2 = '6287767287284';
const WA_GROUP_URL = 'https://chat.whatsapp.com/E0AO1IoMfHK0gqTvFgNQNl';

export function FloatingWhatsAppSpeedDial() {
  const [isOpen, setIsOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { theme, colors } = useAppTheme();
  const isDark = theme === 'dark';
  const { currentTrack } = useMusic();

  const handleOpenLink = async (url: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setIsOpen(false);
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(url);
      }
    } catch (e) {
      console.warn('[FloatingWhatsAppSpeedDial] Error opening URL:', e);
    }
  };

  const toggleOpen = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setIsOpen((prev) => !prev);
  };

  const tabHeight = 60 + Math.max(insets.bottom, 12);
  // Elevate if mini-player is visible
  const bottomOffset = currentTrack ? tabHeight + 72 : tabHeight + 14;

  return (
    <>
      {/* Floating Speed Dial Trigger Button */}
      <View
        pointerEvents="box-none"
        style={[
          styles.fabWrapper,
          {
            bottom: bottomOffset,
            right: 16,
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.fabButton,
            pressed && styles.fabPressed,
          ]}
          onPress={toggleOpen}
          accessibilityLabel="Bantuan CS dan Komunitas WhatsApp"
          accessibilityRole="button"
        >
          <MessageCircle size={26} color="#FFFFFF" strokeWidth={2.2} />
          <View style={styles.onlineDot} />
        </Pressable>
      </View>

      {/* Speed Dial Menu Modal / Overlay */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
          <View
            style={[
              styles.menuCard,
              {
                backgroundColor: isDark ? '#18181b' : '#ffffff',
                borderColor: colors.border,
                bottom: bottomOffset + 60,
              },
            ]}
          >
            <View style={styles.menuHeader}>
              <View style={styles.headerLeft}>
                <MessageCircle size={18} color="#25D366" />
                <Text style={[styles.menuTitle, { color: colors.ink }]}>
                  Bantuan & Komunitas
                </Text>
              </View>
              <Pressable
                onPress={() => setIsOpen(false)}
                hitSlop={8}
                style={styles.closeBtn}
              >
                <X size={16} color={colors.inkMuted} />
              </Pressable>
            </View>

            <Text style={[styles.menuSubtitle, { color: colors.inkMuted }]}>
              Pusat Layanan Pelanggan & Komunitas WhatsApp Resmi
            </Text>

            {/* Admin 1 */}
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                { backgroundColor: isDark ? '#27272a' : '#f4f4f5' },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => handleOpenLink(`https://wa.me/${WA_ADMIN_1}?text=Halo%20Admin%201,%20saya%20butuh%20bantuan%20Ry-ITSolutions`)}
            >
              <View style={[styles.itemIconWrap, { backgroundColor: '#25D366' }]}>
                <Headphones size={18} color="#FFFFFF" />
              </View>
              <View style={styles.itemContent}>
                <View style={styles.itemTitleRow}>
                  <Text style={[styles.itemTitle, { color: colors.ink }]}>
                    CS Admin 1
                  </Text>
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>Online</Text>
                  </View>
                </View>
                <Text style={[styles.itemSub, { color: colors.inkMuted }]}>
                  +{WA_ADMIN_1} (Respon Cepat)
                </Text>
              </View>
              <ExternalLink size={16} color={colors.inkMuted} />
            </Pressable>

            {/* Admin 2 */}
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                { backgroundColor: isDark ? '#27272a' : '#f4f4f5' },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => handleOpenLink(`https://wa.me/${WA_ADMIN_2}?text=Halo%20Admin%202,%20saya%20butuh%20bantuan%20Ry-ITSolutions`)}
            >
              <View style={[styles.itemIconWrap, { backgroundColor: '#0284c7' }]}>
                <Headphones size={18} color="#FFFFFF" />
              </View>
              <View style={styles.itemContent}>
                <View style={styles.itemTitleRow}>
                  <Text style={[styles.itemTitle, { color: colors.ink }]}>
                    CS Admin 2
                  </Text>
                  <View style={[styles.activeBadge, { backgroundColor: 'rgba(2, 132, 199, 0.15)' }]}>
                    <Text style={[styles.activeBadgeText, { color: '#0284c7' }]}>Online</Text>
                  </View>
                </View>
                <Text style={[styles.itemSub, { color: colors.inkMuted }]}>
                  +{WA_ADMIN_2} (Alternatif)
                </Text>
              </View>
              <ExternalLink size={16} color={colors.inkMuted} />
            </Pressable>

            {/* Grup Komunitas */}
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                { backgroundColor: isDark ? '#27272a' : '#f4f4f5' },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => handleOpenLink(WA_GROUP_URL)}
            >
              <View style={[styles.itemIconWrap, { backgroundColor: '#10b981' }]}>
                <Users size={18} color="#FFFFFF" />
              </View>
              <View style={styles.itemContent}>
                <View style={styles.itemTitleRow}>
                  <Text style={[styles.itemTitle, { color: colors.ink }]}>
                    Grup Komunitas
                  </Text>
                  <View style={[styles.activeBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <Text style={[styles.activeBadgeText, { color: '#10b981' }]}>Official</Text>
                  </View>
                </View>
                <Text style={[styles.itemSub, { color: colors.inkMuted }]}>
                  Diskusi, info update & promo terbaru
                </Text>
              </View>
              <ExternalLink size={16} color={colors.inkMuted} />
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabWrapper: {
    position: 'absolute',
    zIndex: 9998,
  },
  fabButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  fabPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
  onlineDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#25D366',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  menuCard: {
    position: 'absolute',
    right: 16,
    width: 320,
    maxWidth: '90%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  menuSubtitle: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    marginBottom: 8,
    gap: 12,
  },
  itemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  activeBadge: {
    backgroundColor: 'rgba(37, 211, 102, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  activeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#16a34a',
  },
  itemSub: {
    fontSize: 11,
    marginTop: 1,
  },
});
