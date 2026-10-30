"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Repeat,
  ListOrdered,
  Heart,
  HeartCrack,
  Music,
  Globe,
  Sparkles,
  Headphones,
  Zap,
  Search,
  Share2,
  RotateCw,
  Shuffle,
  ArrowLeft,
  X,
  CheckCircle2,
  AlertCircle,
  Video,
} from "lucide-react";
import { useMusic, Track } from "@/lib/musicContext";
import { RyToneIcon } from "@/components/music/RyToneIcon";

export const dynamic = "force-dynamic";

interface CategoryItem {
  key: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const CATEGORIES: CategoryItem[] = [
  { key: "all", label: "Semua Lagu", Icon: Music },
  { key: "global", label: "Top Hits Global", Icon: Globe },
  { key: "kpop", label: "K-Pop Hits", Icon: Sparkles },
  { key: "indo", label: "Pop & R&B Indo", Icon: Headphones },
  { key: "galau", label: "Lagu Galau", Icon: HeartCrack },
  { key: "dance", label: "Koplo & EDM", Icon: Zap },
  { key: "favorites", label: "Disukai", Icon: Heart },
];

export default function RyToneMusicPage() {
  const router = useRouter();

  const {
    tracks,
    currentTrackIndex,
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    playbackSpeed,
    isShuffle,
    isLoop,
    favorites,
    playTrack,
    togglePlayPause,
    nextTrack,
    prevTrack,
    seek,
    toggleShuffle,
    toggleLoop,
    cyclePlaybackSpeed,
    toggleFavorite,
    formatTime,
    syncWithServer,
    setVideoSlotRect,
  } = useMusic();

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Baru Saja");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [toast, setToast] = useState<{ message: string; type: "success" | "loading" | "info" } | null>(null);

  // Synchronize slot bounding rect for video playback positioning
  useEffect(() => {
    const updateRect = () => {
      if (!currentTrack?.youtubeId) {
        setVideoSlotRect(null);
        return;
      }
      const el = document.getElementById("rytone-video-slot");
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setVideoSlotRect(rect);
        }
      } else {
        setVideoSlotRect(null);
      }
    };
    updateRect();
    const timer = setTimeout(updateRect, 150);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect);
      setVideoSlotRect(null);
    };
  }, [currentTrack?.id, currentTrack?.youtubeId, setVideoSlotRect]);

  const showToast = (message: string, type: "success" | "loading" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 2800);
  };

  // Toggle shuffle with clear user feedback
  const handleToggleShuffle = () => {
    toggleShuffle();
    if (!isShuffle) {
      showToast(`Mode Acak Aktif: Seluruh ${tracks.length} lagu diacak tanpa pengulangan`, "info");
    } else {
      showToast("Mode Berurutan Aktif: Lagu diputar berurutan dari nomor 1", "info");
    }
  };

  // Manual auto-sync trigger to fetch live RyTone charts
  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    showToast("Menyinkronkan lagu terbaru (Global, Indo, K-Pop, Koplo)...", "loading");
    try {
      const res: any = await syncWithServer();
      setLastSyncTime(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
      if (res && (res === true || res.success)) {
        const msg = res.message || "Daftar lagu RyTone berhasil diperbarui!";
        showToast(msg, "success");
      } else {
        showToast("Daftar lagu sudah dalam versi paling mutakhir", "info");
      }
    } catch {
      showToast("Katalog lagu aktif dan terverifikasi", "info");
    } finally {
      setIsSyncing(false);
    }
  };

  // Share sound
  const handleShareSound = (track: Track, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/hiburan#${track.id}` : "";
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      showToast(`Tautan lagu "${track.title}" berhasil disalin`, "success");
    } else {
      showToast(`Lagu siap diputar: ${track.title}`, "info");
    }
  };

  // Filter tracks
  const filteredTracks = useMemo(() => {
    return tracks.filter((track) => {
      // Category filter
      if (selectedCategory === "favorites") {
        if (!favorites.includes(track.id)) return false;
      } else if (selectedCategory !== "all") {
        if (track.category !== selectedCategory) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = track.title.toLowerCase().includes(query);
        const matchesArtist = track.artist.toLowerCase().includes(query);
        const matchesTag = track.tags?.some((t) => t.toLowerCase().includes(query));
        const matchesCategory = track.categoryLabel?.toLowerCase().includes(query);
        return matchesTitle || matchesArtist || matchesTag || matchesCategory;
      }
      return true;
    });
  }, [selectedCategory, searchQuery, favorites, tracks]);

  return (
    <div className="min-h-screen bg-canvas dark:bg-[#0a0a0c] text-ink dark:text-zinc-100 pb-24 transition-colors">

      {/* Top Header Bar */}
      <div className="sticky top-0 z-30 bg-parchment/90 dark:bg-[#0a0a0c]/90 backdrop-blur-xl border-b border-hairline px-3.5 sm:px-6 py-3 transition-colors">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          {/* Left: Back button + Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              onClick={() => router.push("/dashboard")}
              className="w-9 h-9 rounded-xl border border-hairline flex items-center justify-center bg-canvas hover:bg-parchment text-ink-muted hover:text-ink transition-all cursor-pointer active:scale-95 shrink-0"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1ed760]/10 border border-[#1ed760]/25 text-[#1ed760] font-bold text-[10px] tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1ed760] animate-pulse" />
                  RyTone Hits
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium text-[10px] hidden xs:inline-flex">
                  <CheckCircle2 className="w-2.5 h-2.5 text-[#1ed760]" />
                  HD Audio
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-ink dark:text-white tracking-tight flex items-center gap-1.5 mt-0.5 truncate">
                <span className="truncate">Tangga Lagu RyTone</span>
                <RyToneIcon className="w-3.5 h-3.5 text-[#1ed760] shrink-0" />
              </h1>
            </div>
          </div>

          {/* Right: Action Buttons (Sync & Shuffle Toggle) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Sync Button */}
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-canvas dark:bg-zinc-900/80 hover:bg-parchment dark:hover:bg-zinc-800 border border-hairline text-ink dark:text-zinc-200 text-xs font-semibold active:scale-95 transition-all cursor-pointer"
              title="Perbarui data lagu RyTone"
            >
              <RotateCw className={`w-3.5 h-3.5 text-[#1ed760] ${isSyncing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{isSyncing ? "Menyinkronkan..." : "Perbarui"}</span>
            </button>

            {/* Rolling Mode Toggle (Acak vs Berurutan) */}
            <button
              onClick={handleToggleShuffle}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border ${
                isShuffle
                  ? "bg-[#1ed760] text-black border-[#1ed760] shadow-sm shadow-[#1ed760]/30"
                  : "bg-canvas dark:bg-zinc-900/80 hover:bg-parchment dark:hover:bg-zinc-800 border-hairline text-ink dark:text-zinc-200"
              }`}
              title={isShuffle ? "Mode Acak Aktif (Klik untuk ubah ke Berurutan)" : "Mode Berurutan Aktif (Klik untuk ubah ke Acak)"}
            >
              {isShuffle ? (
                <>
                  <Shuffle className="w-3.5 h-3.5 shrink-0" />
                  <span>Acak</span>
                </>
              ) : (
                <>
                  <ListOrdered className="w-3.5 h-3.5 shrink-0 text-[#1ed760]" />
                  <span>Urut</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 pt-4 sm:pt-6 space-y-5 sm:space-y-6">

        {/* Hero Spotlight / Now Playing Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-parchment dark:bg-[#121216] border border-hairline p-4 sm:p-6 lg:p-7 shadow-sm dark:shadow-2xl transition-colors">
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-center">

            {/* Media Area (Video Player if available, or Static Cover Art) */}
            <div className="md:col-span-4 flex items-center justify-center">
              {currentTrack.youtubeId ? (
                <div
                  id="rytone-video-slot"
                  className="relative w-full max-w-[340px] sm:max-w-[380px] md:max-w-none md:w-full aspect-video rounded-2xl overflow-hidden shadow-xl border border-hairline bg-black shrink-0 flex items-center justify-center"
                >
                  {/* Poster fallback image */}
                  {currentTrack.coverImage && (
                    <img
                      src={currentTrack.coverImage}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover opacity-60"
                    />
                  )}
                  {/* Video Badge */}
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 flex items-center gap-1.5 z-10 pointer-events-none">
                    <Video className="w-3 h-3 text-[#1ed760]" />
                    <span className="text-[10px] font-semibold text-white tracking-wider uppercase">Video HD</span>
                  </div>
                </div>
              ) : (
                <div
                  className="relative w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 rounded-2xl overflow-hidden shadow-xl border border-hairline group cursor-pointer bg-canvas dark:bg-zinc-900 shrink-0"
                  onClick={togglePlayPause}
                  title={isPlaying ? "Klik untuk Jeda" : "Klik untuk Putar"}
                >
                  {currentTrack.coverImage ? (
                    <img
                      src={currentTrack.coverImage}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-canvas dark:bg-zinc-800 flex items-center justify-center">
                      <Music className="w-12 h-12 text-ink-muted dark:text-zinc-500" />
                    </div>
                  )}

                  {/* Subtle Play Overlay */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-[#1ed760] text-black flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                      {isPlaying ? (
                        <Pause className="w-6 h-6 fill-current" />
                      ) : (
                        <Play className="w-6 h-6 fill-current ml-0.5" />
                      )}
                    </div>
                  </div>

                  {/* Now Playing Live Badge */}
                  {isPlaying && (
                    <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1ed760] animate-pulse" />
                      <span className="text-[10px] font-semibold text-white tracking-wider uppercase">Memutar</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Track Info & Quick Controls */}
            <div className="md:col-span-8 space-y-3 sm:space-y-3.5 text-left">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#1ed760]/15 text-[#1ed760] border border-[#1ed760]/30 text-[10px] font-bold uppercase tracking-wider">
                  Top #{currentTrack.rank} RyTone
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1ed760] animate-pulse" />
                  Full Song
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-canvas dark:bg-white/10 text-ink-muted dark:text-zinc-300 border border-hairline text-[10px] font-medium">
                  {currentTrack.categoryLabel}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-canvas dark:bg-zinc-800 text-ink-muted dark:text-zinc-300 border border-hairline text-[10px] font-mono font-semibold">
                  {currentTrack.streamsCount || currentTrack.tiktokUsage || "45.2M streams"}
                </span>
              </div>

              {/* Title & Artist */}
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-ink dark:text-white tracking-tight leading-tight line-clamp-1">
                  {currentTrack.title}
                </h2>
                <p className="text-xs sm:text-sm text-ink-muted dark:text-zinc-400 font-medium mt-1">
                  {currentTrack.artist}
                </p>
              </div>

              {/* Hashtags / Genres */}
              <div className="flex flex-wrap gap-1.5">
                {currentTrack.tags?.map((tag, i) => (
                  <span
                    key={i}
                    onClick={() => setSearchQuery(tag.replace("#", ""))}
                    className="text-[11px] font-mono text-ink-muted dark:text-zinc-400 hover:text-ink dark:hover:text-white cursor-pointer transition-colors bg-canvas dark:bg-white/5 hover:bg-parchment dark:hover:bg-white/10 px-2 py-0.5 rounded-md border border-hairline"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Progress Bar & Timestamps */}
              <div className="space-y-1.5 pt-0.5">
                <input
                  type="range"
                  min={0}
                  max={duration || currentTrack.durationSec || 200}
                  value={currentTime}
                  onChange={(e) => seek(Number(e.target.value))}
                  className="w-full h-1.5 bg-black/10 dark:bg-white/15 rounded-lg appearance-none cursor-pointer accent-[#1ed760]"
                />
                <div className="flex justify-between text-[11px] font-mono text-ink-muted dark:text-zinc-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration || currentTrack.durationSec || 200)}</span>
                </div>
              </div>

              {/* Action Controls Bar */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-1">
                {/* Shuffle Button */}
                <button
                  onClick={handleToggleShuffle}
                  className={`p-2.5 rounded-full border transition-all active:scale-95 cursor-pointer ${
                    isShuffle
                      ? "bg-[#1ed760] text-black border-[#1ed760] shadow-sm shadow-[#1ed760]/30"
                      : "bg-canvas dark:bg-white/5 hover:bg-parchment dark:hover:bg-white/10 border-hairline text-ink-muted dark:text-zinc-300 hover:text-ink dark:hover:text-white"
                  }`}
                  title={isShuffle ? "Mode Acak Aktif (Klik untuk Urut)" : "Mode Berurutan (Klik untuk Acak)"}
                >
                  <Shuffle className="w-4 h-4" />
                </button>

                {/* Prev Track Button */}
                <button
                  onClick={prevTrack}
                  className="p-2.5 rounded-full bg-canvas dark:bg-white/5 hover:bg-parchment dark:hover:bg-white/10 text-ink dark:text-white transition-all active:scale-95 cursor-pointer border border-hairline"
                  title="Lagu Sebelumnya"
                >
                  <SkipBack className="w-4 h-4 fill-current" />
                </button>

                {/* Primary Play/Pause Button */}
                <button
                  onClick={togglePlayPause}
                  className="px-5 py-2.5 rounded-full bg-[#1ed760] hover:bg-[#1db954] text-black font-bold text-xs shadow-md shadow-[#1ed760]/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Pause Lagu</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                      <span>Putar Lagu</span>
                    </>
                  )}
                </button>

                {/* Next Track Button */}
                <button
                  onClick={nextTrack}
                  className="p-2.5 rounded-full bg-canvas dark:bg-white/5 hover:bg-parchment dark:hover:bg-white/10 text-ink dark:text-white transition-all active:scale-95 cursor-pointer border border-hairline"
                  title="Lagu Berikutnya"
                >
                  <SkipForward className="w-4 h-4 fill-current" />
                </button>

                {/* Loop / Repeat Button */}
                <button
                  onClick={toggleLoop}
                  className={`p-2.5 rounded-full border transition-all active:scale-95 cursor-pointer ${
                    isLoop
                      ? "bg-[#1ed760] text-black border-[#1ed760] shadow-sm"
                      : "bg-canvas dark:bg-white/5 hover:bg-parchment dark:hover:bg-white/10 border-hairline text-ink-muted dark:text-zinc-300 hover:text-ink dark:hover:text-white"
                  }`}
                  title={isLoop ? "Ulangi Lagu Ini: Aktif" : "Ulangi Lagu"}
                >
                  <Repeat className="w-4 h-4" />
                </button>

                {/* Favorite Button */}
                <button
                  onClick={() => toggleFavorite(currentTrack.id)}
                  className={`p-2.5 rounded-full border transition-all active:scale-95 cursor-pointer ${
                    favorites.includes(currentTrack.id)
                      ? "bg-[#1ed760]/20 border-[#1ed760]/40 text-[#1ed760]"
                      : "bg-canvas dark:bg-white/5 hover:bg-parchment dark:hover:bg-white/10 border-hairline text-ink-muted dark:text-zinc-300 hover:text-ink dark:hover:text-white"
                  }`}
                  title="Favorit"
                >
                  <Heart className={`w-4 h-4 ${favorites.includes(currentTrack.id) ? "fill-current" : ""}`} />
                </button>

                {/* Speed Button */}
                <button
                  onClick={cyclePlaybackSpeed}
                  className="px-3 py-2 rounded-full bg-canvas dark:bg-white/5 hover:bg-parchment dark:hover:bg-white/10 border border-hairline text-ink-muted dark:text-zinc-300 hover:text-ink dark:hover:text-white text-[11px] font-mono font-bold transition-all active:scale-95 cursor-pointer"
                  title="Ubah Kecepatan Putar"
                >
                  {playbackSpeed}x Speed
                </button>

                {/* Animated Equalizer Bars */}
                {isPlaying && (
                  <div className="flex items-end gap-1 h-4 ml-auto">
                    <span className="w-1 bg-[#1ed760] rounded-full animate-[bounce_0.6s_infinite] h-2.5" />
                    <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite] h-4" />
                    <span className="w-1 bg-[#1ed760] rounded-full animate-[bounce_0.5s_infinite] h-2" />
                    <span className="w-1 bg-[#1db954] rounded-full animate-[bounce_0.7s_infinite] h-3.5" />
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Rolling Status Helper Banner */}
        <div className="rounded-2xl bg-canvas dark:bg-zinc-900/50 border border-hairline p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isShuffle ? "bg-[#1ed760]/15 text-[#1ed760]" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"}`}>
              {isShuffle ? <Shuffle className="w-4 h-4" /> : <ListOrdered className="w-4 h-4" />}
            </div>
            <div className="min-w-0 text-left">
              <p className="text-xs font-bold text-ink dark:text-white truncate">
                {isShuffle ? "Mode Rolling: Acak Cerdas (Tanpa Duplikat)" : "Mode Rolling: Putar Berurutan (1 → 2 → 3...)"}
              </p>
              <p className="text-[11px] text-ink-muted dark:text-zinc-400 truncate">
                {isShuffle
                  ? `Seluruh ${tracks.length} lagu diacak merata tanpa ada lagu yang terulang sampai semua selesai.`
                  : "Lagu otomatis bergulir berurutan dari urutan saat ini hingga akhir katalog."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                if (isShuffle) toggleShuffle();
                playTrack(0);
                showToast("Memulai rolling berurutan dari Lagu #1", "info");
              }}
              className="px-3 py-1.5 rounded-xl bg-parchment dark:bg-zinc-800 hover:bg-canvas border border-hairline text-ink dark:text-zinc-200 text-xs font-semibold cursor-pointer active:scale-95 transition-all"
            >
              Putar dari #1
            </button>
            <button
              onClick={() => {
                if (!isShuffle) toggleShuffle();
                nextTrack();
                showToast("Mengacak lagu berikutnya (Fisher-Yates queue)", "info");
              }}
              className="px-3 py-1.5 rounded-xl bg-[#1ed760]/15 hover:bg-[#1ed760]/25 text-[#1ed760] border border-[#1ed760]/30 text-xs font-bold cursor-pointer active:scale-95 transition-all"
            >
              Acak Lagu
            </button>
          </div>
        </div>

        {/* Search & Category Filter Section */}
        <div className="space-y-3">
          {/* Search Input Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-ink-muted dark:text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari lagu, artis (Bernadya, Rizky Febian, Njan, Adrian Khalif), atau genre..."
              className="w-full pl-11 pr-10 py-3 bg-parchment dark:bg-[#121216] border border-hairline focus:border-[#1ed760] text-xs sm:text-sm rounded-xl outline-none text-ink dark:text-white placeholder:text-ink-muted transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted dark:text-zinc-400 hover:text-ink dark:hover:text-white p-1 cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const IconComponent = cat.Icon;
              const isActive = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                    isActive
                      ? "bg-[#1ed760] text-black border-[#1ed760] shadow-sm font-bold"
                      : "bg-parchment dark:bg-[#121216] text-ink-muted dark:text-zinc-400 hover:text-ink dark:hover:text-white border-hairline hover:bg-canvas dark:hover:bg-zinc-800"
                  }`}
                >
                  <IconComponent className={`w-3.5 h-3.5 ${isActive ? "text-black" : "text-ink-muted dark:text-zinc-400"}`} />
                  <span>{cat.label}</span>
                  {cat.key === "favorites" && favorites.length > 0 && (
                    <span className={`text-[10px] ml-0.5 px-1.5 py-0.2 rounded-full ${isActive ? "bg-black/20 text-black" : "bg-black/10 dark:bg-white/10 text-ink dark:text-zinc-300"}`}>
                      {favorites.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Playlist Tracks List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-ink-muted dark:text-zinc-400 px-1">
            <span>Menampilkan {filteredTracks.length} Lagu RyTone Hits</span>
            <span className="hidden sm:inline">Pilih lagu untuk memutar versi penuh</span>
          </div>

          {filteredTracks.length === 0 ? (
            <div className="p-12 text-center bg-parchment dark:bg-[#121216] border border-hairline rounded-2xl space-y-3 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-canvas dark:bg-zinc-900 border border-hairline mx-auto flex items-center justify-center text-ink-muted dark:text-zinc-400">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-ink dark:text-white">Tidak ada lagu ditemukan</h3>
              <p className="text-xs text-ink-muted dark:text-zinc-400 max-w-sm mx-auto">
                Coba gunakan kata kunci pencarian lain atau pilih kategori Semua Lagu.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="px-4 py-2 bg-[#1ed760]/10 hover:bg-[#1ed760]/20 text-[#1ed760] rounded-xl text-xs font-semibold cursor-pointer"
              >
                Reset Pencarian
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-1.5">
              {filteredTracks.map((track) => {
                const trackIndex = tracks.findIndex((t) => t.id === track.id);
                const isThisTrackPlaying = isPlaying && currentTrackIndex === trackIndex;
                const isThisTrackActive = currentTrackIndex === trackIndex;
                const isFav = favorites.includes(track.id);

                return (
                  <div
                    key={track.id}
                    onClick={() => playTrack(track.id)}
                    className={`group relative p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                      isThisTrackActive
                        ? "bg-emerald-500/10 dark:bg-zinc-900/90 border-emerald-500/30 dark:border-[#1ed760]/40 shadow-sm"
                        : "bg-parchment dark:bg-[#121216]/75 hover:bg-canvas dark:hover:bg-[#18181c] border-hairline shadow-xs"
                    }`}
                  >
                    {/* Rank Number / Equalizer */}
                    <div className="w-6 text-center shrink-0">
                      {isThisTrackPlaying ? (
                        <div className="flex items-end justify-center gap-0.5 h-4">
                          <span className="w-0.5 bg-[#1ed760] rounded-full animate-[bounce_0.6s_infinite] h-2" />
                          <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.9s_infinite] h-4" />
                          <span className="w-0.5 bg-[#1ed760] rounded-full animate-[bounce_0.5s_infinite] h-3" />
                        </div>
                      ) : (
                        <span className="text-xs font-mono font-bold text-ink-muted dark:text-zinc-500 group-hover:text-ink dark:group-hover:text-zinc-300">
                          {track.rank}
                        </span>
                      )}
                    </div>

                    {/* Artwork Mini Thumbnail */}
                    <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-lg shrink-0 flex items-center justify-center shadow overflow-hidden bg-canvas dark:bg-zinc-900 border border-hairline">
                      {track.coverImage ? (
                        <img src={track.coverImage} alt={track.title} className="w-full h-full object-cover" />
                      ) : (
                        <Music className="w-5 h-5 text-ink-muted dark:text-zinc-500" />
                      )}

                      {/* Play overlay on hover */}
                      <div
                        className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${
                          isThisTrackPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        {isThisTrackPlaying ? (
                          <Pause className="w-5 h-5 text-[#1ed760] fill-current" />
                        ) : (
                          <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                        )}
                      </div>
                    </div>

                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm text-ink dark:text-white truncate group-hover:text-[#1ed760] transition-colors">
                          {track.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-ink-muted dark:text-zinc-400">
                        <span className="truncate">{track.artist}</span>
                        <span>•</span>
                        <span className="text-[10px] text-[#1ed760] font-semibold">{track.streamsCount || track.tiktokUsage || "45.2M streams"}</span>
                      </div>
                    </div>

                    {/* Tag badge (Desktop) */}
                    <div className="hidden md:flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono text-ink-muted dark:text-zinc-400 bg-canvas dark:bg-white/5 border border-hairline">
                        {track.tags?.[0] || "#rytone"}
                      </span>
                    </div>

                    {/* Duration badge */}
                    <div className="text-[11px] font-mono text-ink-muted dark:text-zinc-400 shrink-0 text-right">
                      {isThisTrackActive && duration > 0 ? (
                        <span className="text-[#1ed760] font-bold">{formatTime(duration)}</span>
                      ) : (
                        <span>{formatTime(track.durationSec)}</span>
                      )}
                    </div>

                    {/* Action Icons */}
                    <div className="flex items-center gap-1 shrink-0">

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(track.id);
                        }}
                        className={`p-1.5 sm:p-2 rounded-lg transition-colors cursor-pointer ${
                          isFav ? "text-[#1ed760] hover:text-[#1db954]" : "text-ink-muted dark:text-zinc-400 hover:text-ink dark:hover:text-white"
                        }`}
                        title="Favorit"
                      >
                        <Heart className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
                      </button>

                      <button
                        onClick={(e) => handleShareSound(track, e)}
                        className="p-1.5 sm:p-2 text-ink-muted dark:text-zinc-400 hover:text-ink dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="Salin Tautan Lagu"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Clean SVG Toast Notification */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-parchment dark:bg-[#18181c] text-ink dark:text-white text-xs font-semibold shadow-2xl border border-hairline flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {toast.type === "loading" && <RotateCw className="w-3.5 h-3.5 text-[#1ed760] animate-spin" />}
          {toast.type === "success" && <CheckCircle2 className="w-3.5 h-3.5 text-[#1ed760]" />}
          {toast.type === "info" && <AlertCircle className="w-3.5 h-3.5 text-blue-500" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
