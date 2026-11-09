import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { Colors } from '../theme/colors';

export type ThemePreference = 'system' | 'dark' | 'light';

interface ThemeContextType {
  theme: 'dark' | 'light';
  preference: ThemePreference;
  colors: typeof Colors.dark;
  setPreference: (pref: ThemePreference) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deviceScheme = useDeviceColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark');

  // Load saved preference from storage on start
  useEffect(() => {
    async function loadPref() {
      try {
        const saved = await storage.getItem(STORAGE_KEYS.THEME_MODE);
        if (saved === 'dark' || saved === 'light' || saved === 'system') {
          setPreferenceState(saved as ThemePreference);
        }
      } catch {}
    }
    loadPref();
  }, []);

  // Compute resolved theme
  useEffect(() => {
    if (preference === 'dark') {
      setResolvedTheme('dark');
    } else if (preference === 'light') {
      setResolvedTheme('light');
    } else {
      setResolvedTheme(deviceScheme === 'light' ? 'light' : 'dark');
    }
  }, [preference, deviceScheme]);

  const setPreference = useCallback(async (pref: ThemePreference) => {
    setPreferenceState(pref);
    await storage.setItem(STORAGE_KEYS.THEME_MODE, pref);
  }, []);

  const toggleTheme = useCallback(async () => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    await setPreference(next);
  }, [resolvedTheme, setPreference]);

  const activeColors = resolvedTheme === 'light' ? Colors.light : Colors.dark;

  return (
    <ThemeContext.Provider
      value={{
        theme: resolvedTheme,
        preference,
        colors: activeColors,
        setPreference,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Safe fallback if used outside provider
    return {
      theme: 'dark',
      preference: 'dark',
      colors: Colors.dark,
      setPreference: async () => {},
      toggleTheme: async () => {},
    };
  }
  return context;
};
