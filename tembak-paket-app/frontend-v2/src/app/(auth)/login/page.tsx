"use client";
import React, { useState, useEffect } from "react";
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
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<"request" | "verify">("request");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPass, setForgotNewPass] = useState("");
  const [forgotConfirmPass, setForgotConfirmPass] = useState("");
  const [forgotShowPass, setForgotShowPass] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [forgotTimer, setForgotTimer] = useState(60);
  const [forgotCanResend, setForgotCanResend] = useState(false);

  const router = useRouter();
  const { setUser } = useApp();

  useEffect(() => {
    const savedEmail = localStorage.getItem("ryy_saved_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Forgot password resend countdown timer
  useEffect(() => {
    let interval: any = null;
    if (isForgotModalOpen && forgotStep === "verify" && forgotTimer > 0) {
      setForgotCanResend(false);
      interval = setInterval(() => {
        setForgotTimer((prev) => {
          if (prev <= 1) {
            setForgotCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isForgotModalOpen, forgotStep, forgotTimer]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await loginApi(email.trim(), password);
      if (res.status && res.user) {
        if (rememberMe) {
          localStorage.setItem("ryy_saved_email", email.trim());
        } else {
          localStorage.removeItem("ryy_saved_email");
        }
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

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    setError("");
    try {
      const savedRef = typeof window !== "undefined" ? localStorage.getItem("ryy_ref_code") || "" : "";
      const res = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: credentialResponse.credential,
          referral_code: savedRef || undefined,
        }),
        credentials: "include",
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch (e) {
        throw new Error("Server sedang dalam proses sinkronisasi. Silakan coba sesaat lagi.");
      }
      if (res.ok && data.status) {
        setUser(data.user);
        router.push("/dashboard");
      } else {
        setError(data.message || "Gagal masuk menggunakan Google.");
      }
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      setError(err?.message || "Terjadi kesalahan saat otentikasi Google.");
    } finally {
      setIsLoading(false);
    }
  };

  const openForgotPasswordModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setForgotEmail(email.trim());
    setForgotStep("request");
    setForgotOtp("");
    setForgotNewPass("");
    setForgotConfirmPass("");
    setForgotError("");
    setForgotSuccess("");
    setIsForgotModalOpen(true);
  };

  const handleForgotRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    if (!forgotEmail.trim()) {
      setForgotError("Silakan masukkan alamat email Anda.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
      });
      const data = await res.json();

      if (res.ok && data.status) {
        setForgotStep("verify");
        setForgotTimer(60);
        setForgotCanResend(false);
        setForgotSuccess(`Kode verifikasi 6 digit telah dikirim ke ${forgotEmail.trim().toLowerCase()}.`);
      } else {
        setForgotError(data.message || "Email tidak ditemukan atau terjadi kesalahan.");
      }
    } catch (err: any) {
      setForgotError("Gagal menghubungi server. Silakan periksa koneksi Anda.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    if (forgotOtp.trim().length !== 6) {
      setForgotError("Kode verifikasi harus 6 digit angka.");
      return;
    }

    if (forgotNewPass.length < 6) {
      setForgotError("Password baru minimal 6 karakter.");
      return;
    }

    if (forgotNewPass !== forgotConfirmPass) {
      setForgotError("Konfirmasi password baru tidak cocok.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          otp: forgotOtp.trim(),
          newPassword: forgotNewPass,
        }),
      });
      const data = await res.json();

      if (res.ok && data.status) {
        setIsForgotModalOpen(false);
        setEmail(forgotEmail.trim());
        setPassword("");
        Swal.fire({
          icon: "success",
          title: "Password Berhasil Diperbarui!",
          text: "Silakan masuk dengan kata sandi baru Anda.",
          confirmButtonColor: "#0066cc",
        });
      } else {
        setForgotError(data.message || "Kode verifikasi salah atau kedaluwarsa.");
      }
    } catch (err: any) {
      setForgotError("Terjadi kesalahan saat mereset password. Silakan coba lagi.");
    } finally {
      setForgotLoading(false);
    }
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
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium text-center animate-fadeIn">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleLogin}>
          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Email</label>
            <input
              type="email"
              autoComplete="username email"
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
              <label className="text-xs font-semibold text-slate-700">Password</label>
              <button
                type="button"
                onClick={openForgotPasswordModal}
                className="text-[11px] font-medium text-[#0066cc] hover:underline"
              >
                Lupa password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
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
              <span className="text-xs text-slate-600">Ingat saya</span>
            </label>
          </div>

          {/* Submit */}
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

        {/* Register Link */}
        <p className="text-center text-xs text-slate-600 pt-1">
          Belum punya akun?{" "}
          <Link href="/register" className="font-semibold text-[#0066cc] hover:underline">
            Daftar sekarang
          </Link>
        </p>
      </div>

      {/* Back to Home */}
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

      {/* MODAL LUPA PASSWORD (OTOMATIS VIA RESEND EMAIL) */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-[420px] bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0066cc] flex items-center justify-center font-bold">
                  🔒
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Reset Kata Sandi</h3>
                  <p className="text-[11px] text-slate-500">
                    {forgotStep === "request" ? "Verifikasi email akun Anda" : "Masukkan kode & kata sandi baru"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {forgotError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium text-center animate-fadeIn">
                {forgotError}
              </div>
            )}

            {forgotSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium text-center animate-fadeIn">
                {forgotSuccess}
              </div>
            )}

            {forgotStep === "request" ? (
              /* STEP 1: MINTA KODE RESET */
              <form className="space-y-3.5" onSubmit={handleForgotRequestOtp}>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Email Akun Terdaftar</label>
                  <input
                    type="email"
                    placeholder="nama@email.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0066cc] focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <p className="text-[11px] text-slate-400">
                    Sistem akan mengirimkan 6 digit kode verifikasi ke email ini.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="h-9 px-4 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="h-9 px-4 rounded-xl bg-[#0066cc] hover:bg-[#0052a3] text-white text-xs font-semibold transition-colors disabled:opacity-60 flex items-center gap-2"
                  >
                    {forgotLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Mengirim Kode...</span>
                      </>
                    ) : (
                      <span>Kirim Kode Verifikasi</span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* STEP 2: VERIFIKASI KODE & BUAT PASSWORD BARU */
              <form className="space-y-3" onSubmit={handleForgotVerifyAndReset}>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Kode Verifikasi 6 Digit</label>
                  <input
                    type="text"
                    maxLength={6}
                    inputMode="numeric"
                    placeholder="123456"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    className="w-full h-11 text-center font-mono font-bold tracking-[0.4em] text-lg rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-900 focus:outline-none focus:border-[#0066cc] focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Password Baru</label>
                  <div className="relative">
                    <input
                      type={forgotShowPass ? "text" : "password"}
                      placeholder="Minimal 6 karakter"
                      value={forgotNewPass}
                      onChange={(e) => setForgotNewPass(e.target.value)}
                      required
                      minLength={6}
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white pl-3.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0066cc] focus:ring-2 focus:ring-blue-100 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setForgotShowPass(!forgotShowPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {forgotShowPass ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Ulangi Password Baru</label>
                  <input
                    type={forgotShowPass ? "text" : "password"}
                    placeholder="Konfirmasi password baru"
                    value={forgotConfirmPass}
                    onChange={(e) => setForgotConfirmPass(e.target.value)}
                    required
                    minLength={6}
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0066cc] focus:ring-2 focus:ring-blue-100 transition-all font-mono"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                  <div>
                    {forgotCanResend ? (
                      <button
                        type="button"
                        onClick={handleForgotRequestOtp}
                        disabled={forgotLoading}
                        className="font-semibold text-[#0066cc] hover:underline"
                      >
                        Kirim Ulang Kode
                      </button>
                    ) : (
                      <span className="text-slate-400">Kirim ulang ({forgotTimer}s)</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep("request");
                      setForgotOtp("");
                      setForgotError("");
                    }}
                    className="text-slate-500 hover:text-slate-800"
                  >
                    ← Ganti Email
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading || forgotOtp.length !== 6 || forgotNewPass.length < 6}
                  className="w-full h-10 rounded-xl bg-[#0066cc] hover:bg-[#0052a3] text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2 shadow-xs"
                >
                  {forgotLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Menyimpan Password...</span>
                    </>
                  ) : (
                    <span>Simpan Password Baru</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
