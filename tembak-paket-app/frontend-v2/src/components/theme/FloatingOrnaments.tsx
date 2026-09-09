'use client';

import React, { useEffect, useState } from 'react';

export interface OrnamentConfig {
  enabled: boolean;
  particle_svgs?: string[];
  particle_count_desktop?: number;
  particle_count_mobile?: number;
  speed?: 'slow' | 'medium' | 'fast';
}

interface Particle {
  id: number;
  svgUrl: string;
  left: number;
  size: number;
  duration: number;
  delay: number;
  rotation: number;
  drift: number;
}

export function FloatingOrnaments({ config }: { config?: OrnamentConfig }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (!config || !config.enabled || !config.particle_svgs || config.particle_svgs.length === 0) {
      setParticles([]);
      return;
    }

    // Respect user's accessibility choice
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setParticles([]);
      return;
    }

    const isMobile = window.innerWidth < 640;
    const count = isMobile
      ? (config.particle_count_mobile || 5)
      : (config.particle_count_desktop || 12);

    const baseDuration = config.speed === 'fast' ? 7 : config.speed === 'medium' ? 10 : 14;

    const generated: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      svgUrl: config.particle_svgs![i % config.particle_svgs!.length],
      left: Math.round(Math.random() * 92 + 4), // 4% to 96% of screen
      size: Math.round(Math.random() * 12 + 18), // 18px to 30px
      duration: Math.round((baseDuration + Math.random() * 6) * 10) / 10,
      delay: Math.round(Math.random() * 8 * 10) / 10,
      rotation: Math.round(Math.random() * 360),
      drift: Math.round((Math.random() - 0.5) * 40),
    }));

    setParticles(generated);
  }, [config]);

  if (!mounted || !config?.enabled || particles.length === 0) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-30"
      aria-hidden="true"
    >
      {particles.map((p) => (
        <img
          key={p.id}
          src={p.svgUrl}
          alt=""
          className="absolute will-change-transform opacity-35 dark:opacity-25 select-none"
          style={{
            left: `${p.left}%`,
            top: '-35px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            animation: `floatingDriftDown ${p.duration}s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}

      <style jsx global>{`
        @keyframes floatingDriftDown {
          0% {
            transform: translateY(-35px) rotate(0deg) translateX(0);
            opacity: 0;
          }
          15% {
            opacity: 0.4;
          }
          85% {
            opacity: 0.4;
          }
          100% {
            transform: translateY(105vh) rotate(360deg) translateX(24px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
