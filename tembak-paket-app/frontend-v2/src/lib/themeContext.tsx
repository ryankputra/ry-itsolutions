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
    // Poll theme updates occasionally every 3 minutes
    const interval = setInterval(fetchActiveTheme, 180000);
    return () => clearInterval(interval);
  }, []);

  // Compute CSS Variables string from tokens
  const cssVariables = useMemo(() => {
    if (!activeTheme?.tokens) return '';
    const entries = Object.entries(activeTheme.tokens);
    return entries.map(([prop, val]) => `${prop}: ${val};`).join(' ');
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
      {/* Client-side Style Tag Injection */}
      <style
        id="dynamic-theme-vars"
        dangerouslySetInnerHTML={{
          __html: `
            :root {
              ${cssVariables}
            }
          `
        }}
      />

      {/* Floating Ornaments Layer */}
      {activeTheme?.ornaments?.enabled && (
        <FloatingOrnaments config={activeTheme.ornaments} />
      )}

      {children}
    </ThemeContext.Provider>
  );
}

export function useDynamicTheme() {
  return useContext(ThemeContext);
}
