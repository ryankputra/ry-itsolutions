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
    '--theme-surface-glow': 'rgba(0, 113, 227, 0.08)',
    '--theme-card-border': 'rgba(0, 0, 0, 0.08)',
    '--theme-header-bg': '#1D1D1F',
    '--theme-header-text': '#FFFFFF',
    '--theme-badge-bg': '#1D1D1F',
    '--theme-badge-text': '#FFFFFF'
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

  // Compute CSS Variables and dynamic theme styles to transform the entire website
  const dynamicCss = useMemo(() => {
    if (!activeTheme?.tokens) return '';
    const primary = activeTheme.tokens['--theme-primary'] || '#0071E3';
    const primaryHover = activeTheme.tokens['--theme-primary-hover'] || '#0077ED';
    const accent = activeTheme.tokens['--theme-accent'] || '#34C759';
    const surfaceGlow = activeTheme.tokens['--theme-surface-glow'] || 'rgba(0, 113, 227, 0.08)';
    const cardBorder = activeTheme.tokens['--theme-card-border'] || 'rgba(0, 0, 0, 0.08)';
    const headerBg = activeTheme.tokens['--theme-header-bg'] || '#1D1D1F';
    const headerText = activeTheme.tokens['--theme-header-text'] || '#FFFFFF';

    return `
      :root, :root.dark, .dark, body {
        --color-primary: ${primary} !important;
        --color-primary-hover: ${primaryHover} !important;
        --color-primary-focus: ${primaryHover} !important;
        --color-primary-on-dark: ${primary} !important;
        --color-surface-tile: ${headerBg} !important;
        --theme-primary: ${primary} !important;
        --theme-primary-hover: ${primaryHover} !important;
        --theme-accent: ${accent} !important;
        --theme-surface-glow: ${surfaceGlow} !important;
        --theme-card-border: ${cardBorder} !important;
        --theme-header-bg: ${headerBg} !important;
        --theme-header-text: ${headerText} !important;
      }

      /* Global Dynamic Theming: Override primary interactive classes */
      .bg-primary {
        background-color: ${primary} !important;
      }
      .hover\\:bg-primary-hover:hover {
        background-color: ${primaryHover} !important;
      }
      .text-primary {
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
      .border-primary\\/20 {
        border-color: color-mix(in srgb, ${primary} 20%, transparent) !important;
      }
      .border-primary\\/30 {
        border-color: color-mix(in srgb, ${primary} 30%, transparent) !important;
      }
      .border-primary\\/40 {
        border-color: color-mix(in srgb, ${primary} 40%, transparent) !important;
      }

      /* Catch all hardcoded blue hex elements */
      [class*="text-[#0071E3]"], [class*="text-[#0071e3]"], [class*="text-[#2997FF]"], [class*="text-[#2997ff]"] {
        color: ${primary} !important;
      }
      [class*="bg-[#0071E3]"], [class*="bg-[#0071e3]"] {
        background-color: ${primary} !important;
      }
      [class*="border-[#0071E3]"], [class*="border-[#0071e3]"] {
        border-color: ${primary} !important;
      }
      [class*="hover:bg-[#0077ED]"]:hover, [class*="hover:bg-[#0077ed]"]:hover {
        background-color: ${primaryHover} !important;
      }
      [class*="bg-[#0071E3]/10"], [class*="bg-[#0071e3]/10"] {
        background-color: color-mix(in srgb, ${primary} 10%, transparent) !important;
      }
      [class*="border-[#0071E3]/20"], [class*="border-[#0071e3]/20"] {
        border-color: color-mix(in srgb, ${primary} 20%, transparent) !important;
      }

      /* Dynamic Theme Glow on Cards */
      .theme-glow {
        box-shadow: 0 4px 24px ${surfaceGlow} !important;
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

      {/* Atmospheric Theme Glow Overlay */}
      {activeTheme?.id !== 'default-obsidian' && (
        <div
          className="fixed top-0 left-0 right-0 h-96 pointer-events-none z-0 opacity-20 dark:opacity-25 transition-opacity duration-700 select-none"
          style={{
            background: `radial-gradient(ellipse 120% 70% at 50% -15%, ${activeTheme.tokens['--theme-primary']}, transparent 75%)`
          }}
          aria-hidden="true"
        />
      )}

      {/* Floating Ornaments Layer */}
      {activeTheme?.ornaments?.enabled && (
        <FloatingOrnaments config={activeTheme.ornaments} />
      )}

      {/* Momentum Special Edition Top Announcement Bar */}
      {activeTheme?.id !== 'default-obsidian' && (
        <aside
          className="w-full text-center py-1.5 px-4 text-xs font-bold text-white flex items-center justify-center gap-2 select-none relative z-40 transition-colors shadow-2xs"
          style={{
            backgroundColor: activeTheme.tokens['--theme-primary']
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
          <span>{activeTheme.name}</span>
          {activeTheme.meta?.event_name && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 uppercase tracking-widest font-black">
              {activeTheme.meta.event_name}
            </span>
          )}
        </aside>
      )}

      {children}
    </ThemeContext.Provider>
  );
}

export function useDynamicTheme() {
  return useContext(ThemeContext);
}
