"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { API_URL } from "./api";

interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  verifiedPhone?: string;
  role: string;
  balance: number;
  status?: string;
}

interface AppContextType {
  user: User | null;
  loading: boolean;
  menuSettings: { showBeliPaket: boolean };
  ceirgoDisplaySettings: { cekCeir: string[]; barcode: string[] };
  setUser: (user: User | null) => void;
  updateBalance: (balance: number) => void;
  updateMenuSettings: (settings: { showBeliPaket: boolean }) => void;
  updateCeirgoDisplaySettings: (settings: { cekCeir: string[]; barcode: string[] }) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuSettings, setMenuSettings] = useState({ showBeliPaket: false });
  const [ceirgoDisplaySettings, setCeirgoDisplaySettings] = useState({ cekCeir: [] as string[], barcode: [] as string[] });

  // Update setMenuSettings di Context agar bisa dipanggil dari mana saja
  const updateMenuSettings = (settings: { showBeliPaket: boolean }) => {
    setMenuSettings(settings);
  };

  const updateCeirgoDisplaySettings = (settings: { cekCeir: string[]; barcode: string[] }) => {
    setCeirgoDisplaySettings(settings);
  };

  // Load Session on Mount
  useEffect(() => {
    async function loadData() {
      try {
        const [sessionRes, menuRes, ceirgoDisplayRes] = await Promise.all([
          fetch(`${API_URL}/auth/me`, { credentials: 'include' }),
          fetch(`${API_URL}/admin/menu-settings`, { credentials: 'include' }),
          fetch(`${API_URL}/admin/ceirgo-display-settings`, { credentials: 'include' })
        ]);

        if (sessionRes.ok) {
          const data = await sessionRes.json();
          if (data.status && data.user) setUser(data.user);
        }
        if (menuRes.ok) {
          const menuData = await menuRes.json();
          if (menuData.status) setMenuSettings(menuData.data);
        }
        if (ceirgoDisplayRes.ok) {
          const displayData = await ceirgoDisplayRes.json();
          if (displayData.status) {
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

          // Dispatch event global agar komponen lain (seperti halaman TopUp) bisa tahu
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('topup_success'));
          }
        }
      } catch (err) { }
    });

    return () => sse.close();
  }, [user]);

  const updateBalance = (balance: number) => {
    setUser(prev => prev ? { ...prev, balance } : null);
  };

  return (
    <AppContext.Provider value={{ user, loading, menuSettings, ceirgoDisplaySettings, setUser, updateBalance, updateMenuSettings, updateCeirgoDisplaySettings }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error("useApp must be used within AppProvider");
  return context;
}
