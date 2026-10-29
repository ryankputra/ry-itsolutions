import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Robust cross-platform key-value storage wrapper.
 * Uses hardware-backed Expo SecureStore on Android/iOS,
 * and falls back safely to in-memory/localStorage on Web.
 */
class StorageService {
  private memoryStore = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return this.memoryStore.get(key) || null;
      }
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.warn(`[StorageService] Failed to get item for key "${key}":`, error);
      return this.memoryStore.get(key) || null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      this.memoryStore.set(key, value);
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.warn(`[StorageService] Failed to set item for key "${key}":`, error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      this.memoryStore.delete(key);
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.warn(`[StorageService] Failed to delete item for key "${key}":`, error);
    }
  }

  async getObject<T>(key: string): Promise<T | null> {
    try {
      const json = await this.getItem(key);
      return json ? (JSON.parse(json) as T) : null;
    } catch (e) {
      console.warn(`[StorageService] Error parsing JSON for key "${key}":`, e);
      return null;
    }
  }

  async setObject<T>(key: string, value: T): Promise<void> {
    try {
      const json = JSON.stringify(value);
      await this.setItem(key, json);
    } catch (e) {
      console.warn(`[StorageService] Error stringifying object for key "${key}":`, e);
    }
  }
}

export const storage = new StorageService();

// Common storage keys
export const STORAGE_KEYS = {
  USER_ID: 'ry_mobile_user_id',
  USER_DATA: 'ry_mobile_user_data',
  AUTH_TOKEN: 'ry_mobile_auth_token',
  SAVED_CREDENTIALS: 'ry_mobile_saved_cred',
  CART_ITEMS: 'ry_mobile_cart_items',
  THEME_MODE: 'ry_mobile_theme_mode',
};
