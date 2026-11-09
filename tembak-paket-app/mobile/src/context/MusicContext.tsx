import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { apiClient, getApiBaseUrl } from '../services/api';

export interface Track {
  id: string;
  title: string;
  artist: string;
  category: 'all' | 'global' | 'kpop' | 'indo' | 'galau' | 'dance' | 'favorites' | string;
  categoryLabel: string;
  durationSec: number;
  durationFormatted?: string;
  audioUrl?: string;
  previewUrl?: string;
  youtubeId?: string;
  streamsCount?: string;
  rank: number;
  tags?: string[];
  coverImage: string;
  accentColor?: string;
}

export const DEFAULT_TRACKS: Track[] = [
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
    youtubeId: '8Ebqe2Dbzls',
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
    youtubeId: 'kPa7bsKwL-c',
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
    youtubeId: 'd5gf9dXbPi0',
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
    youtubeId: '7Jm2Il2U-c0',
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
    youtubeId: 'sdnDInjdWjw',
  },
];

interface MusicContextType {
  tracks: Track[];
  currentTrack: Track;
  currentTrackIndex: number;
  isPlaying: boolean;
  isAudioLoading: boolean;
  currentTimeSec: number;
  durationSec: number;
  playbackSpeed: number;
  favorites: string[];
  isFullPlayerVisible: boolean;
  hasInteracted: boolean;
  playTrack: (index: number) => Promise<void>;
  togglePlay: () => Promise<void>;
  nextTrack: () => void;
  prevTrack: () => void;
  seekTo: (sec: number) => Promise<void>;
  setPlaybackSpeedRate: (speed: number) => Promise<void>;
  toggleFavorite: (trackId: string) => void;
  openFullPlayer: () => void;
  closeFullPlayer: () => void;
  syncTracks: () => Promise<void>;
}

const MusicContext = createContext<MusicContextType | null>(null);

export const MusicProvider = ({ children }: { children: ReactNode }) => {
  const [tracks, setTracks] = useState<Track[]>(DEFAULT_TRACKS);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(173);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [favorites, setFavorites] = useState<string[]>(['track-1', 'track-4']);
  const [isFullPlayerVisible, setIsFullPlayerVisible] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);
  const currentTrack = tracks[currentTrackIndex] || tracks[0] || DEFAULT_TRACKS[0];

  // Configure Audio Mode on startup
  useEffect(() => {
    async function initAudio() {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (err) {
        console.warn('[MusicContext] Audio mode error:', err);
      }
    }
    initAudio();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const syncTracks = async () => {
    try {
      const res = await apiClient.get('/music');
      const rawTracks = res.data?.data?.tracks || res.data?.tracks;
      if (Array.isArray(rawTracks) && rawTracks.length > 0) {
        const mapped: Track[] = rawTracks.map((t: any, idx: number) => ({
          id: t.id || `track-${idx + 1}`,
          title: t.title,
          artist: t.artist,
          category: t.category || 'indo',
          categoryLabel: t.categoryLabel || 'Top Hits',
          durationSec: t.durationSec || 200,
          durationFormatted: formatSeconds(t.durationSec || 200),
          audioUrl: t.audioUrl,
          previewUrl: t.previewUrl,
          youtubeId: t.youtubeId,
          streamsCount: t.streamsCount || '10M+ streams',
          rank: t.rank || idx + 1,
          tags: t.tags || ['#rytone'],
          coverImage: t.coverImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400',
          accentColor: t.accentColor || '#1ed760',
        }));
        setTracks(mapped);
      }
    } catch (e) {
      console.warn('[MusicContext] Error loading server tracks:', e);
    }
  };

  useEffect(() => {
    syncTracks();
  }, []);

  const getPlayableAudioUrl = (track: Track): string => {
    const baseUrl = getApiBaseUrl();
    if (track.previewUrl && track.previewUrl.startsWith('http')) {
      return track.previewUrl;
    }
    if (track.audioUrl && track.audioUrl.startsWith('http')) {
      return track.audioUrl;
    }
    const identifier = track.youtubeId || `${track.title} ${track.artist}`;
    return `${baseUrl}/music/stream?id=${encodeURIComponent(identifier)}`;
  };

  const playTrack = async (index: number) => {
    try {
      Haptics.selectionAsync();
    } catch {}

    const targetTrack = tracks[index];
    if (!targetTrack) return;

    setHasInteracted(true);
    setCurrentTrackIndex(index);
    setCurrentTimeSec(0);
    setDurationSec(targetTrack.durationSec || 200);
    setIsAudioLoading(true);

    try {
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch {}
        soundRef.current = null;
      }

      const streamUrl = getPlayableAudioUrl(targetTrack);
      const { sound } = await Audio.Sound.createAsync(
        { uri: streamUrl },
        {
          shouldPlay: true,
          rate: playbackSpeed,
          shouldCorrectPitch: true,
          progressUpdateIntervalMillis: 500,
        },
        (status) => {
          if (!status.isLoaded) return;
          setCurrentTimeSec(Math.floor((status.positionMillis || 0) / 1000));
          if (status.durationMillis) {
            setDurationSec(Math.floor(status.durationMillis / 1000));
          }
          if (status.didJustFinish) {
            nextTrack();
          }
        }
      );

      soundRef.current = sound;
      setIsPlaying(true);
    } catch (err) {
      console.warn('[MusicContext] Audio stream playback failed:', err);
      setIsPlaying(false);
    } finally {
      setIsAudioLoading(false);
    }
  };

  const togglePlay = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (!hasInteracted || !soundRef.current) {
      await playTrack(currentTrackIndex);
      return;
    }

    try {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch {
      await playTrack(currentTrackIndex);
    }
  };

  const nextTrack = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    const nextIdx = (currentTrackIndex + 1) % tracks.length;
    playTrack(nextIdx);
  };

  const prevTrack = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    const prevIdx = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    playTrack(prevIdx);
  };

  const seekTo = async (sec: number) => {
    if (soundRef.current) {
      try {
        await soundRef.current.setPositionAsync(sec * 1000);
        setCurrentTimeSec(sec);
      } catch {}
    }
  };

  const setPlaybackSpeedRate = async (speed: number) => {
    setPlaybackSpeed(speed);
    if (soundRef.current) {
      try {
        await soundRef.current.setRateAsync(speed, true);
      } catch {}
    }
  };

  const toggleFavorite = (trackId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setFavorites((prev) =>
      prev.includes(trackId) ? prev.filter((id) => id !== trackId) : [...prev, trackId]
    );
  };

  const openFullPlayer = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setIsFullPlayerVisible(true);
  };

  const closeFullPlayer = () => {
    setIsFullPlayerVisible(false);
  };

  return (
    <MusicContext.Provider
      value={{
        tracks,
        currentTrack,
        currentTrackIndex,
        isPlaying,
        isAudioLoading,
        currentTimeSec,
        durationSec,
        playbackSpeed,
        favorites,
        isFullPlayerVisible,
        hasInteracted,
        playTrack,
        togglePlay,
        nextTrack,
        prevTrack,
        seekTo,
        setPlaybackSpeedRate,
        toggleFavorite,
        openFullPlayer,
        closeFullPlayer,
        syncTracks,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};
