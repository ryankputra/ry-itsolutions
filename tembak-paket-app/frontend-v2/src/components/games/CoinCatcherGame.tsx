"use client";
import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import Swal from "@/lib/sweetalert";
import { playCoinClaimSound, playPopSound, playDingSound } from "@/lib/soundFx";
import { safeJson } from "@/lib/api";
import { useApp } from "@/lib/store";

interface CoinCatcherProps {
  canPlay: boolean;
  onCoinsClaimed: (newBalance: number) => void;
}

export default function CoinCatcherGame({ canPlay, onCoinsClaimed }: CoinCatcherProps) {
  const { user, setUser } = useApp();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(30);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [wonCoins, setWonCoins] = useState<number | null>(null);

  // References for render loop
  const animFrameRef = useRef<number | null>(null);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const timeRef = useRef(30);

  // Catcher Basket position (X coordinate center)
  const basketXRef = useRef(180);
  const basketWidth = 64;

  // Falling Items (coins, gems, bombs)
  const itemsRef = useRef<
    Array<{
      x: number;
      y: number;
      speed: number;
      type: "coin" | "gem" | "bomb";
      size: number;
    }>
  >([]);

  const startGame = () => {
    if (!canPlay || claimed) return;
    playPopSound();
    basketXRef.current = 180;
    itemsRef.current = [];
    scoreRef.current = 0;
    livesRef.current = 3;
    timeRef.current = 30;

    setScore(0);
    setLives(3);
    setTimeLeft(30);
    setGameState("playing");
  };

  // Timer Countdown Effect
  useEffect(() => {
    if (gameState !== "playing") return;

    const interval = setInterval(() => {
      timeRef.current -= 1;
      setTimeLeft(timeRef.current);

      if (timeRef.current <= 0) {
        setGameState("gameover");
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState]);

  // Handle Touch / Mouse movement
  const handlePointerMove = (clientX: number) => {
    if (gameState !== "playing" || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const scale = canvasRef.current.width / rect.width;
    const canvasX = relativeX * scale;

    basketXRef.current = Math.max(basketWidth / 2, Math.min(canvasRef.current.width - basketWidth / 2, canvasX));
  };

  // Keyboard Arrow controls
  useEffect(() => {
    if (gameState !== "playing") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        basketXRef.current = Math.max(basketWidth / 2, basketXRef.current - 24);
      } else if (e.key === "ArrowRight") {
        basketXRef.current = Math.min(360 - basketWidth / 2, basketXRef.current + 24);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState]);

  // Main Canvas Loop
  useEffect(() => {
    if (gameState !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameCount = 0;
    const width = canvas.width;
    const height = canvas.height;

    const loop = () => {
      frameCount++;
      ctx.clearRect(0, 0, width, height);

      // 1. Cyber Dark Background
      ctx.fillStyle = "#0F172A";
      ctx.fillRect(0, 0, width, height);

      // Grid Lines
      ctx.strokeStyle = "rgba(51, 65, 85, 0.4)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // 2. Spawn Items (Coins, Gems, Bombs)
      if (frameCount % 24 === 0) {
        const randType = Math.random();
        let type: "coin" | "gem" | "bomb" = "coin";
        if (randType > 0.82) type = "bomb";
        else if (randType > 0.65) type = "gem";

        itemsRef.current.push({
          x: 20 + Math.random() * (width - 40),
          y: -15,
          speed: 2.2 + Math.random() * 2.5,
          type,
          size: type === "gem" ? 12 : type === "bomb" ? 14 : 11,
        });
      }

      // 3. Render Catcher Basket
      const basketX = basketXRef.current;
      const basketY = height - 30;

      // Catcher — 3D hover-bot: lit from upper-left, shadow below
      // Ground shadow
      ctx.fillStyle = "rgba(2, 6, 23, 0.45)";
      ctx.beginPath();
      ctx.ellipse(basketX, basketY + 20, 30, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glow under basket
      const basketGlow = ctx.createRadialGradient(basketX, basketY, 4, basketX, basketY, 35);
      basketGlow.addColorStop(0, "rgba(16, 185, 129, 0.6)");
      basketGlow.addColorStop(1, "rgba(16, 185, 129, 0)");
      ctx.fillStyle = basketGlow;
      ctx.beginPath();
      ctx.arc(basketX, basketY, 35, 0, Math.PI * 2);
      ctx.fill();

      const drawRoundRect = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
        if (typeof c.roundRect === "function") {
          c.roundRect(x, y, w, h, r);
        } else {
          c.beginPath();
          c.moveTo(x + r, y);
          c.arcTo(x + w, y, x + w, y + h, r);
          c.arcTo(x + w, y + h, x, y + h, r);
          c.arcTo(x, y + h, x, y, r);
          c.arcTo(x, y, x + w, y, r);
          c.closePath();
        }
      };

      // Hover thrusters (behind body, glowing down)
      [basketX - basketWidth / 2 + 8, basketX + basketWidth / 2 - 8].forEach((tx) => {
        const flame = 4 + Math.sin(frameCount * 0.3 + tx) * 2;
        const tg = ctx.createLinearGradient(tx, basketY + 6, tx, basketY + 22);
        tg.addColorStop(0, "rgba(254, 240, 138, 0.9)");
        tg.addColorStop(1, "rgba(245, 158, 11, 0)");
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.moveTo(tx - flame, basketY + 8);
        ctx.lineTo(tx + flame, basketY + 8);
        ctx.lineTo(tx, basketY + 8 + flame * 2.5);
        ctx.closePath();
        ctx.fill();
      });

      // Body shell with vertical light gradient
      const bodyGrad = ctx.createLinearGradient(basketX, basketY - 16, basketX, basketY + 12);
      bodyGrad.addColorStop(0, "#6EE7B7");
      bodyGrad.addColorStop(0.45, "#10B981");
      bodyGrad.addColorStop(1, "#065F46");
      ctx.fillStyle = bodyGrad;
      drawRoundRect(ctx, basketX - basketWidth / 2, basketY - 4, basketWidth, 18, 8);
      ctx.fill();

      // Bottom rim (open catcher lip, front-facing)
      ctx.fillStyle = "#064E3B";
      drawRoundRect(ctx, basketX - basketWidth / 2, basketY + 10, basketWidth, 5, 2.5);
      ctx.fill();

      // Top catch-tray inner shadow (concave opening)
      ctx.fillStyle = "rgba(2, 6, 23, 0.45)";
      drawRoundRect(ctx, basketX - basketWidth / 2 + 4, basketY - 2, basketWidth - 8, 4, 2);
      ctx.fill();

      // Top highlight strip
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      drawRoundRect(ctx, basketX - basketWidth / 2 + 6, basketY - 3, basketWidth - 20, 1.5, 1);
      ctx.fill();

      // Antenna with blinking light
      ctx.strokeStyle = "#34D399";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(basketX + basketWidth / 2 - 6, basketY - 4);
      ctx.lineTo(basketX + basketWidth / 2 - 6, basketY - 14);
      ctx.stroke();
      const blink = Math.sin(frameCount * 0.15) > 0.3 ? 1 : 0.25;
      ctx.fillStyle = `rgba(254, 240, 138, ${blink})`;
      ctx.beginPath();
      ctx.arc(basketX + basketWidth / 2 - 6, basketY - 15, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Visor eyes (two glowing sensors)
      [-9, 9].forEach((ex) => {
        const eyeGrad = ctx.createRadialGradient(basketX + ex - 1, basketY + 3, 0.5, basketX + ex, basketY + 4, 5);
        eyeGrad.addColorStop(0, "#FFFFFF");
        eyeGrad.addColorStop(0.4, "#6EE7B7");
        eyeGrad.addColorStop(1, "#047857");
        ctx.fillStyle = eyeGrad;
        ctx.beginPath();
        ctx.arc(basketX + ex, basketY + 4, 4, 0, Math.PI * 2);
        ctx.fill();
        // Pupil tracks nearest falling item
        const target = itemsRef.current.find((it) => Math.abs(it.x - (basketX + ex)) < 40 && it.y < basketY);
        const px = target ? Math.max(-1.5, Math.min(1.5, (target.x - (basketX + ex)) * 0.1)) : 0;
        const py = target ? Math.max(-1, Math.min(1, (target.y - (basketY + 4)) * 0.03)) : 0;
        ctx.fillStyle = "#022C22";
        ctx.beginPath();
        ctx.arc(basketX + ex + px, basketY + 4 + py, 1.6, 0, Math.PI * 2);
        ctx.fill();
      });

      // 4. Update & Render Falling Items
      const items = itemsRef.current;
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        item.y += item.speed;

        // Draw Items
        if (item.type === "coin") {
          // Golden Coin — spinning 3D cylinder
          ctx.save();
          ctx.translate(item.x, item.y);
          // Drop shadow
          ctx.fillStyle = "rgba(2, 6, 23, 0.4)";
          ctx.beginPath();
          ctx.ellipse(1.5, item.size + 3, item.size, item.size * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();
          // Rim (edge of cylinder, darker)
          ctx.fillStyle = "#B45309";
          ctx.beginPath();
          ctx.ellipse(0, 2, item.size, item.size * 0.42, 0, 0, Math.PI * 2);
          ctx.fill();
          // Face — spin squashes horizontally to fake rotation
          const spin = Math.sin(frameCount * 0.12 + item.x * 0.5);
          const faceW = Math.max(2.5, item.size * Math.abs(spin));
          const faceGrad = ctx.createLinearGradient(0, -item.size, 0, item.size);
          faceGrad.addColorStop(0, "#FEF08A");
          faceGrad.addColorStop(0.5, "#F59E0B");
          faceGrad.addColorStop(1, "#B45309");
          ctx.fillStyle = faceGrad;
          ctx.beginPath();
          ctx.ellipse(0, -1, faceW, item.size * 0.42, 0, 0, Math.PI * 2);
          ctx.fill();
          // Rim highlight arc
          ctx.strokeStyle = "rgba(254, 240, 138, 0.7)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(0, -1, faceW * 0.7, item.size * 0.3, 0, Math.PI * 1.2, Math.PI * 1.8);
          ctx.stroke();
          // "R" emboss only when face is near full
          if (Math.abs(spin) > 0.55) {
            ctx.fillStyle = "#FEF08A";
            ctx.font = "bold 9px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("R", 0, -1);
          }
          ctx.restore();
        } else if (item.type === "gem") {
          // Diamond Gem — faceted 3D crystal
          ctx.save();
          ctx.translate(item.x, item.y);
          const r = item.size;
          // Drop shadow
          ctx.fillStyle = "rgba(2, 6, 23, 0.4)";
          ctx.beginPath();
          ctx.ellipse(1, r + 2, r * 0.8, r * 0.25, 0, 0, Math.PI * 2);
          ctx.fill();
          // Lower pavilion (bottom cone, darker facet)
          ctx.fillStyle = "#0E7490";
          ctx.beginPath();
          ctx.moveTo(-r * 0.7, 0);
          ctx.lineTo(r * 0.7, 0);
          ctx.lineTo(0, r);
          ctx.closePath();
          ctx.fill();
          // Crown left facet
          ctx.fillStyle = "#22D3EE";
          ctx.beginPath();
          ctx.moveTo(-r * 0.7, 0);
          ctx.lineTo(0, -r);
          ctx.lineTo(-r * 0.25, 0);
          ctx.closePath();
          ctx.fill();
          // Crown right facet
          ctx.fillStyle = "#0891B2";
          ctx.beginPath();
          ctx.moveTo(r * 0.7, 0);
          ctx.lineTo(0, -r);
          ctx.lineTo(r * 0.25, 0);
          ctx.closePath();
          ctx.fill();
          // Center table facet (brightest, top view)
          ctx.fillStyle = "#CFFAFE";
          ctx.beginPath();
          ctx.moveTo(-r * 0.25, 0);
          ctx.lineTo(0, -r);
          ctx.lineTo(r * 0.25, 0);
          ctx.closePath();
          ctx.fill();
          // Top vertex sparkle
          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath();
          ctx.arc(0, -r * 0.75, 1.5, 0, Math.PI * 2);
          ctx.fill();
          // Girdle line separating crown/pavilion
          ctx.strokeStyle = "rgba(207, 250, 254, 0.6)";
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(-r * 0.7, 0);
          ctx.lineTo(r * 0.7, 0);
          ctx.stroke();
          ctx.restore();
        } else {
          // Red Bomb — 3D sphere with shading
          ctx.save();
          ctx.translate(item.x, item.y);
          const br = item.size;
          // Drop shadow
          ctx.fillStyle = "rgba(2, 6, 23, 0.4)";
          ctx.beginPath();
          ctx.ellipse(1.5, br + 2, br * 0.85, br * 0.28, 0, 0, Math.PI * 2);
          ctx.fill();
          // Sphere body with radial light gradient
          const bombGrad = ctx.createRadialGradient(-br * 0.3, -br * 0.35, br * 0.1, 0, 0, br);
          bombGrad.addColorStop(0, "#FCA5A5");
          bombGrad.addColorStop(0.35, "#EF4444");
          bombGrad.addColorStop(1, "#7F1D1D");
          ctx.fillStyle = bombGrad;
          ctx.beginPath();
          ctx.arc(0, 0, br, 0, Math.PI * 2);
          ctx.fill();
          // Specular highlight
          ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
          ctx.beginPath();
          ctx.ellipse(-br * 0.35, -br * 0.4, br * 0.28, br * 0.16, -0.6, 0, Math.PI * 2);
          ctx.fill();
          // Bottom ambient occlusion
          ctx.fillStyle = "rgba(2, 6, 23, 0.35)";
          ctx.beginPath();
          ctx.ellipse(0, br * 0.55, br * 0.7, br * 0.28, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Fuse cap on top of sphere
          ctx.fillStyle = "#78350F";
          ctx.beginPath();
          ctx.rect(item.x - 3, item.y - item.size - 2, 6, 4);
          ctx.fill();

          // Fuse — sputtering spark
          ctx.strokeStyle = "#F59E0B";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(item.x, item.y - item.size - 2);
          ctx.lineTo(item.x + 4, item.y - item.size - 5);
          ctx.stroke();
          // Spark glow at fuse tip
          const sparkFlick = 1.5 + Math.sin(frameCount * 0.5 + item.x) * 1;
          ctx.fillStyle = "#FEF08A";
          ctx.beginPath();
          ctx.arc(item.x + 4, item.y - item.size - 5, sparkFlick, 0, Math.PI * 2);
          ctx.fill();
        }

        // Collision Check with Basket
        const hitX = Math.abs(item.x - basketX) < basketWidth / 2 + 6;
        const hitY = item.y + item.size >= basketY && item.y - item.size <= basketY + 14;

        if (hitX && hitY) {
          if (item.type === "coin") {
            scoreRef.current += 1;
            setScore(scoreRef.current);
            playDingSound();
          } else if (item.type === "gem") {
            scoreRef.current += 3;
            setScore(scoreRef.current);
            playDingSound();
          } else if (item.type === "bomb") {
            livesRef.current -= 1;
            setLives(livesRef.current);
            playPopSound();

            if (livesRef.current <= 0) {
              setGameState("gameover");
              return;
            }
          }
          items.splice(i, 1);
          continue;
        }

        // Missed item off bottom of screen
        if (item.y - item.size > height) {
          items.splice(i, 1);
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState]);

  // Submit Score to Backend
  const handleClaimCoins = async () => {
    if (claiming || claimed) return;
    setClaiming(true);

    try {
      const res = await fetch("/api/games/coin-catcher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ score: scoreRef.current }),
      });

      const data = await safeJson(res);
      if (data?.status) {
        playCoinClaimSound();
        setClaimed(true);
        setWonCoins(data.coins_earned);
        if (user) {
          setUser({ ...user, coins: data.new_coins_balance });
        }
        onCoinsClaimed(data.new_coins_balance);

        Swal.fire({
          icon: "success",
          title: "Koin Berhasil Diklaim!",
          text: data.message,
          confirmButtonColor: "#10B981",
          confirmButtonText: "Kumpulkan Koin",
          timer: 3000,
          timerProgressBar: true,
        });
      } else {
        Swal.fire({
          icon: "info",
          title: "Perhatian",
          text: data.message || "Gagal mengklaim koin.",
        });
      }
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Terjadi kesalahan koneksi.",
      });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-2 space-y-3 select-none">
      {/* Game Canvas Container */}
      <div
        className="relative w-full max-w-sm h-80 rounded-3xl overflow-hidden shadow-2xl border-4 border-emerald-500/30 bg-slate-950 touch-none"
        onMouseMove={(e) => handlePointerMove(e.clientX)}
        onTouchMove={(e) => {
          if (e.touches[0]) handlePointerMove(e.touches[0].clientX);
        }}
      >
        <canvas ref={canvasRef} width={360} height={320} className="w-full h-full block" />

        {/* Top HUD */}
        {gameState === "playing" && (
          <div className="absolute top-3 left-4 right-4 flex items-center justify-between pointer-events-none">
            {/* Lives */}
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-slate-900/80 border border-emerald-500/30 text-white font-extrabold text-xs">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className={`w-2.5 h-2.5 rounded-full ${i < lives ? "bg-emerald-400" : "bg-slate-600"}`} />
              ))}
              <span className="ml-1 text-[11px] text-slate-300">{timeLeft}s</span>
            </div>

            {/* Score */}
            <div className="px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 font-black text-sm flex items-center gap-1 shadow-md">
              <span>+</span>
              <span>{score} Ditangkap</span>
            </div>
          </div>
        )}

        {/* Start Screen */}
        {gameState === "idle" && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 shadow-lg animate-bounce">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <div>
              <h3 className="font-extrabold text-base text-white">Tangkap Koin Arcade</h3>
              <p className="text-xs text-slate-300 mt-1 max-w-xs">
                Geser wadah ke kiri &amp; kanan untuk menangkap koin emas &amp; gem bonus. Hindari bom merah!
              </p>
            </div>

            <Button
              onClick={startGame}
              disabled={!canPlay || claimed}
              className="px-6 h-11 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-xl"
            >
              {!canPlay || claimed ? "Tiket Hari Ini Habis" : "Mulai Main Sekarang"}
            </Button>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === "gameover" && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-3.5 animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">SELESAI</span>
              <h3 className="text-lg font-black text-white">Koin Ditangkap: {score}</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {score > 0 ? "Permainan hebat! Klaim koin Anda di bawah." : "Waktu habis atau terkena bom!"}
              </p>
            </div>

            {claimed ? (
              <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                +{wonCoins || 0} Koin Ry telah masuk ke dompet Anda!
              </div>
            ) : (
              <div className="space-y-2 w-full max-w-xs">
                <Button
                  onClick={handleClaimCoins}
                  isLoading={claiming}
                  className="w-full h-11 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs shadow-xl"
                >
                  Klaim Koin Ry Ditangkap
                </Button>

                <button
                  type="button"
                  onClick={startGame}
                  className="text-[11px] font-bold text-slate-400 hover:text-white underline"
                >
                  Main Ulang (Latihan)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
