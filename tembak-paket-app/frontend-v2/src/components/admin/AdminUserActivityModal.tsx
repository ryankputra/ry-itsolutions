"use client";
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { X, RotateCw, Trash2, Globe, Clock, Shield, Smartphone, Laptop, Sparkles, ShoppingBag, CreditCard, LogIn, LogOut, Navigation } from 'lucide-react';
import { safeJson } from '@/lib/api';
import Swal from '@/lib/sweetalert';

export interface UserActivityLog {
  id: number;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  description: string;
  path: string;
  ip: string;
  userAgent: string;
  createdAt: string;
}

interface AdminUserActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: { id: string; name: string; email: string; role?: string } | null;
}

export const AdminUserActivityModal: React.FC<AdminUserActivityModalProps> = ({
  isOpen,
  onClose,
  targetUser
}) => {
  const [logs, setLogs] = useState<UserActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const fetchLogs = async () => {
    if (!targetUser?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/user-logs/${targetUser.id}`, { credentials: 'include' });
      const data = await safeJson(res);
      if (data?.status && Array.isArray(data.data)) {
        setLogs(data.data);
      } else {
        setLogs([]);
      }
    } catch (e) {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && targetUser?.id) {
      fetchLogs();
    }
  }, [isOpen, targetUser?.id]);

  if (!isOpen || !targetUser) return null;

  const handleClearUserLogs = async () => {
    const res = await Swal.fire({
      title: 'Hapus Riwayat Log?',
      text: `Apakah Anda yakin ingin menghapus seluruh riwayat log untuk pengguna ${targetUser.name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (!res.isConfirmed) return;

    try {
      const resp = await fetch('/api/admin/user-logs', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUser.id })
      });
      const data = await safeJson(resp);
      if (resp.ok && data?.status) {
        Swal.fire({ title: 'Berhasil', text: data.message, icon: 'success', timer: 1500, showConfirmButton: false });
        setLogs([]);
      }
    } catch (e) {
      Swal.fire('Gagal', 'Terjadi kesalahan sistem', 'error');
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterAction === 'ALL') return true;
    return (log.action || '').toUpperCase() === filterAction;
  });

  const getActionBadge = (action: string) => {
    const act = (action || '').toUpperCase();
    switch (act) {
      case 'LOGIN':
        return {
          icon: LogIn,
          label: 'LOGIN',
          className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
        };
      case 'LOGOUT':
        return {
          icon: LogOut,
          label: 'LOGOUT',
          className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
        };
      case 'ORDER':
      case 'ORDER_CREATED':
        return {
          icon: ShoppingBag,
          label: 'PESANAN',
          className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
        };
      case 'TOPUP':
      case 'TOPUP_REQUEST':
        return {
          icon: CreditCard,
          label: 'TOPUP',
          className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
        };
      case 'AI_CHAT':
        return {
          icon: Sparkles,
          label: 'AI CHAT',
          className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
        };
      case 'PAGE_VIEW':
        return {
          icon: Navigation,
          label: 'NAVIGASI',
          className: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
        };
      default:
        return {
          icon: Clock,
          label: act,
          className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
        };
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <Card glass className="w-full max-w-2xl max-h-[88vh] flex flex-col p-0 overflow-hidden border border-hairline shadow-2xl bg-canvas">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-hairline bg-parchment/40 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2">
                <span>Riwayat Log Aktivitas:</span>
                <span className="text-primary truncate">{targetUser.name}</span>
              </h3>
              <p className="text-[11px] text-ink-muted mt-0.5">
                {targetUser.email} {targetUser.role && `• Role: ${targetUser.role}`}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 rounded-xl text-ink-muted hover:text-ink"
                onClick={fetchLogs}
                title="Segarkan log"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </Button>
              {logs.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2.5 rounded-xl text-rose-600 hover:bg-rose-50 text-[11px] gap-1"
                  onClick={handleClearUserLogs}
                  title="Bersihkan riwayat log pengguna ini"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Hapus Log</span>
                </Button>
              )}
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

          {/* Action Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
            {[
              { id: 'ALL', label: `Semua (${logs.length})` },
              { id: 'LOGIN', label: 'Login' },
              { id: 'ORDER', label: 'Pesanan' },
              { id: 'TOPUP', label: 'Topup' },
              { id: 'AI_CHAT', label: 'AI Chat' },
              { id: 'PAGE_VIEW', label: 'Navigasi' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterAction(f.id)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all border whitespace-nowrap cursor-pointer ${
                  filterAction === f.id
                    ? 'bg-ink text-white border-ink'
                    : 'bg-canvas text-ink-muted border-hairline hover:bg-parchment'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {loading ? (
            <p className="text-center py-12 text-xs text-ink-muted">Memuat linimasa aktivitas...</p>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Clock className="w-8 h-8 text-ink-muted/40 mx-auto mb-2" />
              <p className="text-xs font-bold text-ink">Belum Ada Log Aktivitas Tercatat</p>
              <p className="text-[11px] text-ink-muted mt-0.5">
                Aktivitas pengguna seperti login, belanja, navigasi, dan interaksi AI akan otomatis dicatat di sini.
              </p>
            </div>
          ) : (
            <div className="relative border-l-2 border-hairline pl-4 sm:pl-5 ml-2 space-y-4">
              {filteredLogs.map((item) => {
                const badge = getActionBadge(item.action);
                const BadgeIcon = badge.icon;
                return (
                  <div key={item.id} className="relative group">
                    {/* Dot on timeline */}
                    <div className="absolute -left-[23px] sm:-left-[27px] top-1.5 w-3.5 h-3.5 rounded-full bg-canvas border-2 border-primary shrink-0" />

                    <div className="p-3 rounded-2xl border border-hairline bg-canvas group-hover:border-primary/40 transition-all space-y-1.5 shadow-2xs">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-wider ${badge.className}`}>
                          <BadgeIcon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                        <span className="text-[10px] text-ink-muted font-mono">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-ink leading-relaxed">
                        {item.description}
                      </p>

                      <div className="pt-1.5 border-t border-hairline/60 flex flex-wrap items-center justify-between gap-2 text-[10px] text-ink-muted">
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.path && (
                            <span className="inline-flex items-center gap-1 font-mono bg-parchment px-1.5 py-0.5 rounded text-ink">
                              <Globe className="w-2.5 h-2.5 text-primary" />
                              <span>{item.path}</span>
                            </span>
                          )}
                          {item.userAgent && (
                            <span className="truncate max-w-[180px] sm:max-w-xs">
                              {item.userAgent}
                            </span>
                          )}
                        </div>
                        {item.ip && <span className="font-mono">IP: {item.ip}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-hairline bg-parchment/30 flex justify-between items-center">
          <span className="text-[11px] text-ink-muted">
            Menampilkan {filteredLogs.length} aktivitas
          </span>
          <Button size="sm" variant="outline" className="text-xs h-8" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </Card>
    </div>
  );
};
