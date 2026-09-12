"use client";
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { safeJson } from '@/lib/api';
import Swal from '@/lib/sweetalert';
import {
  Activity,
  RotateCw,
  Trash2,
  Search,
  Filter,
  Globe,
  Clock,
  User,
  ShoppingBag,
  CreditCard,
  LogIn,
  LogOut,
  Sparkles,
  Navigation,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { UserActivityLog } from './AdminUserActivityModal';

interface AdminActivityLogsTabProps {
  onInspectUser: (user: { id: string; name: string; email: string }) => void;
}

export const AdminActivityLogsTab: React.FC<AdminActivityLogsTabProps> = ({ onInspectUser }) => {
  const [logs, setLogs] = useState<UserActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = async (targetPage = page, targetAction = actionFilter, targetSearch = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('limit', '25');
      if (targetAction && targetAction !== 'ALL') params.set('action', targetAction);
      if (targetSearch && targetSearch.trim()) params.set('search', targetSearch.trim());

      const res = await fetch(`/api/admin/user-logs?${params.toString()}`, { credentials: 'include' });
      const data = await safeJson(res);
      if (data?.status && Array.isArray(data.data)) {
        setLogs(data.data);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
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
    fetchLogs(page, actionFilter, search);
  }, [page, actionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs(1, actionFilter, search);
  };

  const handleClearOldLogs = async () => {
    const { value: days } = await Swal.fire({
      title: 'Bersihkan Log Aktivitas',
      text: 'Pilih rentang waktu log yang ingin dihapus:',
      input: 'select',
      inputOptions: {
        '7': 'Log lebih lama dari 7 hari',
        '14': 'Log lebih lama dari 14 hari',
        '30': 'Log lebih lama dari 30 hari',
        'all': 'Hapus SEMUA log aktivitas'
      },
      inputPlaceholder: 'Pilih opsi retensi',
      showCancelButton: true,
      confirmButtonText: 'Bersihkan',
      cancelButtonText: 'Batal'
    });

    if (!days) return;

    try {
      const body = days === 'all' ? {} : { olderThanDays: parseInt(days, 10) };
      const res = await fetch('/api/admin/user-logs', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await safeJson(res);
      if (res.ok && data?.status) {
        Swal.fire({ title: 'Berhasil', text: data.message, icon: 'success', timer: 1500, showConfirmButton: false });
        setPage(1);
        fetchLogs(1, actionFilter, search);
      } else {
        Swal.fire('Gagal', data?.message || 'Gagal menghapus log', 'error');
      }
    } catch (e) {
      Swal.fire('Error', 'Terjadi kesalahan sistem', 'error');
    }
  };

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
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card glass className="p-4 sm:p-5 space-y-4 border border-hairline bg-canvas">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-base font-bold text-ink flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span>Log Aktivitas Seluruh Pengguna</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-primary/10 text-primary border border-primary/20">
              {totalCount} Log
            </span>
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Audit trail riwayat aksi riil pengguna: login, pembelian, deposit saldo, interaksi AI, dan navigasi halaman.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2.5 text-xs font-semibold rounded-xl border-hairline gap-1.5"
            onClick={() => fetchLogs(page, actionFilter, search)}
            title="Muat Ulang Log"
          >
            <RotateCw className="w-3.5 h-3.5 text-ink-muted" />
            <span className="hidden sm:inline">Segarkan</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2.5 text-xs font-semibold rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/20 gap-1.5"
            onClick={handleClearOldLogs}
            title="Bersihkan Log Lama"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Bersihkan Log</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Input
            type="text"
            placeholder="Cari nama, email, deskripsi, atau IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border-hairline bg-canvas focus:border-primary"
          />
          <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </form>

        {/* Action pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {[
            { id: 'ALL', label: 'Semua' },
            { id: 'LOGIN', label: 'Login' },
            { id: 'ORDER', label: 'Pesanan' },
            { id: 'TOPUP', label: 'Topup' },
            { id: 'AI_CHAT', label: 'AI Chat' },
            { id: 'PAGE_VIEW', label: 'Navigasi' }
          ].map((act) => (
            <button
              key={act.id}
              onClick={() => {
                setActionFilter(act.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all border whitespace-nowrap cursor-pointer ${
                actionFilter === act.id
                  ? 'bg-ink text-white border-ink'
                  : 'bg-canvas text-ink-muted border-hairline hover:bg-parchment'
              }`}
            >
              {act.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Feed / Table */}
      {loading ? (
        <p className="text-center py-12 text-xs text-ink-muted">Memuat log aktivitas...</p>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 px-4">
          <Clock className="w-8 h-8 text-ink-muted/40 mx-auto mb-2" />
          <p className="text-xs font-bold text-ink">Tidak Ada Log Aktivitas Ditemukan</p>
          <p className="text-[11px] text-ink-muted mt-0.5">
            {search ? 'Coba ubah kata kunci pencarian Anda.' : 'Belum ada aktivitas yang terekam pada filter ini.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {logs.map((item) => {
            const badge = getActionBadge(item.action);
            const BadgeIcon = badge.icon;
            return (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl border border-hairline bg-canvas hover:border-primary/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs"
              >
                {/* Left side: Action badge, Description, User */}
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-wider ${badge.className}`}>
                      <BadgeIcon className="w-3 h-3" />
                      <span>{badge.label}</span>
                    </span>

                    {/* User identifier */}
                    {item.userId ? (
                      <button
                        onClick={() => onInspectUser({ id: item.userId, name: item.userName, email: item.userEmail })}
                        className="inline-flex items-center gap-1 text-xs font-bold text-ink hover:text-primary transition-colors cursor-pointer group"
                        title="Klik untuk melihat seluruh riwayat pengguna ini"
                      >
                        <span className="underline decoration-dotted underline-offset-2">{item.userName}</span>
                        <span className="text-[11px] text-ink-muted font-normal group-hover:text-primary">({item.userEmail})</span>
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-ink-muted">Tamu</span>
                    )}

                    <span className="text-[10px] text-ink-muted font-mono">
                      • {formatDate(item.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-ink leading-relaxed">
                    {item.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-ink-muted pt-0.5">
                    {item.path && (
                      <span className="inline-flex items-center gap-1 font-mono bg-parchment px-1.5 py-0.5 rounded text-ink">
                        <Globe className="w-2.5 h-2.5 text-primary" />
                        <span>{item.path}</span>
                      </span>
                    )}
                    {item.userAgent && (
                      <span className="truncate max-w-[200px] sm:max-w-xs">
                        {item.userAgent}
                      </span>
                    )}
                    {item.ip && <span className="font-mono">IP: {item.ip}</span>}
                  </div>
                </div>

                {/* Right side: Direct inspect button */}
                {item.userId && (
                  <div className="flex items-center justify-end shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-[11px] font-semibold rounded-xl border-hairline gap-1 hover:bg-parchment"
                      onClick={() => onInspectUser({ id: item.userId, name: item.userName, email: item.userEmail })}
                      title="Buka riwayat audit pengguna ini"
                    >
                      <FileText className="w-3 h-3 text-primary" />
                      <span>Audit User</span>
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 pt-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 gap-1"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Sebelumnya</span>
          </Button>
          <span className="text-xs font-semibold text-ink-muted">
            Halaman {page} dari {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 gap-1"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <span>Selanjutnya</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </Card>
  );
};
