"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Volume1,
  Heart,
  Music,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import { useMusic } from "@/lib/musicContext";

export function SpotifyPlayerBar() {
  const pathname = usePathname();
  const isHiburanPage = pathname === "/hiburan" || pathname.startsWith("/hiburan/");
  const isAiPage = pathname === "/ai";

  const {
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

    togglePlayPause,
    nextTrack,
    prevTrack,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleLoop,
    cyclePlaybackSpeed,
    toggleFavorite,
    toggleMinimize,
    formatTime,
  } = useMusic();

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);

  // If on /ai full-screen page or on /hiburan (which already has its full spotlight player & tracklist), hide bar
  if (isAiPage || isHiburanPage) {
    return null;
  }

  // Show player on other pages if user started playing or explicitly opened player
  const shouldShow = isPlayerVisible || isPlaying;
  if (!shouldShow) {
    return null;
  }

  const isLiked = favorites.includes(currentTrack?.id || "");
  const progressPercent = duration > 0 ? ((isScrubbing ? scrubValue : currentTime) / duration) * 100 : 0;
  const volumePercent = isMuted ? 0 : volume * 100;

  // Minimized Compact Pill Mode
  if (isMinimized) {
    return (
      <div className="fixed bottom-[65px] lg:bottom-4 right-4 z-40 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="bg-parchment/95 dark:bg-[#121212]/95 border border-hairline dark:border-white/10 backdrop-blur-xl rounded-full pl-2 pr-4 py-1.5 shadow-2xl flex items-center gap-3 text-ink dark:text-white">
          <button
            onClick={toggleMinimize}
            className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 cursor-pointer shadow relative group border border-hairline dark:border-white/20"
            title="Perbesar Player"
          >
            {currentTrack?.coverImage ? (
              <img src={currentTrack.coverImage} alt={currentTrack.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-tr ${currentTrack?.coverGradient || "from-emerald-500 to-teal-700"} flex items-center justify-center`}>
                <Music className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
              </div>
            )}
            {isPlaying && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#1ed760] rounded-full animate-ping" />
            )}
          </button>
          <div className="flex flex-col max-w-[130px] sm:max-w-[180px] cursor-pointer" onClick={toggleMinimize}>
            <span className="text-xs font-semibold text-ink dark:text-white truncate">{currentTrack?.title}</span>
            <span className="text-[10px] text-ink-muted dark:text-zinc-400 truncate">{currentTrack?.artist}</span>
          </div>
          <button
            onClick={togglePlayPause}
            className="w-8 h-8 rounded-full bg-ink dark:bg-white text-canvas dark:text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer shadow"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-0.5" />}
          </button>
          <button
            onClick={toggleMinimize}
            className="text-ink-muted dark:text-zinc-400 hover:text-ink dark:hover:text-white transition-colors cursor-pointer"
            title="Buka Player Penuh"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        @keyframes eqBar1 { 0%, 100% { height: 4px; } 50% { height: 16px; } }
        @keyframes eqBar2 { 0%, 100% { height: 14px; } 50% { height: 6px; } }
        @keyframes eqBar3 { 0%, 100% { height: 8px; } 50% { height: 18px; } }
        @keyframes eqBar4 { 0%, 100% { height: 16px; } 50% { height: 4px; } }
        .eq-bar-1 { animation: eqBar1 0.7s infinite ease-in-out; }
        .eq-bar-2 { animation: eqBar2 0.5s infinite ease-in-out; }
        .eq-bar-3 { animation: eqBar3 0.9s infinite ease-in-out; }
        .eq-bar-4 { animation: eqBar4 0.6s infinite ease-in-out; }
      `}</style>

      {/* Main Spotify-style Player Bar */}
      <footer
        className="fixed bottom-[56px] lg:bottom-0 left-0 right-0 z-40 bg-parchment/95 dark:bg-[#121212]/95 border-t border-hairline dark:border-white/10 backdrop-blur-2xl text-ink dark:text-white select-none transition-all duration-200 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.5)]"
        aria-label="Spotify Music Player"
      >
        {/* Mobile thin top progress indicator */}
        <div className="lg:hidden w-full h-[3px] bg-black/10 dark:bg-white/10 relative overflow-hidden">
          <div
            className="h-full bg-[#1ed760] transition-all duration-100 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 h-[64px] sm:h-[72px] lg:h-[80px] flex items-center justify-between gap-2 sm:gap-4">
          {/* ========================================================= */}
          {/* 1. LEFT COLUMN: Track Artwork & Info (Spotify Style)      */}
          {/* ========================================================= */}
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 w-[45%] sm:w-[35%] lg:w-[30%]">
            {/* Album Cover Thumbnail with Equalizer Badge */}
            <Link
              href="/hiburan"
              className="relative w-11 h-11 sm:w-13 sm:h-13 lg:w-14 lg:h-14 rounded-lg overflow-hidden shrink-0 shadow-lg group cursor-pointer border border-white/10 bg-black/40"
              title="Buka Halaman Hiburan"
            >
              {currentTrack?.coverImage ? (
                <img
                  src={currentTrack.coverImage}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div
                  className={`w-full h-full bg-gradient-to-tr ${currentTrack?.coverGradient || "from-emerald-500 to-teal-700"} flex items-center justify-center transition-transform duration-300 group-hover:scale-105`}
                >
                  <Music className="w-5 h-5 text-white/80" />
                </div>
              )}

              {/* Dancing Equalizer Overlay when Playing */}
              {isPlaying && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-end justify-center gap-0.5 pb-2">
                  <span className="w-1 bg-[#1ed760] rounded-t-sm eq-bar-1" />
                  <span className="w-1 bg-[#1ed760] rounded-t-sm eq-bar-2" />
                  <span className="w-1 bg-[#1ed760] rounded-t-sm eq-bar-3" />
                  <span className="w-1 bg-[#1ed760] rounded-t-sm eq-bar-4" />
                </div>
              )}
            </Link>

            {/* Title & Artist Text */}
            <div className="min-w-0 flex flex-col justify-center">
              <Link
                href="/hiburan"
                className="text-xs sm:text-sm font-bold text-ink dark:text-white hover:underline truncate block"
                title={currentTrack?.title}
              >
                {currentTrack?.title}
              </Link>
              <span className="text-[10px] sm:text-xs text-ink-muted dark:text-zinc-400 hover:text-ink dark:hover:text-white truncate transition-colors">
                {currentTrack?.artist}
              </span>
            </div>

            {/* Spotify Heart / Like Button */}
            <button
              onClick={() => toggleFavorite(currentTrack?.id || "")}
              className={`p-1.5 rounded-full transition-all cursor-pointer shrink-0 hover:scale-110 active:scale-90 ${
                isLiked ? "text-[#1ed760]" : "text-ink-muted dark:text-zinc-400 hover:text-ink dark:hover:text-white"
              }`}
              title={isLiked ? "Hapus dari Favorit" : "Simpan ke Lagu yang Disukai"}
            >
              <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isLiked ? "fill-[#1ed760]" : ""}`} />
            </button>
          </div>

          {/* ========================================================= */}
          {/* 2. CENTER COLUMN: Controls & Timeline (Desktop + Mobile) */}
          {/* ========================================================= */}
          <div className="flex flex-col items-center justify-center flex-1 max-w-[620px] px-1 sm:px-2">
            {/* Control Buttons Row */}
            <div className="flex items-center gap-2 sm:gap-4 lg:gap-5">
              {/* Shuffle (Desktop only) */}
              <button
                onClick={toggleShuffle}
                className={`hidden sm:flex relative p-2 text-ink-muted dark:text-zinc-400 hover:text-ink dark:hover:text-white transition cursor-pointer ${
                  isShuffle ? "text-[#1ed760] hover:text-[#1ed760] dark:text-[#1ed760] dark:hover:text-[#1ed760]" : ""
                }`}
                title={isShuffle ? "Acak Aktif" : "Aktifkan Putar Acak"}
              >
                <Shuffle className="w-4 h-4" />
                {isShuffle && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#1ed760] rounded-full" />
                )}
              </button>

              {/* Prev */}
              <button
                onClick={prevTrack}
                className="p-1.5 sm:p-2 text-ink-muted dark:text-zinc-400 hover:text-ink dark:hover:text-white hover:scale-105 active:scale-95 transition cursor-pointer"
                title="Lagu Sebelumnya"
              >
                <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              </button>

              {/* Circular Play / Pause (Spotify Signature Button) */}
              <button
                onClick={togglePlayPause}
                className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-full bg-ink dark:bg-white text-canvas dark:text-black hover:scale-105 active:scale-95 flex items-center justify-center shadow-lg transition-transform cursor-pointer"
                title={isPlaying ? "Jeda" : "Putar"}
              >
                {isBuffering ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                ) : (
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current translate-x-0.5" />
                )}
              </button>

              {/* Next */}
              <button
                onClick={nextTrack}
                className="p-1.5 sm:p-2 text-ink-muted dark:text-zinc-400 hover:text-ink dark:hover:text-white hover:scale-105 active:scale-95 transition cursor-pointer"
                title="Lagu Berikutnya"
              >
                <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              </button>

              {/* Repeat / Loop (Desktop only) */}
              <button
                onClick={toggleLoop}
                className={`hidden sm:flex relative p-2 text-ink-muted dark:text-zinc-400 hover:text-ink dark:hover:text-white transition cursor-pointer ${
                  isLoop ? "text-[#1ed760] hover:text-[#1ed760] dark:text-[#1ed760] dark:hover:text-[#1ed760]" : ""
                }`}
                title={isLoop ? "Ulangi Lagu Aktif" : "Ulangi Lagu"}
              >
                <Repeat className="w-4 h-4" />
                {isLoop && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#1ed760] rounded-full" />
                )}
              </button>
            </div>

            {/* Desktop Scrubber Timeline */}
            <div className="hidden sm:flex items-center gap-2.5 w-full mt-1">
              <span className="text-[11px] text-ink-muted dark:text-zinc-400 font-mono w-10 text-right shrink-0">
                {formatTime(isScrubbing ? scrubValue : currentTime)}
              </span>

              {/* Spotify Interactive Track Slider */}
              <div className="relative flex-1 flex items-center group py-2">
                <input
                  type="range"
                  min={0}
                  max={duration || currentTrack?.durationSec || 100}
                  step={0.5}
                  value={isScrubbing ? scrubValue : currentTime}
                  onMouseDown={() => setIsScrubbing(true)}
                  onTouchStart={() => setIsScrubbing(true)}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setScrubValue(val);
                    if (!isScrubbing) seek(val);
                  }}
                  onMouseUp={() => {
                    seek(scrubValue);
                    setIsScrubbing(false);
                  }}
                  onTouchEnd={() => {
                    seek(scrubValue);
                    setIsScrubbing(false);
                  }}
                  className="w-full h-1 bg-black/15 dark:bg-white/20 rounded-full appearance-none cursor-pointer accent-[#1ed760] group-hover:h-1.5 transition-all"
                  aria-label="Progress Waktu"
                />
              </div>

              <span className="text-[11px] text-ink-muted dark:text-zinc-400 font-mono w-10 text-left shrink-0">
                {formatTime(duration || currentTrack?.durationSec || 0)}
              </span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 3. RIGHT COLUMN: Speed, Playlist Link & Volume Controls   */}
          {/* ========================================================= */}
          <div className="flex items-center justify-end gap-2 sm:gap-3 w-[25%] sm:w-[30%] lg:w-[30%]">
            {/* Speed Badge Button */}
            <button
              onClick={cyclePlaybackSpeed}
              className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                playbackSpeed !== 1.0
                  ? "bg-[#1ed760] text-black border-[#1ed760] shadow-sm shadow-[#1ed760]/40"
                  : "bg-canvas dark:bg-white/5 border-hairline dark:border-white/10 text-ink-muted dark:text-zinc-300 hover:text-ink dark:hover:text-white"
              }`}
              title="Kecepatan Putar (Speed Up)"
            >
              <Zap className="w-3 h-3" />
              <span>{playbackSpeed}x</span>
            </button>

            {/* Quick Playlist Page Link */}
            {!isHiburanPage && (
              <Link
                href="/hiburan"
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-canvas dark:bg-white/5 hover:bg-parchment dark:hover:bg-white/10 border border-hairline dark:border-white/10 text-ink-muted dark:text-zinc-300 hover:text-ink dark:hover:text-white text-xs font-semibold transition cursor-pointer"
                title="Buka Playlist Spotify"
              >
                <Music className="w-3.5 h-3.5 text-[#1ed760]" />
                <span className="hidden xl:inline">Spotify Hits</span>
              </Link>
            )}

            {/* Volume Control (Desktop only) */}
            <div className="hidden lg:flex items-center gap-2 group relative">
              <button
                onClick={toggleMute}
                className="text-ink-muted dark:text-zinc-400 hover:text-ink dark:hover:text-white transition cursor-pointer p-1"
                title={isMuted ? "Bunyikan" : "Bisukan"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-500" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-16 xl:w-24 h-1 bg-black/15 dark:bg-white/20 rounded-full appearance-none cursor-pointer accent-[#1ed760] group-hover:h-1.5 transition-all"
                aria-label="Pengatur Volume"
              />
            </div>

            {/* Minimize / Down Arrow */}
            <button
              onClick={toggleMinimize}
              className="p-1.5 rounded-full text-ink-muted dark:text-zinc-400 hover:text-ink dark:hover:text-white hover:bg-canvas dark:hover:bg-white/10 transition cursor-pointer"
              title="Perkecil Player"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>
    </>
  );
}
