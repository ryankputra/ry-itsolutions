"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { Play } from "lucide-react";

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

export interface VideoSlotPos {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface MusicContextType {
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
  seekTo: (seconds: number) => void;
  seek: (seconds: number) => void;
  handleNextTrack: () => void;
  nextTrack: () => void;
  handlePrevTrack: () => void;
  prevTrack: () => void;
  setVolume: (volume: number) => void;
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
  videoSlotPos: VideoSlotPos | null;
  setVideoSlotPos: (pos: VideoSlotPos | null) => void;
}

const MusicContext = createContext<MusicContextType | null>(null);

const isIOSDevice = () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
};

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
  const [isResuming, setIsResuming] = useState<boolean>(false);
  const [videoSlotPos, setVideoSlotPos] = useState<VideoSlotPos | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const isYtReadyRef = useRef<boolean>(false);
  const currentPlaybackEngineRef = useRef<"youtube" | "html5">("youtube");
  const handleNextTrackRef = useRef<() => void>(() => {});
  const shuffleQueueRef = useRef<number[]>([]);
  const playedHistoryRef = useRef<number[]>([]);
  const isReturningFromBackgroundRef = useRef<boolean>(false);

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
            height: "100%",
            width: "100%",
            playerVars: {
              autoplay: 0,
              controls: 0,
              disablekb: 1,
              fs: 0,
              rel: 0,
              modestbranding: 1,
              playsinline: 1,
              enablejsapi: 1,
              iv_load_policy: 3,
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
                  // If background HTML5 audio was playing, pause it once YouTube starts playing
                  if (audioRef.current && !audioRef.current.paused) {
                    audioRef.current.pause();
                  }
                  isReturningFromBackgroundRef.current = false;
                } else if (event.data === 2) {
                  // If background HTML5 audio is actively playing, don't let browser's autoplay block pause the music!
                  if (audioRef.current && !audioRef.current.paused) {
                    return;
                  }
                  if (isReturningFromBackgroundRef.current.valueOf()) {
                    return;
                  }
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
      const savedVol = localStorage.getItem("ry_rytone_player_vol") || localStorage.getItem("ry_spotify_player_vol");
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
        album: "RyTone Hits (Full Version)",
        artwork: artworks,
      });

      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

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
  }, [currentTrack, isPlaying]);

  // Mobile background audio resilience: seamless switch to native HTML5 stream when tab is hidden / phone locked
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityChange = () => {
      // Pada perangkat iOS (iPhone/iPad), audio HTML5 sudah aktif langsung sejak awal sentuhan,
      // sehingga tidak boleh diinterupsi oleh visibilitychange agar tidak diblokir iOS WebKit.
      if (isIOSDevice()) return;

      if (document.hidden) {
        // App di-minimize atau layar HP dikunci (Android/Desktop):
        if (isPlaying && currentTrack) {
          const currentSec = ytPlayerRef.current?.getCurrentTime ? ytPlayerRef.current.getCurrentTime() : currentTime;
          const streamUrl = (currentTrack.audioUrl && currentTrack.audioUrl.endsWith('.mp3'))
            ? currentTrack.audioUrl
            : `/api/music/stream?id=${encodeURIComponent(currentTrack.youtubeId || (currentTrack.title + " " + currentTrack.artist))}`;
          if (audioRef.current) {
            if (!audioRef.current.src || !audioRef.current.src.includes(streamUrl)) {
              audioRef.current.src = streamUrl;
            }
            audioRef.current.currentTime = currentSec || 0;
            audioRef.current.play().catch(() => {});
          }
        }
      } else {
        // App dibuka kembali ke foreground:
        isReturningFromBackgroundRef.current = true;
        setTimeout(() => {
          isReturningFromBackgroundRef.current = false;
        }, 2500);

        // PENTING: JANGAN pause audioRef! Biarkan lagu tetap mengalir tanpa jeda
        if (audioRef.current && !audioRef.current.paused) {
          const resumeSec = audioRef.current.currentTime;
          // Sinkronkan video YouTube di background jika browser mengizinkan
          if (ytPlayerRef.current?.seekTo && isPlaying) {
            ytPlayerRef.current.seekTo(resumeSec, true);
            try {
              ytPlayerRef.current.playVideo();
            } catch {}
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPlaying, currentTrack, currentTime]);

  // Handle Play Track (100% Full Length via YouTube or HTML5 audio stream)
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

      // Pre-warm background HTML5 audio stream for instant zero-gap background playback
      const fullStreamUrl = (targetTrack.audioUrl && targetTrack.audioUrl.endsWith('.mp3'))
        ? targetTrack.audioUrl
        : `/api/music/stream?id=${encodeURIComponent(targetTrack.youtubeId || (targetTrack.title + " " + targetTrack.artist))}`;

      const isIOS = isIOSDevice();

      // Di iOS, gunakan HTML5 Native Stream dari awal agar audio bisa terus berputar saat keluar Safari / kunci layar!
      if (targetTrack.youtubeId && !isIOS) {
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
        // iOS or HTML5 Native Stream (Full audio stream dari server dengan background play & lock screen support)
        currentPlaybackEngineRef.current = "html5";
        if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === "function") {
          try { ytPlayerRef.current.pauseVideo(); } catch {}
        }
        const audio = audioRef.current;
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
          audio.src = fullStreamUrl;
          audio.playbackRate = playbackSpeed;
          audio.play().then(() => {
            setIsPlaying(true);
            if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
              navigator.mediaSession.playbackState = "playing";
            }
          }).catch((err) => {
            console.warn("[HTML5 Audio Play Error]:", err);
          });
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
          if (audioRef.current) audioRef.current.pause();
          setIsPlaying(false);
          if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
            navigator.mediaSession.playbackState = "paused";
          }
        } else {
          setIsResuming(true);
          setTimeout(() => setIsResuming(false), 1200);
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
          if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
            navigator.mediaSession.playbackState = "playing";
          }
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
        if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "paused";
        }
      } else {
        setIsResuming(true);
        setTimeout(() => setIsResuming(false), 1200);
        const fullStreamUrl = (currentTrack.audioUrl && currentTrack.audioUrl.endsWith('.mp3'))
          ? currentTrack.audioUrl
          : `/api/music/stream?id=${encodeURIComponent(currentTrack.youtubeId || (currentTrack.title + " " + currentTrack.artist))}`;
        if (!audio.src || audio.src === "" || (!audio.src.includes(fullStreamUrl) && !audio.src.includes(currentTrack.audioUrl || ""))) {
          audio.src = fullStreamUrl;
          audio.playbackRate = playbackSpeed;
        }
        audio.play().then(() => {
          setIsPlaying(true);
          if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
            navigator.mediaSession.playbackState = "playing";
          }
        }).catch(() => {});
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
      localStorage.setItem("ry_rytone_player_vol", clamped.toString());
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
            message: json?.message || `Berhasil memperbarui ${serverTracks.length} lagu RyTone Hits!`
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
        handleNextTrack,
        nextTrack: handleNextTrack,
        handlePrevTrack,
        prevTrack: handlePrevTrack,
        seekTo: seek,
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
        videoSlotPos,
        setVideoSlotPos,
      }}
    >
      <style jsx global>{`
        #persistent-yt-audio,
        #persistent-yt-audio iframe {
          width: 100% !important;
          height: 100% !important;
          border: 0 !important;
          border-radius: inherit;
          pointer-events: none !important;
        }
      `}</style>

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

      {/* 2. Persistent YouTube Audio/Video Engine */}
      <div
        className={
          videoSlotPos && currentTrack?.youtubeId
            ? "absolute z-20 overflow-hidden rounded-2xl shadow-xl bg-black select-none pointer-events-none"
            : "fixed bottom-0 right-0 w-[2px] h-[2px] opacity-[0.001] pointer-events-none overflow-hidden z-[-1]"
        }
        style={
          videoSlotPos && currentTrack?.youtubeId
            ? {
                left: `${videoSlotPos.left}px`,
                top: `${videoSlotPos.top}px`,
                width: `${videoSlotPos.width}px`,
                height: `${videoSlotPos.height}px`,
                borderRadius: "1rem",
              }
            : undefined
        }
      >
        {/* Video Unzoomed (Scale 1.0 Normal Asli) */}
        <div
          id="persistent-yt-audio"
          className="w-full h-full pointer-events-none"
          style={{ width: "100%", height: "100%" }}
        />

        {/* RyTone Stealth Top Header Bar - 100% blocks YouTube Title, Channel Avatar, & Share Button */}
        <div className="absolute top-0 inset-x-0 h-14 bg-gradient-to-b from-black/95 via-black/60 to-transparent z-15 pointer-events-none flex items-center justify-between px-3.5">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-2 h-2 rounded-full bg-[#1ed760] animate-pulse shrink-0" />
            <p className="text-xs font-bold text-white truncate max-w-[200px] drop-shadow-md">
              {currentTrack?.title}
            </p>
            <span className="text-[10px] text-zinc-400 font-medium truncate hidden sm:inline">
              • {currentTrack?.artist}
            </span>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-black/70 text-[#1ed760] border border-[#1ed760]/30 backdrop-blur-md shrink-0">
            RyTone HD
          </span>
        </div>

        {/* RyTone Stealth Bottom-Right Seal - 100% blocks YouTube Watermark */}
        <div className="absolute bottom-2.5 right-2.5 z-15 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/85 border border-white/10 backdrop-blur-md shadow-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-[#1ed760]" />
          <span className="text-[10px] font-black tracking-wider text-white">RyTone</span>
        </div>

        {/* Splash & State Cover Curtain to seamlessly seal YouTube loading, intro, pause, and buffer */}
        <div
          className={`absolute inset-0 z-20 overflow-hidden rounded-2xl transition-opacity duration-300 select-none bg-black ${
            !isPlaying || isBuffering || currentTime < 5.5 || isResuming
              ? "opacity-100 pointer-events-auto cursor-pointer"
              : "opacity-0 pointer-events-none"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            togglePlayPause();
          }}
        >
          {currentTrack.coverImage ? (
            <img
              src={currentTrack.coverImage}
              alt={currentTrack.title}
              className="w-full h-full object-cover brightness-90 scale-105"
            />
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center" />
          )}

          {/* RyTone Overlay Badges & Custom Interactive Play/Pause Indicator */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
            {!isPlaying ? (
              <div className="flex flex-col items-center gap-2 group">
                <div className="w-14 h-14 rounded-full bg-[#1ed760] text-black flex items-center justify-center shadow-2xl shadow-[#1ed760]/50 transform group-hover:scale-110 transition-transform">
                  <Play className="w-7 h-7 fill-black ml-1 text-black" />
                </div>
                <p className="text-[11px] font-bold text-white tracking-widest uppercase">Klik Untuk Memutar</p>
              </div>
            ) : isBuffering || isResuming ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-[#1ed760]/20 border border-[#1ed760]/40 flex items-center justify-center shadow-lg">
                  <span className="w-4 h-4 rounded-full bg-[#1ed760] animate-ping" />
                </div>
                <p className="text-[11px] font-bold text-[#1ed760] tracking-widest uppercase animate-pulse">Menyelaraskan Audio...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-11 h-11 rounded-full bg-[#1ed760]/20 border border-[#1ed760]/40 flex items-center justify-center shadow-lg">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#1ed760] animate-ping" />
                </div>
                <p className="text-[11px] font-bold text-white tracking-widest uppercase">RyTone HD Audio</p>
              </div>
            )}
          </div>
        </div>

        {/* Transparent Shield Overlay to prevent any hover/click/tap reaching YouTube */}
        <div
          className="absolute inset-0 z-30 pointer-events-auto bg-transparent select-none cursor-default"
          onClick={(e) => {
            e.stopPropagation();
            togglePlayPause();
          }}
        />
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
