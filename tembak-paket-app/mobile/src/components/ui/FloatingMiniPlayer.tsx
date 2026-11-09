import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Play, Pause, SkipForward } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMusic } from '../../context/MusicContext';
import { Colors } from '../../theme/colors';

export function FloatingMiniPlayer() {
  const insets = useSafeAreaInsets();
  const colors = Colors.dark;
  const {
    currentTrack,
    isPlaying,
    isAudioLoading,
    currentTimeSec,
    durationSec,
    togglePlay,
    nextTrack,
    openFullPlayer,
  } = useMusic();

  if (!currentTrack) return null;

  const progressPercent = durationSec > 0
    ? Math.min(100, Math.max(0, (currentTimeSec / durationSec) * 100))
    : 0;

  const tabHeight = 60 + Math.max(insets.bottom, 12);

  return (
    <View
      style={[
        styles.floatingContainer,
        {
          bottom: tabHeight + 8,
          backgroundColor: colors.parchment,
          borderColor: colors.hairline,
        },
      ]}
    >
      {/* Top Mini Progress Bar */}
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${progressPercent}%`, backgroundColor: colors.primary },
          ]}
        />
      </View>

      {/* Main Touch Area (Opens Full Player) */}
      <Pressable style={styles.contentWrap} onPress={openFullPlayer}>
        <Image source={{ uri: currentTrack.coverImage }} style={styles.coverImage} />

        <View style={styles.infoCol}>
          <Text numberOfLines={1} style={[styles.trackTitle, { color: colors.ink }]}>
            {currentTrack.title}
          </Text>
          <Text numberOfLines={1} style={[styles.trackArtist, { color: colors.inkMuted }]}>
            {currentTrack.artist}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controlsRow}>
          <Pressable
            style={[styles.playBtn, { backgroundColor: colors.primary }]}
            onPress={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            hitSlop={8}
          >
            {isAudioLoading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : isPlaying ? (
              <Pause size={16} color="#000" fill="#000" />
            ) : (
              <Play size={16} color="#000" fill="#000" style={{ marginLeft: 2 }} />
            )}
          </Pressable>

          <Pressable
            style={styles.skipBtn}
            onPress={(e) => {
              e.stopPropagation();
              nextTrack();
            }}
            hitSlop={8}
          >
            <SkipForward size={18} color={colors.ink} />
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 9999,
  },
  progressBarTrack: {
    height: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
  },
  contentWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  coverImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  infoCol: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  trackTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  trackArtist: {
    fontSize: 11,
    marginTop: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
