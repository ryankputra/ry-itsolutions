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
      const activeRef = typeof window !== "undefined"
        ? (new URLSearchParams(window.location.search).get("ref") || localStorage.getItem("ryy_ref_code") || "")
        : "";
      const res = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: credentialResponse.credential,
          referral_code: activeRef ? activeRef.toUpperCase() : undefined,
        }),
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
        setError(res.message || "Email atau kata sandi salah.");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan sistem. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    Swal.fire({
      title: "Lupa Password?",
      text: "Silakan hubungi Customer Support kami melalui WhatsApp untuk bantuan reset password.",
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Hubungi CS WhatsApp",
      cancelButtonText: "Batal",
      confirmButtonColor: "#0066cc",
    }).then((res) => {
      if (res.isConfirmed) {
        const text = encodeURIComponent(`Halo Admin Ry-ITSolutions, saya butuh bantuan reset password akun saya (Email: ${email || "-"}).`);
        window.open(`https://wa.me/6285770020477?text=${text}`, "_blank");
      }
    });
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 bg-[#f8fafc] text-slate-800">
      
      {/* Brand Header */}
      <div className="w-full max-w-[400px] text-center mb-6">
        <Link href="/" className="inline-flex items-center justify-center hover:opacity-90 transition-opacity">
          <Logo size={40} />
        </Link>
        <h1 className="text-xl font-bold text-slate-900 mt-4 tracking-tight">
          Masuk ke Akun
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Selamat datang kembali, silakan masuk ke akun Anda
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-[400px] bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6 sm:p-8 space-y-5">
        
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium text-center">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleLogin}>
          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Email
            </label>
            <input
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0066cc] focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Password
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-[11px] font-medium text-[#0066cc] hover:underline"
              >
                Lupa password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-10 rounded-xl border border-slate-300 bg-white pl-3.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0066cc] focus:ring-2 focus:ring-blue-100 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                title={showPassword ? "Sembunyikan password" : "Lihat password"}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#0066cc] focus:ring-0 cursor-pointer"
              />
              <span className="text-xs text-slate-600">
                Ingat saya
              </span>
            </label>
          </div>

          {/* Button Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 rounded-xl bg-[#0066cc] hover:bg-[#0052a3] active:bg-[#004080] text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Memproses...</span>
              </>
            ) : (
              <span>Masuk</span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center pt-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <span className="relative bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            atau
          </span>
        </div>

        {/* Google Login */}
        <div className="flex justify-center w-full">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError("Login Google dibatalkan.")}
            theme="outline"
            size="large"
            shape="pill"
            text="signin_with"
            width="100%"
          />
        </div>

        {/* Register link */}
        <p className="text-center text-xs text-slate-600 pt-1">
          Belum punya akun?{" "}
          <Link
            href="/register"
            className="font-semibold text-[#0066cc] hover:underline"
          >
            Daftar sekarang
          </Link>
        </p>
      </div>

      {/* Back to Home Link */}
      <div className="mt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          <span>Kembali ke Halaman Utama</span>
        </Link>
      </div>

    </div>
  );
}
