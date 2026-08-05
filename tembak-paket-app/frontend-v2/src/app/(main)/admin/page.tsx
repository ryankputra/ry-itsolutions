"use client";
import React, { useEffect, useState, useRef } from "react";
import { useApp } from "@/lib/store";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Swal from "sweetalert2";

export default function AdminPage() {
  const { user, loading: userLoading } = useApp();
  const [activeTab, setActiveTab] = useState("paket");

  // Packages State
  const [packages, setPackages] = useState<any[]>([]);
  const [loadingPkgs, setLoadingPkgs] = useState(false);
  const [searchPkg, setSearchPkg] = useState("");
  const [selectedPkgIndex, setSelectedPkgIndex] = useState<number | null>(null);
  const [isOpenPkg, setIsOpenPkg] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [syncing, setSyncing] = useState(false);
  const [savingPkg, setSavingPkg] = useState(false);

  // Users State
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [balAmount, setBalAmount] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Settings State
  const [announcement, setAnnouncement] = useState("");
  const [savingAnn, setSavingAnn] = useState(false);
  const [paymentGateway, setPaymentGateway] = useState("orkut");
  const [savingGateway, setSavingGateway] = useState(false);
  const [providerBalances, setProviderBalances] = useState<{kmsp: number | null, ceirgo: number | null}>({ kmsp: null, ceirgo: null });
  
  // Ceirgo Admin Top Up State
  const [showCeirgoTopUp, setShowCeirgoTopUp] = useState(false);
  const [ceirgoProviders, setCeirgoProviders] = useState<any[]>([]);
  const [ceirgoTopUpAmount, setCeirgoTopUpAmount] = useState("");
  const [ceirgoProviderCode, setCeirgoProviderCode] = useState("");
  const [ceirgoTopUpLoading, setCeirgoTopUpLoading] = useState(false);
  const [ceirgoPaymentData, setCeirgoPaymentData] = useState<any>(null);
  
  

  // Manual Orders State
  const [manualOrders, setManualOrders] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any>({});
  const [imeiPackages, setImeiPackages] = useState<any[]>([]);
  const [newImeiPkg, setNewImeiPkg] = useState({ duration: "", price: "" });
  const [ceirgoServices, setCeirgoServices] = useState<any[]>([]);
  const [ceirgoPricing, setCeirgoPricing] = useState<any>({});
  const [loadingManual, setLoadingManual] = useState(false);
  const [manualActionData, setManualActionData] = useState<{ id: string, status: string, note: string, file: File | null } | null>(null);
  const [hideSuccess, setHideSuccess] = useState(true);

  
  useEffect(() => {
    if (activeTab === 'pesanan-manual') {
      Notification.requestPermission();
      
      const interval = setInterval(async () => {
        try {
          const res = await fetch('/api/admin/manual-orders', { credentials: 'include' });
          if (res.ok) {
            const d = await res.json();
            if (d.status) {
              setManualOrders(prev => {
                const newPending = d.data.filter((o: any) => o.status === 'pending');
                const oldPending = prev.filter((o: any) => o.status === 'pending');
                if (newPending.length > oldPending.length) {
                  // New order arrived!
                  Swal.fire({
                    title: 'Pesanan Manual Baru!',
                    text: 'Ada pesanan manual baru yang perlu diproses.',
                    icon: 'info',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 5000
                  });
                  if (Notification.permission === 'granted') {
                    new Notification('Pesanan Manual Baru!', {
                      body: 'Ada pesanan manual baru di Antrean.'
                    });
                  }
                }
                return d.data;
              });
            }
          }
        } catch(e) {}
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);
  
  useEffect(() => {
    if (!userLoading && user?.role !== 'admin') redirect("/dashboard");
  }, [user, userLoading]);

  const [imeiServiceOpen, setImeiServiceOpen] = useState(true);
  const [imeiServiceNote, setImeiServiceNote] = useState("");

  const loadManualData = async () => {
    setLoadingManual(true);
    try {
      const [ordRes, prcRes, imeiRes, ceirSvcRes, ceirPrcRes, statusRes] = await Promise.all([
        fetch('/api/admin/manual-orders', { credentials: 'include' }),
        fetch('/api/manual-services-pricing'),
        fetch('/api/imei-packages?all=true'),
        fetch('/api/admin/ceirgo-services', { credentials: 'include' }),
        fetch('/api/ceirgo-pricing'),
        fetch('/api/imei-service-status', { cache: 'no-store' })
      ]);
      if (ordRes.ok) {
        const d = await ordRes.json();
        if (d.status) setManualOrders(d.data);
      }
      if (prcRes.ok) {
        const d = await prcRes.json();
        if (d.status) setPricing(d.data);
      }
      if (imeiRes.ok) {
        const d = await imeiRes.json();
        if (d.status) setImeiPackages(d.data);
      }
      if (ceirSvcRes?.ok) {
        const d = await ceirSvcRes.json();
        if (d.status) setCeirgoServices(d.data);
      }
      if (ceirPrcRes?.ok) {
        const d = await ceirPrcRes.json();
        if (d.status) setCeirgoPricing(d.data);
      }
      if (statusRes.ok) {
        const d = await statusRes.json();
        if (d.status) {
          setImeiServiceOpen(d.isOpen);
          setImeiServiceNote(d.note || "");
        }
      }
    } finally { setLoadingManual(false); }
  };

  const loadPackages = async () => {
    setLoadingPkgs(true);
    try {
      const res = await fetch('/api/admin/packages', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.status) setPackages(data.data);
      }
    } finally { setLoadingPkgs(false); }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.status) setUsers(data.data);
      }
    } finally { setLoadingUsers(false); }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      if (activeTab === "paket") loadPackages();
      if (activeTab === "pengguna") loadUsers();
      if (activeTab === "pesanan-manual") loadManualData();
      if (activeTab === "pengaturan") {
        fetch('/api/admin/payment-gateway').then(r => r.json()).then(d => {
          if (d.status) setPaymentGateway(d.data.gateway);
        }).catch(() => {});
        
        // Ambil saldo provider
        fetch('/api/admin/kmsp-balance', { credentials: 'include' })
          .then(r => r.json())
          .then(d => setProviderBalances(prev => ({ ...prev, kmsp: d.data?.balance })))
          .catch(() => {});
          
        fetch('/api/admin/ceirgo-balance', { credentials: 'include' })
          .then(r => r.json())
          .then(d => setProviderBalances(prev => ({ ...prev, ceirgo: d.data?.balance })))
          .catch(() => {});
          
        // Ambil daftar provider deposit ceirgo
        fetch('/api/admin/ceirgo-deposit-providers', { credentials: 'include' })
          .then(r => r.json())
          .then(d => { if (d.status) setCeirgoProviders(d.data); })
          .catch(() => {});
      }
    }
  }, [user, activeTab]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpenPkg(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/sync-packages', { method: 'POST', credentials: 'include' });
      if (res.ok) {
        await loadPackages();
        setSelectedPkgIndex(null);
        Swal.fire({title: "Info", text: 'Sinkronisasi KMSP berhasil!', icon: "info"});
      } else Swal.fire({title: "Info", text: 'Gagal sinkronisasi', icon: "info"});
    } finally { setSyncing(false); }
  };

  const handleSaveSinglePkg = async () => {
    if (selectedPkgIndex === null) return;
    setSavingPkg(true);
    try {
      const res = await fetch('/api/admin/packages/bulk-update', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packages: [packages[selectedPkgIndex!]] })
      });
      if (res.ok) Swal.fire({title: "Info", text: 'Tersimpan!', icon: "info"});
      else Swal.fire({title: "Info", text: 'Gagal menyimpan', icon: "info"});
    } finally { setSavingPkg(false); }
  };

  const handleUpdateBalance = async (userId: number) => {
    if (!balAmount) return;
    try {
      const res = await fetch('/api/admin/update-balance', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount: parseInt(balAmount) })
      });
      if (res.ok) {
        Swal.fire({title: "Info", text: "Saldo ditambahkan", icon: "info"});
        loadUsers();
        setBalAmount("");
        setSelectedUserId(null);
      }
    } catch (e) { Swal.fire({title: "Info", text: "Error update balance", icon: "info"}); }
  };

  const handleDeleteZeroBalance = async () => {
    const res = await Swal.fire({
      title: 'Hapus Semua Akun Saldo 0?',
      text: 'Semua user (kecuali admin) dengan saldo Rp 0 akan dihapus permanen! Ini tidak bisa dibatalkan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus Semua!',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#d33'
    });
    
    if (!res.isConfirmed) return;
    
    try {
      const resp = await fetch('/api/admin/delete-zero-balance', {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await resp.json();
      if (resp.ok) {
        Swal.fire('Berhasil', data.message, 'success');
        loadUsers();
      } else {
        Swal.fire('Gagal', data.message || 'Gagal menghapus pengguna', 'error');
      }
    } catch (e) {
      Swal.fire('Error', 'Kesalahan jaringan', 'error');
    }
  };

  const handleSaveAnnouncement = async () => {
    setSavingAnn(true);
    try {
      const res = await fetch('/api/admin/announcement', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: announcement, isEnabled: true })
      });
      if (res.ok) Swal.fire({title: "Info", text: "Pengumuman disimpan!", icon: "info"});
    } finally { setSavingAnn(false); }
  };

  if (userLoading) return <p>Memuat Admin Panel...</p>;

  const filteredPackages = packages.filter(p => 
    p.name.toLowerCase().includes(searchPkg.toLowerCase()) || 
    p.package_code.toLowerCase().includes(searchPkg.toLowerCase())
  );
  const selectedPkg = selectedPkgIndex !== null ? packages[selectedPkgIndex!] : null;

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchUser.toLowerCase()) || 
    u.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  const usersPerPage = 10;
  const totalUserPages = Math.ceil(filteredUsers.length / usersPerPage);
  const paginatedUsers = filteredUsers.slice((userPage - 1) * usersPerPage, userPage * usersPerPage);

  useEffect(() => {
    setUserPage(1);
  }, [searchUser]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex gap-4 border-b border-hairline pb-4 overflow-x-auto">
        {['paket', 'pengguna', 'pesanan-manual', 'pengaturan'].map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold capitalize rounded-full transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-primary text-white' : 'text-ink-muted hover:bg-parchment hover:text-ink'}`}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      {activeTab === 'paket' && (
        <Card glass className="p-6 space-y-6 overflow-visible">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Kelola Paket</h2>
            <Button variant="outline" onClick={handleSync} isLoading={syncing}>Sync KMSP</Button>
          </div>
          <div className="flex flex-col gap-1.5 relative" ref={dropdownRef}>
            <label className="text-sm font-medium text-ink/80">Cari & Pilih Paket</label>
            <input 
              type="text"
              className="w-full h-11 rounded-full border border-hairline bg-canvas px-5 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Ketik nama paket atau kode..."
              value={selectedPkg ? selectedPkg.name : searchPkg}
              onChange={(e) => {
                setSearchPkg(e.target.value);
                setSelectedPkgIndex(null);
                setIsOpenPkg(true);
              }}
              onFocus={() => setIsOpenPkg(true)}
            />
            {isOpenPkg && filteredPackages.length > 0 && (
              <div className="absolute top-[72px] left-0 right-0 max-h-60 overflow-y-auto bg-canvas border border-hairline rounded-xl shadow-lg z-50">
                {filteredPackages.map((p) => {
                  const originalIdx = packages.findIndex(pkg => pkg.package_code === p.package_code);
                  return (
                    <div 
                      key={p.package_code}
                      className="p-3 hover:bg-parchment cursor-pointer border-b border-hairline last:border-0"
                      onClick={() => {
                        setSelectedPkgIndex(originalIdx);
                        setIsOpenPkg(false);
                      }}
                    >
                      <p className="font-semibold text-sm text-ink">{p.name}</p>
                      <p className="text-xs text-ink-muted">{p.package_code}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {selectedPkg && (
            <div className="pt-4 border-t border-hairline space-y-6">
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Editing Paket</p>
                <h4 className="font-bold text-lg text-ink">{selectedPkg.name}</h4>
                <p className="text-sm text-ink-muted">Harga Asli: Rp {selectedPkg.original_price?.toLocaleString('id-ID')}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Platform Fee (Rp)" 
                  type="number" 
                  value={selectedPkg.platform_fee || 0}
                  onChange={(e) => {
                    const newPkgs = [...packages];
                    newPkgs[selectedPkgIndex!] = { ...newPkgs[selectedPkgIndex!], platform_fee: parseInt(e.target.value) || 0 };
                    setPackages(newPkgs);
                  }}
                />
                <Input 
                  label="Reseller Fee (Rp)" 
                  type="number" 
                  value={selectedPkg.reseller_fee || 0}
                  onChange={(e) => {
                    const newPkgs = [...packages];
                    newPkgs[selectedPkgIndex!] = { ...newPkgs[selectedPkgIndex!], reseller_fee: parseInt(e.target.value) || 0 };
                    setPackages(newPkgs);
                  }}
                />
              </div>

              <div className="flex flex-col gap-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded border-hairline text-primary"
                    checked={selectedPkg.isVisible}
                    onChange={(e) => {
                      const newPkgs = [...packages];
                      newPkgs[selectedPkgIndex!] = { ...newPkgs[selectedPkgIndex!], isVisible: e.target.checked };
                      setPackages(newPkgs);
                    }}
                  />
                  <span className="text-sm font-medium text-ink">Tampilkan Paket ke User (Aktif)</span>
                </label>
              </div>
              <Button className="w-full" onClick={handleSaveSinglePkg} isLoading={savingPkg}>Simpan Pengaturan Paket</Button>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'pengguna' && (
        <Card glass className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              Kelola Pengguna
              <Button size="sm" variant="outline" className="text-xs text-rose-500 border-rose-200 hover:bg-rose-50 px-3 py-1 ml-2" onClick={handleDeleteZeroBalance}>
                🗑 Hapus Semua Saldo 0
              </Button>
            </h2>
            <input 
              type="text" 
              className="h-10 rounded-full border border-hairline bg-canvas px-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-w-[250px]"
              placeholder="Cari nama atau email..."
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
            />
          </div>
          {loadingUsers ? <p className="text-sm text-ink-muted">Memuat...</p> : (
            <div className="space-y-4">
              {paginatedUsers.map(u => (
                <div key={u.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-hairline rounded-lg bg-canvas gap-4">
                  <div className="flex-1">
                    <p className="font-bold text-ink">{u.name}</p>
                    <p className="text-xs text-ink-muted">{u.email}</p>
                    <p className="text-sm font-semibold text-primary mt-1">Saldo: Rp {u.balance?.toLocaleString('id-ID')}</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <select 
                      className="h-9 px-3 rounded-md border border-hairline bg-canvas text-sm focus:outline-none focus:border-primary cursor-pointer"
                      value={u.role}
                      onChange={async (e) => {
                        try {
                          const res = await fetch('/api/admin/update-user-role', {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: u.id, newRole: e.target.value })
                          });
                          if (res.ok) {
                            Swal.fire({title: "Info", text: "Role diubah!", icon: "info"});
                            loadUsers();
                          } else Swal.fire({title: "Info", text: "Gagal mengubah role", icon: "info"});
                        } catch(err) { Swal.fire({title: "Info", text: "Error ubah role", icon: "info"}); }
                      }}
                    >
                      <option value="user">User</option>
                      <option value="reseller">Reseller</option>
                      <option value="admin">Admin</option>
                    </select>

                    {selectedUserId === u.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Input type="number" placeholder="Gunakan - untuk kurang (misal: -10000)" className="w-60 text-xs" value={balAmount} onChange={(e) => setBalAmount(e.target.value)} />
                        <Button size="sm" onClick={() => handleUpdateBalance(u.id)}>Simpan Saldo</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setSelectedUserId(null); setBalAmount(""); }}>X</Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setSelectedUserId(u.id)}>Edit Saldo</Button>
                    )}

                    {u.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={async () => {
                          const res = await Swal.fire({title: "Konfirmasi", text: "Setujui pendaftaran user ini?", icon: "warning", showCancelButton: true}); if(!res.isConfirmed) return;
                          try {
                            const res = await fetch('/api/admin/approve-user', {
                              method: 'POST',
                              credentials: 'include',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ userId: u.id })
                            });
                            if(res.ok) loadUsers();
                          } catch(e) {}
                        }}>Approve</Button>
                        <Button variant="danger" size="sm" onClick={async () => {
                          const res = await Swal.fire({title: "Konfirmasi", text: "Tolak user ini?", icon: "warning", showCancelButton: true}); if(!res.isConfirmed) return;
                          try {
                            const res = await fetch('/api/admin/reject-user', {
                              method: 'POST',
                              credentials: 'include',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ userId: u.id })
                            });
                            if(res.ok) loadUsers();
                          } catch(e) {}
                        }}>Reject</Button>
                      </div>
                    )}
                    
                    <Button variant="danger" size="sm" onClick={async () => {
                      const res = await Swal.fire({title: "Konfirmasi", text: "Yakin ingin menghapus pengguna ini?", icon: "warning", showCancelButton: true}); if(!res.isConfirmed) return;
                      try {
                        const res = await fetch('/api/admin/delete-user', {
                          method: 'POST',
                          credentials: 'include',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ userId: u.id })
                        });
                        if(res.ok) loadUsers();
                        else Swal.fire({title: "Info", text: "Gagal hapus, mungkin anda menghapus diri sendiri.", icon: "info"});
                      } catch(e) { Swal.fire({title: "Info", text: "Error", icon: "info"}); }
                    }}>Hapus</Button>
                  </div>
                </div>
              ))}
              
              {/* Pagination Controls */}
              {totalUserPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setUserPage(p => Math.max(1, p - 1))}
                    disabled={userPage === 1}
                  >
                    Sebelumnya
                  </Button>
                  <span className="text-sm font-medium">Halaman {userPage} dari {totalUserPages}</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setUserPage(p => Math.min(totalUserPages, p + 1))}
                    disabled={userPage === totalUserPages}
                  >
                    Selanjutnya
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'pesanan-manual' && (
        <div className="space-y-6">
          <Card glass className="p-6 space-y-6">
            <h2 className="text-xl font-bold">Pengaturan Layanan Manual</h2>

            {/* Status Layanan Toggle */}
            <div className="bg-canvas border border-hairline p-4 rounded-2xl space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-ink">Status Layanan Unblock IMEI</h3>
                  <p className="text-xs text-ink-muted mt-0.5">Atur apakah user bisa melakukan order Unblock IMEI.</p>
                </div>
                <button 
                  onClick={async () => {
                    const newStatus = !imeiServiceOpen;
                    setImeiServiceOpen(newStatus);
                    await fetch('/api/admin/imei-service-status', {
                      method: 'POST',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ isOpen: newStatus, note: imeiServiceNote })
                    });
                    Swal.fire({ title: 'Tersimpan', text: `Layanan IMEI sekarang ${newStatus ? 'BUKA' : 'TUTUP'}`, icon: 'success', timer: 2000 });
                  }} 
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${imeiServiceOpen ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'}`}
                >
                  {imeiServiceOpen ? '🟢 OPEN / BUKA' : '🔴 CLOSE / TUTUP'}
                </button>
              </div>
              <div className="flex gap-2 items-end">
                <Input 
                  label="Catatan Khusus saat Tutup (Opsional)" 
                  placeholder="Contoh: Server lagi maintenance..." 
                  value={imeiServiceNote} 
                  onChange={e => setImeiServiceNote(e.target.value)} 
                />
                <Button 
                  className="h-10 shrink-0" 
                  onClick={async () => {
                    await fetch('/api/admin/imei-service-status', {
                      method: 'POST',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ isOpen: imeiServiceOpen, note: imeiServiceNote })
                    });
                    Swal.fire({ title: 'Berhasil', text: 'Catatan IMEI berhasil disimpan!', icon: 'success', timer: 2000 });
                  }}
                >
                  Simpan Catatan
                </Button>
              </div>
            </div>
            
            <div className="space-y-3 pt-4 border-t border-hairline">
              <h3 className="font-bold text-ink">Paket Unblock IMEI</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {imeiPackages.map(pkg => (
                  <div key={pkg.id} className="p-3 border border-hairline rounded-xl flex justify-between items-center bg-canvas">
                    <div>
                      <p className="font-bold text-sm">{pkg.duration}</p>
                      <p className="text-xs text-ink-muted">Rp {pkg.price.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button onClick={async () => {
                        await fetch(`/api/admin/imei-packages/${pkg.id}/toggle`, { 
                          method: 'PUT', 
                          credentials: 'include', 
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ isVisible: pkg.isVisible === 1 ? 0 : 1 })
                        });
                        loadManualData();
                      }} className={`px-2 py-1 text-xs font-bold rounded ${pkg.isVisible === 1 ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                        {pkg.isVisible === 1 ? 'Aktif' : 'Hidden'}
                      </button>
                      <button onClick={async () => {
                        const res = await Swal.fire({title: "Konfirmasi", text: "Hapus paket ini?", icon: "warning", showCancelButton: true}); if(res.isConfirmed) {
                          await fetch(`/api/admin/imei-packages/${pkg.id}`, { method: 'DELETE', credentials: 'include' });
                          loadManualData();
                        }
                      }} className="text-red-500 hover:text-red-700 font-bold p-1">&times;</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 items-end pt-2">
                <Input label="Durasi Baru (Misal: 6 Bulan)" value={newImeiPkg.duration} onChange={e => setNewImeiPkg({...newImeiPkg, duration: e.target.value})} />
                <Input label="Harga (Rp)" type="number" value={newImeiPkg.price} onChange={e => setNewImeiPkg({...newImeiPkg, price: e.target.value})} />
                <Button className="h-10 shrink-0" onClick={async () => {
                  if (!newImeiPkg.duration || !newImeiPkg.price) return Swal.fire({title: "Info", text: "Isi durasi dan harga", icon: "info"});
                  await fetch('/api/admin/imei-packages', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ duration: newImeiPkg.duration, price: parseInt(newImeiPkg.price) }) });
                  setNewImeiPkg({ duration: "", price: "" });
                  loadManualData();
                }}>+ Tambah</Button>
              </div>
            </div>
            <div className="pt-4 border-t border-hairline space-y-3">
              <h3 className="font-bold text-ink">Kecepatan Proses IMEI (Biaya Tambahan)</h3>
              <p className="text-xs text-ink-muted">Tekan tombol status untuk menampilkan atau menyembunyikan opsi kecepatan dari user.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Fast */}
                <div className="bg-canvas border border-hairline p-3 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm">⚡ Fast</span>
                    <button onClick={() => setPricing({ ...pricing, imei_speed_fast_status: pricing.imei_speed_fast_status === 'hidden' ? 'active' : 'hidden' })} 
                      className={`px-2 py-1 text-xs font-bold rounded ${pricing.imei_speed_fast_status !== 'hidden' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                      {pricing.imei_speed_fast_status !== 'hidden' ? 'Aktif' : 'Hidden'}
                    </button>
                  </div>
                  <Input placeholder="Harga (Rp)" type="number" value={pricing.imei_speed_fast || ''} onChange={e => setPricing({...pricing, imei_speed_fast: e.target.value})} />
                </div>

                {/* Semi Fast */}
                <div className="bg-canvas border border-hairline p-3 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-sm">Menu &quot;Beli Paket&quot;</p>
                    <button onClick={() => setPricing({ ...pricing, imei_speed_semi_status: pricing.imei_speed_semi_status === 'hidden' ? 'active' : 'hidden' })} 
                      className={`px-2 py-1 text-xs font-bold rounded ${pricing.imei_speed_semi_status !== 'hidden' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                      {pricing.imei_speed_semi_status !== 'hidden' ? 'Aktif' : 'Hidden'}
                    </button>
                  </div>
                  <Input placeholder="Harga (Rp)" type="number" value={pricing.imei_speed_semi || ''} onChange={e => setPricing({...pricing, imei_speed_semi: e.target.value})} />
                </div>

                {/* Slow */}
                <div className="bg-canvas border border-hairline p-3 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm">🐌 Slow</span>
                    <button onClick={() => setPricing({ ...pricing, imei_speed_slow_status: pricing.imei_speed_slow_status === 'hidden' ? 'active' : 'hidden' })} 
                      className={`px-2 py-1 text-xs font-bold rounded ${pricing.imei_speed_slow_status !== 'hidden' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                      {pricing.imei_speed_slow_status !== 'hidden' ? 'Aktif' : 'Hidden'}
                    </button>
                  </div>
                  <Input placeholder="Harga (Rp)" type="number" value={pricing.imei_speed_slow || ''} onChange={e => setPricing({...pricing, imei_speed_slow: e.target.value})} />
                </div>
              </div>
            </div>

            <Button onClick={async () => {
              try {
                const res = await fetch('/api/admin/manual-services-pricing', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pricing) });
                if(res.ok) Swal.fire({title: "Info", text: "Harga tersimpan!", icon: "info"});
              } catch(e) {}
            }}>Simpan Pengaturan Harga</Button>
          </Card>

          <Card glass className="p-6 space-y-6 border-primary/50">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold">Sinkronisasi Layanan Ceirgo.id</h2>
                <p className="text-sm text-ink-muted mt-1">Atur harga jual layanan otomatis dari API Ceirgo.</p>
              </div>
              <Button size="sm" variant="outline" onClick={loadManualData}>🔄 Refresh dari Ceirgo</Button>
            </div>
            
            {ceirgoServices.length === 0 ? (
              <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm border border-amber-200">
                Layanan Ceirgo tidak ditemukan. Pastikan <b>CEIRGO_API_KEY</b> di <code>.env</code> sudah benar.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ceirgoServices.map((svc) => (
                    <div key={svc.code} className="bg-canvas border border-hairline p-4 rounded-xl flex flex-col gap-3">
                      <div>
                        <p className="font-bold text-ink">{svc.name}</p>
                        <p className="text-xs text-primary font-semibold font-mono">{svc.code}</p>
                        <p className="text-xs text-ink-muted mt-1">Modal Asli: Rp {svc.modalPrice.toLocaleString('id-ID')}</p>
                      </div>
                      <Input 
                        label="Harga Jual ke User (Rp)" 
                        type="number"
                        value={ceirgoPricing[svc.code] ?? svc.modalPrice} 
                        onChange={(e) => setCeirgoPricing({...ceirgoPricing, [svc.code]: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  ))}
                </div>
                <Button onClick={async () => {
                  try {
                    const res = await fetch('/api/admin/ceirgo-pricing', {
                      method: 'POST',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(ceirgoPricing)
                    });
                    if (res.ok) Swal.fire({title: "Info", text: "Harga layanan Ceirgo berhasil disimpan!", icon: "info"});
                  } catch(e) { Swal.fire({title: "Info", text: "Error menyimpan harga", icon: "info"}); }
                }} className="w-full">Simpan Harga Jual Ceirgo</Button>
              </div>
            )}
          </Card>

          <Card glass className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Antrean Pesanan Manual</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={hideSuccess} onChange={e => setHideSuccess(e.target.checked)} className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Sembunyikan Sukses</span>
              </label>
            </div>
            {loadingManual ? <p>Memuat...</p> : manualOrders.length === 0 ? <p className="text-ink-muted">Tidak ada pesanan.</p> : (
              <div className="space-y-4">
                {manualOrders.filter(o => hideSuccess ? o.status !== "success" : true).map(o => (
                  <div key={o.id} className="p-4 border border-hairline rounded-lg bg-canvas space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold">{o.packageName}</p>
                        <p className="text-sm">User: {o.userName}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {o.imei?.split(',').map((im: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded border border-primary/20">{im.trim()}</span>
                          ))}
                        </div>
                        {o.speed_option && (
                          <p className="text-xs font-semibold text-primary mt-1">
                            Kecepatan: <span className="capitalize">{o.speed_option === 'fast' ? '⚡ Fast' : o.speed_option === 'semi' ? '🚀 Semi Fast' : '🐌 Slow'}</span>
                          </p>
                        )}
                        <p className="text-xs text-ink-muted mt-1">{new Date(o.createdAt).toLocaleString()}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${o.status === 'success' ? 'bg-green-100 text-green-700' : o.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{o.status}</span>
                    </div>

                    <div className="flex gap-4 flex-wrap">
                      {o.user_image && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold">Bukti SS *#06#:</p>
                          <div className="flex flex-wrap gap-2">
                            {o.user_image.split(',').map((imgUrl: string, idx: number) => (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img 
                                key={idx}
                                src={imgUrl} 
                                alt={`Bukti User ${idx+1}`} 
                                className="h-24 object-contain rounded border border-hairline bg-white p-1 cursor-zoom-in hover:scale-105 transition-transform" 
                                onClick={() => {
                                  Swal.fire({
                                    imageUrl: imgUrl,
                                    imageAlt: 'Bukti User',
                                    showConfirmButton: false,
                                    showCloseButton: true,
                                    background: 'rgba(0,0,0,0.9)',
                                    customClass: {
                                      image: 'max-h-[85vh] object-contain'
                                    }
                                  });
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      {o.user_image_ceir && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold">Bukti SS Cek CEIR:</p>
                          <div className="flex flex-wrap gap-2">
                            {o.user_image_ceir.split(',').map((imgUrl: string, idx: number) => (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img 
                                key={idx}
                                src={imgUrl} 
                                alt={`Bukti CEIR User ${idx+1}`} 
                                className="h-24 object-contain rounded border border-hairline bg-white p-1 cursor-zoom-in hover:scale-105 transition-transform" 
                                onClick={() => {
                                  Swal.fire({
                                    imageUrl: imgUrl,
                                    imageAlt: 'Bukti CEIR User',
                                    showConfirmButton: false,
                                    showCloseButton: true,
                                    background: 'rgba(0,0,0,0.9)',
                                    customClass: {
                                      image: 'max-h-[85vh] object-contain'
                                    }
                                  });
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {manualActionData?.id === o.id ? (
                      <div className="bg-parchment p-4 rounded-xl space-y-3 mt-4">
                        <select className="w-full h-10 rounded-lg border border-hairline px-3" value={manualActionData?.status || "pending"} onChange={e => setManualActionData(prev => prev ? {...prev, status: e.target.value} : null)}>
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="success">Success</option>
                          <option value="failed">Failed (Refund Saldo)</option>
                        </select>
                        <Input label="Catatan Admin" placeholder="Berikan catatan..." value={manualActionData?.note || ""} onChange={e => setManualActionData(prev => prev ? {...prev, note: e.target.value} : null)} />
                        <div>
                          <label className="text-sm font-medium">Upload Hasil/Bukti (Opsional)</label>
                          <input type="file" className="block w-full text-sm mt-1" onChange={e => setManualActionData(prev => prev ? {...prev, file: e.target.files?.[0] || null} : null)} />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={async () => {
                            const formData = new FormData();
                            formData.append("status", manualActionData?.status || "pending");
                            formData.append("admin_note", manualActionData?.note || "");
                            if (manualActionData?.file) formData.append("image", manualActionData?.file);
                            
                            try {
                              const res = await fetch(`/api/admin/manual-orders/${o.id}`, { method: 'PUT', credentials: 'include', body: formData });
                              if(res.ok) {
                                Swal.fire({title: "Info", text: "Tersimpan!", icon: "info"});
                                setManualActionData(null);
                                loadManualData();
                              }
                            } catch(e) {}
                          }}>Simpan</Button>
                          <Button variant="ghost" onClick={() => setManualActionData(null)}>Batal</Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setManualActionData({ id: o.id, status: o.status, note: o.admin_note || '', file: null })}>Proses Pesanan</Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'pengaturan' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card glass className="p-6 space-y-4">
              <h2 className="text-xl font-bold">Saldo Provider Modal</h2>
              <p className="text-sm text-ink-muted">Sisa saldo di server pusat penyedia layanan.</p>
              <div className="space-y-3 mt-4">
                <div className="flex justify-between items-center p-3 bg-canvas border border-hairline rounded-xl">
                  <div className="font-bold text-sm">🌐 KMSP Store</div>
                  <div className="font-black text-primary">Rp {providerBalances.kmsp !== null ? providerBalances.kmsp?.toLocaleString('id-ID') : '...'}</div>
                </div>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center p-3 bg-canvas border border-hairline rounded-xl gap-3">
                  <div>
                    <div className="font-bold text-sm flex items-center gap-1.5">📱 Ceirgo.id</div>
                    <div className="font-black text-primary">Rp {providerBalances.ceirgo !== null ? providerBalances.ceirgo?.toLocaleString('id-ID') : '...'}</div>
                  </div>
                  <Button size="sm" onClick={() => setShowCeirgoTopUp(true)}>Isi Saldo</Button>
                </div>
              </div>
            </Card>

            <Card glass className="p-6 space-y-4">
              <h2 className="text-xl font-bold">Pengumuman Sistem</h2>
              <textarea 
                className="w-full p-4 border border-hairline rounded-lg bg-canvas text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                rows={4}
                placeholder="Masukkan pengumuman penting di sini..."
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
              />
              <Button onClick={handleSaveAnnouncement} isLoading={savingAnn}>Simpan Pengumuman</Button>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card glass className="p-6 space-y-4">
              <h2 className="text-xl font-bold">Payment Gateway (Top Up)</h2>
              <p className="text-sm text-ink-muted">Pilih gateway pembayaran QRIS yang aktif untuk top up saldo user.</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentGateway("orkut")}
                  className={`p-4 rounded-xl border text-center transition-all ${paymentGateway === 'orkut' ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary' : 'border-hairline bg-canvas hover:bg-parchment'}`}
                >
                  <div className="font-bold text-sm">🏦 ORKUT (QRIS Statis)</div>
                  <div className="text-xs text-ink-muted mt-1">Polling via ORKUT API, nominal unik</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentGateway("gopay")}
                  className={`p-4 rounded-xl border text-center transition-all ${paymentGateway === 'gopay' ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary' : 'border-hairline bg-canvas hover:bg-parchment'}`}
                >
                  <div className="font-bold text-sm">💚 GoPay Gateway</div>
                  <div className="text-xs text-ink-muted mt-1">QRIS dinamis, nominal tepat, auto-detect</div>
                </button>
              </div>
              <Button 
                className="w-full" 
                isLoading={savingGateway}
                onClick={async () => {
                  setSavingGateway(true);
                  try {
                    const res = await fetch('/api/admin/payment-gateway', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ gateway: paymentGateway })
                    });
                    const data = await res.json();
                    if (res.ok && data.status) Swal.fire({title: "Info", text: data.message, icon: "info"});
                    else Swal.fire({title: "Info", text: data.message || 'Gagal menyimpan', icon: "info"});
                  } catch (e) { Swal.fire({title: "Info", text: 'Error menyimpan gateway', icon: "info"}); }
                  finally { setSavingGateway(false); }
                }}
              >
                Simpan Gateway Aktif
              </Button>
            </Card>

            <Card glass className="p-6 space-y-4">
              <h2 className="text-xl font-bold">Database & Sistem</h2>
              <p className="text-sm text-ink-muted">Backup semua data (pengguna, transaksi, paket) ke file .sqlite</p>
              <a href="/api/admin/backup-database" download>
                <Button variant="outline" className="w-full">Unduh Backup Database (.sqlite)</Button>
              </a>
            </Card>
          </div>
        </div>
      )}

      {/* Modal Top Up Ceirgo */}
      {showCeirgoTopUp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => {
              setShowCeirgoTopUp(false);
              setCeirgoPaymentData(null);
            }} className="absolute right-4 top-4 text-ink-muted hover:text-ink w-8 h-8 flex items-center justify-center bg-slate-50 rounded-full font-bold">✕</button>
            
            <h3 className="text-xl font-bold mb-4">Isi Saldo Ceirgo.id</h3>
            
            {!ceirgoPaymentData ? (
              <div className="space-y-4">
                <Input 
                  label="Jumlah Isi Saldo (Min 10.000)" 
                  type="number" 
                  placeholder="Contoh: 50000" 
                  value={ceirgoTopUpAmount}
                  onChange={(e) => setCeirgoTopUpAmount(e.target.value)}
                />
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-ink/80">Pilih Metode Pembayaran</label>
                  {ceirgoProviders.length === 0 ? (
                    <p className="text-xs text-ink-muted">Memuat provider...</p>
                  ) : (
                    <select 
                      className="w-full h-11 rounded-xl border border-hairline px-3 bg-canvas text-sm outline-none focus:border-primary"
                      value={ceirgoProviderCode}
                      onChange={(e) => setCeirgoProviderCode(e.target.value)}
                    >
                      <option value="">-- Pilih Provider --</option>
                      {ceirgoProviders.map(p => (
                        <option key={p.code} value={p.code}>{p.display_name} ({p.channel})</option>
                      ))}
                    </select>
                  )}
                </div>

                <Button 
                  className="w-full" 
                  isLoading={ceirgoTopUpLoading}
                  onClick={async () => {
                    if (!ceirgoTopUpAmount || !ceirgoProviderCode) return Swal.fire({title: "Info", text: 'Isi nominal dan pilih provider', icon: "info"});
                    setCeirgoTopUpLoading(true);
                    try {
                      const res = await fetch('/api/admin/ceirgo-deposit', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ amount: ceirgoTopUpAmount, provider_code: ceirgoProviderCode })
                      });
                      const d = await res.json();
                      if (d.status) setCeirgoPaymentData(d.data);
                      else alert(d.message);
                    } catch (e) { Swal.fire({title: "Info", text: 'Error membuat deposit', icon: "info"}); }
                    finally { setCeirgoTopUpLoading(false); }
                  }}
                >
                  Lanjut Pembayaran
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-sm font-medium text-ink-muted">Selesaikan pembayaran Anda:</p>
                
                {ceirgoPaymentData.qr ? (
                  <>
                    <div className="bg-white p-4 rounded-2xl inline-block border border-hairline shadow-sm">
                      <img src={ceirgoPaymentData.qr} alt="QRIS" className="w-64 h-64 object-contain mx-auto" />
                    </div>
                    <div className="bg-primary/5 p-4 rounded-xl">
                      <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Jumlah Harus Dibayar</p>
                      <p className="text-3xl font-black text-primary mt-1">Rp {ceirgoPaymentData.total_pay.toLocaleString('id-ID')}</p>
                    </div>
                  </>
                ) : ceirgoPaymentData.account_number ? (
                  <div className="bg-primary/5 p-4 rounded-xl text-left space-y-2">
                    <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Transfer Ke:</p>
                    <p className="font-bold text-lg">{ceirgoPaymentData.provider}</p>
                    <div className="flex justify-between items-center bg-white p-2 rounded border border-hairline">
                      <span className="font-mono text-lg tracking-wider">{ceirgoPaymentData.account_number}</span>
                    </div>
                    <p className="text-sm">A/n: <b>{ceirgoPaymentData.account_holder}</b></p>
                    
                    <div className="pt-3 mt-3 border-t border-hairline">
                      <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Jumlah Harus Dibayar</p>
                      <p className="text-2xl font-black text-primary mt-1">Rp {ceirgoPaymentData.total_pay.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                ) : null}

                <div className="bg-blue-50 text-blue-800 p-3 rounded-xl text-xs text-left">
                  Saldo CEIRGO akan otomatis bertambah setelah pembayaran berhasil. Silakan cek saldo secara berkala di menu Pengaturan.
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
