'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { API_URL } from './api';
import { FloatingOrnaments, OrnamentConfig } from '@/components/theme/FloatingOrnaments';

export interface ThemeData {
  id: string;
  name: string;
  category: string;
  description?: string;
  tokens: Record<string, string>;
  assets: {
    pattern_svg_url?: string;
    theme_badge_text?: string;
    [key: string]: any;
  };
  ornaments: OrnamentConfig;
  meta?: {
    mode: string;
    auto_schedule_enabled?: boolean;
    event_name?: string | null;
    active_momentum?: string | null;
  };
}

interface ThemeContextType {
  theme: ThemeData | null;
  isLoading: boolean;
  refreshTheme: () => Promise<void>;
  previewTheme: (customTheme: ThemeData | null) => void;
}

const defaultObsidianTheme: ThemeData = {
  id: 'default-obsidian',
  name: 'Apple Obsidian (Default)',
  category: 'default',
  tokens: {
    '--theme-primary': '#0071E3',
    '--theme-primary-hover': '#0077ED',
    '--theme-accent': '#34C759',
    '--theme-canvas': '#F5F5F7',
    '--theme-parchment': '#FFFFFF',
    '--theme-hairline': 'rgba(0, 0, 0, 0.08)',
    '--theme-header-bg': '#1D1D1F',
    '--theme-header-text': '#FFFFFF',
    '--theme-surface-glow': 'rgba(0, 113, 227, 0.08)',
    '--theme-card-border': 'rgba(0, 0, 0, 0.08)',
    '--theme-dark-canvas': '#000000',
    '--theme-dark-parchment': '#161617',
    '--theme-dark-header-bg': '#1C1C1E',
    '--theme-dark-hairline': 'rgba(255, 255, 255, 0.08)'
  },
  assets: {
    pattern_svg_url: 'none',
    theme_badge_text: 'Default'
  },
  ornaments: {
    enabled: false,
    particle_svgs: []
  },
  meta: {
    mode: 'default_fallback',
    auto_schedule_enabled: true
  }
};

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultObsidianTheme,
  isLoading: false,
  refreshTheme: async () => {},
  previewTheme: () => {}
});

export function DynamicThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeData>(defaultObsidianTheme);
  const [previewOverride, setPreviewOverride] = useState<ThemeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const activeTheme = previewOverride || theme;

  const fetchActiveTheme = async () => {
    try {
      const res = await fetch(`${API_URL}/theme/active`, {
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setTheme(json.data);
        }
      }
    } catch (err) {
      console.warn('Could not fetch active theme, using obsidian fallback:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveTheme();
    const interval = setInterval(fetchActiveTheme, 180000);
    return () => clearInterval(interval);
  }, []);

  // Compute Full Dynamic Stylesheet to transform every aspect of the website
  const dynamicCss = useMemo(() => {
    if (!activeTheme?.tokens) return '';
    const t = activeTheme.tokens;
    const isDefault = activeTheme.id === 'default-obsidian';

    const primary = t['--theme-primary'] || '#0071E3';
    const primaryHover = t['--theme-primary-hover'] || '#0077ED';
    const accent = t['--theme-accent'] || '#34C759';
    const canvas = t['--theme-canvas'] || '#F5F5F7';
    const parchment = t['--theme-parchment'] || '#FFFFFF';
    const hairline = t['--theme-hairline'] || 'rgba(0, 0, 0, 0.08)';
    const headerBg = t['--theme-header-bg'] || '#1D1D1F';
    const headerText = t['--theme-header-text'] || '#FFFFFF';
    const surfaceGlow = t['--theme-surface-glow'] || 'rgba(0, 113, 227, 0.08)';
    const cardBorder = t['--theme-card-border'] || 'rgba(0, 0, 0, 0.08)';

    const darkCanvas = t['--theme-dark-canvas'] || '#000000';
    const darkParchment = t['--theme-dark-parchment'] || '#161617';
    const darkHeaderBg = t['--theme-dark-header-bg'] || '#1C1C1E';
    const darkHairline = t['--theme-dark-hairline'] || 'rgba(255, 255, 255, 0.08)';

    if (isDefault) {
      return `
        :root {
          --color-primary: #0071E3;
          --color-primary-hover: #0077ED;
          --theme-primary: #0071E3;
          --theme-accent: #34C759;
          --theme-canvas: #F5F5F7;
          --theme-parchment: #FFFFFF;
          --theme-header-bg: #1D1D1F;
          --theme-header-text: #FFFFFF;
        }
        .dark {
          --color-primary: #2997FF;
          --color-primary-hover: #52A9FF;
        }
      `;
    }

    return `
      :root {
        --color-primary: ${primary} !important;
        --color-primary-hover: ${primaryHover} !important;
        --color-primary-focus: ${primaryHover} !important;
        --color-primary-on-dark: ${primary} !important;
        --color-canvas: ${canvas} !important;
        --color-parchment: ${parchment} !important;
        --color-surface-tile: ${headerBg} !important;
        --color-hairline: ${hairline} !important;
        --background: ${canvas} !important;
        --theme-primary: ${primary} !important;
        --theme-primary-hover: ${primaryHover} !important;
        --theme-accent: ${accent} !important;
        --theme-canvas: ${canvas} !important;
        --theme-parchment: ${parchment} !important;
        --theme-surface-glow: ${surfaceGlow} !important;
        --theme-card-border: ${cardBorder} !important;
        --theme-header-bg: ${headerBg} !important;
        --theme-header-text: ${headerText} !important;
      }

      .dark {
        --color-primary: ${primary} !important;
        --color-primary-hover: ${primaryHover} !important;
        --color-canvas: ${darkCanvas} !important;
        --color-parchment: ${darkParchment} !important;
        --color-surface-tile: ${darkHeaderBg} !important;
        --color-hairline: ${darkHairline} !important;
        --background: ${darkCanvas} !important;
        --theme-canvas: ${darkCanvas} !important;
        --theme-parchment: ${darkParchment} !important;
        --theme-header-bg: ${darkHeaderBg} !important;
      }

      /* 1. Global Page Background Transformation */
      body {
        background-color: ${canvas} !important;
        transition: background-color 0.4s ease;
      }
      .dark body {
        background-color: ${darkCanvas} !important;
      }

      html:not(.dark) .bg-canvas,
      :not(.dark) .bg-canvas {
        background-color: ${canvas} !important;
      }
      .dark .bg-canvas {
        background-color: ${darkCanvas} !important;
      }

      /* 2. Global Card & Container Surfaces: Light vs Dark Isolation */
      html:not(.dark) .bg-parchment,
      :not(.dark) .bg-parchment,
      html:not(.dark) .bg-white,
      :not(.dark) .bg-white {
        background-color: ${parchment} !important;
      }
      .dark .bg-parchment,
      .dark .bg-white,
      .dark .bg-slate-900,
      .dark [class*="dark:bg-[#161617]"],
      .dark [class*="dark:bg-[#1C1C1E]"],
      .dark [class*="dark:bg-[#1c1c1e]"],
      .dark [class*="dark:bg-[#2C2C2E]"] {
        background-color: ${darkParchment} !important;
      }

      /* 3. Global Hairlines & Borders */
      html:not(.dark) .border-hairline,
      :not(.dark) .border-hairline,
      html:not(.dark) .divide-hairline > * + *,
      :not(.dark) .divide-hairline > * + *,
      :not(.dark) .border-black\/\[0\.05\],
      :not(.dark) .border-black\/\[0\.06\],
      :not(.dark) .divide-black\/\[0\.05\] > * + * {
        border-color: ${hairline} !important;
      }
      .dark .border-hairline,
      .dark .divide-hairline > * + *,
      .dark .border-white\/\[0\.08\],
      .dark .border-white\/\[0\.06\],
      .dark .divide-white\/\[0\.06\] > * + * {
        border-color: ${darkHairline} !important;
      }

      /* 4. Luxury Obsidian Titanium Cards (Wallet, Voucher Banner, Profile Card) */
      html:not(.dark) .bg-\[\#1D1D1F\],
      :not(.dark) .bg-\[\#1D1D1F\],
      :not(.dark) .bg-\[\#1d1d1f\],
      :not(.dark) .bg-surface-tile {
        background-color: ${headerBg} !important;
        border-color: ${cardBorder} !important;
      }
      .dark .bg-\[\#1D1D1F\],
      .dark .bg-\[\#1d1d1f\],
      .dark .bg-surface-tile {
        background-color: ${darkHeaderBg} !important;
        border-color: ${darkHairline} !important;
      }

      /* 5. Primary Semantic Colors */
      .bg-primary {
        background-color: ${primary} !important;
      }
      .hover\\:bg-primary-hover:hover {
        background-color: ${primaryHover} !important;
      }
      .text-primary {
        color: ${primary} !important;
      }
      .hover\\:text-primary:hover {
        color: ${primaryHover} !important;
      }
      .group:hover .group-hover\\:text-primary {
        color: ${primary} !important;
      }
      .border-primary {
        border-color: ${primary} !important;
      }
      .ring-primary {
        --tw-ring-color: ${primary} !important;
      }
      .bg-primary\\/5 {
        background-color: color-mix(in srgb, ${primary} 5%, transparent) !important;
      }
      .bg-primary\\/10 {
        background-color: color-mix(in srgb, ${primary} 10%, transparent) !important;
      }
      .bg-primary\\/15 {
        background-color: color-mix(in srgb, ${primary} 15%, transparent) !important;
      }
      .bg-primary\\/20 {
        background-color: color-mix(in srgb, ${primary} 20%, transparent) !important;
      }
      .group:hover .group-hover\\:bg-primary\\/20 {
        background-color: color-mix(in srgb, ${primary} 20%, transparent) !important;
      }
      .border-primary\\/20 {
        border-color: color-mix(in srgb, ${primary} 20%, transparent) !important;
      }
      .border-primary\\/30 {
        border-color: color-mix(in srgb, ${primary} 30%, transparent) !important;
      }
      .border-primary\\/40 {
        border-color: color-mix(in srgb, ${primary} 40%, transparent) !important;
      }

      /* 6. Strict Fallback for Legacy Hardcoded Hex Selectors (Exact match [class~="..."] to never clobber /10 or group-hover) */
      [class~="bg-[#0071E3]"], [class~="bg-[#0071e3]"] {
        background-color: ${primary} !important;
      }
      [class~="bg-[#0071E3]/10"], [class~="bg-[#0071e3]/10"] {
        background-color: color-mix(in srgb, ${primary} 10%, transparent) !important;
      }
      [class~="bg-[#0071E3]/15"], [class~="bg-[#0071e3]/15"] {
        background-color: color-mix(in srgb, ${primary} 15%, transparent) !important;
      }
      [class~="bg-[#0071E3]/20"], [class~="bg-[#0071e3]/20"] {
        background-color: color-mix(in srgb, ${primary} 20%, transparent) !important;
      }
      [class~="text-[#0071E3]"], [class~="text-[#0071e3]"], [class~="text-[#2997FF]"], [class~="text-[#2997ff]"] {
        color: ${primary} !important;
      }
      [class~="border-[#0071E3]"], [class~="border-[#0071e3]"] {
        border-color: ${primary} !important;
      }
      [class~="border-[#0071E3]/20"], [class~="border-[#0071e3]/20"] {
        border-color: color-mix(in srgb, ${primary} 20%, transparent) !important;
      }
      [class~="border-[#0071E3]/30"], [class~="border-[#0071e3]/30"] {
        border-color: color-mix(in srgb, ${primary} 30%, transparent) !important;
      }
      [class~="hover:bg-[#0077ED]"]:hover, [class~="hover:bg-[#0071E3]"]:hover {
        background-color: ${primaryHover} !important;
      }
      .group:hover [class~="group-hover:text-[#0071E3]"] {
        color: ${primary} !important;
      }
      .group:hover [class~="group-hover:bg-[#0071E3]/20"] {
        background-color: color-mix(in srgb, ${primary} 20%, transparent) !important;
      }

      /* 7. Navigation Bar Active Highlights */
      .bg-white\\/80, .dark .bg-\\[\\#161617\\]\\/80 {
        border-color: ${hairline} !important;
      }

      /* 8. Ambient Glowing Shadows */
      .theme-glow {
        box-shadow: 0 4px 28px ${surfaceGlow} !important;
      }
    `;
  }, [activeTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme: activeTheme,
        isLoading,
        refreshTheme: fetchActiveTheme,
        previewTheme: setPreviewOverride
      }}
    >
      {/* Comprehensive Dynamic Stylesheet Injection */}
      <style
        id="dynamic-theme-vars"
        dangerouslySetInnerHTML={{
          __html: dynamicCss
        }}
      />

      {/* Atmospheric Top Glow Aura (Subtle & Elegant) */}
      {activeTheme?.id !== 'default-obsidian' && (
        <div
          className="fixed top-0 left-0 right-0 h-64 pointer-events-none z-0 opacity-15 dark:opacity-20 transition-opacity duration-700 select-none"
          style={{
            background: `radial-gradient(ellipse 110% 70% at 50% -20%, ${activeTheme.tokens['--theme-primary']}, transparent 75%)`
          }}
          aria-hidden="true"
        />
      )}

      {/* Atmospheric Bottom Reflection */}
      {activeTheme?.id !== 'default-obsidian' && (
        <div
          className="fixed bottom-0 left-0 right-0 h-40 pointer-events-none z-0 opacity-10 dark:opacity-15 transition-opacity duration-700 select-none"
          style={{
            background: `radial-gradient(ellipse 100% 70% at 50% 120%, ${activeTheme.tokens['--theme-primary']}, transparent 75%)`
          }}
          aria-hidden="true"
        />
      )}

      {/* Floating Momentum Ornaments Layer */}
      {activeTheme?.ornaments?.enabled && (
        <FloatingOrnaments config={activeTheme.ornaments} />
      )}

      {/* Momentum Special Edition Top Announcement Ribbon (Apple Glass Style) */}
      {activeTheme?.id !== 'default-obsidian' && (
        <aside
          className="w-full py-1.5 px-4 text-xs font-medium text-white flex items-center justify-center gap-2.5 select-none relative z-40 transition-colors border-b border-white/10 backdrop-blur-md"
          style={{
            background: `linear-gradient(90deg, rgba(20,20,22,0.95) 0%, color-mix(in srgb, ${activeTheme.tokens['--theme-primary']} 22%, rgba(20,20,22,0.95)) 50%, rgba(20,20,22,0.95) 100%)`
          }}
        >
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white"
            style={{
              backgroundColor: `color-mix(in srgb, ${activeTheme.tokens['--theme-primary']} 35%, transparent)`,
              border: `1px solid color-mix(in srgb, ${activeTheme.tokens['--theme-primary']} 50%, transparent)`
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: activeTheme.tokens['--theme-primary'] }}
            />
            {activeTheme.meta?.event_name || 'Edisi Perayaan'}
          </span>
          <span className="text-xs text-white/90 font-medium tracking-tight">
            {activeTheme.name}
          </span>
        </aside>
      )}

      {children}
    </ThemeContext.Provider>
  );
}

export function useDynamicTheme() {
  return useContext(ThemeContext);
}
