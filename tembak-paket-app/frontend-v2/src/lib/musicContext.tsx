"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

export interface Track {
  id: string;
  title: string;
  artist: string;
  category: "all" | "global" | "kpop" | "indo" | "galau" | "dance" | "favorites" | string;
  categoryLabel: string;
  durationSec: number;
  youtubeId?: string;
  audioUrl: string;
  streamsCount?: string;
  tiktokUsage?: string;
  rank: number;
  tags: string[];
  coverGradient?: string;
  coverImage?: string;
  accentColor?: string;
  verifiedOriginal?: boolean;
}

export const DEFAULT_TRACKS: Track[] = [
  {
    id: "track-1",
    title: "APT.",
    artist: "ROSÉ & Bruno Mars",
    category: "global",
    categoryLabel: "Top Hits Global",
    durationSec: 173,
    youtubeId: "8Ebqe2Dbzls",
    audioUrl: "https://www.youtube.com/watch?v=8Ebqe2Dbzls",
    streamsCount: "145.2M streams",
    rank: 1,
    tags: ["#apt", "#rosé", "#brunomars", "#tophits"],
    coverGradient: "from-rose-500 via-pink-600 to-amber-500",
    coverImage: "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/2d/14/66/2d14661b-345b-d0f3-4e86-56ef626e68aa/075679629203.jpg/400x400bb.jpg",
    accentColor: "#1ed760",
    verifiedOriginal: true,
  },
  {
    id: "track-2",
    title: "Die With A Smile",
    artist: "Lady Gaga & Bruno Mars",
    category: "global",
    categoryLabel: "Top Hits Global",
    durationSec: 251,
    youtubeId: "kPa7bsKwL-c",
    audioUrl: "https://www.youtube.com/watch?v=kPa7bsKwL-c",
    streamsCount: "162.5M streams",
    rank: 2,
    tags: ["#diewithasmile", "#ladygaga", "#brunomars"],
    coverGradient: "from-purple-600 via-pink-500 to-indigo-600",
    coverImage: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/37/10/ec/3710ec41-7649-ee9b-f1f3-c59ce13ca3bb/24UMGIM88636.rgb.jpg/400x400bb.jpg",
    accentColor: "#1ed760",
    verifiedOriginal: true,
  },
  {
    id: "track-3",
    title: "BIRDS OF A FEATHER",
    artist: "Billie Eilish",
    category: "global",
    categoryLabel: "Top Hits Global",
    durationSec: 193,
    youtubeId: "d5gf9dXbPi0",
    audioUrl: "https://www.youtube.com/watch?v=d5gf9dXbPi0",
    streamsCount: "185.4M streams",
    rank: 3,
    tags: ["#birdsofafeather", "#billieeilish"],
    coverGradient: "from-blue-600 via-indigo-600 to-cyan-500",
    coverImage: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/f4/bf/2a/f4bf2a6d-e4d6-ca70-7fbe-4eb345d36e7a/24UMGIM36511.rgb.jpg/400x400bb.jpg",
    accentColor: "#1ed760",
    verifiedOriginal: true,
  },
  {
    id: "track-4",
    title: "Satu Bulan",
    artist: "Bernadya",
    category: "galau",
    categoryLabel: "Lagu Galau",
    durationSec: 200,
    youtubeId: "7Jm2Il2U-c0",
    audioUrl: "https://www.youtube.com/watch?v=7Jm2Il2U-c0",
    streamsCount: "81.3M streams",
    rank: 4,
    tags: ["#satubulan", "#bernadya"],
    coverGradient: "from-indigo-600 via-purple-600 to-pink-500",
    coverImage: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/d8/bb/8c/d8bb8c81-ddb9-e427-a18b-c385afae12c2/23UMGIM65225.rgb.jpg/400x400bb.jpg",
    accentColor: "#1ed760",
    verifiedOriginal: true,
  },
  {
    id: "track-5",
    title: "Kita Buat Menyenangkan",
    artist: "Bernadya",
    category: "galau",
    categoryLabel: "Lagu Galau",
    durationSec: 250,
    youtubeId: "sdnDInjdWjw",
    audioUrl: "https://www.youtube.com/watch?v=sdnDInjdWjw",
    streamsCount: "62.0M streams",
    rank: 5,
    tags: ["#kitabuatmenyenangkan", "#bernadya"],
    coverGradient: "from-emerald-500 via-green-600 to-teal-700",
    coverImage: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/50/c0/8b/50c08bf3-f106-9b29-5bf0-4a9c269add43/26UMGIM00072.rgb.jpg/400x400bb.jpg",
    accentColor: "#1ed760",
    verifiedOriginal: true,
  },
  {
    id: "track-6",
    title: "Bermuara",
    artist: "Rizky Febian & Mahalini",
    category: "indo",
    categoryLabel: "Pop & R&B Indo",
    durationSec: 245,
    youtubeId: "GAf2DQPYvGE",
    audioUrl: "https://www.youtube.com/watch?v=GAf2DQPYvGE",
    streamsCount: "69.1M streams",
    rank: 6,
    tags: ["#bermuara", "#rizkyfebian", "#mahalini"],
    coverGradient: "from-amber-500 via-rose-500 to-pink-600",
    coverImage: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/37/10/ec/3710ec41-7649-ee9b-f1f3-c59ce13ca3bb/24UMGIM88636.rgb.jpg/400x400bb.jpg",
    accentColor: "#1ed760",
    verifiedOriginal: true,
  },
  {
    id: "track-7",
    title: "Cerita Kita Singkat",
    artist: "Rizwan Fadilah (Njan)",
    category: "indo",
    categoryLabel: "Pop & R&B Indo",
    durationSec: 214,
    youtubeId: "mlmcRW3s5TY",
    audioUrl: "https://www.youtube.com/watch?v=mlmcRW3s5TY",
    streamsCount: "38.4M streams",
    rank: 7,
    tags: ["#ceritakitasingkat", "#njan"],
    coverGradient: "from-teal-400 via-cyan-500 to-blue-500",
    accentColor: "#1ed760",
    verifiedOriginal: true,
  },
  {
    id: "track-8",
    title: "Sialan",
    artist: "Adrian Khalif & Juicy Luicy",
    category: "indo",
    categoryLabel: "Pop & R&B Indo",
    durationSec: 272,
    youtubeId: "54u_qDsqJv4",
    audioUrl: "https://www.youtube.com/watch?v=54u_qDsqJv4",
    streamsCount: "91.0M streams",
    rank: 8,
    tags: ["#sialan", "#adriankhalif", "#juicyluicy"],
    coverGradient: "from-violet-600 via-purple-700 to-pink-600",
    accentColor: "#1ed760",
    verifiedOriginal: true,
  },
  {
    id: "track-9",
    title: "Sigar",
    artist: "Denny Caknan",
    category: "dance",
    categoryLabel: "Koplo & Jawa Hits",
    durationSec: 285,
    youtubeId: "s525A0Bc3z4",
    audioUrl: "https://www.youtube.com/watch?v=s525A0Bc3z4",
    streamsCount: "66.5M streams",
    rank: 9,
    tags: ["#sigar", "#dennycaknan"],
    coverGradient: "from-amber-500 via-red-500 to-rose-600",
    accentColor: "#1ed760",
    verifiedOriginal: true,
  },
];

interface MusicContextType {
  tracks: Track[];
  currentTrackIndex: number;
  currentTrack: Track;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  isLoop: boolean;
  playbackSpeed: number;
  favorites: string[];
  isPlayerVisible: boolean;
  isMinimized: boolean;
  isBuffering: boolean;

  playTrack: (indexOrId: number | string) => void;
  togglePlayPause: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleLoop: () => void;
  cyclePlaybackSpeed: () => void;
  toggleFavorite: (trackId: string) => void;
  setPlayerVisible: (visible: boolean) => void;
  toggleMinimize: () => void;
  formatTime: (seconds: number) => string;
  refreshTracks: () => Promise<void>;
  syncWithServer: () => Promise<any>;
}

const MusicContext = createContext<MusicContextType | null>(null);

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>(DEFAULT_TRACKS);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isLoop, setIsLoop] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isPlayerVisible, setPlayerVisible] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const isYtReadyRef = useRef<boolean>(false);
  const currentPlaybackEngineRef = useRef<"youtube" | "html5">("youtube");
  const handleNextTrackRef = useRef<() => void>(() => {});
  const shuffleQueueRef = useRef<number[]>([]);
  const playedHistoryRef = useRef<number[]>([]);

  const currentTrack = tracks[currentTrackIndex] || DEFAULT_TRACKS[0];

  // Initialize YouTube IFrame API once on client
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!(window as any).YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      try {
        if ((window as any).YT && (window as any).YT.Player) {
          ytPlayerRef.current = new (window as any).YT.Player("persistent-yt-audio", {
            height: "120",
            width: "120",
            playerVars: {
              autoplay: 0,
              controls: 0,
              disablekb: 1,
              fs: 0,
              rel: 0,
              modestbranding: 1,
              playsinline: 1,
              enablejsapi: 1,
              origin: typeof window !== "undefined" ? window.location.origin : undefined,
            },
            events: {
              onReady: () => {
                isYtReadyRef.current = true;
                try {
                  ytPlayerRef.current.setVolume((volume || 0.85) * 100);
                } catch {}
              },
              onStateChange: (event: any) => {
                // 1 = PLAYING, 2 = PAUSED, 0 = ENDED, 3 = BUFFERING
                if (event.data === 1) {
                  setIsPlaying(true);
                  setIsBuffering(false);
                } else if (event.data === 2) {
                  setIsPlaying(false);
                } else if (event.data === 0) {
                  // Track finished playing naturally -> trigger up-to-date nextTrack
                  handleNextTrackRef.current();
                } else if (event.data === 3) {
                  setIsBuffering(true);
                }
              },
            },
          });
        }
      } catch (e) {
        console.warn("[YT Player] Init error:", e);
      }
    };

    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer();
    } else {
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    }
  }, []);

  // Poll YouTube player time every 250ms for smooth scrubber sync
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentPlaybackEngineRef.current === "youtube" && ytPlayerRef.current) {
        try {
          if (typeof ytPlayerRef.current.getCurrentTime === "function") {
            const curr = ytPlayerRef.current.getCurrentTime();
            if (typeof curr === "number" && !isNaN(curr)) {
              setCurrentTime(curr);
            }
          }
          if (typeof ytPlayerRef.current.getDuration === "function") {
            const dur = ytPlayerRef.current.getDuration();
            if (typeof dur === "number" && dur > 0) {
              setDuration(dur);
            }
          }
        } catch {}
      }
    }, 250);
    return () => clearInterval(interval);
  }, []);

  // Load tracks from server API or localStorage
  useEffect(() => {
    fetch(`/api/music?_t=${Date.now()}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : fetch(`/api/tiktok-music?_t=${Date.now()}`, { cache: "no-store" }).then((r) => r.json())))
      .then((json) => {
        const serverTracks = json?.data?.tracks || json?.tracks;
        if (Array.isArray(serverTracks) && serverTracks.length > 0) {
          setTracks(serverTracks);
        }
      })
      .catch(() => {});

    try {
      const savedFavs = localStorage.getItem("ry_music_favs") || localStorage.getItem("ry_tiktok_music_favs");
      if (savedFavs) {
        setFavorites(JSON.parse(savedFavs));
      }
      const savedVol = localStorage.getItem("ry_spotify_player_vol");
      if (savedVol) {
        const parsed = parseFloat(savedVol);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          setVolumeState(parsed);
        }
      }
    } catch {}
  }, []);

  // Update MediaSession metadata for lock screen & notifications
  useEffect(() => {
    if (typeof window !== "undefined" && "mediaSession" in navigator && currentTrack) {
      const artworks = [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ];
      if (currentTrack.coverImage) {
        artworks.unshift({ src: currentTrack.coverImage, sizes: "400x400", type: "image/jpeg" });
      }

      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: "Spotify Hits (Full Version)",
        artwork: artworks,
      });

      navigator.mediaSession.setActionHandler("play", () => {
        togglePlayPause();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        togglePlayPause();
      });
      navigator.mediaSession.setActionHandler("nexttrack", () => handleNextTrack());
      navigator.mediaSession.setActionHandler("previoustrack", () => handlePrevTrack());
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime !== undefined) {
          seek(details.seekTime);
        }
      });
    }
  }, [currentTrack]);

  // Handle Play Track (100% Full Length via YouTube or HTML5 audio)
  const playTrack = useCallback(
    (indexOrId: number | string) => {
      let index: number;
      if (typeof indexOrId === "string") {
        index = tracks.findIndex((t) => t.id === indexOrId);
      } else {
        index = indexOrId;
      }
      if (index < 0 || index >= tracks.length) return;
      const targetTrack = tracks[index];
      if (!targetTrack) return;

      setPlayerVisible(true);
      setIsMinimized(false);

      // Same track clicked: Toggle Pause/Play
      if (index === currentTrackIndex) {
        togglePlayPause();
        return;
      }

      // Switching to a DIFFERENT track:
      setCurrentTrackIndex(index);
      setCurrentTime(0);
      setIsPlaying(true);
      setDuration(targetTrack.durationSec || 200);

      if (targetTrack.youtubeId) {
        currentPlaybackEngineRef.current = "youtube";
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
        }

        const loadVideo = () => {
          if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === "function") {
            try {
              ytPlayerRef.current.loadVideoById(targetTrack.youtubeId);
              ytPlayerRef.current.playVideo();
              if (playbackSpeed !== 1 && typeof ytPlayerRef.current.setPlaybackRate === "function") {
                ytPlayerRef.current.setPlaybackRate(playbackSpeed);
              }
            } catch (err) {
              console.warn("[YT Player] Play error:", err);
            }
          } else {
            setTimeout(loadVideo, 200);
          }
        };
        loadVideo();
      } else {
        // Fallback HTML5 audio (for local .mp3 tracks)
        currentPlaybackEngineRef.current = "html5";
        if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === "function") {
          ytPlayerRef.current.pauseVideo();
        }
        const audio = audioRef.current;
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
          audio.src = targetTrack.audioUrl;
          audio.playbackRate = playbackSpeed;
          audio.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      }
    },
    [tracks, currentTrackIndex, playbackSpeed]
  );

  const togglePlayPause = useCallback(() => {
    setPlayerVisible(true);

    if (currentPlaybackEngineRef.current === "youtube" && ytPlayerRef.current) {
      try {
        const state = ytPlayerRef.current.getPlayerState ? ytPlayerRef.current.getPlayerState() : -1;
        if (state === 1) {
          ytPlayerRef.current.pauseVideo();
          setIsPlaying(false);
        } else {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        }
      } catch {
        setIsPlaying((prev) => !prev);
      }
    } else {
      const audio = audioRef.current;
      if (!audio) return;
      if (!audio.paused) {
        audio.pause();
        setIsPlaying(false);
      } else {
        if (!audio.src || audio.src === "" || !audio.src.includes(currentTrack.audioUrl)) {
          audio.src = currentTrack.audioUrl;
          audio.playbackRate = playbackSpeed;
        }
        audio.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  }, [currentTrack, playbackSpeed]);

  // Helper to generate a Fisher-Yates randomized queue of track indices
  const generateShuffledQueue = useCallback((trackList: Track[], currentIdx: number): number[] => {
    if (!trackList || trackList.length <= 1) return [];
    const pool: number[] = [];
    for (let i = 0; i < trackList.length; i++) {
      if (i !== currentIdx) {
        pool.push(i);
      }
    }
    // Fisher-Yates shuffle algorithm
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
  }, []);

  const seek = useCallback((seconds: number) => {
    setCurrentTime(seconds);
    if (currentPlaybackEngineRef.current === "youtube" && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.seekTo(seconds, true);
      } catch {}
    } else if (audioRef.current) {
      audioRef.current.currentTime = seconds;
    }
  }, []);

  const handleNextTrack = useCallback(() => {
    if (!tracks || tracks.length === 0) return;

    // 1. If Loop / Repeat is ON: Repeat current track from start
    if (isLoop) {
      seek(0);
      if (currentPlaybackEngineRef.current === "youtube" && ytPlayerRef.current?.seekTo) {
        try {
          ytPlayerRef.current.seekTo(0, true);
          ytPlayerRef.current.playVideo();
        } catch {}
      } else if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
      setIsPlaying(true);
      return;
    }

    // Save current track to history so handlePrevTrack can go back accurately
    playedHistoryRef.current.push(currentTrackIndex);
    if (playedHistoryRef.current.length > 60) {
      playedHistoryRef.current.shift();
    }

    // 2. If Shuffle is ON: Use Fisher-Yates Queue so NO track repeats until all played
    if (isShuffle) {
      if (shuffleQueueRef.current.length === 0) {
        shuffleQueueRef.current = generateShuffledQueue(tracks, currentTrackIndex);
      }
      const nextIndex =
        shuffleQueueRef.current.length > 0
          ? shuffleQueueRef.current.shift()!
          : (currentTrackIndex + 1) % tracks.length;

      playTrack(nextIndex);
    } else {
      // 3. Sequential order: strict rolling 0 -> 1 -> 2 -> ... -> N-1 -> 0
      const nextIndex = (currentTrackIndex + 1) % tracks.length;
      playTrack(nextIndex);
    }
  }, [isLoop, isShuffle, currentTrackIndex, tracks, generateShuffledQueue, seek, playTrack]);

  // Synchronize handleNextTrackRef with every render to eliminate stale closure in YouTube API
  useEffect(() => {
    handleNextTrackRef.current = handleNextTrack;
  }, [handleNextTrack]);

  // Handle ended event for HTML5 audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      handleNextTrackRef.current();
    };
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const handlePrevTrack = useCallback(() => {
    if (!tracks || tracks.length === 0) return;

    // If more than 3 seconds in, replay current track from start (standard music player UX)
    if (currentTime > 3) {
      seek(0);
      return;
    }

    if (isShuffle && playedHistoryRef.current.length > 0) {
      const prevIdx = playedHistoryRef.current.pop()!;
      playTrack(prevIdx);
    } else {
      const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
      playTrack(prevIndex);
    }
  }, [currentTime, isShuffle, currentTrackIndex, tracks, seek, playTrack]);

  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === "function") {
      try {
        ytPlayerRef.current.setVolume(clamped * 100);
      } catch {}
    }
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    setIsMuted(clamped === 0);
    try {
      localStorage.setItem("ry_spotify_player_vol", clamped.toString());
    } catch {}
  }, []);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setVolume(volume || 0.85);
      setIsMuted(false);
    } else {
      setVolume(0);
      setIsMuted(true);
    }
  }, [isMuted, volume, setVolume]);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => {
      const next = !prev;
      if (next) {
        // Pre-generate a complete randomized queue of all remaining tracks
        shuffleQueueRef.current = generateShuffledQueue(tracks, currentTrackIndex);
      } else {
        shuffleQueueRef.current = [];
      }
      return next;
    });
  }, [tracks, currentTrackIndex, generateShuffledQueue]);

  const toggleLoop = useCallback(() => {
    setIsLoop((prev) => !prev);
  }, []);

  const cyclePlaybackSpeed = useCallback(() => {
    const speeds = [1.0, 1.25, 1.5, 0.85];
    setPlaybackSpeed((prevSpeed) => {
      const idx = speeds.indexOf(prevSpeed);
      const next = speeds[(idx + 1) % speeds.length];
      if (currentPlaybackEngineRef.current === "youtube" && ytPlayerRef.current?.setPlaybackRate) {
        try {
          ytPlayerRef.current.setPlaybackRate(next);
        } catch {}
      }
      if (audioRef.current) {
        audioRef.current.playbackRate = next;
      }
      return next;
    });
  }, []);

  const toggleFavorite = useCallback(
    (trackId: string) => {
      setFavorites((prev) => {
        let updated: string[];
        if (prev.includes(trackId)) {
          updated = prev.filter((id) => id !== trackId);
        } else {
          updated = [...prev, trackId];
        }
        try {
          localStorage.setItem("ry_tiktok_music_favs", JSON.stringify(updated));
        } catch {}
        return updated;
      });
    },
    []
  );

  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  const formatTime = useCallback((secs: number) => {
    if (isNaN(secs) || secs < 0) return "00:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes < 10 ? "0" : ""}${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  }, []);

  const refreshTracks = useCallback(async () => {
    try {
      const res = await fetch("/api/tiktok-music");
      if (res.ok) {
        const json = await res.json();
        const serverTracks = json?.data?.tracks || json?.tracks;
        if (Array.isArray(serverTracks) && serverTracks.length > 0) {
          setTracks(serverTracks);
        }
      }
    } catch {}
  }, []);

  const syncWithServer = useCallback(async () => {
    try {
      let res = await fetch("/api/music/sync", { method: "POST" });
      if (!res.ok) {
        res = await fetch("/api/tiktok-music/sync", { method: "POST" });
      }
      if (res.ok) {
        const json = await res.json();
        const serverTracks = json?.data?.tracks || json?.tracks;
        if (Array.isArray(serverTracks) && serverTracks.length > 0) {
          setTracks(serverTracks);
          return {
            success: true,
            count: serverTracks.length,
            added: json?.addedCount || 0,
            message: json?.message || `Berhasil memperbarui ${serverTracks.length} lagu Spotify Hits!`
          };
        }
      }
    } catch (e) {
      console.error("[MusicSync] Error:", e);
    }
    return { success: false, message: "Gagal menghubungkan ke server musik" };
  }, []);

  return (
    <MusicContext.Provider
      value={{
        tracks,
        currentTrackIndex,
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        isShuffle,
        isLoop,
        playbackSpeed,
        favorites,
        isPlayerVisible,
        isMinimized,
        isBuffering,

        playTrack,
        togglePlayPause,
        nextTrack: handleNextTrack,
        prevTrack: handlePrevTrack,
        seek,
        setVolume,
        toggleMute,
        toggleShuffle,
        toggleLoop,
        cyclePlaybackSpeed,
        toggleFavorite,
        setPlayerVisible,
        toggleMinimize,
        formatTime,
        refreshTracks,
        syncWithServer,
      }}
    >
      {/* 1. Global Persistent Audio Element (Fallback for local .mp3) */}
      <audio
        ref={audioRef}
        loop={isLoop}
        preload="metadata"
        onTimeUpdate={() => {
          if (currentPlaybackEngineRef.current === "html5" && audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (currentPlaybackEngineRef.current === "html5" && audioRef.current) {
            setDuration(audioRef.current.duration || currentTrack.durationSec || 200);
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          if (currentPlaybackEngineRef.current === "html5" && audioRef.current?.paused) {
            setIsPlaying(false);
          }
        }}
        onEnded={() => {
          if (!isLoop) handleNextTrack();
        }}
      />

      {/* 2. Persistent YouTube Audio Engine (100% Full Length Playback) */}
      <div
        className="fixed bottom-0 right-0 w-[2px] h-[2px] opacity-[0.01] pointer-events-none overflow-hidden z-[-1]"
        aria-hidden="true"
        tabIndex={-1}
      >
        <div id="persistent-yt-audio" />
      </div>

      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error("useMusic must be used within a MusicProvider");
  }
  return context;
}
