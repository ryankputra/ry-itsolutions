"use client";
import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import Swal from "@/lib/sweetalert";
import { playCoinClaimSound, playPopSound, playDingSound } from "@/lib/soundFx";
import { safeJson } from "@/lib/api";
import { useApp } from "@/lib/store";

interface FlappyCyberProps {
  canPlay: boolean;
  onCoinsClaimed: (newBalance: number) => void;
}

export default function FlappyCyberGame({ canPlay, onCoinsClaimed }: FlappyCyberProps) {
  const { user, setUser } = useApp();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<"idle" | "ready" | "playing" | "gameover">("idle");
  const [score, setScore] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [wonCoins, setWonCoins] = useState<number | null>(null);

  // Game loop references
  const animFrameRef = useRef<number | null>(null);
  const scoreRef = useRef(0);

  // Drone & Physics state
  const droneRef = useRef({
    x: 50,
    y: 150,
    vy: 0,
    gravity: 0.38,
    jump: -6.5,
    size: 24,
  });

  const obstaclesRef = useRef<
    Array<{
      x: number;
      topHeight: number;
      bottomHeight: number;
      passed: boolean;
      coinY: number;
      coinCollected: boolean;
    }>
  >([]);

  const starsRef = useRef<Array<{ x: number; y: number; speed: number; size: number }>>([]);

  // Initialize stars background
  useEffect(() => {
    const stars = [];
    for (let i = 0; i < 30; i++) {
      stars.push({
        x: Math.random() * 360,
        y: Math.random() * 400,
        speed: 0.3 + Math.random() * 0.7,
        size: Math.random() * 2 + 1,
      });
    }
    starsRef.current = stars;
  }, []);

  const startGame = () => {
    if (!canPlay || claimed) return;
    playPopSound();
    droneRef.current = {
      x: 50,
      y: 150,
      vy: 0,
      gravity: 0.38,
      jump: -6.5,
      size: 24,
    };
    obstaclesRef.current = [];
    scoreRef.current = 0;
    setScore(0);
    setGameState("ready");
  };

  const handleJump = () => {
    if (gameState === "ready") {
      playPopSound();
      droneRef.current.vy = droneRef.current.jump;
      setGameState("playing");
    } else if (gameState === "playing") {
      playPopSound();
      droneRef.current.vy = droneRef.current.jump;
    }
  };

  // Keyboard controls (Space or ArrowUp)
  useEffect(() => {
    if (gameState !== "playing" && gameState !== "ready") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        handleJump();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState]);

  // Main Canvas Render Loop
  useEffect(() => {
    if (gameState !== "playing" && gameState !== "ready") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameCount = 0;
    const width = canvas.width;
    const height = canvas.height;
    const gap = 110;

    const loop = () => {
      frameCount++;
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Cyber Dark Space Background
      ctx.fillStyle = "#0B0F19";
      ctx.fillRect(0, 0, width, height);

      // Draw Starfield
      ctx.fillStyle = "#ffffff";
      starsRef.current.forEach((star) => {
        star.x -= star.speed;
        if (star.x < 0) star.x = width;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      const drone = droneRef.current;

      if (gameState === "ready") {
        // Hovering gently in place before player's first tap
        drone.y = 150 + Math.sin(frameCount * 0.08) * 8;
        drone.vy = 0;
      } else {
        // 2. Update Drone Physics
        drone.vy += drone.gravity;
        drone.y += drone.vy;

        // Floor & Ceiling Collision
        if (drone.y + drone.size / 2 >= height - 20 || drone.y - drone.size / 2 <= 0) {
          setGameState("gameover");
          return;
        }
      }

      // Draw Drone (Cyber Mascot with Glowing Ring)
      ctx.save();
      ctx.translate(drone.x, drone.y);
      const angle = gameState === "ready" ? 0 : Math.min(Math.PI / 4, Math.max(-Math.PI / 4, drone.vy * 0.08));
      ctx.rotate(angle);

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

      // 3D Drone: lights everything from upper-left
      // Ground shadow (sells altitude, offset opposite to light)
      ctx.fillStyle = "rgba(2, 6, 23, 0.45)";
      ctx.beginPath();
      ctx.ellipse(2, 20, 20, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Drone Glow
      const glowGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
      glowGrad.addColorStop(0, "rgba(59, 130, 246, 0.8)");
      glowGrad.addColorStop(1, "rgba(59, 130, 246, 0)");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fill();

      // Armature crossbar (behind body, reads as depth)
      ctx.fillStyle = "#1D4ED8";
      drawRoundRect(ctx, -17, -2, 34, 5, 2.5);
      ctx.fill();
      // Armature top highlight
      ctx.fillStyle = "#3B82F6";
      drawRoundRect(ctx, -17, -2, 34, 1.5, 1);
      ctx.fill();

      // Rotor mounts at each arm tip
      [-17, 17].forEach((ax) => {
        ctx.fillStyle = "#1E3A8A";
        ctx.beginPath();
        ctx.arc(ax, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Drone Body — vertical gradient fakes a lit 3D shell
      const bodyGrad = ctx.createLinearGradient(0, -11, 0, 11);
      bodyGrad.addColorStop(0, "#60A5FA");
      bodyGrad.addColorStop(0.45, "#2563EB");
      bodyGrad.addColorStop(1, "#1E3A8A");
      ctx.fillStyle = bodyGrad;
      drawRoundRect(ctx, -12, -9, 24, 18, 7);
      ctx.fill();

      // Bottom ambient occlusion
      ctx.fillStyle = "rgba(2, 6, 23, 0.35)";
      drawRoundRect(ctx, -12, 4, 24, 6, 5);
      ctx.fill();

      // Body specular sheen
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      drawRoundRect(ctx, -9, -7, 14, 3, 1.5);
      ctx.fill();

      // Cyber Visor — glass cockpit, spherical highlight
      const visorGrad = ctx.createLinearGradient(0, -6, 0, 6);
      visorGrad.addColorStop(0, "#7DD3FC");
      visorGrad.addColorStop(0.5, "#38BDF8");
      visorGrad.addColorStop(1, "#0369A1");
      ctx.fillStyle = visorGrad;
      drawRoundRect(ctx, -1, -6, 11, 12, 4);
      ctx.fill();
      // Visor glare
      ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
      drawRoundRect(ctx, 1, -4.5, 3, 4, 1.5);
      ctx.fill();
      // Visor scanline
      ctx.fillStyle = "rgba(2, 6, 23, 0.3)";
      drawRoundRect(ctx, -1, 1, 11, 1.5, 0.75);
      ctx.fill();

      // Spinning rotors: 2 blades with spin blur, for each mount
      [-17, 17].forEach((ax) => {
        const spin = frameCount * 0.9 + (ax < 0 ? 0 : Math.PI);
        // Spinning blade arc
        ctx.save();
        ctx.translate(ax, -4);
        ctx.rotate(spin);
        ctx.fillStyle = "rgba(148, 163, 184, 0.45)";
        ctx.beginPath();
        ctx.ellipse(7, 0, 7, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(148, 163, 184, 0.45)";
        ctx.beginPath();
        ctx.ellipse(-7, 0, 7, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // Rotor dome
        ctx.fillStyle = "#334155";
        ctx.beginPath();
        ctx.arc(ax, -4, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#94A3B8";
        ctx.beginPath();
        ctx.arc(ax - 0.6, -4.6, 0.7, 0, Math.PI * 2);
        ctx.fill();
        // Motion ring when airborne
        if (gameState === "playing") {
          ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(ax, -4, 8, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // Thruster Trail (flame gradient + glow)
      const thrusterPulse = 4 + Math.sin(frameCount * 0.3) * 2;
      const flameGrad = ctx.createLinearGradient(-26, 0, -8, 0);
      flameGrad.addColorStop(0, "rgba(239, 68, 68, 0)");
      flameGrad.addColorStop(0.5, "#F59E0B");
      flameGrad.addColorStop(1, "#FEF08A");
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.moveTo(-8, -thrusterPulse);
      ctx.quadraticCurveTo(-20, 0, -8, thrusterPulse);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      if (gameState === "playing") {
        // 3. Spawn Obstacles
        if (frameCount % 90 === 0) {
          const topH = Math.floor(Math.random() * (height - gap - 90)) + 30;
          const botH = height - topH - gap;
          obstaclesRef.current.push({
            x: width,
            topHeight: topH,
            bottomHeight: botH,
            passed: false,
            coinY: topH + gap / 2,
            coinCollected: false,
          });
        }

        // 4. Update & Render Obstacles & Coins
        const obstacles = obstaclesRef.current;
        for (let i = obstacles.length - 1; i >= 0; i--) {
          const obs = obstacles[i];
          obs.x -= 2.2;

          // Draw Obstacles (Neon Cyber Pillars)
          ctx.fillStyle = "#1E293B";
          ctx.strokeStyle = "#3B82F6";
          ctx.lineWidth = 2;

          // Top Pillar
          ctx.fillRect(obs.x, 0, 44, obs.topHeight);
          ctx.strokeRect(obs.x, 0, 44, obs.topHeight);

          // Bottom Pillar
          const botY = height - obs.bottomHeight;
          ctx.fillRect(obs.x, botY, 44, obs.bottomHeight);
          ctx.strokeRect(obs.x, botY, 44, obs.bottomHeight);

          // Draw Coin if not collected
          if (!obs.coinCollected) {
            const coinX = obs.x + 22;
            const coinY = obs.coinY;

            ctx.save();
            ctx.translate(coinX, coinY);
            // Drop shadow
            ctx.fillStyle = "rgba(2, 6, 23, 0.4)";
            ctx.beginPath();
            ctx.ellipse(1.5, 13, 10, 3, 0, 0, Math.PI * 2);
            ctx.fill();
            // Rim (cylinder edge)
            ctx.fillStyle = "#B45309";
            ctx.beginPath();
            ctx.ellipse(0, 2, 10, 4.2, 0, 0, Math.PI * 2);
            ctx.fill();
            // Face — horizontal squash fakes spin
            const spin = Math.sin(frameCount * 0.12 + coinX * 0.5);
            const faceW = Math.max(2.5, 10 * Math.abs(spin));
            const faceGrad = ctx.createLinearGradient(0, -10, 0, 10);
            faceGrad.addColorStop(0, "#FEF08A");
            faceGrad.addColorStop(0.5, "#F59E0B");
            faceGrad.addColorStop(1, "#B45309");
            ctx.fillStyle = faceGrad;
            ctx.beginPath();
            ctx.ellipse(0, -1, faceW, 4.2, 0, 0, Math.PI * 2);
            ctx.fill();
            // Rim highlight arc
            ctx.strokeStyle = "rgba(254, 240, 138, 0.7)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(0, -1, faceW * 0.7, 3, 0, Math.PI * 1.2, Math.PI * 1.8);
            ctx.stroke();
            // "R" only when face near full
            if (Math.abs(spin) > 0.55) {
              ctx.fillStyle = "#FEF08A";
              ctx.font = "bold 10px sans-serif";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText("R", 0, -1);
            }
            ctx.restore();

            // Coin Collection Check
            const dist = Math.hypot(drone.x - coinX, drone.y - coinY);
            if (dist < 22) {
              obs.coinCollected = true;
              scoreRef.current += 1;
              setScore(scoreRef.current);
              playDingSound();
            }
          }

          // Collision Check with Pillars
          const obsWidth = 44;
          if (
            drone.x + 10 > obs.x &&
            drone.x - 10 < obs.x + obsWidth &&
            (drone.y - 10 < obs.topHeight || drone.y + 10 > height - obs.bottomHeight)
          ) {
            setGameState("gameover");
            return;
          }

          // Remove offscreen obstacles
          if (obs.x + obsWidth < 0) {
            obstacles.splice(i, 1);
          }
        }
      }

      // Draw Floor Line
      ctx.fillStyle = "#1E293B";
      ctx.fillRect(0, height - 20, width, 20);
      ctx.fillStyle = "#3B82F6";
      ctx.fillRect(0, height - 20, width, 2);

      // Draw pulsing instruction overlay when in READY state
      if (gameState === "ready") {
        ctx.save();
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.fillRect(30, height / 2 + 15, width - 60, 52);
        ctx.strokeStyle = "#3B82F6";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(30, height / 2 + 15, width - 60, 52);

        ctx.fillStyle = "#60A5FA";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const pulse = Math.sin(frameCount * 0.1) * 0.25 + 0.75;
        ctx.globalAlpha = pulse;
        ctx.fillText("KETUK / TEKAN SPASI UNTUK TERBANG!", width / 2, height / 2 + 41);
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState]);

  // Submit Claim to Backend
  const handleClaimCoins = async () => {
    if (claiming || claimed) return;
    setClaiming(true);

    try {
      const res = await fetch("/api/games/flappy-cyber", {
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
          confirmButtonColor: "#2563EB",
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
        className="relative w-full max-w-sm h-80 rounded-3xl overflow-hidden shadow-2xl border-4 border-blue-500/30 bg-slate-950 cursor-pointer"
        onClick={handleJump}
        onTouchStart={(e) => {
          e.preventDefault();
          handleJump();
        }}
      >
        <canvas ref={canvasRef} width={360} height={320} className="w-full h-full block" />

        {/* Top Floating HUD */}
        {(gameState === "playing" || gameState === "ready") && (
          <div className="absolute top-3 left-4 right-4 flex items-center justify-between pointer-events-none">
            <div className="px-3 py-1 rounded-full bg-slate-900/80 border border-blue-500/30 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md">
              <span className={`w-2 h-2 rounded-full ${gameState === "ready" ? "bg-amber-400" : "bg-emerald-400 animate-ping"}`} />
              <span>{gameState === "ready" ? "SIAP TERBANG" : "TERBANG"}</span>
            </div>

            <div className="px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 font-black text-sm flex items-center gap-1 shadow-md">
              <span>+</span>
              <span>{score} Koin</span>
            </div>
          </div>
        )}

        {/* Start Overlay */}
        {gameState === "idle" && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/40 shadow-lg animate-bounce">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Flappy Cyber Flyer</h3>
              <p className="text-xs text-slate-300 mt-1 max-w-xs">
                Ketuk layar atau spasi untuk menerbangkan drone, lewati rintangan &amp; kumpulkan Koin Ry!
              </p>
            </div>

            <Button
              onClick={(e) => {
                e.stopPropagation();
                startGame();
              }}
              disabled={!canPlay || claimed}
              className="px-6 h-11 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-xl"
            >
              {!canPlay || claimed ? "Tiket Hari Ini Habis" : "Mulai Terbang Sekarang"}
            </Button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === "gameover" && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-3.5 animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-400">GAME OVER</span>
              <h3 className="text-lg font-black text-white">Koin Terkumpul: {score}</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {score > 0 ? "Hasil penerbangan Anda sangat bagus!" : "Jangan menyerah, coba main lagi!"}
              </p>
            </div>

            {claimed ? (
              <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                +{wonCoins || 0} Koin Ry telah masuk ke dompet Anda!
              </div>
            ) : (
              <div className="space-y-2 w-full max-w-xs">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClaimCoins();
                  }}
                  isLoading={claiming}
                  className="w-full h-11 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs shadow-xl"
                >
                  Klaim Koin Ry Hasil Terbang
                </Button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startGame();
                  }}
                  className="text-[11px] font-bold text-slate-400 hover:text-white underline block mx-auto py-1"
                >
                  Main Ulang (Persiapan Dulu)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
