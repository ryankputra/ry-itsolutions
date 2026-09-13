"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useApp } from "@/lib/store";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Swal from "@/lib/sweetalert";
import { safeJson } from "@/lib/api";

function SettingsContent() {
  const { user, setUser } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab State
  type TabType = "profile" | "whatsapp" | "email" | "password";
  const initialTab = (searchParams.get("tab") as TabType) || "profile";
  const [activeTab, setActiveTab] = useState<TabType>(
    ["profile", "whatsapp", "email", "password"].includes(initialTab) ? initialTab : "profile"
  );

  // Form States
  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [newEmailInput, setNewEmailInput] = useState("");
  const [emailOtpInput, setEmailOtpInput] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI States
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setNameInput(user.name || "");
      setPhoneInput(user.verifiedPhone || user.phone || "");
    }
  }, [user]);

  // Sync tab with URL if changed externally
  useEffect(() => {
    const tabParam = searchParams.get("tab") as TabType;
    if (tabParam && ["profile", "whatsapp", "email", "password"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // OTP Countdown timer
  useEffect(() => {
    let timer: any;
    if (otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpCountdown]);

  // Handlers
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      return Swal.fire("Perhatian", "Ukuran file maksimal 5MB.", "warning");
    }

    const formData = new FormData();
    formData.append("avatar", file);

    setUploadingAvatar(true);
    try {
      const res = await fetch("/api/user/avatar", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await safeJson(res);
      if (data?.status && data.avatar) {
        if (user) setUser({ ...user, avatar: data.avatar });
        Swal.fire({
          icon: "success",
          title: "Foto Profil Diperbarui",
          text: "Foto profil akun Anda berhasil disimpan.",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        Swal.fire("Gagal", data?.message || "Gagal mengunggah foto profil.", "error");
      }
    } catch (err) {
      Swal.fire("Error", "Terjadi kesalahan saat mengunggah foto profil.", "error");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nameInput.trim()) {
      return Swal.fire("Perhatian", "Nama lengkap tidak boleh kosong.", "warning");
    }
    setSavingName(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      const data = await safeJson(res);
      if (data?.status) {
        if (user) setUser({ ...user, name: nameInput.trim() });
        Swal.fire({
          icon: "success",
          title: "Berhasil Disimpan",
          text: "Nama lengkap Anda berhasil diperbarui.",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        Swal.fire("Gagal", data?.message || "Gagal memperbarui nama.", "error");
      }
    } catch (err: any) {
      Swal.fire("Error", err.message || "Gagal menghubungi server.", "error");
    } finally {
      setSavingName(false);
    }
  };

  const handleSavePhone = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let clean = phoneInput.replace(/\D/g, "");
    if (!clean || clean.length < 9) {
      return Swal.fire("Perhatian", "Nomor WhatsApp minimal 9 digit angka.", "warning");
    }
    if (clean.startsWith("0")) clean = "62" + clean.substring(1);
    else if (!clean.startsWith("62")) clean = "62" + clean;

    setSavingPhone(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: clean }),
      });
      const data = await safeJson(res);
      if (data?.status) {
        if (user) setUser({ ...user, phone: clean, verifiedPhone: clean });
        setPhoneInput(clean);
        Swal.fire({
          icon: "success",
          title: "Berhasil Disimpan",
          text: "Nomor WhatsApp aktif untuk nota invoice dan notifikasi status pesanan.",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        Swal.fire("Gagal", data?.message || "Gagal menyimpan nomor WhatsApp.", "error");
      }
    } catch (err: any) {
      Swal.fire("Error", err.message || "Gagal menghubungi server.", "error");
    } finally {
      setSavingPhone(false);
    }
  };

  const handleRequestEmailOtp = async () => {
    if (!newEmailInput.trim() || !newEmailInput.includes("@")) {
      return Swal.fire("Perhatian", "Masukkan alamat email baru yang valid.", "warning");
    }
    if (newEmailInput.trim().toLowerCase() === (user?.email || "").toLowerCase()) {
      return Swal.fire("Perhatian", "Email baru tidak boleh sama dengan email saat ini.", "info");
    }

    setSendingOtp(true);
    try {
      const res = await fetch("/api/user/request-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newEmail: newEmailInput.trim() }),
      });
      const data = await safeJson(res);
      if (data?.status) {
        setOtpSent(true);
        setOtpCountdown(60);
        Swal.fire({
          icon: "success",
          title: "Kode OTP Terkirim",
          text: data.message || `Kode verifikasi 6 digit telah dikirim ke ${newEmailInput}. Silakan periksa Kotak Masuk atau folder Spam.`,
        });
      } else {
        Swal.fire("Gagal", data?.message || "Gagal mengirim kode OTP ke email baru.", "error");
      }
    } catch (err: any) {
      Swal.fire("Error", err.message || "Gagal menghubungi server.", "error");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyEmailOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newEmailInput.trim() || !emailOtpInput.trim()) {
      return Swal.fire("Perhatian", "Masukkan email baru dan kode OTP 6 digit.", "warning");
    }
    setVerifyingOtp(true);
    try {
      const res = await fetch("/api/user/verify-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          newEmail: newEmailInput.trim(),
          otp: emailOtpInput.trim(),
        }),
      });
      const data = await safeJson(res);
      if (data?.status) {
        if (user) setUser({ ...user, email: newEmailInput.trim().toLowerCase() });
        setOtpSent(false);
        setEmailOtpInput("");
        setNewEmailInput("");
        Swal.fire({
          icon: "success",
          title: "Email Berhasil Diperbarui",
          text: "Alamat email akun Anda telah berhasil diganti.",
        });
      } else {
        Swal.fire("Gagal", data?.message || "Kode OTP tidak valid atau telah kedaluwarsa.", "error");
      }
    } catch (err: any) {
      Swal.fire("Error", err.message || "Gagal menghubungi server.", "error");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleChangePassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentPassword || !newPassword) {
      return Swal.fire("Perhatian", "Harap isi kata sandi saat ini dan kata sandi baru.", "warning");
    }
    if (newPassword.length < 6) {
      return Swal.fire("Perhatian", "Kata sandi baru minimal 6 karakter.", "warning");
    }
    if (newPassword !== confirmPassword) {
      return Swal.fire("Perhatian", "Konfirmasi kata sandi baru tidak cocok.", "error");
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await safeJson(res);
      if (data?.status) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        Swal.fire({
          icon: "success",
          title: "Kata Sandi Diperbarui",
          text: data.message || "Gunakan kata sandi baru ini untuk login berikutnya.",
        });
      } else {
        Swal.fire("Gagal", data?.message || "Kata sandi saat ini tidak sesuai.", "error");
      }
    } catch (err: any) {
      Swal.fire("Error", err.message || "Gagal memperbarui kata sandi.", "error");
    } finally {
      setSavingPassword(false);
    }
  };

  const username = user?.name || user?.email?.split("@")[0] || "Pengguna";

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-28 pt-2 px-3 sm:px-4">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-hairline pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="p-2 rounded-xl bg-canvas border border-hairline hover:bg-parchment text-ink transition-colors flex items-center justify-center"
            title="Kembali ke Halaman Profil"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-ink tracking-tight">
              Pengaturan Akun
            </h1>
            <p className="text-xs text-ink-muted">
              Kelola identitas, nomor WhatsApp notifikasi, alamat email, dan keamanan.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (SVG Only - No Emojis) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 rounded-2xl bg-canvas border border-hairline shadow-xs">
        {[
          {
            id: "profile" as TabType,
            label: "Data Diri",
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            ),
          },
          {
            id: "whatsapp" as TabType,
            label: "WhatsApp",
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-.85-.929l.643-2.176C3.89 16.574 3 14.394 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            ),
          },
          {
            id: "email" as TabType,
            label: "Ganti Email",
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            ),
          },
          {
            id: "password" as TabType,
            label: "Keamanan",
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            ),
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 select-none ${
              activeTab === tab.id
                ? "bg-primary text-white shadow-xs"
                : "text-ink-muted hover:text-ink hover:bg-parchment"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: DATA DIRI */}
      {activeTab === "profile" && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-canvas border border-hairline p-4 sm:p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-ink border-b border-hairline pb-2.5">
              Identitas Pengguna
            </h2>

            {/* Foto Profil */}
            <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-parchment/40 border border-hairline">
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-full bg-canvas border border-hairline overflow-hidden flex items-center justify-center font-bold text-xl text-primary">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={username} className="w-full h-full object-cover" />
                  ) : (
                    username[0]
                  )}
                </div>
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="font-bold text-ink text-xs sm:text-sm">Foto Profil</p>
                <p className="text-[11px] text-ink-muted">Format JPG, PNG, atau WEBP (Maksimal 5MB)</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="px-3 py-1.5 rounded-lg bg-canvas border border-hairline hover:border-primary text-primary text-[11px] font-bold transition-colors inline-flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                  <span>{uploadingAvatar ? "Mengunggah..." : "Pilih Foto Baru"}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
            </div>

            {/* Form Nama */}
            <form onSubmit={handleSaveName} className="space-y-4">
              <div>
                <label className="font-bold text-ink text-xs block mb-1.5">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Masukkan nama lengkap Anda"
                  className="w-full p-2.5 rounded-xl border border-hairline bg-canvas text-ink text-xs font-semibold focus:border-primary outline-none transition-all"
                />
                <p className="text-[11px] text-ink-muted mt-1">Nama ini tercantum pada bukti invoice dan sapaan profil.</p>
              </div>

              <div>
                <label className="font-bold text-ink-muted text-xs block mb-1.5">ID Pengguna (Sistem)</label>
                <input
                  type="text"
                  disabled
                  value={user?.id || ""}
                  className="w-full p-2.5 rounded-xl border border-hairline/60 bg-parchment/50 text-ink-muted font-mono text-xs cursor-not-allowed"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={savingName}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {savingName ? "Menyimpan..." : "Simpan Perubahan Nama"}
                </button>
              </div>
            </form>
          </div>

          {/* Kartu Tingkatan Member */}
          <div className="rounded-2xl bg-canvas border border-hairline p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-hairline pb-2.5">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-ink">Tingkatan Akun</h3>
                <p className="text-[11px] text-ink-muted">Status peranan dan tingkatan hak akses akun Anda</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[10px] border border-emerald-500/20">
                Aktif
              </span>
            </div>

            <div className="p-3 rounded-xl bg-parchment/40 border border-hairline space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink">Peranan Saat Ini:</span>
                <span className="font-mono text-xs font-bold uppercase px-2.5 py-0.5 rounded-lg bg-canvas border border-hairline text-ink">
                  {user?.role === "admin"
                    ? "Administrator"
                    : user?.role === "reseller"
                    ? "Mitra Reseller"
                    : "Member Reguler"}
                </span>
              </div>

              <p className="text-[11px] text-ink-muted leading-relaxed">
                {user?.role === "admin"
                  ? "Akun memiliki hak akses administrator penuh untuk mengelola konfigurasi, layanan, dan transaksi sistem."
                  : user?.role === "reseller"
                  ? "Akun Anda aktif sebagai Mitra Reseller. Anda berhak mendapatkan harga grosir terendah dan antrean pemrosesan prioritas utama."
                  : "Akun Anda berstatus Member Reguler. Tingkatkan status akun Anda ke Mitra Reseller untuk mendapatkan harga grosir unblock IMEI dan pengerjaan prioritas antrean pertama."}
              </p>

              {user?.role !== "admin" && user?.role !== "reseller" && (
                <div className="pt-2 border-t border-hairline/60">
                  <a
                    href={`https://wa.me/6287767287284?text=${encodeURIComponent(
                      `Halo Admin Ry-ITSolutions, saya ingin mengajukan upgrade tingkatan akun menjadi Mitra Reseller. (ID Akun: ${
                        user?.id || ""
                      }, Nama: ${user?.name || username})`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                    </svg>
                    <span>Ajukan Upgrade Reseller via CS WhatsApp</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WHATSAPP NOTIFIKASI */}
      {activeTab === "whatsapp" && (
        <div className="rounded-2xl bg-canvas border border-hairline p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-hairline pb-2.5">
            <div>
              <h2 className="text-sm font-bold text-ink">Nomor WhatsApp Notifikasi</h2>
              <p className="text-[11px] text-ink-muted">Pengiriman bukti invoice dan status pengerjaan transaksi otomatis</p>
            </div>
            {phoneInput ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[10px] border border-emerald-500/20">
                Terhubung
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-bold text-[10px] border border-amber-500/20">
                Belum Diatur
              </span>
            )}
          </div>

          <div className="p-3 rounded-xl bg-parchment/40 border border-hairline text-xs text-ink-muted leading-relaxed">
            Bot WhatsApp resmi Ry-ITSolutions akan mengirimkan notifikasi digital setiap kali transaksi Anda berhasil, termasuk nota pembayaran QRIS, link garansi unblock IMEI, dan informasi update sistem.
          </div>

          <form onSubmit={handleSavePhone} className="space-y-4">
            <div>
              <label className="font-bold text-ink text-xs block mb-1.5">Nomor WhatsApp Aktif</label>
              <input
                type="text"
                required
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="Contoh: 081234567890 atau 6281234567890"
                className="w-full p-2.5 rounded-xl border border-hairline bg-canvas text-ink text-xs font-semibold focus:border-primary outline-none transition-all"
              />
              <p className="text-[11px] text-ink-muted mt-1">
                Format dapat diawali dengan 08... atau 628... Sistem akan otomatis menyesuaikan format kode negara.
              </p>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={savingPhone}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {savingPhone ? "Menyimpan..." : "Simpan Nomor WhatsApp"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: GANTI EMAIL */}
      {activeTab === "email" && (
        <div className="rounded-2xl bg-canvas border border-hairline p-4 sm:p-5 shadow-xs space-y-4">
          <div className="border-b border-hairline pb-2.5">
            <h2 className="text-sm font-bold text-ink">Perubahan Alamat Email</h2>
            <p className="text-[11px] text-ink-muted">Email digunakan sebagai identitas akun dan pemulihan kata sandi</p>
          </div>

          <div className="p-3 rounded-xl bg-parchment/40 border border-hairline flex items-center justify-between">
            <span className="text-xs font-bold text-ink">Email Saat Ini:</span>
            <span className="font-mono text-xs text-primary font-bold">{user?.email || "Belum ada"}</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="font-bold text-ink text-xs block mb-1.5">Alamat Email Baru</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  required
                  value={newEmailInput}
                  onChange={(e) => setNewEmailInput(e.target.value)}
                  placeholder="Masukkan alamat email baru"
                  className="flex-1 p-2.5 rounded-xl border border-hairline bg-canvas text-ink text-xs font-semibold focus:border-primary outline-none transition-all"
                />
                <button
                  type="button"
                  disabled={sendingOtp || otpCountdown > 0 || !newEmailInput.trim()}
                  onClick={handleRequestEmailOtp}
                  className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-xs transition-all shrink-0 disabled:opacity-50"
                >
                  {sendingOtp
                    ? "Mengirim..."
                    : otpCountdown > 0
                    ? `Kirim Ulang (${otpCountdown}s)`
                    : otpSent
                    ? "Kirim Ulang OTP"
                    : "Kirim Kode OTP"}
                </button>
              </div>
              <p className="text-[11px] text-ink-muted mt-1">
                Kode verifikasi 6 digit akan dikirimkan ke email baru Anda untuk konfirmasi kepemilikan.
              </p>
            </div>

            {otpSent && (
              <form onSubmit={handleVerifyEmailOtp} className="p-4 rounded-xl border border-hairline bg-parchment/30 space-y-3 animate-in fade-in duration-200">
                <div>
                  <label className="font-bold text-ink text-xs block mb-1">
                    Masukkan Kode OTP 6 Digit dari Email Baru
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={emailOtpInput}
                    onChange={(e) => setEmailOtpInput(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full p-2.5 rounded-xl border border-hairline bg-canvas text-ink font-mono text-center text-lg tracking-widest focus:border-primary outline-none"
                  />
                  <p className="text-[11px] text-ink-muted mt-1">
                    Kode verifikasi berlaku selama 15 menit.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setEmailOtpInput("");
                    }}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-parchment hover:bg-hairline text-ink font-bold text-xs transition-colors"
                  >
                    Ganti Email Baru
                  </button>
                  <button
                    type="submit"
                    disabled={verifyingOtp || emailOtpInput.length < 6}
                    className="w-full sm:w-auto px-6 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50"
                  >
                    {verifyingOtp ? "Memverifikasi..." : "Verifikasi & Simpan Email Baru"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: KEAMANAN & PASSWORD */}
      {activeTab === "password" && (
        <div className="rounded-2xl bg-canvas border border-hairline p-4 sm:p-5 shadow-xs space-y-4">
          <div className="border-b border-hairline pb-2.5">
            <h2 className="text-sm font-bold text-ink">Keamanan Kata Sandi</h2>
            <p className="text-[11px] text-ink-muted">Gunakan kombinasi minimal 6 karakter untuk menjaga akun Anda tetap aman</p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="font-bold text-ink text-xs block mb-1">Kata Sandi Saat Ini</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan kata sandi saat ini"
                  className="w-full p-2.5 pr-10 rounded-xl border border-hairline bg-canvas text-ink text-xs font-semibold focus:border-primary outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-2.5 top-2.5 p-1 text-ink-muted hover:text-ink transition-colors"
                  title={showCurrentPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                >
                  {showCurrentPassword ? (
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

            <div>
              <label className="font-bold text-ink text-xs block mb-1">Kata Sandi Baru</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full p-2.5 pr-10 rounded-xl border border-hairline bg-canvas text-ink text-xs font-semibold focus:border-primary outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2.5 top-2.5 p-1 text-ink-muted hover:text-ink transition-colors"
                  title={showNewPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                >
                  {showNewPassword ? (
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

            <div>
              <label className="font-bold text-ink text-xs block mb-1">Konfirmasi Kata Sandi Baru</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                className="w-full p-2.5 rounded-xl border border-hairline bg-canvas text-ink text-xs font-semibold focus:border-primary outline-none"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={savingPassword || !currentPassword || !newPassword}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {savingPassword ? "Menyimpan..." : "Simpan Kata Sandi Baru"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-ink-muted">Memuat pengaturan akun...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
