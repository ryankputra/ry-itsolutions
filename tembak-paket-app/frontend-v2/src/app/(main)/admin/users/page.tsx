"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Swal from "@/lib/sweetalert";
import { safeJson } from "@/lib/api";
import { AdminUserActivityModal } from "@/components/admin/AdminUserActivityModal";
import { Users, RotateCw, Wallet, Coins, FileText, Trash2, Check, X, Search, ShieldAlert, UserCheck } from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "user" | "admin">("all");
  const [userPage, setUserPage] = useState(1);
  const itemsPerPage = 15;

  // Selected User for balance & coins
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [balAmount, setBalAmount] = useState("");
  const [selectedCoinUserId, setSelectedCoinUserId] = useState<number | null>(null);
  const [coinAmount, setCoinAmount] = useState("");

  // Audit Log Modal
  const [inspectLogUser, setInspectLogUser] = useState<{ id: number; name: string; email: string; role?: string } | null>(null);
  const [showUserLogModal, setShowUserLogModal] = useState(false);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      const data = await safeJson(res);
      if (data?.status && Array.isArray(data.data)) {
        setUsers(data.data);
      } else {
        setUsers([]);
      }
    } catch (e) {
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleUpdateBalance = async (userId: number) => {
    if (!balAmount) return;
    try {
      const res = await fetch("/api/admin/update-balance", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount: parseInt(balAmount) }),
      });
      if (res.ok) {
        Swal.fire({ title: "Berhasil", text: "Saldo pengguna berhasil diperbarui.", timer: 1500, showConfirmButton: false });
        loadUsers();
        setBalAmount("");
        setSelectedUserId(null);
      } else {
        Swal.fire({ title: "Gagal", text: "Gagal memperbarui saldo pengguna." });
      }
    } catch (e) {
      Swal.fire({ title: "Error", text: "Terjadi kesalahan jaringan." });
    }
  };

  const handleUpdateCoins = async (userId: number) => {
    if (!coinAmount || isNaN(Number(coinAmount))) return;
    try {
      const res = await fetch("/api/admin/update-coins", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount: parseInt(coinAmount, 10) }),
      });
      const data = await safeJson(res);
      if (res.ok && data?.status) {
        Swal.fire({ title: "Berhasil", text: data?.message || "Koin berhasil diperbarui.", timer: 1500, showConfirmButton: false });
        loadUsers();
        setCoinAmount("");
        setSelectedCoinUserId(null);
      } else {
        Swal.fire({ title: "Gagal", text: data?.message || "Gagal mengubah koin pengguna." });
      }
    } catch (e) {
      Swal.fire({ title: "Error", text: "Terjadi kesalahan sistem saat update koin." });
    }
  };

  const handleDeleteZeroBalance = async () => {
    const res = await Swal.fire({
      title: "Hapus Semua Akun Saldo 0?",
      text: "Semua akun non-admin dengan saldo Rp 0 akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus Semua",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ef4444",
    });

    if (!res.isConfirmed) return;

    try {
      const resp = await fetch("/api/admin/delete-zero-balance", {
        method: "DELETE",
        credentials: "include",
      });
      const data = await resp.json();
      if (resp.ok) {
        Swal.fire({ title: "Berhasil", text: data.message || "Akun saldo nol telah dihapus.", timer: 2000, showConfirmButton: false });
        loadUsers();
      } else {
        Swal.fire({ title: "Gagal", text: data.message || "Gagal menghapus pengguna." });
      }
    } catch (e) {
      Swal.fire({ title: "Error", text: "Kesalahan jaringan." });
    }
  };

  // Filtering
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.name && u.name.toLowerCase().includes(searchUser.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchUser.toLowerCase())) ||
      (u.phone && u.phone.includes(searchUser));
    const matchesRole =
      userRoleFilter === "all" ||
      (userRoleFilter === "admin" && u.role === "admin") ||
      (userRoleFilter === "user" && (u.role === "user" || !u.role));
    return matchesSearch && matchesRole;
  });

  const totalUserPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = filteredUsers.slice((userPage - 1) * itemsPerPage, userPage * itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-hairline">
        <div>
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Kelola Pengguna Terdaftar
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Manajemen akun pembeli, hak akses admin, penyesuaian saldo & koin, serta riwayat aktivitas.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={loadUsers} className="gap-1.5 text-xs">
            <RotateCw className={`w-3.5 h-3.5 ${loadingUsers ? "animate-spin" : ""}`} />
            Segarkan
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/30 gap-1.5"
            onClick={handleDeleteZeroBalance}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Hapus Akun Saldo 0
          </Button>
        </div>
      </div>

      <Card glass className="p-5 space-y-4">
        {/* Search & Role Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              className="w-full h-10 rounded-xl border border-hairline bg-canvas pl-9 pr-3.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              placeholder="Cari berdasarkan nama, email, atau nomor HP pengguna..."
              value={searchUser}
              onChange={(e) => {
                setSearchUser(e.target.value);
                setUserPage(1);
              }}
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setUserRoleFilter("all");
                setUserPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                userRoleFilter === "all"
                  ? "bg-primary text-white border-primary"
                  : "bg-canvas text-ink-muted border-hairline hover:border-primary/40"
              }`}
            >
              Semua ({users.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setUserRoleFilter("user");
                setUserPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                userRoleFilter === "user"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-canvas text-emerald-600 border-hairline hover:border-emerald-400"
              }`}
            >
              Member ({users.filter((u) => u.role === "user" || !u.role).length})
            </button>
            <button
              type="button"
              onClick={() => {
                setUserRoleFilter("admin");
                setUserPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                userRoleFilter === "admin"
                  ? "bg-rose-600 text-white border-rose-600"
                  : "bg-canvas text-rose-600 border-hairline hover:border-rose-400"
              }`}
            >
              Admin ({users.filter((u) => u.role === "admin").length})
            </button>
          </div>
        </div>

        {loadingUsers ? (
          <div className="py-12 text-center text-xs text-ink-muted">
            <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
            Memuat daftar pengguna...
          </div>
        ) : paginatedUsers.length === 0 ? (
          <div className="py-12 text-center text-xs text-ink-muted border border-dashed rounded-xl">
            Tidak ada data pengguna yang sesuai dengan filter pencarian.
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedUsers.map((u) => (
              <div
                key={u.id}
                className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-hairline rounded-xl bg-canvas gap-3 hover:border-primary/30 transition-colors shadow-2xs"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-xs text-ink">{u.name}</p>
                    <span
                      className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase ${
                        u.role === "admin"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {u.role || "User"}
                    </span>
                    {u.isOnline ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        Online
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-parchment text-ink-muted border border-hairline">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        Offline
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-muted">
                    {u.email} {u.phone ? `• ${u.phone}` : ""}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] font-semibold text-ink pt-0.5 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Wallet className="w-3 h-3 text-primary shrink-0" />
                      <span>Rp {Number(u.balance || 0).toLocaleString("id-ID")}</span>
                    </span>
                    <span className="text-ink-muted">&bull;</span>
                    <span className="flex items-center gap-1">
                      <Coins className="w-3 h-3 text-amber-500 shrink-0" />
                      <span>{Number(u.coins || 0).toLocaleString("id-ID")} Koin</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
                  <select
                    className="h-8 px-2.5 rounded-lg border border-hairline bg-canvas text-xs font-semibold focus:outline-none focus:border-primary cursor-pointer"
                    value={u.role || "user"}
                    onChange={async (e) => {
                      try {
                        const res = await fetch("/api/admin/update-user-role", {
                          method: "POST",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ userId: u.id, newRole: e.target.value }),
                        });
                        if (res.ok) {
                          Swal.fire({ title: "Info", text: "Role pengguna berhasil diubah.", timer: 1200, showConfirmButton: false });
                          loadUsers();
                        } else {
                          Swal.fire({ title: "Info", text: "Gagal mengubah role pengguna." });
                        }
                      } catch (err) {
                        Swal.fire({ title: "Error", text: "Terjadi kesalahan sistem." });
                      }
                    }}
                  >
                    <option value="user">Member (User)</option>
                    <option value="admin">Administrator</option>
                  </select>

                  {selectedUserId === u.id ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Input
                        type="number"
                        placeholder="Jumlah (+/- Saldo)"
                        className="w-36 text-xs h-8"
                        value={balAmount}
                        onChange={(e) => setBalAmount(e.target.value)}
                      />
                      <Button size="sm" className="text-xs h-8 px-2.5" onClick={() => handleUpdateBalance(u.id)}>
                        Simpan
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-8 px-2"
                        onClick={() => {
                          setSelectedUserId(null);
                          setBalAmount("");
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => {
                        setSelectedUserId(u.id);
                        setSelectedCoinUserId(null);
                      }}
                    >
                      Edit Saldo
                    </Button>
                  )}

                  {selectedCoinUserId === u.id ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Input
                        type="number"
                        placeholder="+/- Koin"
                        className="w-28 text-xs h-8"
                        value={coinAmount}
                        onChange={(e) => setCoinAmount(e.target.value)}
                      />
                      <Button
                        size="sm"
                        className="text-xs h-8 px-2.5 bg-amber-500 hover:bg-amber-600 text-white"
                        onClick={() => handleUpdateCoins(u.id)}
                      >
                        Simpan
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-8 px-2"
                        onClick={() => {
                          setSelectedCoinUserId(null);
                          setCoinAmount("");
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 text-amber-600 border-amber-200 hover:bg-amber-50 dark:border-amber-800/40 dark:hover:bg-amber-950/30"
                      onClick={() => {
                        setSelectedCoinUserId(u.id);
                        setSelectedUserId(null);
                      }}
                    >
                      Edit Koin
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 gap-1 border-hairline text-ink hover:bg-parchment"
                    onClick={() => {
                      setInspectLogUser({ id: u.id, name: u.name, email: u.email, role: u.role });
                      setShowUserLogModal(true);
                    }}
                    title="Lihat log audit aktivitas pengguna ini"
                  >
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    <span>Log</span>
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    className="text-xs h-8"
                    onClick={async () => {
                      const res = await Swal.fire({
                        title: "Hapus Pengguna?",
                        text: `Yakin ingin menghapus akun ${u.name}? Tindakan ini permanen.`,
                        showCancelButton: true,
                        confirmButtonText: "Ya, Hapus",
                        cancelButtonText: "Batal",
                        confirmButtonColor: "#ef4444",
                      });
                      if (!res.isConfirmed) return;
                      try {
                        const res = await fetch("/api/admin/delete-user", {
                          method: "POST",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ userId: u.id }),
                        });
                        if (res.ok) {
                          Swal.fire({ title: "Terhapus", text: "Pengguna berhasil dihapus.", timer: 1200, showConfirmButton: false });
                          loadUsers();
                        } else {
                          Swal.fire({ title: "Gagal", text: "Gagal menghapus akun pengguna." });
                        }
                      } catch (e) {
                        Swal.fire({ title: "Error", text: "Terjadi kesalahan jaringan." });
                      }
                    }}
                  >
                    Hapus
                  </Button>
                </div>
              </div>
            ))}

            {/* Pagination Controls */}
            {totalUserPages > 1 && (
              <div className="flex justify-center items-center gap-3 pt-4 border-t border-hairline">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                  disabled={userPage === 1}
                >
                  Sebelumnya
                </Button>
                <span className="text-xs font-semibold text-ink-muted">
                  Halaman {userPage} dari {totalUserPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setUserPage((p) => Math.min(totalUserPages, p + 1))}
                  disabled={userPage === totalUserPages}
                >
                  Selanjutnya
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* User Activity Log Modal */}
      {showUserLogModal && inspectLogUser && (
        <AdminUserActivityModal
          user={inspectLogUser}
          isOpen={showUserLogModal}
          onClose={() => {
            setShowUserLogModal(false);
            setInspectLogUser(null);
          }}
        />
      )}
    </div>
  );
}
