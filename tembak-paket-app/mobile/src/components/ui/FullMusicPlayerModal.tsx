import { useAppTheme } from '../../context/ThemeContext';
import React, { useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Share,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronDown,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Heart,
  Share2,
  Volume2,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMusic } from '../../context/MusicContext';
import { Colors } from '../../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function FullMusicPlayerModal() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const {
    currentTrack,
    isPlaying,
    isAudioLoading,
    currentTimeSec,
    durationSec,
    playbackSpeed,
    favorites,
    isFullPlayerVisible,
    togglePlay,
    nextTrack,
    prevTrack,
    seekTo,
    setPlaybackSpeedRate,
    toggleFavorite,
    closeFullPlayer,
  } = useMusic();

  const isFav = favorites.includes(currentTrack.id);

  // PanResponder for drag-down to dismiss gesture
  const panY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.8) {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {}
          closeFullPlayer();
          panY.setValue(0);
        } else {
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    })
  ).current;

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const cycleSpeed = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const speeds = [1.0, 1.25, 1.5, 0.75];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    await setPlaybackSpeedRate(speeds[nextIdx]);
  };

  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await Share.share({
        title: `${currentTrack.title} - ${currentTrack.artist}`,
        message: `Dengarkan "${currentTrack.title}" oleh ${currentTrack.artist} di RyTone Player! 🎵\nhttps://ry-itsolutionts.web.id/hiburan`,
      });
    } catch {}
  };

  const progressPercent = durationSec > 0
    ? Math.min(100, Math.max(0, (currentTimeSec / durationSec) * 100))
    : 0;

  if (!isFullPlayerVisible) return null;

  return (
    <Modal visible={isFullPlayerVisible} animationType="slide" transparent onRequestClose={closeFullPlayer}>
      <View style={styles.modalBackdrop}>
        <Animated.View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.canvas, transform: [{ translateY: panY }] },
          ]}
          {...panResponder.panHandlers}
        >
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            {/* Top Bar with Drag Handle & Close */}
            <View style={styles.header}>
              <View style={styles.dragPill} />
              <View style={styles.headerRow}>
                <Pressable onPress={closeFullPlayer} hitSlop={12} style={styles.closeBtn}>
                  <ChevronDown size={24} color={colors.ink} />
                </Pressable>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.headerSubtitle, { color: colors.inkMuted }]}>MEMUTAR DARI PLAYLIST</Text>
                  <Text style={[styles.headerTitle, { color: colors.ink }]}>RyTone Top Hits</Text>
                </View>
                <Pressable onPress={handleShare} hitSlop={12} style={styles.closeBtn}>
                  <Share2 size={18} color={colors.ink} />
                </Pressable>
              </View>
            </View>

            {/* Large Album Artwork */}
            <View style={styles.artContainer}>
              <View style={[styles.artWrapper, { shadowColor: colors.primary }]}>
                <Image source={{ uri: currentTrack.coverImage }} style={styles.coverArt} />
              </View>
            </View>

            {/* Track Info & Favorite */}
            <View style={styles.trackDetailsRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text numberOfLines={1} style={[styles.trackTitle, { color: colors.ink }]}>
                  {currentTrack.title}
                </Text>
                <Text numberOfLines={1} style={[styles.trackArtist, { color: colors.inkMuted }]}>
                  {currentTrack.artist}
                </Text>
              </View>
              <Pressable onPress={() => toggleFavorite(currentTrack.id)} hitSlop={12}>
                <Heart
                  size={26}
                  color={isFav ? '#ff453a' : colors.inkMuted}
                  fill={isFav ? '#ff453a' : 'transparent'}
                />
              </Pressable>
            </View>

            {/* Interactive Progress Bar */}
            <View style={styles.progressSection}>
              <Pressable
                style={styles.progressBarWrapper}
                onPress={(e) => {
                  const clickX = e.nativeEvent.locationX;
                  const barWidth = SCREEN_WIDTH - 48;
                  const ratio = Math.max(0, Math.min(1, clickX / barWidth));
                  seekTo(Math.floor(ratio * durationSec));
                }}
              >
                <View style={[styles.progressBarBg, { backgroundColor: colors.hairline }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${progressPercent}%`, backgroundColor: colors.primary },
                    ]}
                  />
                </View>
              </Pressable>
              <View style={styles.timeRow}>
                <Text style={[styles.timeText, { color: colors.inkMuted }]}>
                  {formatSeconds(currentTimeSec)}
                </Text>
                <Text style={[styles.timeText, { color: colors.inkMuted }]}>
                  {formatSeconds(durationSec)}
                </Text>
              </View>
            </View>

            {/* Playback Controls */}
            <View style={styles.controlsRow}>
              {/* Speed Button */}
              <Pressable style={styles.speedPill} onPress={cycleSpeed} hitSlop={8}>
                <Text style={[styles.speedText, { color: colors.primary }]}>{playbackSpeed}x</Text>
              </Pressable>

              {/* Prev */}
              <Pressable onPress={prevTrack} hitSlop={12}>
                <SkipBack size={30} color={colors.ink} />
              </Pressable>

              {/* Play / Pause Primary Button */}
              <Pressable
                style={[styles.bigPlayBtn, { backgroundColor: colors.primary }]}
                onPress={togglePlay}
                hitSlop={8}
              >
                {isAudioLoading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : isPlaying ? (
                  <Pause size={28} color="#000" fill="#000" />
                ) : (
                  <Play size={28} color="#000" fill="#000" style={{ marginLeft: 3 }} />
                )}
              </Pressable>

              {/* Next */}
              <Pressable onPress={nextTrack} hitSlop={12}>
                <SkipForward size={30} color={colors.ink} />
              </Pressable>

              {/* Audio Mode Badge */}
              <View style={styles.audioBadge}>
                <Sparkles size={14} color={colors.primary} />
                <Text style={[styles.audioBadgeText, { color: colors.primary }]}>Hi-Fi</Text>
              </View>
            </View>

            {/* Bottom Status Tag */}
            <View style={styles.bottomTag}>
              <Volume2 size={14} color={colors.inkMuted} style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 11, color: colors.inkMuted }}>
                Audio diputar aktif di latar belakang (Background Streaming)
              </Text>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  dragPill: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 10,
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    padding: 6,
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  artContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginVertical: 12,
  },
  artWrapper: {
    width: SCREEN_WIDTH - 64,
    height: SCREEN_WIDTH - 64,
    borderRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },
  coverArt: {
    width: '100%',
    height: '100%',
  },
  trackDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  trackTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  trackArtist: {
    fontSize: 15,
    marginTop: 4,
  },
  progressSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  progressBarWrapper: {
    height: 20,
    justifyContent: 'center',
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    marginBottom: 20,
  },
  speedPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(30, 215, 96, 0.4)',
  },
  speedText: {
    fontSize: 12,
    fontWeight: '800',
  },
  bigPlayBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1ed760',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  audioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 215, 96, 0.1)',
  },
  audioBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  bottomTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 16,
  },
});
