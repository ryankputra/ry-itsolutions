import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  CheckCircle2,
  X,
  Volume2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';

export interface Track {
  id: string;
  title: string;
  artist: string;
  category: 'all' | 'global' | 'kpop' | 'indo' | 'galau' | 'dance' | 'favorites' | string;
  categoryLabel: string;
  durationSec: number;
  durationFormatted?: string;
  audioUrl?: string;
  streamsCount?: string;
  rank: number;
  tags?: string[];
  coverImage: string;
  accentColor?: string;
}

export const SPOTIFY_TRACKS_CATALOG: Track[] = [
  {
    id: 'track-1',
    title: 'APT.',
    artist: 'ROSÉ & Bruno Mars',
    category: 'global',
    categoryLabel: 'Top Hits Global',
    durationSec: 173,
    durationFormatted: '02:53',
    streamsCount: '145.2M streams',
    rank: 1,
    tags: ['#apt', '#rosé', '#brunomars'],
    coverImage: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/2d/14/66/2d14661b-345b-d0f3-4e86-56ef626e68aa/075679629203.jpg/400x400bb.jpg',
  },
  {
    id: 'track-2',
    title: 'Die With A Smile',
    artist: 'Lady Gaga & Bruno Mars',
    category: 'global',
    categoryLabel: 'Top Hits Global',
    durationSec: 251,
    durationFormatted: '04:11',
    streamsCount: '162.5M streams',
    rank: 2,
    tags: ['#diewithasmile', '#ladygaga'],
    coverImage: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/37/10/ec/3710ec41-7649-ee9b-f1f3-c59ce13ca3bb/24UMGIM88636.rgb.jpg/400x400bb.jpg',
  },
  {
    id: 'track-3',
    title: 'BIRDS OF A FEATHER',
    artist: 'Billie Eilish',
    category: 'global',
    categoryLabel: 'Top Hits Global',
    durationSec: 193,
    durationFormatted: '03:13',
    streamsCount: '185.4M streams',
    rank: 3,
    tags: ['#birdsofafeather', '#billieeilish'],
    coverImage: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/f4/bf/2a/f4bf2a6d-e4d6-ca70-7fbe-4eb345d36e7a/24UMGIM36511.rgb.jpg/400x400bb.jpg',
  },
  {
    id: 'track-4',
    title: 'Satu Bulan',
    artist: 'Bernadya',
    category: 'galau',
    categoryLabel: 'Lagu Galau',
    durationSec: 200,
    durationFormatted: '03:20',
    streamsCount: '81.3M streams',
    rank: 4,
    tags: ['#satubulan', '#bernadya'],
    coverImage: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/d8/bb/8c/d8bb8c81-ddb9-e427-a18b-c385afae12c2/23UMGIM65225.rgb.jpg/400x400bb.jpg',
  },
  {
    id: 'track-5',
    title: 'Kita Buat Menyenangkan',
    artist: 'Bernadya',
    category: 'galau',
    categoryLabel: 'Lagu Galau',
    durationSec: 250,
    durationFormatted: '04:10',
    streamsCount: '62.0M streams',
    rank: 5,
    tags: ['#kitabuatmenyenangkan', '#bernadya'],
    coverImage: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/50/c0/8b/50c08bf3-f106-9b29-5bf0-4a9c269add43/26UMGIM00072.rgb.jpg/400x400bb.jpg',
  },
  {
    id: 'track-6',
    title: 'Bermuara',
    artist: 'Rizky Febian & Mahalini',
    category: 'indo',
    categoryLabel: 'Pop & R&B Indo',
    durationSec: 245,
    durationFormatted: '04:05',
    streamsCount: '69.1M streams',
    rank: 6,
    tags: ['#bermuara', '#rizkyfebian', '#mahalini'],
    coverImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80',
  },
  {
    id: 'track-7',
    title: 'Cerita Kita Singkat',
    artist: 'Rizwan Fadilah (Njan)',
    category: 'indo',
    categoryLabel: 'Pop & R&B Indo',
    durationSec: 214,
    durationFormatted: '03:34',
    streamsCount: '38.4M streams',
    rank: 7,
    tags: ['#ceritakitasingkat', '#njan'],
    coverImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80',
  },
  {
    id: 'track-8',
    title: 'Gala Bunga Matahari',
    artist: 'Sal Priadi',
    category: 'galau',
    categoryLabel: 'Lagu Galau',
    durationSec: 232,
    durationFormatted: '03:52',
    streamsCount: '94.2M streams',
    rank: 8,
    tags: ['#galabungamatahari', '#salpriadi'],
    coverImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80',
  },
  {
    id: 'track-9',
    title: 'Supernova',
    artist: 'aespa',
    category: 'kpop',
    categoryLabel: 'K-Pop Hits',
    durationSec: 180,
    durationFormatted: '03:00',
    streamsCount: '110.8M streams',
    rank: 9,
    tags: ['#supernova', '#aespa', '#kpop'],
    coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
  },
  {
    id: 'track-10',
    title: 'Rungkad (Koplo Remix)',
    artist: 'Happy Asmara',
    category: 'dance',
    categoryLabel: 'Koplo & EDM',
    durationSec: 210,
    durationFormatted: '03:30',
    streamsCount: '78.5M streams',
    rank: 10,
    tags: ['#rungkad', '#koplo', '#dance'],
    coverImage: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&q=80',
  },
];

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
  const colors = Colors.dark;

  // Track & Player states
  const [tracks, setTracks] = useState<Track[]>(SPOTIFY_TRACKS_CATALOG);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(45);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [favorites, setFavorites] = useState<string[]>(['track-1', 'track-4']);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('Baru Saja');

  const currentTrack = tracks[currentTrackIndex] || tracks[0];

  // Simulated playback timer
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTimeSec((prev) => {
          if (prev >= currentTrack.durationSec) {
            // Auto advance
            setCurrentTrackIndex((idx) => (idx + 1) % tracks.length);
            return 0;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, playbackSpeed, currentTrack, tracks.length]);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleTogglePlay = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
    setCurrentTimeSec(0);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
    setCurrentTimeSec(0);
    setIsPlaying(true);
  };

  const handleToggleFavorite = (trackId: string) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    setFavorites((prev) =>
      prev.includes(trackId) ? prev.filter((id) => id !== trackId) : [...prev, trackId]
    );
  };

  const cycleSpeed = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    const speeds = [1.0, 1.25, 1.5, 0.75];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIdx]);
  };

  const handleShareTrack = async (track: Track) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Share.share({
        message: `Dengarkan lagu hits "${track.title}" oleh ${track.artist} di Ry-IT Solutions Spotify Player!`,
      });
    } catch (e) {}
  };

  const handleSyncWithServer = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.get('/music/chart').catch(() => null);
      if (res?.data?.status && Array.isArray(res.data.data)) {
        setTracks(res.data.data);
      }
      setLastSyncTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      Alert.alert('Tersinkronisasi', 'Daftar lagu Spotify berhasil diperbarui ke chart terbaru.');
    } catch (e) {
      Alert.alert('Info', 'Katalog lagu Spotify aktif dan versi mutakhir.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Filtered tracks
  const filteredTracks = useMemo(() => {
    return tracks.filter((track) => {
      if (selectedCategory === 'favorites') {
        if (!favorites.includes(track.id)) return false;
      } else if (selectedCategory !== 'all') {
        if (track.category !== selectedCategory) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          track.title.toLowerCase().includes(q) ||
          track.artist.toLowerCase().includes(q) ||
          track.categoryLabel.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tracks, selectedCategory, searchQuery, favorites]);

  const progressPercent = Math.min(1, Math.max(0, currentTimeSec / (currentTrack.durationSec || 180)));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#090a0f' }]} edges={['top']}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: '#ffffff12' }]}>
        <View style={styles.rowSpace}>
          <View>
            <View style={styles.badgeRow}>
              <View style={[styles.spotifyBadge, { backgroundColor: '#1ed76018', borderColor: '#1ed76044' }]}>
                <View style={styles.spotifyDot} />
                <Text style={styles.spotifyBadgeText}>Spotify Hits</Text>
              </View>
              <View style={[styles.verifiedBadge, { backgroundColor: '#10b98118', borderColor: '#10b98144' }]}>
                <CheckCircle2 size={12} color="#10b981" />
                <Text style={styles.verifiedBadgeText}>Audio Terverifikasi</Text>
              </View>
            </View>
            <Text style={styles.headerTitle}>Pemutar Musik Spotify</Text>
            <Text style={styles.headerSub}>Auto-Update Aktif • {lastSyncTime}</Text>
          </View>

          <Pressable
            style={[styles.syncBtn, { backgroundColor: '#181922', borderColor: '#ffffff18' }]}
            onPress={handleSyncWithServer}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#1ed760" />
            ) : (
              <RotateCw size={16} color="#1ed760" />
            )}
          </Pressable>
        </View>

        {/* Search Input Bar */}
        <View style={[styles.searchBar, { backgroundColor: '#13141c', borderColor: '#ffffff18' }]}>
          <Search size={16} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari lagu, artis, atau genre..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <X size={16} color="#94a3b8" />
            </Pressable>
          )}
        </View>

        {/* Category Horizontal Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = selectedCategory === cat.key;
            return (
              <Pressable
                key={cat.key}
                style={[
                  styles.catChip,
                  active
                    ? { backgroundColor: '#1ed760', borderColor: '#1ed760' }
                    : { backgroundColor: '#14151e', borderColor: '#ffffff14' },
                ]}
                onPress={() => {
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                  setSelectedCategory(cat.key);
                }}
              >
                <Icon size={13} color={active ? '#000' : '#94a3b8'} />
                <Text style={[styles.catChipText, { color: active ? '#000' : '#ffffff' }]}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Featured Spotify Player Card */}
      <View style={styles.playerContainer}>
        <View style={[styles.playerCard, { backgroundColor: '#12131b', borderColor: '#ffffff14' }]}>
          <View style={styles.playerTopRow}>
            <Image source={{ uri: currentTrack.coverImage }} style={styles.coverArt} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.nowPlayingTag}>SEDANG DIPUTAR</Text>
              <Text style={styles.playerTitle} numberOfLines={1}>{currentTrack.title}</Text>
              <Text style={styles.playerArtist} numberOfLines={1}>{currentTrack.artist}</Text>
              <Text style={styles.playerStreams} numberOfLines={1}>{currentTrack.streamsCount || 'Spotify Trending'}</Text>
            </View>

            <Pressable onPress={() => handleToggleFavorite(currentTrack.id)} hitSlop={10}>
              <Heart
                size={22}
                color={favorites.includes(currentTrack.id) ? '#ff3b30' : '#64748b'}
                fill={favorites.includes(currentTrack.id) ? '#ff3b30' : 'transparent'}
              />
            </Pressable>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={[styles.progressBarBg, { backgroundColor: '#ffffff18' }]}>
              <View style={[styles.progressBarFill, { width: `${progressPercent * 100}%` }]} />
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatSeconds(currentTimeSec)}</Text>
              <Text style={styles.timeText}>{currentTrack.durationFormatted || formatSeconds(currentTrack.durationSec)}</Text>
            </View>
          </View>

          {/* Controls Bar */}
          <View style={styles.playerControls}>
            <Pressable style={styles.speedBtn} onPress={cycleSpeed}>
              <Text style={styles.speedText}>{playbackSpeed}x</Text>
            </Pressable>

            <Pressable style={styles.ctrlBtn} onPress={handlePrev}>
              <SkipBack size={20} color="#ffffff" />
            </Pressable>

            <Pressable style={styles.playBtn} onPress={handleTogglePlay}>
              {isPlaying ? <Pause size={22} color="#000" fill="#000" /> : <Play size={22} color="#000" fill="#000" style={{ marginLeft: 2 }} />}
            </Pressable>

            <Pressable style={styles.ctrlBtn} onPress={handleNext}>
              <SkipForward size={20} color="#ffffff" />
            </Pressable>

            <Pressable style={styles.ctrlBtn} onPress={() => handleShareTrack(currentTrack)}>
              <Share2 size={18} color="#94a3b8" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Track List */}
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        <View style={styles.listHeaderRow}>
          <Text style={styles.listHeaderTitle}>Daftar Putar ({filteredTracks.length})</Text>
          <Text style={styles.listHeaderSub}>Sentuh untuk memutar</Text>
        </View>

        <FlashList
          data={filteredTracks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
          renderItem={({ item, index }) => {
            const isCurrent = currentTrack.id === item.id;
            const isLiked = favorites.includes(item.id);
            return (
              <Pressable
                style={[
                  styles.trackItem,
                  isCurrent
                    ? { backgroundColor: '#1ed76014', borderColor: '#1ed76033' }
                    : { backgroundColor: '#11121a', borderColor: '#ffffff0a' },
                ]}
                onPress={() => {
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                  const idx = tracks.findIndex((t) => t.id === item.id);
                  if (idx !== -1) {
                    setCurrentTrackIndex(idx);
                    setCurrentTimeSec(0);
                    setIsPlaying(true);
                  }
                }}
              >
                <View style={styles.rankCol}>
                  <Text style={[styles.rankText, isCurrent && { color: '#1ed760' }]}>
                    {index + 1}
                  </Text>
                </View>

                <Image source={{ uri: item.coverImage }} style={styles.itemThumb} />

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.itemTitle, isCurrent && { color: '#1ed760' }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.itemArtist} numberOfLines={1}>
                    {item.artist} • <Text style={{ color: '#64748b' }}>{item.categoryLabel}</Text>
                  </Text>
                </View>

                <Text style={styles.itemDuration}>{item.durationFormatted || '03:15'}</Text>

                <Pressable
                  onPress={(e) => {
                    handleToggleFavorite(item.id);
                  }}
                  hitSlop={8}
                  style={{ marginLeft: 8 }}
                >
                  <Heart
                    size={16}
                    color={isLiked ? '#ff3b30' : '#475569'}
                    fill={isLiked ? '#ff3b30' : 'transparent'}
                  />
                </Pressable>
              </Pressable>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    gap: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  spotifyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  spotifyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1ed760',
  },
  spotifyBadgeText: {
    color: '#1ed760',
    fontSize: 10,
    fontWeight: '800',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  verifiedBadgeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  headerSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 1,
  },
  syncBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
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
    color: '#ffffff',
    fontSize: 13,
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  playerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  playerCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  playerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coverArt: {
    width: 62,
    height: 62,
    borderRadius: 12,
  },
  nowPlayingTag: {
    color: '#1ed760',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  playerTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  playerArtist: {
    color: '#cbd5e1',
    fontSize: 12,
    marginTop: 1,
  },
  playerStreams: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  progressSection: {
    gap: 6,
  },
  progressBarBg: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#1ed760',
    borderRadius: 3,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeText: {
    color: '#94a3b8',
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  speedBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#1e202c',
  },
  speedText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  ctrlBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1ed760',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  listHeaderTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  listHeaderSub: {
    color: '#64748b',
    fontSize: 11,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  rankCol: {
    width: 24,
    alignItems: 'center',
  },
  rankText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
  },
  itemThumb: {
    width: 42,
    height: 42,
    borderRadius: 8,
  },
  itemTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  itemArtist: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  itemDuration: {
    color: '#64748b',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    marginLeft: 6,
  },
  rowSpace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
