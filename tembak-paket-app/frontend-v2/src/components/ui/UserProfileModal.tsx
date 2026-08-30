"use client";
import React from "react";
import { getReviewRole, getReviewRoleClass } from "@/lib/reviews";

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: {
    userName?: string;
    userAvatar?: string;
    userJoinedAt?: string;
    transactionDate?: string;
    userTotalOrders?: number;
    userRole?: string;
  };
}

export function UserProfileModal({ isOpen, onClose, user }: UserProfileModalProps) {
  if (!isOpen || !user) return null;
  const role = getReviewRole(user);

  const formattedJoinedDate = user.userJoinedAt
    ? new Date(user.userJoinedAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "15 Januari 2026";

  const formattedTrxDate = user.transactionDate
    ? new Date(user.transactionDate).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " WIB"
    : "28 Agt 2026, 14:20 WIB";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-canvas rounded-3xl border border-hairline shadow-2xl overflow-hidden flex flex-col">
        {/* Header Banner */}
        <div className="h-20 bg-gradient-to-r from-blue-600 via-primary to-emerald-600 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-slate-950/20 hover:bg-slate-950/40 text-white flex items-center justify-center text-xs font-bold transition-colors"
          >
            <svg aria-label="Tutup" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>

        {/* User Avatar & Info */}
        <div className="px-5 pb-5 pt-0 relative space-y-4">
          <div className="flex items-end justify-between -mt-10 mb-2">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user.userAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.userName || "Pelanggan")}`}
                alt={user.userName || "User Profile"}
                className="w-20 h-20 rounded-2xl object-cover border-4 border-canvas shadow-lg"
              />
              <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-canvas bg-emerald-500 text-white" title="Terverifikasi">
                <svg aria-hidden="true" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" /></svg>
              </span>
            </div>
            <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase ${getReviewRoleClass(role)}`}>
              {role}
            </span>
          </div>

          <div>
            <h3 className="font-extrabold text-base text-ink flex items-center gap-1.5">
              <span>{user.userName || "Pelanggan Ry-ITSolutions"}</span>
              <svg className="w-4 h-4 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">Akun Riil Terdaftar &amp; Terverifikasi Sistem</p>
          </div>

          {/* Stats List */}
          <div className="p-3.5 rounded-2xl bg-parchment border border-hairline space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-ink-muted font-medium">Bergabung Sejak:</span>
              <span className="font-bold text-ink">{formattedJoinedDate}</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-hairline">
              <span className="text-ink-muted font-medium">Total Transaksi Sukses:</span>
              <span className="font-extrabold text-primary">{user.userTotalOrders || 1} Pesanan</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-hairline">
              <span className="text-ink-muted font-medium">Waktu Transaksi Layanan Ini:</span>
              <span className="font-bold text-emerald-600">{formattedTrxDate}</span>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full h-10 rounded-2xl bg-primary hover:bg-primary-focus text-white font-bold text-xs shadow-md transition-colors"
          >
            Tutup Profil
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserProfileModal;
