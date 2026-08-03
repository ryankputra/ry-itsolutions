"use client";
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/lib/store";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

export default function TopUpPage() {
  const { user, setUser } = useApp();
  const router = useRouter();
  
  const [amount, setAmount] = useState("");
  const [qrisData, setQrisData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [initialBalance, setInitialBalance] = useState<number | null>(null);
  
  // States for Timer & Polling
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Polling Saldo & Timer
  useEffect(() => {
    let timerInterval: NodeJS.Timeout;
    let pollingInterval: NodeJS.Timeout;

    if (qrisData && !success) {
      // 1. Timer Countdown
      timerInterval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setQrisData(null); // Timeout! Hapus QRIS
            setError("Waktu pembayaran telah habis. Silakan buat QRIS baru.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // 2. Fallback Polling (Bertanya ke server setiap 5 detik)
      pollingInterval = setInterval(async () => {
        try {
          const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            if (data.status && data.user) {
              // Jika saldo di database lebih besar dari saldo di layar saat ini
              if (user && data.user.balance > user.balance) {
                setUser(data.user); // Update state global
                setSuccess(true);
                setTimeout(() => router.push("/dashboard"), 4000);
              }
            }
          }
        } catch (err) {}
      }, 5000);
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [qrisData, success, user, router, setUser]);

  // Cek perubahan saldo untuk trigger animasi sukses (Fast track)
  if (qrisData && !success && initialBalance !== null && user && user.balance > initialBalance) {
    setSuccess(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 4000);
  }

  const handleRequestQris = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setInitialBalance(user?.balance || 0);

    try {
      const res = await fetch("/api/topup/request-qris", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseInt(amount) }),
      });
      const data = await res.json();
      if (data.status) {
        setQrisData(data.qrisData);
        setTimeLeft(data.qrisData.expiresAt ? data.qrisData.expiresAt - Math.floor(Date.now() / 1000) : 5 * 60);
      } else {
        setError(data.message || "Gagal membuat QRIS");
        setInitialBalance(null);
      }
    } catch (err) {
      setError("Kesalahan jaringan");
      setInitialBalance(null);
    } finally {
      setLoading(false);
    }
  };

  // Format MM:SS
  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "00:00";
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => router.push('/dashboard')} className="w-10 h-10 flex items-center justify-center rounded-full bg-canvas border border-hairline hover:bg-parchment transition-colors">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Isi Saldo</h1>
          <p className="text-sm text-ink-muted">Otomatis masuk 24 Jam Non-stop</p>
        </div>
      </div>

      <Card glass className="p-0 overflow-hidden">
        {success ? (
          <div className="text-center space-y-4 py-16 px-6">
            <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
              <svg className="w-12 h-12 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-3xl font-black text-ink">Berhasil!</h3>
            <p className="text-ink-muted">Saldo Anda telah ditambahkan secara instan. Mengalihkan Anda ke dashboard...</p>
          </div>
        ) : !qrisData ? (
          <>
            <div className="bg-gradient-to-r from-primary to-primary-focus p-6 sm:p-8 text-white">
              <h2 className="text-xl font-bold mb-2">QRIS Auto-Detect ⚡</h2>
              <p className="text-white/80 text-sm mb-6 max-w-sm">Dukung semua pembayaran e-Wallet dan Mobile Banking. Saldo masuk dalam hitungan detik.</p>
              
              <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-sm">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 flex items-center justify-center border border-white/20">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-11v6h2v-6h-2zm0-4v2h2V7h-2z"/></svg>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 flex items-center justify-center border border-white/20 font-black italic tracking-tighter">OVO</div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 flex items-center justify-center border border-white/20 font-bold tracking-tight text-blue-200">DANA</div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 flex items-center justify-center border border-white/20 font-bold">QRIS</div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <form onSubmit={handleRequestQris} className="space-y-6">
                {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100 flex gap-3"><svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg><span>{error}</span></div>}
                
                <div className="space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 mt-1">1</div>
                    <div className="flex-1">
                      <p className="font-bold text-ink">Masukkan Nominal</p>
                      <p className="text-sm text-ink-muted mb-3">Minimal Rp 5.000 tanpa potongan fee.</p>
                      <Input 
                        type="number" 
                        placeholder="Contoh: 50000" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required 
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 items-start opacity-70">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-ink-muted flex items-center justify-center font-bold shrink-0">2</div>
                    <div className="flex-1">
                      <p className="font-bold text-ink pt-1.5">Scan & Bayar</p>
                    </div>
                  </div>
                </div>
                
                <Button className="w-full h-14 text-lg font-bold shadow-md shadow-primary/20" type="submit" isLoading={loading}>
                  Buat QRIS Pembayaran
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-8 bg-gradient-to-b from-canvas to-parchment/50">
            
            <div className="w-full max-w-xs space-y-2">
              <p className="text-sm font-bold text-ink-muted uppercase tracking-wider">Total Pembayaran</p>
              <div className="bg-white border-2 border-primary/20 p-4 rounded-2xl shadow-sm">
                <p className="text-4xl font-black text-primary">Rp {qrisData.uniqueAmount.toLocaleString('id-ID')}</p>
              </div>
            </div>
            
            <div className="relative w-64 h-64 bg-white p-4 rounded-3xl border-2 border-hairline shadow-xl shadow-black/5 mx-auto">
              <div className="absolute -top-3 -right-3 bg-rose-500 text-white font-bold px-3 py-1.5 rounded-full text-sm shadow-md flex items-center gap-1.5 animate-pulse">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {formatTime(timeLeft)}
              </div>
              <img src={qrisData.base64Image} alt="QRIS Code" className="w-full h-full object-contain" />
            </div>

            <div className="space-y-4 max-w-sm">
              {qrisData.uniqueAmount !== parseInt(amount) && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3 text-left">
                  <svg className="w-6 h-6 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <p className="text-sm text-amber-800 font-medium">PENTING! Transfer harus <b>Tepat</b> sesuai nominal di atas (jangan dibulatkan) agar saldo otomatis masuk.</p>
                </div>
              )}
              
              <div className="flex items-center justify-center gap-2 text-ink-muted text-sm font-medium">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                Sistem sedang menunggu pembayaran Anda...
              </div>
              
              <Button variant="ghost" className="w-full text-ink-muted hover:text-ink mt-2" onClick={() => {
                setQrisData(null);
                setInitialBalance(null);
              }}>
                Batalkan & Kembali
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
