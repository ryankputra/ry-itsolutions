"use client";
import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import { API_URL } from "@/lib/api";
import { useApp } from "@/lib/store";
import { Logo } from "@/components/ui/Logo";

function RegisterForm() {
  const searchParams = useSearchParams();
  const refParam = searchParams.get("ref") || "";

  // Step state: 'form' | 'otp'
  const [step, setStep] = useState<"form" | "otp">("form");

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState(refParam);

  // OTP State
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // UI Feedback State
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const { setUser } = useApp();
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Load persistent referral
  useEffect(() => {
    const initialRef = refParam || (typeof window !== "undefined" ? localStorage.getItem("ryy_ref_code") || "" : "");
    if (initialRef) {
      setReferralCode(initialRef.toUpperCase());
      if (typeof window !== "undefined") {
        localStorage.setItem("ryy_ref_code", initialRef.toUpperCase());
      }
    }
  }, [refParam]);

  // Resend Timer Countdown
  useEffect(() => {
    let interval: any = null;
    if (step === "otp" && resendTimer > 0) {
      setCanResend(false);
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, resendTimer]);

  // Focus OTP input when transitioning to OTP step
  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 150);
    }
  }, [step]);

  // Step 1: Request OTP from backend
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim() || !email.trim() || !password) {
      setError("Semua bidang formulir wajib diisi.");
      return;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    setIsLoading(true);
    try {
      const activeRef = referralCode.trim() || (typeof window !== "undefined" ? localStorage.getItem("ryy_ref_code") || "" : "");
      const res = await fetch(`${API_URL}/auth/register-request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          referral_code: activeRef ? activeRef.toUpperCase() : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.status) {
        setStep("otp");
        setResendTimer(60);
        setCanResend(false);
        setSuccess(`Kode verifikasi 6 digit telah dikirim ke ${data.email || email}. Cek inbox atau folder spam.`);
      } else {
        setError(data.message || "Gagal mengirim kode verifikasi.");
      }
    } catch (err: any) {
      setError("Terjadi kesalahan sistem saat menghubungi server. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP and finalize registration
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (otp.trim().length !== 6) {
      setError("Masukkan 6 digit kode verifikasi dengan lengkap.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register-verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
        }),
        credentials: "include",
      });

      const data = await res.json();
      if (res.ok && data.status) {
        setSuccess("Email berhasil diverifikasi! Mengalihkan ke dashboard...");
        if (data.user) {
          setUser(data.user);
        }
        setTimeout(() => {
          router.push("/dashboard");
        }, 1200);
      } else {
        setError(data.message || "Kode verifikasi salah atau telah kedaluwarsa.");
      }
    } catch (err: any) {
      setError("Terjadi kendala saat memverifikasi kode. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (!canResend || isLoading) return;
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const activeRef = referralCode.trim() || (typeof window !== "undefined" ? localStorage.getItem("ryy_ref_code") || "" : "");
      const res = await fetch(`${API_URL}/auth/register-request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          referral_code: activeRef ? activeRef.toUpperCase() : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.status) {
        setResendTimer(60);
        setCanResend(false);
        setSuccess("Kode verifikasi baru telah dikirimkan ke email Anda.");
      } else {
        setError(data.message || "Gagal mengirim ulang kode OTP.");
      }
    } catch (err: any) {
      setError("Gagal menghubungi server. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth Handler
  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    setError("");
    try {
      const activeRef = referralCode.trim() || (typeof window !== "undefined" ? localStorage.getItem("ryy_ref_code") || "" : "");
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
        setError(data.message || "Gagal masuk menggunakan Google.");
      }
    } catch (err: any) {
      setError("Terjadi kesalahan saat otentikasi Google.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6 sm:p-8 space-y-4">
      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium text-center animate-fadeIn">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium text-center animate-fadeIn">
          {success}
        </div>
      )}

      {step === "form" ? (
        /* STEP 1: REGISTRATION FORM */
        <>
          <form className="space-y-3.5" onSubmit={handleRequestOtp}>
            {/* Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Nama Lengkap</label>
              <input
                type="text"
                placeholder="Nama Anda"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0066cc] focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Email Aktif</label>
              <input
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0066cc] focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <p className="text-[10px] text-slate-400">Kode verifikasi OTP akan dikirim ke email ini.</p>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full h-10 rounded-xl border border-slate-300 bg-white pl-3.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0066cc] focus:ring-2 focus:ring-blue-100 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
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

            {/* Referral */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Kode Referral</label>
                <span className="text-[10px] text-slate-400">(Opsional)</span>
              </div>
              <input
                type="text"
                placeholder="Contoh: RYY8899"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-mono uppercase font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0066cc] focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 rounded-xl bg-[#0066cc] hover:bg-[#0052a3] active:bg-[#004080] text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 shadow-xs"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Mengirim Kode OTP...</span>
                </>
              ) : (
                <span>Lanjutkan & Verifikasi Email</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center py-1">
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
              onError={() => setError("Pendaftaran Google dibatalkan.")}
              theme="outline"
              size="large"
              shape="pill"
              text="signup_with"
              width="100%"
            />
          </div>
        </>
      ) : (
        /* STEP 2: EMAIL OTP VERIFICATION */
        <div className="space-y-4 animate-fadeIn">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 bg-blue-50 text-[#0066cc] border border-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-900">Verifikasi Alamat Email</h3>
            <p className="text-xs text-slate-500">
              Masukkan 6 digit kode OTP yang dikirim ke: <br />
              <strong className="text-slate-800 font-medium">{email}</strong>
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleVerifyOtp}>
            <div className="space-y-1.5">
              <input
                ref={otpInputRef}
                type="text"
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="• • • • • •"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full h-14 text-center text-2xl font-bold tracking-[0.5em] font-mono rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-900 focus:outline-none focus:border-[#0066cc] focus:ring-2 focus:ring-blue-100 transition-all"
                required
              />
              <p className="text-[11px] text-slate-400 text-center">Kode verifikasi berlaku selama 10 menit</p>
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full h-10 rounded-xl bg-[#0066cc] hover:bg-[#0052a3] active:bg-[#004080] text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <span>Verifikasi & Selesaikan Pendaftaran</span>
              )}
            </button>
          </form>

          {/* Resend & Back Controls */}
          <div className="flex flex-col items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="text-slate-500">
              Belum menerima kode?{" "}
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isLoading}
                  className="font-semibold text-[#0066cc] hover:underline"
                >
                  Kirim Ulang Kode
                </button>
              ) : (
                <span className="font-semibold text-slate-400 font-mono">
                  Kirim ulang dalam {resendTimer}s
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setStep("form");
                setOtp("");
                setError("");
                setSuccess("");
              }}
              className="text-slate-400 hover:text-slate-700 font-medium transition-colors flex items-center gap-1 text-[11px]"
            >
              ← Ubah Email / Data Pendaftaran
            </button>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-slate-600 pt-1">
        Sudah punya akun?{" "}
        <Link
          href="/login"
          className="font-semibold text-[#0066cc] hover:underline"
        >
          Masuk sekarang
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 bg-[#f8fafc] text-slate-800">
      <div className="w-full max-w-[420px] text-center mb-6">
        <Link href="/" className="inline-flex items-center justify-center hover:opacity-90 transition-opacity">
          <Logo size={40} />
        </Link>
        <h1 className="text-xl font-bold text-slate-900 mt-4 tracking-tight">
          Buat Akun Baru
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Daftar gratis untuk mengakses layanan dan harga mitra
        </p>
      </div>

      <Suspense fallback={<p className="text-center text-xs text-slate-400">Memuat formulir...</p>}>
        <RegisterForm />
      </Suspense>

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
