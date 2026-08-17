"use client";
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import TelegramPopup from "@/components/ui/TelegramPopup";

export default function DashboardPage() {
  const { user, setUser, menuSettings } = useApp();




  const [announcement, setAnnouncement] = useState<any>(null);
  const [publicInfo, setPublicInfo] = useState<string>("");
  const [recentTrx, setRecentTrx] = useState<any[]>([]);
  const [selectedQris, setSelectedQris] = useState<any>(null);
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    // Meminta Izin Push Notification
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new Notification("Notifikasi Aktif!", {
              body: "Anda akan menerima update transaksi dan pengumuman di sini.",
              icon: "/icon-192.png"
            });
          }
        });
      }
    }

    async function loadDashboardData() {
      try {
        const [annRes, trxRes] = await Promise.all([
          fetch("/api/user/announcement", { credentials: 'include' }).catch(() => null),
          fetch("/api/user/transactions", { credentials: 'include' }).catch(() => null)
        ]);

        if (annRes?.ok) {
          const data = await annRes.json();
          if (data.status && data.data?.message) setAnnouncement(data.data);
        }
        if (trxRes?.ok) {
          const data = await trxRes.json();
          if (data.status && data.data) setRecentTrx(data.data.slice(0, 3));
        }
      } catch (err) { console.error(err); }
    }
    loadDashboardData();
  }, []);


  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      {/* Header Profile */}
      <TelegramPopup />
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Wassup, {user?.name?.split(' ')[0] || "Bestie"} ✨</h1>
          <p className="text-sm text-ink-muted">Welcome back to Ry-ITSolutions</p>
        </div>
      </div>

      {/* Announcement Banner */}
      {announcement && (
        <div
          className="rounded-2xl p-4 text-white shadow-lg relative overflow-hidden"
          style={{ backgroundColor: announcement.bgColor || '#dc2626' }}
        >
          <div className="absolute -right-4 -top-4 text-white/10">
            <svg width="100" height="100" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
          </div>
          <div className="relative z-10">
            <h3 className="font-bold text-sm mb-1">📢 Info Penting Nih!</h3>
            <p className="text-sm opacity-90">{announcement.message}</p>
          </div>
        </div>
      )}

      {/* Wallet Card Premium PPOB Style */}
      <div className="relative rounded-[24px] p-6 text-white overflow-hidden shadow-xl shadow-primary/20 bg-gradient-to-br from-[#0066cc] via-[#005bb5] to-[#004080] hover:scale-[1.02] transition-transform duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <svg width="120" height="120" fill="currentColor" viewBox="0 0 24 24"><path d="M21 18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1h-9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9zm-9-2h10V8H12v8zm4-3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" /></svg>
        </div>

        <div className="relative z-10 flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/80 text-sm font-medium mb-1">Cuan Aktif 💰</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">Rp</span>
                    <span className="text-4xl font-black tracking-tight">
                      {showBalance ? (user?.balance?.toLocaleString('id-ID') || "0") : "******"}
                    </span>
                    <button onClick={() => setShowBalance(!showBalance)} className="ml-2 text-white/80 hover:text-white transition-colors">
                      {showBalance ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
            <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold capitalize border border-white/10">
              {user?.role}
            </div>
          </div>

          <div className="flex gap-3">
            <a href="/topup" className="flex-1 bg-white text-[#005bb5] hover:bg-white/90 transition-colors py-2.5 rounded-full font-bold text-sm shadow-sm flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              Top Up Cuan
            </a>
            <a href="/history" className="flex-1 bg-[#004080]/50 hover:bg-[#004080]/80 transition-colors border border-white/20 py-2.5 rounded-full font-bold text-sm text-center flex items-center justify-center gap-2">
              History
            </a>
          </div>
        </div>
      </div>

      {/* Category Grid */}
      <div>
        <h2 className="text-lg font-bold text-ink mb-4">Trending Now 🔥</h2>
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-4">
          {[
            ...(menuSettings?.showBeliPaket ? [{ name: "Suntik Kuota", icon: "🌐", href: "/beli-paket", color: "bg-blue-50 text-blue-600" }] : []),
            { name: "Buka Gembok IMEI", icon: "🔓", href: "/unblock-imei", color: "bg-rose-50 text-rose-600" },
            { name: "Cek CEIR", icon: "🔍", href: "/cek-ceir", color: "bg-emerald-50 text-emerald-600" }
          ].map(item => (
            <a key={item.name} href={item.href} className="flex flex-col items-center gap-2 group">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-105 group-hover:shadow-lg ${item.color}`}>
                {item.icon}
              </div>
              <span className="text-xs font-semibold text-center text-ink/80">{item.name}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex justify-between items-center mb-4 mt-6">
          <h2 className="text-lg font-bold text-ink">Jejak Transaksi 👣</h2>
          <a href="/history" className="text-sm font-semibold text-primary">See All</a>
        </div>

        {recentTrx.length === 0 ? (
          <div className="text-center py-8 bg-canvas border border-hairline rounded-2xl">
            <p className="text-sm text-ink-muted">Belum ada pergerakan nih. Yuk checkout!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTrx.map((trx, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-canvas border border-hairline rounded-[18px] hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-lg">
                    {trx.packageName?.toLowerCase().includes('pulsa') ? '📱' : '🌐'}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-ink line-clamp-1">{trx.packageName || "Paket Data"}</p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {trx.imei ? (trx.imei.split(',').length > 1 ? `${trx.imei.split(',')[0]} (+${trx.imei.split(',').length - 1})` : trx.imei) : trx.targetPhone}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-ink">Rp {(trx.originalPrice || trx.baseAmount || 0).toLocaleString('id-ID')}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded uppercase ${trx.status === 'success' || trx.status === 'completed' ? 'bg-green-100 text-green-700' : trx.status === 'failed' || trx.status === 'canceled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {trx.status === 'completed' ? 'success' : trx.status}
                  </span>
                  {trx.type === 'topup' && trx.status === 'pending' && trx.qrisData && (
                    <button
                      onClick={() => setSelectedQris(trx.qrisData)}
                      className="block mt-2 px-2 py-1 text-xs bg-primary text-white font-bold rounded"
                    >
                      Lihat QRIS
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QRIS Modal */}
      {selectedQris && (() => {
        const createdAt = selectedQris.createdAt ? new Date(selectedQris.createdAt).getTime() : Date.now();
        const expiresAt = Math.floor((createdAt + 15 * 60 * 1000) / 1000);

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="max-w-xs w-full p-6 text-center space-y-4 relative">
              <button onClick={() => setSelectedQris(null)} className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full hover:bg-slate-200">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <h3 className="font-bold text-lg">Bayar Top Up</h3>
              <p className="text-primary font-black text-2xl">Rp {selectedQris.uniqueAmount?.toLocaleString('id-ID')}</p>

              <div className="relative mx-auto border-2 border-hairline p-2 rounded-xl">
                <div className="absolute -top-3 -right-3 bg-rose-500 text-white font-bold px-3 py-1.5 rounded-full text-sm shadow-md flex items-center gap-1.5 animate-pulse">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <CountdownTimer expiresAt={expiresAt} onExpire={() => setSelectedQris(null)} />
                </div>
                <img src={selectedQris.base64Image || selectedQris.qrisData?.base64Image} alt="QRIS" className="w-full h-auto" />
              </div>
              <p className="text-xs text-ink-muted">Scan QRIS ini di aplikasi e-Wallet atau m-Banking Anda sebelum waktu habis.</p>
            </Card>
          </div>
        );
      })()}

    </div>
  );
}

function CountdownTimer({ expiresAt, onExpire }: { expiresAt: number, onExpire: () => void }) {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, expiresAt - Math.floor(Date.now() / 1000)));

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const s = (timeLeft % 60).toString().padStart(2, '0');
  return <span>{m}:{s}</span>;
}
