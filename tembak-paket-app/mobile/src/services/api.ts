import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { ApiResponse, User } from '../types';

/**
 * Determine dynamic API Base URL depending on environment and platform:
 * - Production: https://ry-itsolutionts.web.id/api
 * - Android Emulator: http://10.0.2.2:3001/api
 * - iOS Simulator / Web: http://localhost:3001/api
 */
export const getApiBaseUrl = (): string => {
  // If explicitly specified in .env, honor it
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  // Default to live production server to ensure immediate out-of-the-box sync
  const PROD_API_URL = 'https://ry-itsolutionts.web.id/api';

  // Toggle this flag if targeting local dev backend
  const USE_LOCAL_BACKEND = false;

  if (USE_LOCAL_BACKEND) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3001/api';
    }
    return 'http://localhost:3001/api';
  }

  return PROD_API_URL;
};

/**
 * Normalizes backend response payloads identically to the web client
 * to ensure boolean status and success indicators are always uniform.
 */
export function normalizeResponsePayload<T = any>(data: any): T {
  if (!data || typeof data !== 'object') return data;

  const isSuccess = data.status === true || data.success === true;
  const isFailure = data.status === false || data.success === false;

  if (isSuccess) {
    data.status = true;
    data.success = true;
  } else if (isFailure) {
    data.status = false;
    data.success = false;
  }

  return data as T;
}

// Create centralized Axios client
export const apiClient: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 20000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Automatically inject authentication headers
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const userId = await storage.getItem(STORAGE_KEYS.USER_ID);
      if (userId && config.headers) {
        config.headers['x-user-id'] = userId;
      }

      const authToken = await storage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (authToken && config.headers) {
        config.headers['Authorization'] = `Bearer ${authToken}`;
      }
    } catch (e) {
      console.warn('[API Interceptor] Failed reading credentials from storage:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Normalize payload & handle global network diagnostics
apiClient.interceptors.response.use(
  (response) => {
    if (response.data) {
      response.data = normalizeResponsePayload(response.data);
    }
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.data) {
      error.response.data = normalizeResponsePayload(error.response.data);
    }
    const status = error.response?.status;
    const message = (error.response?.data as any)?.message || error.message;

    console.warn(`[API Error ${status || 'Network'}]:`, message);
    return Promise.reject(error);
  }
);

// High-level Domain Auth Methods
export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const res = await apiClient.get<ApiResponse<{ user: User }>>('/auth/me');
    if (res.data?.status && (res.data.user || res.data.data?.user)) {
      return res.data.user || res.data.data?.user || null;
    }
    return null;
  } catch (err) {
    return null;
  }
}

export async function loginUser(email: string, password: string): Promise<ApiResponse<{ user: User }>> {
  const res = await apiClient.post<ApiResponse<{ user: User }>>('/auth/login', {
    email: email.trim().toLowerCase(),
    password,
  });

  const payload = res.data;
  if (payload.status && payload.user) {
    await storage.setItem(STORAGE_KEYS.USER_ID, payload.user.id);
    await storage.setObject(STORAGE_KEYS.USER_DATA, payload.user);
  }

  return payload;
}

export async function logoutUser(): Promise<void> {
  try {
    await apiClient.post('/auth/logout');
  } catch (e) {
    // Ignore server error on logout
  } finally {
    await storage.removeItem(STORAGE_KEYS.USER_ID);
    await storage.removeItem(STORAGE_KEYS.USER_DATA);
    await storage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  }
}
