import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { User } from '../types';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { fetchCurrentUser, loginUser, logoutUser } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserBalance: (balance: number, coins?: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize session from hardware-backed storage on app boot
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        // Fast-path: read cached user for instantaneous render
        const cachedUser = await storage.getObject<User>(STORAGE_KEYS.USER_DATA);
        if (cachedUser && isMounted) {
          setUser(cachedUser);
        }

        const savedUserId = await storage.getItem(STORAGE_KEYS.USER_ID);
        if (savedUserId) {
          // Revalidate with backend
          const remoteUser = await fetchCurrentUser();
          if (remoteUser && isMounted) {
            setUser(remoteUser);
            await storage.setObject(STORAGE_KEYS.USER_DATA, remoteUser);
          } else if (!remoteUser && isMounted) {
            // Sesi kedaluwarsa atau invalid
            await storage.removeItem(STORAGE_KEYS.USER_ID);
            await storage.removeItem(STORAGE_KEYS.USER_DATA);
            setUser(null);
          }
        }
      } catch (err) {
        console.warn('[AuthProvider] Error restoring session:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await loginUser(email, password);
      if (response.status && response.user) {
        setUser(response.user);
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        return { success: true, message: response.message || 'Login berhasil!' };
      }
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      return { success: false, message: response.message || 'Login gagal.' };
    } catch (error: any) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      const errMsg = error.response?.data?.message || error.message || 'Terjadi kesalahan jaringan.';
      return { success: false, message: errMsg };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    await logoutUser();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const updated = await fetchCurrentUser();
      if (updated) {
        setUser(updated);
        await storage.setObject(STORAGE_KEYS.USER_DATA, updated);
      }
    } catch (e) {
      console.warn('[AuthProvider] refreshUser failed:', e);
    }
  }, []);

  const updateUserBalance = useCallback((balance: number, coins?: number) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated: User = {
        ...prev,
        balance,
        ...(typeof coins === 'number' ? { coins } : {}),
      };
      storage.setObject(STORAGE_KEYS.USER_DATA, updated).catch(() => {});
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
        updateUserBalance,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
