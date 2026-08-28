"use client";
import React, { useState, useEffect, useRef } from "react";
import { useApp } from "@/lib/store";
import Swal from "sweetalert2";

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const [showNotif, setShowNotif] = useState(false);
  const [announcement, setAnnouncement] = useState<any>(null);
  const [unread, setUnread] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const { user } = useApp();

  const [pendingOrders, setPendingOrders] = useState(0);

  useEffect(() => {
    if (user?.role === 'admin') {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        Notification.requestPermission();
      }
      
      let lastCount = 0;
      
      const checkOrders = async () => {
        try {
          const res = await fetch('/api/admin/manual-orders', { credentials: 'include' });
          if (res.ok) {
            const d = await res.json();
            if (d.status) {
              const pending = d.data.filter((o: any) => o.status === 'pending');
              setPendingOrders(pending.length);
              
              if (pending.length > lastCount && pending.length > 0) {
                Swal.fire({
                  title: 'Pesanan Manual Baru!',
                  text: 'Ada ' + (pending.length - lastCount) + ' pesanan manual baru yang perlu diproses.',
                  icon: 'info',
                  toast: true,
                  position: 'top-end',
                  showConfirmButton: false,
                  timer: 5000
                });
                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                  new Notification('Pesanan Manual Baru!', {
                    body: 'Ada ' + pending.length + ' pesanan manual di Antrean.'
                  });
                }
              }
              lastCount = pending.length;
            }
          }
        } catch(e) {}
      };
      
      checkOrders();
      const interval = setInterval(checkOrders, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);
  
  const [notifHistory, setNotifHistory] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('ry_notif_history');
    if (saved) {
      try { setNotifHistory(JSON.parse(saved)); } catch(e) {}
    }

    // Ambil Pengumuman Sistem
    fetch('/api/user/announcement')
      .then(res => res.json())
      .then(data => {
        if (data.status && data.data?.message) {
          const ann = data.data;
          setAnnouncement(ann);
          
          setNotifHistory(prev => {
            const exists = prev.find(n => n.message === ann.message);
            if (!exists) {
              const newHist = [{ ...ann, id: Date.now() }, ...prev].slice(0, 10);
              localStorage.setItem('ry_notif_history', JSON.stringify(newHist));
              setUnread(true);

              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                new Notification('Info Terkini Ry-ITSolutions 📢', {
                  body: ann.message
                });
              }

              return newHist;
            }
            return prev;
          });
        }
      })
      .catch(() => {});

    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotif(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenNotif = () => {
    setShowNotif(!showNotif);
    setUnread(false); // Hilangkan titik merah saat dibuka
  };

  // Dark Mode Support
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);
    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-hairline bg-canvas/80 backdrop-blur-md px-4 sm:gap-x-6 sm:px-6 lg:px-8 transition-colors">
      {/* Hamburger Menu for Mobile */}
      <button 
        onClick={onMenuClick}
        className="text-ink hover:text-primary transition-colors md:hidden p-2 -ml-2"
      >
        <span className="sr-only">Open sidebar</span>
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1"></div>
        <div className="flex items-center gap-x-2 sm:gap-x-3">
          
          {/* Dark Mode Toggle Button */}
          <button
            onClick={toggleDarkMode}
            className="p-2 text-ink-muted hover:text-ink transition-colors rounded-full hover:bg-parchment flex items-center justify-center"
            title={isDark ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap (Obsidian)"}
          >
            {isDark ? (
              <svg className="w-5 h-5 text-amber-400 hover:text-amber-300 transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-slate-700 hover:text-slate-900 transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>

          {/* Notification Button & Dropdown */}
          <div className="relative" ref={notifRef}>
            <button 
              onClick={handleOpenNotif}
              className="relative p-2 text-ink-muted hover:text-ink transition-colors rounded-full hover:bg-parchment"
            >
              <span className="sr-only">Notifications</span>
              <svg className="h-5 h-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {unread && (
                <div className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-canvas animate-pulse"></div>
              )}
            </button>

            {/* Dropdown Notifikasi */}
            {showNotif && (
              <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-canvas border border-hairline rounded-2xl shadow-xl z-50 overflow-hidden">
                <div className="p-4 border-b border-hairline bg-parchment/50">
                  <h3 className="font-bold text-ink">Notifikasi</h3>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  {pendingOrders > 0 && user?.role === 'admin' && (
                  <div className="p-4 hover:bg-parchment transition-colors border-b border-hairline cursor-pointer" onClick={() => window.location.href = '/admin'}>
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                        📦
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-ink">Pesanan Manual</h4>
                        <p className="text-xs text-ink-muted mt-0.5">Ada {pendingOrders} pesanan pending menunggu proses!</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {notifHistory.length > 0 ? notifHistory.map((notif, idx) => (
                  <div key={notif.id || idx} className="p-4 border-b border-hairline hover:bg-parchment/50 transition-colors cursor-pointer bg-blue-50/50">
                    <p className="text-xs font-bold text-primary mb-1">INFO SISTEM</p>
                    <p className="text-sm font-semibold text-ink leading-tight">Pengumuman Terbaru</p>
                    <p className="text-xs text-ink-muted mt-1">{notif.message}</p>
                    <p className="text-[10px] text-ink-muted mt-2">{new Date(notif.createdAt).toLocaleString('id-ID')}</p>
                  </div>
                )) : (
                  <div className="p-4 border-b border-hairline hover:bg-parchment/50 transition-colors cursor-pointer">
                    <p className="text-xs font-bold text-primary mb-1">SELAMAT DATANG</p>
                    <p className="text-sm font-semibold text-ink leading-tight">Hai {user?.name?.split(' ')[0]} 👋</p>
                    <p className="text-xs text-ink-muted mt-1">Platform PPOB dan Unblock IMEI Terpercaya. Gunakan layanan kami dengan bijak.</p>
                  </div>
                )}

                  {user?.role === 'admin' && (
                    <div className="p-4 border-b border-hairline hover:bg-parchment/50 transition-colors cursor-pointer">
                      <p className="text-xs font-bold text-amber-500 mb-1">INFO ADMIN</p>
                      <p className="text-sm font-semibold text-ink leading-tight">Sistem Online</p>
                      <p className="text-xs text-ink-muted mt-1">Peringatan: Gunakan Panel Admin dengan hati-hati.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
