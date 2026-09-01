"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { API_URL, safeJson } from "./api";
import { bindSwalSounds, playTopupSuccessSound, playPopSound } from "./soundFx";

const MENU_SETTINGS_STORAGE_KEY = "menu_settings";
const CART_STORAGE_KEY = "ry_cart_items";
const DEFAULT_MENU_SETTINGS = { showBeliPaket: false };

export interface CartItem {
  id: string;
  packageId?: string;
  packageName: string;
  serviceType: string;
  price: number;
  totalPrice?: number;
  duration?: string;
  imei?: string;
  targetPhone?: string;
  quantity: number;
  speed?: string;
  speedPrice?: number;
}

interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  verifiedPhone?: string;
  role: string;
  balance: number;
  coins?: number;
  avatar?: string;
  status?: string;
  createdAt?: string;
}

interface AppContextType {
  user: User | null;
  loading: boolean;
  cart: CartItem[];
  cartCount: number;
  menuSettings: { showBeliPaket: boolean };
  ceirgoDisplaySettings: { cekCeir: string[]; barcode: string[] };
  setUser: (user: User | null) => void;
  updateBalance: (balance: number) => void;
  updateMenuSettings: (settings: { showBeliPaket: boolean }) => void;
  updateCeirgoDisplaySettings: (settings: { cekCeir: string[]; barcode: string[] }) => void;
  addToCart: (item: Omit<CartItem, "id">) => void;
  removeFromCart: (id: string) => void;
  updateCartQty: (id: string, qty: number) => void;
  clearCart: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = window.localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [menuSettings, setMenuSettings] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_MENU_SETTINGS;
    try {
      const saved = window.localStorage.getItem(MENU_SETTINGS_STORAGE_KEY);
      return saved ? { ...DEFAULT_MENU_SETTINGS, ...JSON.parse(saved) } : DEFAULT_MENU_SETTINGS;
    } catch {
      return DEFAULT_MENU_SETTINGS;
    }
  });
  const [ceirgoDisplaySettings, setCeirgoDisplaySettings] = useState({ cekCeir: [] as string[], barcode: [] as string[] });

  // Auto recovery for ChunkLoadError (stale Next.js build cache in browser tab)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleChunkError = (event: ErrorEvent) => {
      if (
        event.error?.name === "ChunkLoadError" ||
        (event.message && (event.message.includes("Loading chunk") || event.message.includes("ChunkLoadError")))
      ) {
        console.warn("ChunkLoadError detected, reloading page to fetch fresh bundle...");
        window.location.reload();
      }
    };
    window.addEventListener("error", handleChunkError);
    return () => window.removeEventListener("error", handleChunkError);
  }, []);

  // Persist cart
  const saveCart = (items: CartItem[]) => {
    setCart(items);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  };

  const addToCart = (newItem: Omit<CartItem, "id">) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    const updated = [...cart, { ...newItem, id }];
    saveCart(updated);
    playPopSound();
  };

  const removeFromCart = (id: string) => {
    const updated = cart.filter((item) => item.id !== id);
    saveCart(updated);
  };

  const updateCartQty = (id: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(id);
      return;
    }
    const updated = cart.map((item) => (item.id === id ? { ...item, quantity: qty } : item));
    saveCart(updated);
  };

  const clearCart = () => {
    saveCart([]);
  };

  const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

  // Update setMenuSettings di Context agar bisa dipanggil dari mana saja
  const updateMenuSettings = (settings: { showBeliPaket: boolean }) => {
    setMenuSettings(settings);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MENU_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      window.dispatchEvent(new CustomEvent("menu_settings_updated", { detail: settings }));
    }
  };

  const updateCeirgoDisplaySettings = (settings: { cekCeir: string[]; barcode: string[] }) => {
    setCeirgoDisplaySettings(settings);
  };

  // Load Session on Mount
  useEffect(() => {
    bindSwalSounds();

    async function loadData() {
      try {
        const [sessionRes, menuRes, ceirgoDisplayRes] = await Promise.all([
          fetch(`${API_URL}/auth/me`, { credentials: 'include' }).catch(() => null),
          fetch(`${API_URL}/admin/menu-settings`, { credentials: 'include' }).catch(() => null),
          fetch(`${API_URL}/admin/ceirgo-display-settings`, { credentials: 'include' }).catch(() => null)
        ]);

        if (sessionRes && sessionRes.ok) {
          const data = await safeJson(sessionRes);
          if (data && data.status && data.user) setUser(data.user);
        }
        if (menuRes && menuRes.ok) {
          const menuData = await safeJson(menuRes);
          if (menuData && menuData.status) updateMenuSettings({ showBeliPaket: !!menuData.data?.showBeliPaket });
        }
        if (ceirgoDisplayRes && ceirgoDisplayRes.ok) {
          const displayData = await safeJson(ceirgoDisplayRes);
          if (displayData && displayData.status) {
            setCeirgoDisplaySettings({
              cekCeir: Array.isArray(displayData.data?.cekCeir) ? displayData.data.cekCeir : [],
              barcode: Array.isArray(displayData.data?.barcode) ? displayData.data.barcode : []
            });
          }
        }
      } catch (err) {
        console.error("Failed to load initial data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Setup SSE for Realtime Updates
  useEffect(() => {
    if (!user) return;
    const sse = new EventSource(`${API_URL}/stream`, { withCredentials: true });

    sse.addEventListener("balance_update", (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        if (typeof payload.balance === "number") {
          setUser(prev => prev ? { ...prev, balance: payload.balance } : null);
          playTopupSuccessSound();

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('topup_success'));
          }
        }
      } catch (err) { }
    });

    return () => sse.close();
  }, [user?.id]);

  const updateBalance = (balance: number) => {
    setUser(prev => prev ? { ...prev, balance } : null);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        loading,
        cart,
        cartCount,
        menuSettings,
        ceirgoDisplaySettings,
        setUser,
        updateBalance,
        updateMenuSettings,
        updateCeirgoDisplaySettings,
        addToCart,
        removeFromCart,
        updateCartQty,
        clearCart,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error("useApp must be used within AppProvider");
  return context;
}
