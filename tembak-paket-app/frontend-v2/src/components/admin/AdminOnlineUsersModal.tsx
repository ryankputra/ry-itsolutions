"use client";
import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { X, RotateCw, Globe, Smartphone, Laptop, FileText, User as UserIcon } from 'lucide-react';

export interface OnlineUser {
  userId: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  phone?: string;
  ip: string;
  device: string;
  currentPage: string;
  onlineDurationSeconds: number;
  lastSeenSecondsAgo: number;
}

interface AdminOnlineUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onlineUsers: OnlineUser[];
  totalOnline: number;
  onRefresh: () => void;
  onViewUserLogs: (user: { id: string; name: string; email: string }) => void;
}

export const AdminOnlineUsersModal: React.FC<AdminOnlineUsersModalProps> = ({
  isOpen,
  onClose,
  onlineUsers,
  totalOnline,
  onRefresh,
  onViewUserLogs
}) => {
  if (!isOpen) return null;

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds} detik`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins} menit`;
    const hours = Math.floor(mins / 60);
    return `${hours} jam ${mins % 60}m`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <Card glass className="w-full max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden border border-hairline shadow-2xl bg-canvas">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-hairline bg-parchment/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2">
                <span>Pengguna Sedang Online</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {totalOnline} Aktif
                </span>
              </h3>
              <p className="text-[11px] text-ink-muted mt-0.5">
                Pengguna dengan detak aktivitas aktif dalam 60 detik terakhir
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 rounded-xl text-ink-muted hover:text-ink"
              onClick={onRefresh}
              title="Segarkan data online"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 rounded-xl text-ink-muted hover:text-ink"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Online Users List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {onlineUsers.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-2xl bg-parchment flex items-center justify-center mx-auto text-ink-muted mb-3">
                <UserIcon className="w-6 h-6 opacity-40" />
              </div>
              <p className="text-xs font-bold text-ink">Tidak Ada Pengguna Lain yang Sedang Online</p>
              <p className="text-[11px] text-ink-muted mt-1 max-w-xs mx-auto">
                Status online akan terdeteksi otomatis saat pengguna membuka website dan melakukan aktivitas.
              </p>
            </div>
          ) : (
            onlineUsers.map((u) => {
              const isMobile = /iPhone|Android|Mobile/i.test(u.device);
              return (
                <div
                  key={u.userId}
                  className="p-3.5 rounded-2xl border border-hairline bg-canvas hover:border-primary/40 transition-all space-y-2.5 shadow-xs"
                >
                  {/* Top row: Avatar, Name, Role, Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-10 h-10 rounded-full object-cover border border-hairline"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase border border-primary/20">
                            {u.name.slice(0, 2)}
                          </div>
                        )}
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-canvas"></span>
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-xs text-ink truncate">{u.name}</p>
                          <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase ${
                            u.role === 'admin'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                              : u.role === 'reseller'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {u.role || 'User'}
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-muted truncate mt-0.5">
                          {u.email} {u.phone && `• ${u.phone}`}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-[11px] font-semibold rounded-xl border-hairline gap-1 shrink-0 text-primary hover:bg-primary/10"
                      onClick={() => {
                        onClose();
                        onViewUserLogs({ id: u.userId, name: u.name, email: u.email });
                      }}
                    >
                      <FileText className="w-3 h-3" />
                      <span>Lihat Log</span>
                    </Button>
                  </div>

                  {/* Details row: Current Route, Device & IP, Last Ping */}
                  <div className="pt-2 border-t border-hairline flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Active Route */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-parchment text-ink font-mono text-[10px] border border-hairline">
                        <Globe className="w-3 h-3 text-primary shrink-0" />
                        <span>{u.currentPage || '/'}</span>
                      </span>

                      {/* Device summary */}
                      <span className="inline-flex items-center gap-1 text-ink-muted text-[10px]">
                        {isMobile ? <Smartphone className="w-3 h-3 shrink-0 text-amber-500" /> : <Laptop className="w-3 h-3 shrink-0 text-blue-500" />}
                        <span>{u.device}</span>
                      </span>

                      {/* IP */}
                      <span className="text-[10px] text-ink-muted/80 font-mono">
                        IP: {u.ip}
                      </span>
                    </div>

                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Detak: {u.lastSeenSecondsAgo < 5 ? 'baru saja' : `${u.lastSeenSecondsAgo}d lalu`}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-hairline bg-parchment/30 flex justify-between items-center">
          <span className="text-[11px] text-ink-muted">
            Pembaruan otomatis berkala setiap 15 detik
          </span>
          <Button size="sm" variant="outline" className="text-xs h-8" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </Card>
    </div>
  );
};
