"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import { login as loginApi, API_URL } from "@/lib/api";
import { useApp } from "@/lib/store";
import { Logo } from "@/components/ui/Logo";
import Swal from "@/lib/sweetalert";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { setUser } = useApp();
  const router = useRouter();

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: credentialResponse.credential }),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.status) {
        setUser(data.user);
        router.push("/dashboard");
      } else {
        setError(data.message || "Gagal masuk dengan Google.");
      }
    } catch (err) {
      setError("Kesalahan jaringan saat menghubungi server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await loginApi(email.trim(), password);
      if (res.status && res.user) {
        setUser(res.user);
        router.push("/dashboard");
      } else {
        setError(res.message || "Email atau kata sandi yang Anda masukkan salah.");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan sistem. Silakan coba beberapa saat lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    Swal.fire({
      title: "Lupa Kata Sandi?",
      html: `
        <div class="text-left text-xs space-y-3 text-slate-600 dark:text-slate-300">
          <p>Jika Anda lupa kata sandi akun <b>Ry-ITSolutions</b>, tim Customer Support kami siap membantu memulihkan akun Anda dengan cepat.</p>
          <div class="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 rounded-xl border border-blue-200 dark:border-blue-800">
            <p class="font-bold">Ketentuan Pemulihan:</p>
            <p class="text-[11px] mt-0.5">Sertakan alamat email atau nomor WhatsApp yang terdaftar untuk verifikasi kepemilikan akun.</p>
          </div>
        </div>
      `,
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Hubungi CS WhatsApp",
      cancelButtonText: "Tutup",
      confirmButtonColor: "#25D366",
    }).then((res) => {
      if (res.isConfirmed) {
        const text = encodeURIComponent(`Halo Admin Ry-ITSolutions, saya lupa kata sandi akun saya (Email: ${email || "-"}). Mohon bantuan reset kata sandi.`);
        window.open(`https://wa.me/6285770020477?text=${text}`, "_blank");
      }
    });
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* LEFT COLUMN: Modern Branding & Feature Showcase (Visible on Large Screens) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-950 text-white flex-col justify-between p-12 overflow-hidden select-none">
        {/* Ambient Gradient Glows */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/30 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
        <div className="absolute top-1/2 -right-24 w-80 h-80 bg-purple-600/25 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Subtle Cyber Grid Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "24px 24px"
          }}
        />

        {/* Top: Back to Home Link */}
        <div className="relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-slate-200 transition-all hover:gap-2.5 backdrop-blur-md"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span>Kembali ke Beranda</span>
          </Link>
        </div>

        {/* Center: Hero Branding & Trust Highlights */}
        <div className="relative z-10 space-y-8 my-auto py-8">
          <div className="space-y-4 max-w-lg">
            <div className="flex items-center gap-3">
              <Logo size={42} />
              <div className="h-6 w-px bg-white/20" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-cyan-400 bg-cyan-950/60 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                Official Digital Hub
              </span>
            </div>

            <h1 className="text-3xl xl:text-4xl font-black tracking-tight text-white leading-tight">
              Kelola Solusi IT &amp; FinTech dalam Satu Dashboard Terpadu.
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Masuk untuk memantau pesanan sinyal IMEI, payment gateway QRIS GoPay Unofficial, validasi database CEIR, hingga sistem nota digital otomatis.
            </p>
          </div>

          {/* 3 Interactive Feature Glass Cards */}
          <div className="space-y-3 max-w-md">
            <div className="p-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.09] border border-white/10 backdrop-blur-md transition-all flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 text-base shadow-inner">
                ⚡
              </div>
              <div className="text-xs">
                <h4 className="font-bold text-white">Aktivasi Sinyal &amp; IMEI All Operator</h4>
                <p className="text-slate-400 mt-0.5">Bergaransi sesuai paket &amp; proses terpantau real-time 24 jam.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.09] border border-white/10 backdrop-blur-md transition-all flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 text-base shadow-inner">
                💳
              </div>
              <div className="text-xs">
                <h4 className="font-bold text-white">Payment Gateway GoPay &amp; QRIS Unofficial</h4>
                <p className="text-slate-400 mt-0.5">Integrasi API &amp; webhook instan dengan mutasi otomatis ke rekening Anda.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.09] border border-white/10 backdrop-blur-md transition-all flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 text-base shadow-inner">
                🛡️
              </div>
              <div className="text-xs">
                <h4 className="font-bold text-white">Keamanan &amp; Enkripsi End-to-End</h4>
                <p className="text-slate-400 mt-0.5">Proteksi data kredensial dengan sertifikasi enkripsi SSL 256-bit.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Social Proof & Status Pill */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-slate-300">Server &amp; Gateway Online 99.9%</span>
          </div>
          <span className="text-[11px] text-slate-500">© 2026 Ry-ITSolutions. All rights reserved.</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Modern Form Container */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-4 sm:p-8 md:p-12 relative overflow-y-auto">
        {/* Soft Background Accents for Mobile */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none lg:hidden"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none lg:hidden"></div>

        {/* Mobile Top Bar */}
        <div className="w-full max-w-md flex items-center justify-between mb-6 lg:hidden">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span>Beranda</span>
          </Link>
          <Logo size={28} />
        </div>

        {/* Main Login Card */}
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl sm:shadow-2xl rounded-3xl p-6 sm:p-9 space-y-6 transition-all">
            
            {/* Header */}
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-bold">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <span>Portal Autentikasi Pengguna</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Selamat Datang
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Masuk ke akun Ry-ITSolutions Anda untuk mengakses dashboard dan layanan.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-start gap-2.5 animate-shake">
                <svg className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form className="space-y-4" onSubmit={handleLogin}>
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Alamat Email
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Kata Sandi
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  >
                    Lupa kata sandi?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 pl-10 pr-10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    title={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Ingat saya di perangkat ini
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Memverifikasi Akun...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Akun</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                </div>
                <span className="relative bg-white dark:bg-slate-900 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  atau masuk dengan
                </span>
              </div>

              {/* Google Sign In */}
              <div className="flex justify-center w-full">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError("Login Google digagalkan atau dibatalkan.")}
                  theme="outline"
                  size="large"
                  shape="pill"
                  text="signin_with"
                  width="100%"
                />
              </div>

              {/* Register CTA */}
              <p className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2">
                Belum memiliki akun?{" "}
                <Link
                  href="/register"
                  className="font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-all"
                >
                  Daftar Akun Baru
                </Link>
              </p>
            </form>
          </div>

          {/* Security & Encryption Trust Footer */}
          <div className="mt-6 text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span>Terkoneksi Aman dengan Enkripsi SSL 256-Bit</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
