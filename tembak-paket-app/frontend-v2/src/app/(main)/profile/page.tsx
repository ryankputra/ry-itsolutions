"use client";
import React, { useState, useEffect, useRef } from "react";
import { useApp } from "@/lib/store";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "@/lib/sweetalert";
import { safeJson } from "@/lib/api";
import { PushSettingsCard } from "@/components/ui/PushSettingsCard";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { InstallAppButton } from "@/components/ui/InstallAppButton";

export default function ProfilePage() {
  const { user, setUser, cartCount } = useApp();
  const router = useRouter();

  const [vouchersCount, setVouchersCount] = useState(0);
  const [orderCounts, setOrderCounts] = useState({
    pending: 0,
    waiting: 0,
    processing: 0,
    success: 0,
    canceled: 0,
  });

  // Modal Settings States
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'whatsapp' | 'email' | 'password'>('profile');

  // Form States for Profile Settings
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [phoneInput, setPhoneInput] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  const [newEmailInput, setNewEmailInput] = useState("");
  const [emailOtpInput, setEmailOtpInput] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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

  useEffect(() => {
    // Fetch transaction counts
    fetch("/api/user/transactions", { credentials: "include" })
      .then((res) => safeJson(res))
      .then((data) => {
        if (data?.status && Array.isArray(data.data)) {
          const pending = data.data.filter(
            (t: any) =>
              (t.status === "pending" || t.status === "unpaid") &&
              t.payment_method !== "balance" &&
              t.paymentMethod !== "balance"
          ).length;
          const waiting = data.data.filter((t: any) => {
            const s = (t.status || "").toLowerCase();
            const note = (t.admin_note || t.adminNote || "").toLowerCase();
            return (
              s === "in_queue" ||
              s === "waiting" ||
              s === "waiting_admin" ||
              (s === "processing" && note.includes("menunggu"))
            );
          }).length;
          const processing = data.data.filter((t: any) => {
            const s = (t.status || "").toLowerCase();
            const note = (t.admin_note || t.adminNote || "").toLowerCase();
            return (
              (s === "processing" || s === "in_progress") &&
              !note.includes("menunggu")
            );
          }).length;
          const success = data.data.filter(
            (t: any) => t.status === "success" || t.status === "completed"
          ).length;
          const canceled = data.data.filter(
            (t: any) =>
              t.status === "failed" ||
              t.status === "canceled" ||
              t.status === "cancelled" ||
              t.status === "rejected" ||
              t.status === "refunded"
          ).length;
          setOrderCounts({ pending, waiting, processing, success, canceled });
        }
      })
      .catch(() => {});

    // Fetch public vouchers count
    fetch("/api/coupons/public", { credentials: "include" })
      .then((res) => safeJson(res))
      .then((data) => {
        if (data?.status && Array.isArray(data.data)) {
          setVouchersCount(data.data.length);
        }
      })
      .catch(() => {});
  }, []);

  const openSettingsModal = (tab: 'profile' | 'whatsapp' | 'email' | 'password' = 'profile') => {
    setNameInput(user?.name || "");
    setPhoneInput(user?.phone || user?.verifiedPhone || "");
    setNewEmailInput("");
    setEmailOtpInput("");
    setOtpSent(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSettingsTab(tab);
    setShowSettingsModal(true);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      Swal.fire({ icon: "error", title: "Format Salah", text: "Pilih file gambar (JPG, PNG, WEBP)." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({ icon: "error", title: "Ukuran Terlalu Besar", text: "Ukuran maksimal foto adalah 5MB." });
      return;
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
        setUser(user ? { ...user, avatar: data.avatar } : null);
        Swal.fire({
          icon: "success",
          title: "Foto Profil Diperbarui",
          text: "Foto profil akun Anda berhasil disimpan.",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({ icon: "error", title: "Gagal Mengunggah", text: data?.message || "Terjadi kesalahan." });
      }
    } catch (err) {
      Swal.fire({ icon: "error", title: "Gagal", text: "Gagal mengunggah foto profil." });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nameInput.trim()) {
      return Swal.fire("Perhatian", "Nama lengkap tidak boleh kosong!", "warning");
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
        if (user) {
          setUser({ ...user, name: nameInput.trim() });
        }
        Swal.fire({
          icon: "success",
          title: "Berhasil!",
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
      return Swal.fire("Perhatian", "Nomor WhatsApp minimal 9 digit angka!", "warning");
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
        if (user) {
          setUser({ ...user, phone: clean, verifiedPhone: clean });
        }
        Swal.fire({
          icon: "success",
          title: "Berhasil Disimpan!",
          text: "Nomor WhatsApp aktif untuk menerima invoice dan notifikasi otomatis.",
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
      return Swal.fire("Perhatian", "Masukkan alamat email baru yang valid!", "warning");
    }
    if (newEmailInput.trim().toLowerCase() === (user?.email || "").toLowerCase()) {
      return Swal.fire("Perhatian", "Email baru tidak boleh sama dengan email saat ini!", "info");
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
          title: "Kode OTP Terkirim!",
          text: data.message || `Kode 6 digit telah dikirim ke ${newEmailInput}. Silakan cek Inbox / Spam.`,
        });
      } else {
        Swal.fire("Gagal", data?.message || "Gagal mengirim OTP ke email baru.", "error");
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
        if (user) {
          setUser({ ...user, email: newEmailInput.trim().toLowerCase() });
        }
        setOtpSent(false);
        setEmailOtpInput("");
        setNewEmailInput("");
        Swal.fire({
          icon: "success",
          title: "Email Berhasil Diubah!",
          text: "Alamat email akun Anda telah berhasil diperbarui.",
        });
      } else {
        Swal.fire("Gagal", data?.message || "Kode OTP salah atau telah kedaluwarsa.", "error");
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
      return Swal.fire("Perhatian", "Mohon isi password saat ini dan password baru.", "warning");
    }
    if (newPassword.length < 6) {
      return Swal.fire("Perhatian", "Password baru minimal 6 karakter.", "warning");
    }
    if (newPassword !== confirmPassword) {
      return Swal.fire("Perhatian", "Konfirmasi password baru tidak cocok!", "error");
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
          title: "Password Berhasil Diubah!",
          text: data.message || "Gunakan password baru ini untuk login berikutnya.",
        });
      } else {
        Swal.fire("Gagal", data?.message || "Password saat ini salah.", "error");
      }
    } catch (err: any) {
      Swal.fire("Error", err.message || "Gagal mengubah password.", "error");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    const { isConfirmed } = await Swal.fire({
      title: "Konfirmasi Keluar",
      text: "Apakah Anda yakin ingin keluar dari akun?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Keluar",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ef4444",
    });

    if (isConfirmed) {
      try {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      } catch (e) {}
      setUser(null);
      router.push("/login");
    }
  };

  const userCoins = user?.coins || 0;
  const userBalance = user?.balance || 0;
  const rawUsername = user?.name || user?.email?.split("@")[0] || "Pengguna Ry";
  const username = rawUsername.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, "").trim() || "Pengguna Ry";
  const userPhone = user?.phone || user?.verifiedPhone || "";

  return (
    <div className="max-w-2xl mx-auto space-y-3 pb-24">
      {/* ============================================================ */}
      {/* 1. TOP PROFILE HEADER CARD (Apple ID Clean & Interactive)    */}
      {/* ============================================================ */}
      <div className="rounded-3xl bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-black/[0.05] dark:border-white/[0.08] relative">
        {/* Top Mini Icons (Cart, CS, Settings) */}
        <div className="flex items-center justify-end gap-2 mb-3">
          <Link
            href="/cart"
            className="p-2 rounded-full bg-[#F5F5F7] dark:bg-[#2C2C2E] hover:bg-[#E8E8ED] dark:hover:bg-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] transition-colors relative"
            title="Keranjang Belanja"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[#FF3B30] text-white rounded-full min-w-[16px] h-4 px-1 text-[9px] font-bold flex items-center justify-center shadow-xs">
                {cartCount}
              </span>
            )}
          </Link>

          <Link
            href="/tickets"
            className="p-2 rounded-full bg-[#F5F5F7] dark:bg-[#2C2C2E] hover:bg-[#E8E8ED] dark:hover:bg-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] transition-colors"
            title="Pusat Bantuan CS"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-.85-.929l.643-2.176C3.89 16.574 3 14.394 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </Link>

          <button
            type="button"
            onClick={() => openSettingsModal('profile')}
            className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
            title="Pengaturan Profil & Akun"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* User Info Row */}
        <div className="flex items-center gap-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 rounded-full bg-[#E8E8ED] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-white flex items-center justify-center font-bold text-2xl shadow-xs uppercase shrink-0 relative cursor-pointer group border border-black/[0.08] dark:border-white/[0.1] overflow-hidden"
            title="Klik untuk ubah foto profil"
          >
            {user?.avatar ? (
              <img
                src={user.avatar.startsWith("http") || user.avatar.startsWith("data:") ? user.avatar : `${user.avatar}`}
                alt={username}
                className="w-full h-full object-cover"
              />
            ) : (
              username[0]
            )}

            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
            </div>

            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />

          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2
                onClick={() => openSettingsModal('profile')}
                className="font-bold text-base sm:text-lg text-[#1D1D1F] dark:text-[#F5F5F7] truncate cursor-pointer hover:text-primary transition-colors"
              >
                {username}
              </h2>
              {user?.role === "admin" ? (
                <Link
                  href="/admin"
                  className="px-2.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-semibold uppercase tracking-wider shadow-xs hover:bg-primary-hover transition-colors shrink-0 flex items-center gap-1"
                  title="Masuk ke Dashboard Admin"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  <span>ADMIN</span>
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-[#E8E8ED] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] text-[10px] font-semibold uppercase tracking-wider shrink-0">
                  MEMBER VIP
                </span>
              )}
            </div>

            <p className="text-xs text-[#86868B] truncate">
              {user?.email || "Belum ada email terdaftar"}
            </p>

            {/* Nomor WhatsApp Notifikasi Terhubung */}
            <div
              onClick={() => openSettingsModal('whatsapp')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold cursor-pointer hover:bg-emerald-500/20 transition-colors"
              title="Klik untuk ubah nomor WhatsApp Notifikasi"
            >
              <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              <span>WA Notifikasi:</span>
              <span className="font-black">
                {userPhone ? userPhone : "Belum diatur"}
              </span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-bold text-[8px] uppercase">
                {userPhone ? "Aktif" : "Set"}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 underline ml-0.5">Ubah</span>
            </div>

            {/* Button Edit Profil & Keamanan */}
            <div className="pt-1.5">
              <button
                type="button"
                onClick={() => openSettingsModal('profile')}
                className="px-3 py-1 rounded-full bg-primary hover:bg-primary-hover text-white text-[11px] font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                <span>Edit Profil &amp; Keamanan</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1.5. DEDICATED ADMIN CONTROL CARD (Apple Obsidian Card)     */}
      {/* ============================================================ */}
      {user?.role === "admin" && (
        <div className="rounded-3xl bg-[#1C1C1E] text-white border border-white/[0.08] p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] space-y-3.5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center shadow-xs">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </span>
              <div>
                <h3 className="font-semibold text-xs sm:text-sm text-white flex items-center gap-1.5">
                  <span>Panel Kontrol Admin (Owner)</span>
                  <span className="px-2 py-0.2 rounded-full bg-primary/20 text-primary text-[9px] font-semibold">Aktif</span>
                </h3>
                <p className="text-[11px] text-[#86868B]">
                  Manajemen sistem, pengerjaan order manual &amp; pengaturan promo
                </p>
              </div>
            </div>
            <Link
              href="/admin"
              className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white font-semibold text-xs rounded-full shadow-xs transition-colors shrink-0 flex items-center gap-1"
            >
              <span>Buka Panel</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
            {/* Dashboard */}
            <Link
              href="/admin"
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex flex-col items-center group"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <span className="text-xs font-black mt-1.5 text-slate-100">Dashboard</span>
              <span className="text-[9px] text-amber-400 font-medium">Statistik Toko</span>
            </Link>

            {/* Order Manual */}
            <Link
              href="/admin#manual-orders"
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex flex-col items-center group"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              </div>
              <span className="text-xs font-black mt-1.5 text-slate-100">Order Manual</span>
              <span className="text-[9px] text-amber-400 font-medium">Proses IMEI</span>
            </Link>

            {/* Pengguna */}
            <Link
              href="/admin#users"
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex flex-col items-center group"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <span className="text-xs font-black mt-1.5 text-slate-100">Member</span>
              <span className="text-[9px] text-amber-400 font-medium">Data Pelanggan</span>
            </Link>

            {/* Pengaturan */}
            <Link
              href="/admin#settings"
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex flex-col items-center group"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-xs font-black mt-1.5 text-slate-100">Pengaturan</span>
              <span className="text-[9px] text-amber-400 font-medium">Maintenance</span>
            </Link>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. PESANAN SAYA CARD (Langsung Tepat Di Bawah Profil)        */}
      {/* ============================================================ */}
      <div className="rounded-2xl bg-canvas border border-hairline p-4 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between border-b border-hairline/80 pb-2.5">
          <h3 className="font-black text-xs sm:text-sm text-ink">Pesanan Saya</h3>
          <Link
            href="/history"
            className="text-[11px] font-bold text-ink-muted hover:text-primary transition-colors flex items-center gap-1"
          >
            <span>Lihat Riwayat Pesanan</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>

        {/* 5 Status Icons: Belum Bayar, Menunggu, Diproses, Selesai, Refund */}
        <div className="grid grid-cols-5 gap-1 text-center pt-1">
          {[
            {
              label: "Belum Bayar",
              href: "/history?tab=unpaid",
              badge: orderCounts.pending > 0 ? orderCounts.pending : null,
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
              ),
            },
            {
              label: "Menunggu",
              href: "/history?tab=waiting",
              badge: orderCounts.waiting > 0 ? orderCounts.waiting : null,
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
            },
            {
              label: "Diproses",
              href: "/history?tab=processing",
              badge: orderCounts.processing > 0 ? orderCounts.processing : null,
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              ),
            },
            {
              label: "Selesai",
              href: "/history?tab=success",
              badge: orderCounts.success > 0 ? orderCounts.success : null,
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
            },
            {
              label: "Refund",
              href: "/history?tab=canceled",
              badge: orderCounts.canceled > 0 ? orderCounts.canceled : null,
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                </svg>
              ),
            },
          ].map((item, idx) => (
            <div
              key={idx}
              onClick={() => router.push(item.href)}
              className="flex flex-col items-center justify-center p-1.5 rounded-xl hover:bg-parchment/60 transition-colors cursor-pointer group relative"
            >
              <div className="relative text-ink-muted group-hover:text-primary transition-colors">
                {item.icon}
                {item.badge !== null && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white rounded-full min-w-[15px] h-4 px-1 text-[9px] font-black flex items-center justify-center shadow-xs">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold text-ink mt-1.5 truncate max-w-full">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Shortcuts Order IMEI & Garansi */}
        <div className="pt-2 border-t border-hairline space-y-2">
          <div
            onClick={() => router.push("/unblock-imei")}
            className="flex items-center justify-between py-1 cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-primary flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                </svg>
              </div>
              <span className="text-xs font-bold text-ink group-hover:text-primary transition-colors">
                Aktivasi IMEI &amp; CEIR
              </span>
            </div>
            <span className="text-[11px] font-bold text-primary flex items-center gap-1">
              <span>Order Sekarang</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </span>
          </div>

          <div
            onClick={() => router.push("/cek-garansi")}
            className="flex items-center justify-between py-1 cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <span className="text-xs font-bold text-ink group-hover:text-primary transition-colors">
                Lacak Nota &amp; Garansi Digital
              </span>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
              <span>Garansi Resmi</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. DOMPET SAYA CARD                                          */}
      {/* ============================================================ */}
      <div className="rounded-2xl bg-canvas border border-hairline p-4 shadow-sm space-y-3.5">
        <h3 className="font-black text-xs sm:text-sm text-ink border-b border-hairline/80 pb-2.5">
          Dompet &amp; Keuangan Saya
        </h3>

        <div className="grid grid-cols-4 gap-2 text-center">
          {/* 1. RyPay */}
          <div
            onClick={() => router.push("/topup")}
            className="flex flex-col items-center justify-center p-1 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-primary flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
            </div>
            <span className="text-[10px] font-bold text-ink mt-1.5">RyPay</span>
            <span className="text-[9px] font-bold text-primary mt-0.5">
              Rp {userBalance.toLocaleString("id-ID")}
            </span>
          </div>

          {/* 2. RyPoints */}
          <div
            onClick={() => router.push("/games")}
            className="flex flex-col items-center justify-center p-1 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-[10px] font-bold text-ink mt-1.5">RyPoints</span>
            <span className="text-[9px] font-bold text-amber-600 mt-0.5">
              {userCoins.toLocaleString("id-ID")} Koin
            </span>
          </div>

          {/* 3. Voucher Saya */}
          <div
            onClick={() => router.push("/vouchers")}
            className="flex flex-col items-center justify-center p-1 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
              </svg>
            </div>
            <span className="text-[10px] font-bold text-ink mt-1.5">Voucher</span>
            <span className="text-[9px] font-bold text-cyan-600 mt-0.5">
              {vouchersCount} Kupon
            </span>
          </div>

          {/* 4. Referral */}
          <div
            onClick={() => router.push("/referral")}
            className="flex flex-col items-center justify-center p-1 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <span className="text-[10px] font-bold text-ink mt-1.5">Referral</span>
            <span className="text-[9px] font-bold text-purple-600 mt-0.5">
              Komisi Saldo
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. FITUR & LAYANAN TAMBAHAN (Dipindah ke Bawah Sebelum Bantuan)*/}
      {/* ============================================================ */}
      <div className="rounded-3xl bg-white dark:bg-[#1C1C1E] border border-black/[0.05] dark:border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden divide-y divide-black/[0.05] dark:divide-white/[0.06]">
        <div className="p-3.5 bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/[0.05] dark:border-white/[0.06]">
          <h3 className="font-bold text-xs text-[#1D1D1F] dark:text-[#F5F5F7]">Fitur &amp; Layanan Tambahan</h3>
          <p className="text-[11px] text-[#86868B]">Aplikasi official, payment gateway, referral dan panduan sistem</p>
        </div>

        {/* Program Referral Reseller */}
        <div
          onClick={() => router.push("/referral")}
          className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#FF9500]/10 border border-[#FF9500]/20 text-[#FF9500] dark:text-[#FF9F0A] flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-[#1D1D1F] dark:text-[#F5F5F7]">Program Referral Reseller</span>
                <span className="px-1.5 py-0.2 rounded-full bg-[#FF9500]/15 text-[#FF9500] dark:text-[#FF9F0A] font-semibold text-[8px] uppercase tracking-wider">
                  Komisi Saldo
                </span>
              </div>
              <p className="text-[11px] text-[#86868B]">Ajak teman dan dapatkan komisi saldo otomatis</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-[#86868B]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>

        {/* Payment Gateway SaaS */}
        <div
          onClick={() => router.push("/gateway")}
          className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#30B0C7]/10 border border-[#30B0C7]/20 text-[#30B0C7] dark:text-[#64D2FF] flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h3.75m0 0v3.75m0-3.75l-3.75 3.75" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-[#1D1D1F] dark:text-[#F5F5F7]">Payment Gateway GoPay &amp; QRIS</span>
                <span className="px-1.5 py-0.2 rounded-full bg-[#30B0C7]/15 text-[#30B0C7] dark:text-[#64D2FF] font-semibold text-[8px] uppercase tracking-wider">
                  Rp 10rb/bln
                </span>
              </div>
              <p className="text-[11px] text-[#86868B]">Terima pembayaran QRIS otomatis di website / bot Anda</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-[#86868B]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>

        {/* Install Application Card */}
        <InstallAppButton variant="profile" />

        {/* Panduan Interaktif Aplikasi Card */}
        <div
          onClick={() => window.dispatchEvent(new Event("open_app_tour"))}
          className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#AF52DE]/10 border border-[#AF52DE]/20 text-[#AF52DE] dark:text-[#BF5AF2] flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 18h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <span className="font-semibold text-xs text-[#1D1D1F] dark:text-[#F5F5F7]">Panduan Interaktif Aplikasi</span>
              <p className="text-[11px] text-[#86868B]">Tur panduan fitur utama dengan suara AI</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#E8E8ED] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold text-[10px] uppercase tracking-wider">
            Mulai
          </span>
        </div>
      </div>

      {/* Push Notification Manager Card */}
      <PushSettingsCard />

      {/* ============================================================ */}
      {/* 5. PUSAT BANTUAN & KEAMANAN                                   */}
      {/* ============================================================ */}
      <div className="rounded-2xl bg-canvas border border-hairline p-4 shadow-sm space-y-2">
        <h3 className="font-black text-xs sm:text-sm text-ink border-b border-hairline/80 pb-2.5">
          Pusat Bantuan &amp; Keamanan
        </h3>

        <div className="space-y-1 text-xs">
          <Link
            href="/tickets"
            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-parchment font-bold text-ink transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-.85-.929l.643-2.176C3.89 16.574 3 14.394 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <span>Hubungi CS WhatsApp 24 Jam</span>
            </div>
            <svg className="w-3.5 h-3.5 text-ink-muted" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>

          <Link
            href="/cek-garansi"
            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-parchment font-bold text-ink transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span>Cek Status &amp; Garansi Layanan</span>
            </div>
            <svg className="w-3.5 h-3.5 text-ink-muted" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-rose-50 text-rose-600 font-bold transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </div>
              <span>Keluar dari Akun</span>
            </div>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 6. MODAL PENGATURAN PROFIL & AKUN LENGKAP                    */}
      {/* ============================================================ */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-canvas border border-hairline rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-hairline flex items-center justify-between bg-parchment/30 shrink-0">
              <div>
                <h3 className="font-black text-sm sm:text-base text-ink flex items-center gap-2">
                  <span>⚙️</span> Pengaturan Akun &amp; Profil
                </h3>
                <p className="text-[11px] text-ink-muted">
                  Kelola nama, WhatsApp notifikasi, email OTP, dan keamanan akun
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="w-8 h-8 rounded-full bg-parchment hover:bg-hairline flex items-center justify-center text-ink text-xs font-black transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-hairline bg-canvas shrink-0 overflow-x-auto p-1.5 gap-1">
              {[
                { id: 'profile', label: 'Data Diri', icon: '👤' },
                { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
                { id: 'email', label: 'Ganti Email', icon: '✉️' },
                { id: 'password', label: 'Keamanan', icon: '🔒' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSettingsTab(tab.id as any)}
                  className={`flex-1 min-w-[90px] py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 select-none ${
                    settingsTab === tab.id
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-ink-muted hover:text-ink hover:bg-parchment'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Modal Body / Tab Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* TAB 1: DATA DIRI (Nama & Foto) */}
              {settingsTab === 'profile' && (
                <form onSubmit={handleSaveName} className="space-y-4">
                  <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-parchment/40 border border-hairline">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full bg-canvas border border-hairline overflow-hidden flex items-center justify-center font-black text-xl text-primary shrink-0">
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
                    <div>
                      <p className="font-bold text-ink">Foto Profil Akun</p>
                      <p className="text-[11px] text-ink-muted mb-1.5">Format JPG, PNG, atau WEBP maks 5MB</p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="px-3 py-1 rounded-lg bg-canvas border border-hairline hover:border-primary text-primary text-[11px] font-bold transition-colors"
                      >
                        {uploadingAvatar ? "Mengunggah..." : "Pilih Foto Baru"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-ink block mb-1.5">Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Masukkan nama lengkap Anda"
                      className="w-full p-2.5 rounded-xl border border-hairline bg-canvas text-ink font-bold focus:border-primary outline-none transition-all"
                    />
                    <p className="text-[10px] text-ink-muted mt-1">Nama ini akan tercantum pada invoice dan sapaan profil.</p>
                  </div>

                  <div>
                    <label className="font-bold text-ink-muted block mb-1.5">ID Akun (Sistem)</label>
                    <input
                      type="text"
                      disabled
                      value={user?.id || ""}
                      className="w-full p-2.5 rounded-xl border border-hairline/60 bg-parchment/50 text-ink-muted font-mono text-[11px] cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-ink-muted block mb-1.5">Tingkatan Member</label>
                    <div className="p-2.5 rounded-xl border border-hairline bg-parchment/40 flex items-center justify-between">
                      <span className="font-black text-ink">{user?.role === 'admin' ? '🛡️ Administrator Utama' : '⭐ Member VIP'}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">Aktif</span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingName}
                      className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                    >
                      {savingName ? "Menyimpan..." : "Simpan Perubahan Nama"}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: WHATSAPP NOTIFIKASI */}
              {settingsTab === 'whatsapp' && (
                <form onSubmit={handleSavePhone} className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20 text-emerald-950 dark:text-emerald-300 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-600 font-black">💬 WhatsApp Notifikasi Transaksi</span>
                      {userPhone ? (
                        <span className="px-2 py-0.2 rounded-full bg-emerald-500 text-white font-black text-[9px] uppercase">
                          Terhubung
                        </span>
                      ) : (
                        <span className="px-2 py-0.2 rounded-full bg-amber-500 text-white font-black text-[9px] uppercase">
                          Belum Diatur
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-400">
                      Sistem bot WhatsApp Ry-ITSolutions secara otomatis akan mengirimkan bukti nota, link garansi unblock IMEI, dan informasi update order ke nomor ini.
                    </p>
                  </div>

                  <div>
                    <label className="font-bold text-ink block mb-1.5">Nomor WhatsApp Aktif</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="Contoh: 081234567890 atau 6281234567890"
                        className="w-full p-2.5 pl-3 rounded-xl border border-hairline bg-canvas text-ink font-bold focus:border-primary outline-none transition-all"
                      />
                    </div>
                    <p className="text-[10px] text-ink-muted mt-1">
                      Format bebas: Awali dengan 08... atau 628... (sistem otomatis merapikan formatnya).
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-parchment/40 border border-hairline text-[11px] space-y-1">
                    <p className="font-bold text-ink">Keuntungan menghubungkan WhatsApp:</p>
                    <ul className="list-disc list-inside text-ink-muted space-y-0.5">
                      <li>Nota digital langsung masuk ke chat WhatsApp Anda saat bayar QRIS.</li>
                      <li>Notifikasi saat IMEI selesai diproses atau jika butuh revisi format IMEI.</li>
                      <li>Aman &amp; terjaga kerahasiaannya.</li>
                    </ul>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingPhone}
                      className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-md transition-all"
                    >
                      {savingPhone ? "Menyimpan..." : "Simpan Nomor WhatsApp"}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: GANTI EMAIL AKUN (DENGAN OTP) */}
              {settingsTab === 'email' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-blue-500/[0.06] border border-blue-500/20 text-blue-950 dark:text-blue-300 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold">✉️ Alamat Email Saat Ini:</span>
                      <span className="font-black text-primary underline">{user?.email || "-"}</span>
                    </div>
                    <p className="text-[11px] text-blue-800 dark:text-blue-400">
                      Untuk keamanan akun, penggantian email wajib diverifikasi dengan kode OTP 6 digit yang dikirimkan ke alamat email baru Anda.
                    </p>
                  </div>

                  <div>
                    <label className="font-bold text-ink block mb-1.5">Alamat Email Baru</label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        required
                        disabled={otpSent}
                        value={newEmailInput}
                        onChange={(e) => setNewEmailInput(e.target.value)}
                        placeholder="Contoh: emailbaru@gmail.com"
                        className="flex-1 p-2.5 rounded-xl border border-hairline bg-canvas text-ink font-bold focus:border-primary outline-none transition-all disabled:opacity-60"
                      />
                      <button
                        type="button"
                        disabled={sendingOtp || otpCountdown > 0 || !newEmailInput.trim()}
                        onClick={handleRequestEmailOtp}
                        className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-[11px] shadow-xs transition-all shrink-0 disabled:opacity-50"
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
                    <p className="text-[10px] text-ink-muted mt-1">
                      Pastikan email aktif dan dapat menerima pesan masuk / spam.
                    </p>
                  </div>

                  {otpSent && (
                    <form onSubmit={handleVerifyEmailOtp} className="p-3.5 rounded-2xl bg-amber-500/[0.06] border border-amber-500/20 space-y-3 animate-in fade-in duration-200">
                      <div>
                        <label className="font-bold text-ink block mb-1">
                          Masukkan Kode OTP 6 Digit dari Email Baru
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={emailOtpInput}
                          onChange={(e) => setEmailOtpInput(e.target.value.replace(/\D/g, ""))}
                          placeholder="Contoh: 123456"
                          className="w-full p-2.5 rounded-xl border border-hairline bg-canvas text-ink font-black text-center text-lg tracking-widest focus:border-primary outline-none"
                        />
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
                          Kode verifikasi berlaku selama 15 menit.
                        </p>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => { setOtpSent(false); setEmailOtpInput(""); }}
                          className="px-3 py-2 rounded-xl bg-parchment hover:bg-hairline text-ink font-bold text-xs"
                        >
                          Ubah Email
                        </button>
                        <button
                          type="submit"
                          disabled={verifyingOtp || emailOtpInput.length < 6}
                          className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                        >
                          {verifyingOtp ? "Memverifikasi..." : "Verifikasi & Simpan Email Baru"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* TAB 4: GANTI PASSWORD */}
              {settingsTab === 'password' && (
                <form onSubmit={handleChangePassword} className="space-y-3.5">
                  <div className="p-3 rounded-2xl bg-parchment/50 border border-hairline text-[11px] text-ink-muted">
                    🔒 Gunakan kombinasi huruf dan angka minimal 6 karakter agar akun Anda tetap aman.
                  </div>

                  <div>
                    <label className="font-bold text-ink block mb-1">Password Saat Ini</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Masukkan password saat ini"
                        className="w-full p-2.5 pr-9 rounded-xl border border-hairline bg-canvas text-ink font-bold focus:border-primary outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-2.5 top-2.5 text-ink-muted hover:text-ink text-xs font-bold"
                      >
                        {showCurrentPassword ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-ink block mb-1">Password Baru</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className="w-full p-2.5 pr-9 rounded-xl border border-hairline bg-canvas text-ink font-bold focus:border-primary outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2.5 top-2.5 text-ink-muted hover:text-ink text-xs font-bold"
                      >
                        {showNewPassword ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-ink block mb-1">Konfirmasi Password Baru</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi password baru"
                      className="w-full p-2.5 rounded-xl border border-hairline bg-canvas text-ink font-bold focus:border-primary outline-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingPassword || !currentPassword || !newPassword}
                      className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                    >
                      {savingPassword ? "Menyimpan..." : "Simpan Password Baru"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
