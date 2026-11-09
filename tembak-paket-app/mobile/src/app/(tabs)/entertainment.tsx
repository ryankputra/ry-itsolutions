import { useAppTheme } from '../../context/ThemeContext';
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Heart,
  Music,
  Globe,
  Sparkles,
  Headphones,
  Zap,
  Search,
  Share2,
  RotateCw,
  X,
  Volume2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMusic } from '../../context/MusicContext';
import { Colors } from '../../theme/colors';

const CATEGORIES = [
  { key: 'all', label: 'Semua Lagu', icon: Music },
  { key: 'global', label: 'Top Hits Global', icon: Globe },
  { key: 'kpop', label: 'K-Pop Hits', icon: Sparkles },
  { key: 'indo', label: 'Pop Indo', icon: Headphones },
  { key: 'galau', label: 'Lagu Galau', icon: Heart },
  { key: 'dance', label: 'Koplo & EDM', icon: Zap },
  { key: 'favorites', label: 'Disukai', icon: Heart },
];

export default function EntertainmentScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  const {
    tracks,
    currentTrack,
    currentTrackIndex,
    isPlaying,
    isAudioLoading,
    currentTimeSec,
    durationSec,
    playbackSpeed,
    favorites,
    playTrack,
    togglePlay,
    nextTrack,
    prevTrack,
    setPlaybackSpeedRate,
    toggleFavorite,
    openFullPlayer,
    syncTracks,
    searchServerTracks,
  } = useMusic();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Live global search via /api/music/search?q=... with debounce
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const handler = setTimeout(async () => {
      try {
        const results = await searchServerTracks(trimmed);
        setSearchResults(results);
      } catch (err) {
        console.warn('[Entertainment] Live search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [searchQuery, searchServerTracks]);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleShareTrack = async (track: any) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await Share.share({
        title: `${track.title} - ${track.artist}`,
        message: `Dengarkan "${track.title}" oleh ${track.artist} di RyTone Streaming RY IT Solutions! 🎵\nhttps://ry-itsolutionts.web.id/hiburan`,
      });
    } catch {}
  };

  const cycleSpeed = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const speeds = [1.0, 1.25, 1.5, 0.75];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    await setPlaybackSpeedRate(speeds[nextIdx]);
  };

  const filteredTracks = useMemo(() => {
    const sourceList = searchResults !== null ? searchResults : tracks;
    return sourceList.filter((t) => {
      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'favorites') return favorites.includes(t.id);
      return t.category === selectedCategory;
    });
  }, [tracks, searchResults, selectedCategory, favorites]);

  const progressPercent = durationSec > 0
    ? Math.min(100, Math.max(0, (currentTimeSec / durationSec) * 100))
    : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.canvas }]} edges={['top']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.brandBadge, { backgroundColor: colors.primary }]}>
            <Music size={14} color="#000" strokeWidth={2.5} />
          </View>
          <View>
            <Text style={[styles.appTitle, { color: colors.ink }]}>RyTone Music</Text>
            <Text style={[styles.appSub, { color: colors.inkMuted }]}>
              Streaming Musik Resmi • Paritas Web 1:1
            </Text>
          </View>
        </View>

        <Pressable
          style={[styles.syncBtn, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}
          onPress={async () => {
            setIsSyncing(true);
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await syncTracks();
              Alert.alert('Sukses 🎵', 'Katalog RyTone berhasil disinkronkan dengan server backend.');
            } catch {
              Alert.alert('Gagal', 'Tidak dapat menyinkronkan katalog.');
            } finally {
              setIsSyncing(false);
            }
          }}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <RotateCw size={14} color={colors.ink} />
          )}
        </Pressable>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBox, { backgroundColor: colors.parchment, borderColor: colors.hairline }]}>
          <Search size={16} color={colors.inkMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.ink }]}
            placeholder="Cari judul lagu, artis, atau genre..."
            placeholderTextColor={colors.inkMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {isSearching ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 6 }} />
          ) : searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <X size={16} color={colors.inkMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Category Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.key;
          const IconComp = cat.icon;
          return (
            <Pressable
              key={cat.key}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: active ? colors.primary : colors.parchment,
                  borderColor: active ? colors.primary : colors.hairline,
                },
              ]}
              onPress={() => {
                try {
                  Haptics.selectionAsync();
                } catch {}
                setSelectedCategory(cat.key);
              }}
            >
              <IconComp size={13} color={active ? '#000' : colors.ink} />
              <Text
                style={[
                  styles.categoryText,
                  { color: active ? '#000' : colors.ink, fontWeight: active ? '800' : '600' },
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Main Track List */}
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        <FlashList
          data={filteredTracks}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 170 + insets.bottom }}
          renderItem={({ item, index }) => {
            const isCurrent = currentTrack.id === item.id;
            const isFav = favorites.includes(item.id);

            return (
              <Pressable
                style={[
                  styles.trackCard,
                  {
                    backgroundColor: isCurrent ? 'rgba(30, 215, 96, 0.08)' : colors.parchment,
                    borderColor: isCurrent ? colors.primary : colors.hairline,
                  },
                ]}
                onPress={() => playTrack(index)}
              >
                {/* Cover Image + Rank */}
                <View style={styles.coverWrap}>
                  <Image source={{ uri: item.coverImage }} style={styles.trackImage} />
                  {isCurrent && (
                    <View style={styles.playingOverlay}>
                      {isAudioLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Volume2 size={16} color="#fff" />
                      )}
                    </View>
                  )}
                </View>

                {/* Track Info */}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.trackTitle,
                      { color: isCurrent ? colors.primary : colors.ink, fontWeight: '700' },
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Text numberOfLines={1} style={[styles.trackArtist, { color: colors.inkMuted }]}>
                    {item.artist}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Text style={{ fontSize: 11, color: colors.inkMuted }}>
                      {item.durationFormatted || formatSeconds(item.durationSec)}
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.inkMuted }}>•</Text>
                    <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>
                      #{item.rank || index + 1}
                    </Text>
                  </View>
                </View>

                {/* Favorite & Share */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable onPress={() => toggleFavorite(item.id)} hitSlop={10}>
                    <Heart
                      size={18}
                      color={isFav ? '#ff453a' : colors.inkMuted}
                      fill={isFav ? '#ff453a' : 'transparent'}
                    />
                  </Pressable>
                  <Pressable onPress={() => handleShareTrack(item)} hitSlop={10}>
                    <Share2 size={16} color={colors.inkMuted} />
                  </Pressable>
                </View>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Floating Bottom Mini Player with Duration Slider */}
      <View
        style={[
          styles.bottomPlayer,
          {
            backgroundColor: colors.parchment,
            borderColor: colors.hairline,
            bottom: 74 + insets.bottom,
          },
        ]}
      >
        {/* Progress Bar Line */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progressPercent}%`, backgroundColor: colors.primary },
            ]}
          />
        </View>

        <Pressable style={styles.playerInner} onPress={openFullPlayer}>
          <Image source={{ uri: currentTrack.coverImage }} style={styles.miniCover} />

          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text numberOfLines={1} style={[styles.miniTitle, { color: colors.ink }]}>
              {currentTrack.title}
            </Text>
            <Text numberOfLines={1} style={[styles.miniArtist, { color: colors.inkMuted }]}>
              {currentTrack.artist} • {formatSeconds(currentTimeSec)} / {formatSeconds(durationSec)}
            </Text>
          </View>

          {/* Speed Toggle */}
          <Pressable
            style={styles.speedBtn}
            onPress={(e) => {
              e.stopPropagation();
              cycleSpeed();
            }}
            hitSlop={8}
          >
            <Text style={[styles.speedText, { color: colors.primary }]}>{playbackSpeed}x</Text>
          </Pressable>

          {/* Prev */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              prevTrack();
            }}
            hitSlop={8}
          >
            <SkipBack size={18} color={colors.ink} />
          </Pressable>

          {/* Play/Pause */}
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
              <Pause size={18} color="#000" fill="#000" />
            ) : (
              <Play size={18} color="#000" fill="#000" style={{ marginLeft: 2 }} />
            )}
          </Pressable>

          {/* Next */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              nextTrack();
            }}
            hitSlop={8}
          >
            <SkipForward size={18} color={colors.ink} />
          </Pressable>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  brandBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  appSub: {
    fontSize: 11,
  },
  syncBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  coverWrap: {
    width: 52,
    height: 52,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  trackImage: {
    width: '100%',
    height: '100%',
  },
  playingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackTitle: {
    fontSize: 14,
  },
  trackArtist: {
    fontSize: 12,
    marginTop: 2,
  },
  bottomPlayer: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
  },
  playerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 12,
  },
  miniCover: {
    width: 42,
    height: 42,
    borderRadius: 8,
  },
  miniTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  miniArtist: {
    fontSize: 11,
    marginTop: 2,
  },
  speedBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(30, 215, 96, 0.3)',
  },
  speedText: {
    fontSize: 10,
    fontWeight: '800',
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
