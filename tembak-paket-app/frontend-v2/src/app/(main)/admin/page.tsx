"use client";
import React, { useEffect, useState, useRef } from "react";
import { useApp } from "@/lib/store";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { InvoiceModal } from "@/components/ui/InvoiceModal";
import Swal from "sweetalert2";

export default function AdminPage() {
  const { user, loading: userLoading, updateMenuSettings } = useApp();
  const [activeTab, setActiveTab] = useState("pesanan-manual");
  const [activeCategory, setActiveCategory] = useState("operasional");

  // Packages State
  const [packages, setPackages] = useState<any[]>([]);
  const [loadingPkgs, setLoadingPkgs] = useState(false);
  const [searchPkg, setSearchPkg] = useState("");
  const [selectedPkgIndex, setSelectedPkgIndex] = useState<number | null>(null);
  const [isOpenPkg, setIsOpenPkg] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [syncing, setSyncing] = useState(false);
  const [savingPkg, setSavingPkg] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Users State
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [balAmount, setBalAmount] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userPage, setUserPage] = useState(1);

  // Settings State
  const [announcement, setAnnouncement] = useState("");
  const [savingAnn, setSavingAnn] = useState(false);
  const [paymentGateway, setPaymentGateway] = useState("orkut");
  const [savingGateway, setSavingGateway] = useState(false);
  const [providerBalances, setProviderBalances] = useState<{ kmsp: number | null, ceirgo: number | null }>({ kmsp: null, ceirgo: null });
  const [showBeliPaket, setShowBeliPaket] = useState(false);
  const [savingMenuSettings, setSavingMenuSettings] = useState(false);
  const [showDeposit, setShowDeposit] = useState(true);
  const [depositMinAmount, setDepositMinAmount] = useState<number>(10000);
  const [autoAcceptCeirgo, setAutoAcceptCeirgo] = useState(false);
  const [savingDepositSettings, setSavingDepositSettings] = useState(false);

  // WhatsApp Gateway Settings State
  const [waToken, setWaToken] = useState("");
  const [waUrl, setWaUrl] = useState("https://api.fonnte.com/send");
  const [waAutoSend, setWaAutoSend] = useState(false);
  const [savingWhatsApp, setSavingWhatsApp] = useState(false);

  // Baileys WhatsApp Bot State (100% Gratis & Unlimited)
  const [baileysStatus, setBaileysStatus] = useState<{ isConnected: boolean, state: string, connectedPhone: string | null, qrCode: string | null }>({
    isConnected: false,
    state: "disconnected",
    connectedPhone: null,
    qrCode: null
  });
  const [loadingBaileys, setLoadingBaileys] = useState(false);

  const loadBaileysStatus = async () => {
    try {
      const res = await fetch('/api/admin/baileys/status', { credentials: 'include' });
      const d = await res.json();
      if (d.status && d.data) {
        setBaileysStatus(d.data);
      }
    } catch (e) {}
  };

  const handleInitBaileys = async (forceNew = false) => {
    setLoadingBaileys(true);
    try {
      await fetch('/api/admin/baileys/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ forceNew })
      });
      loadBaileysStatus();
    } catch (e) {}
    finally { setLoadingBaileys(false); }
  };

  const handleLogoutBaileys = async () => {
    const confirm = await Swal.fire({
      title: "Putus Koneksi WhatsApp?",
      text: "WhatsApp Bot akan logout dari server Anda.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Putus",
      cancelButtonText: "Batal"
    });
    if (!confirm.isConfirmed) return;

    setLoadingBaileys(true);
    try {
      const res = await fetch('/api/admin/baileys/logout', { method: 'POST', credentials: 'include' });
      const d = await res.json();
      if (d.status) {
        Swal.fire({ title: "Terputus", text: "WhatsApp bot telah logout.", icon: "info", timer: 1500 });
        loadBaileysStatus();
      }
    } catch (e) {}
    finally { setLoadingBaileys(false); }
  };

  // Server Pusat Deposit / Top Up Modal State
  const [showCeirgoTopUp, setShowCeirgoTopUp] = useState(false);
  const [ceirgoProviders, setCeirgoProviders] = useState<any[]>([]);
  const [ceirgoTopUpAmount, setCeirgoTopUpAmount] = useState("");
  const [ceirgoProviderCode, setCeirgoProviderCode] = useState("");
  const [ceirgoTopUpLoading, setCeirgoTopUpLoading] = useState(false);
  const [ceirgoPaymentData, setCeirgoPaymentData] = useState<any>(null);
  const [ceirgoDepositProviders, setCeirgoDepositProviders] = useState<any[]>([]);
  const [ceirgoDepositProviderCode, setCeirgoDepositProviderCode] = useState("");
  const [ceirgoDepositAmount, setCeirgoDepositAmount] = useState("");

  // Deploy Console State
  const [showDeployConsole, setShowDeployConsole] = useState(false);
  const [deployLogs, setDeployLogs] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);

  // Manual Orders & Service State
  const [manualOrders, setManualOrders] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any>({});
  const [imeiPackages, setImeiPackages] = useState<any[]>([]);
  const [newImeiPkg, setNewImeiPkg] = useState({ duration: "", price: "" });
  const [ceirgoServices, setCeirgoServices] = useState<any[]>([]);
  const [ceirgoPricing, setCeirgoPricing] = useState<any>({});
  const [loadingManual, setLoadingManual] = useState(false);
  const [manualActionData, setManualActionData] = useState<{ id: string, status: string, note: string, file: File | null } | null>(null);
  const [hideSuccess, setHideSuccess] = useState(false);
  const [hideFailed, setHideFailed] = useState(false);
  const [searchOrder, setSearchOrder] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [selectedInvoiceTrx, setSelectedInvoiceTrx] = useState<any>(null);

  const [imeiServiceOpen, setImeiServiceOpen] = useState(true);
  const [imeiServiceNote, setImeiServiceNote] = useState("");
  const [ceirgoDisplayCodes, setCeirgoDisplayCodes] = useState<Set<string>>(new Set());

  // Tickets State
  const [adminTickets, setAdminTickets] = useState<any[]>([]);
  const [adminActiveTicket, setAdminActiveTicket] = useState<any>(null);
  const [adminTicketMessages, setAdminTicketMessages] = useState<any[]>([]);
  const [adminReply, setAdminReply] = useState("");
  const [ticketFilter, setTicketFilter] = useState("all");
  const adminMessagesEndRef = useRef<HTMLDivElement>(null);

  // Coupons State
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discount_type: "fixed",
    discount_value: "",
    min_order_amount: "",
    max_discount_amount: "",
    max_usage_limit: "100",
    start_date: "",
    end_date: ""
  });
  const [creatingCoupon, setCreatingCoupon] = useState(false);

  // Referral Settings State
  const [refSettings, setRefSettings] = useState<any>({
    referral_enabled: "true",
    referral_commission_type: "fixed",
    referral_commission_value: "5000",
    referral_new_user_discount: "5000"
  });
  const [loadingRefSettings, setLoadingRefSettings] = useState(false);
  const [savingRefSettings, setSavingRefSettings] = useState(false);

  // Broadcast Promo State
  const [broadcastData, setBroadcastData] = useState({
    title: "PROMO SPESIAL RY-ITSOLUTIONS",
    message: "",
    voucherCode: "",
    targetTelegram: true,
    targetWhatsApp: true,
    targetInApp: true,
    bgColor: "#0066cc"
  });
  const [broadcasting, setBroadcasting] = useState(false);

  // Auto Deploy Trigger
  const startDeploy = async () => {
    try {
      const res = await fetch('/api/admin/deploy', { method: 'POST', credentials: 'include' });
      const d = await res.json();
      if (d.status) {
        setShowDeployConsole(true);
        setIsDeploying(true);
        setDeployLogs("Menghubungi server...\n");

        const interval = setInterval(async () => {
          try {
            const statusRes = await fetch('/api/admin/deploy-status', { credentials: 'include' });
            const statusData = await statusRes.json();
            if (statusData.status) {
              setDeployLogs(statusData.log);
              if (statusData.log.includes("SELESAI DENGAN KODE")) {
                clearInterval(interval);
                setIsDeploying(false);
              }
            }
          } catch (err) {
            setDeployLogs(prev => prev + "\n[SISTEM] Server sedang offline (merestart PM2...). Menunggu koneksi...\n");
            clearInterval(interval);
            let checkCount = 0;
            const reconnectInterval = setInterval(async () => {
              checkCount++;
              try {
                const ping = await fetch('/api/admin/menu-settings');
                if (ping.ok) {
                  clearInterval(reconnectInterval);
                  setDeployLogs(prev => prev + "\n[SISTEM] Koneksi terhubung! Update Sukses. Silakan Muat Ulang Halaman.\n");
                  setIsDeploying(false);
                  Swal.fire("Sukses!", "Server berhasil diperbarui dan kembali online!", "success");
                }
              } catch (e) {
                if (checkCount > 20) {
                  clearInterval(reconnectInterval);
                  setDeployLogs(prev => prev + "\n[ERROR] Waktu tunggu habis. Silakan muat ulang halaman manual.\n");
                  setIsDeploying(false);
                }
              }
            }, 3000);
          }
        }, 1500);
      }
    } catch (e) {
      Swal.fire("Error", "Gagal memicu deployment", "error");
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastData.message.trim()) {
      return Swal.fire("Peringatan", "Pesan broadcast wajib diisi!", "warning");
    }

    const confirmRes = await Swal.fire({
      title: "Kirim Broadcast Promo?",
      text: "Pesan promo akan dipublikasikan ke WhatsApp (semua user terdaftar), Telegram, dan/atau Banner In-App.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Kirim Sekarang!",
      cancelButtonText: "Batal"
    });

    if (!confirmRes.isConfirmed) return;

    setBroadcasting(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(broadcastData)
      });
      const d = await res.json();
      if (res.ok && d.status) {
        Swal.fire("Sukses! 🚀", d.message, "success");
        setBroadcastData(prev => ({ ...prev, message: "", voucherCode: "" }));
      } else {
        Swal.fire("Gagal", d.message || "Gagal mengirim broadcast.", "error");
      }
    } catch (e: any) {
      Swal.fire("Error", e.message || "Terjadi kesalahan.", "error");
    } finally {
      setBroadcasting(false);
    }
  };

  const loadCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const res = await fetch('/api/admin/coupons', { credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        if (d.status) setCoupons(d.data || []);
      }
    } catch (e) { } finally { setLoadingCoupons(false); }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code.trim() || !newCoupon.discount_value) {
      return Swal.fire("Peringatan", "Kode dan nilai diskon wajib diisi", "warning");
    }
    setCreatingCoupon(true);
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newCoupon)
      });
      const d = await res.json();
      if (res.ok && d.status) {
        Swal.fire("Sukses", d.message, "success");
        setNewCoupon({
          code: "",
          discount_type: "fixed",
          discount_value: "",
          min_order_amount: "",
          max_discount_amount: "",
          max_usage_limit: "100",
          start_date: "",
          end_date: ""
        });
        loadCoupons();
      } else {
        Swal.fire("Gagal", d.message, "error");
      }
    } catch (e) {
      Swal.fire("Error", "Gagal membuat kupon", "error");
    } finally {
      setCreatingCoupon(false);
    }
  };

  const handleToggleCoupon = async (id: string, currentStatus: number) => {
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: currentStatus === 1 ? 0 : 1 })
      });
      const d = await res.json();
      if (res.ok && d.status) {
        loadCoupons();
      }
    } catch (e) { }
  };

  const handleDeleteCoupon = async (id: string) => {
    const confirm = await Swal.fire({
      title: "Hapus Kupon?",
      text: "Kupon yang dihapus tidak bisa digunakan lagi.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus"
    });
    if (!confirm.isConfirmed) return;
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE', credentials: 'include' });
      const d = await res.json();
      if (res.ok && d.status) {
        Swal.fire("Terhapus", d.message, "success");
        loadCoupons();
      }
    } catch (e) { }
  };

  const loadRefSettings = async () => {
    setLoadingRefSettings(true);
    try {
      const res = await fetch('/api/admin/referral-settings', { credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        if (d.status) setRefSettings(d.data || {});
      }
    } catch (e) { } finally { setLoadingRefSettings(false); }
  };

  const handleSaveRefSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRefSettings(true);
    try {
      const res = await fetch('/api/admin/referral-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          referral_enabled: refSettings.referral_enabled === 'true' || refSettings.referral_enabled === true,
          referral_commission_type: refSettings.referral_commission_type,
          referral_commission_value: refSettings.referral_commission_value,
          referral_new_user_discount: refSettings.referral_new_user_discount
        })
      });
      const d = await res.json();
      if (res.ok && d.status) {
        Swal.fire("Sukses", "Pengaturan referral berhasil disimpan!", "success");
      } else {
        Swal.fire("Gagal", d.message, "error");
      }
    } catch (e) {
      Swal.fire("Error", "Gagal menyimpan pengaturan referral", "error");
    } finally {
      setSavingRefSettings(false);
    }
  };

  // Realtime Polling for Orders
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
                      body: 'Ada pesanan manual baru di antrean.'
                    });
                  }
                }
                return d.data;
              });
            }
          }
        } catch (e) { }
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!userLoading && user?.role !== 'admin') redirect("/dashboard");
  }, [user, userLoading]);

  const loadManualData = async () => {
    setLoadingManual(true);
    try {
      const [ordRes, prcRes, imeiRes, ceirSvcRes, ceirPrcRes, statusRes, displayRes] = await Promise.all([
        fetch('/api/admin/manual-orders', { credentials: 'include' }),
        fetch('/api/manual-services-pricing'),
        fetch('/api/imei-packages?all=true'),
        fetch('/api/admin/ceirgo-services', { credentials: 'include' }),
        fetch('/api/ceirgo-pricing'),
        fetch('/api/imei-service-status', { cache: 'no-store' }),
        fetch('/api/admin/ceirgo-display-settings', { credentials: 'include' })
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
      let loadedServices: any[] = [];
      if (ceirSvcRes?.ok) {
        const d = await ceirSvcRes.json();
        if (d.status) {
          setCeirgoServices(d.data);
          loadedServices = d.data;
        }
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
      if (displayRes?.ok) {
        const d = await displayRes.json();
        if (d.status && d.data && Array.isArray(d.data.cekCeir)) {
          setCeirgoDisplayCodes(new Set(d.data.cekCeir));
        } else if (loadedServices.length > 0) {
          setCeirgoDisplayCodes(new Set(loadedServices.map(s => s.code)));
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

  // Initial Load Metrics & Data
  useEffect(() => {
    if (user?.role === 'admin') {
      loadManualData();
      loadUsers();
      loadAdminTickets();

      fetch('/api/admin/kmsp-balance', { credentials: 'include' })
        .then(r => r.json())
        .then(d => setProviderBalances(prev => ({ ...prev, kmsp: d.data?.balance })))
        .catch(() => { });

      fetch('/api/admin/ceirgo-balance', { credentials: 'include' })
        .then(r => r.json())
        .then(d => setProviderBalances(prev => ({ ...prev, ceirgo: d.data?.balance })))
        .catch(() => { });

      fetch('/api/admin/payment-gateway').then(r => r.json()).then(d => {
        if (d.status) setPaymentGateway(d.data.gateway);
      }).catch(() => { });

      fetch('/api/admin/menu-settings').then(r => r.json()).then(d => {
        if (d.status) setShowBeliPaket(d.data.showBeliPaket);
      }).catch(() => { });

      fetch('/api/admin/whatsapp-settings', { credentials: 'include' }).then(r => r.json()).then(d => {
        if (d.status && d.data) {
          setWaToken(d.data.token || '');
          setWaUrl(d.data.url || 'https://api.fonnte.com/send');
          setWaAutoSend(Boolean(d.data.autoSend));
        }
      }).catch(() => { });

      fetch('/api/admin/ceirgo-deposit-providers', { credentials: 'include' })
        .then(r => r.json())
        .then(d => { if (d.status) setCeirgoDepositProviders(d.data); })
        .catch(() => { });
    }
  }, [user]);

  // Tab change triggers
  useEffect(() => {
    if (user?.role === 'admin') {
      if (activeTab === "paket") loadPackages();
      if (activeTab === "pengguna") loadUsers();
      if (activeTab === "pesanan-manual" || activeTab === "layanan-imei") loadManualData();
      if (activeTab === "tiket-bantuan") loadAdminTickets();
      if (activeTab === "kupon-promo") loadCoupons();
      if (activeTab === "referral") loadRefSettings();
      if (activeTab === "pengaturan") {
        loadBaileysStatus();
      }
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "pengaturan") {
      const interval = setInterval(loadBaileysStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

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
        Swal.fire({ title: "Info", text: 'Sinkronisasi KMSP berhasil!', icon: "info" });
      } else Swal.fire({ title: "Info", text: 'Gagal sinkronisasi', icon: "info" });
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
      if (res.ok) Swal.fire({ title: "Info", text: 'Tersimpan!', icon: "info" });
      else Swal.fire({ title: "Info", text: 'Gagal menyimpan', icon: "info" });
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
        Swal.fire({ title: "Info", text: "Saldo berhasil diperbarui!", icon: "info" });
        loadUsers();
        setBalAmount("");
        setSelectedUserId(null);
      }
    } catch (e) { Swal.fire({ title: "Info", text: "Error update balance", icon: "info" }); }
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

  const handleSaveMenuSettings = async () => {
    setSavingMenuSettings(true);
    try {
      const res = await fetch('/api/admin/menu-settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showBeliPaket })
      });
      if (res.ok) {
        updateMenuSettings({ showBeliPaket });
        Swal.fire({ title: "Info", text: "Pengaturan menu disimpan!", icon: "info" });
      } else {
        Swal.fire({ title: "Info", text: "Gagal menyimpan pengaturan menu", icon: "info" });
      }
    } catch (e) {
      Swal.fire({ title: "Info", text: "Error menyimpan pengaturan menu", icon: "info" });
    } finally {
      setSavingMenuSettings(false);
    }
  };

  const autoSavePricing = (p: any, instant = false) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const doSave = async () => {
      try {
        await fetch('/api/admin/manual-services-pricing', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
      } catch (e) { }
    };
    if (instant) { doSave(); return; }
    debounceRef.current = setTimeout(doSave, 1000);
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
      if (res.ok) Swal.fire({ title: "Info", text: "Pengumuman disimpan!", icon: "info" });
    } finally { setSavingAnn(false); }
  };

  const handleSaveWhatsAppSettings = async () => {
    setSavingWhatsApp(true);
    try {
      const res = await fetch('/api/admin/whatsapp-settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: waToken, url: waUrl, autoSend: waAutoSend })
      });
      const data = await res.json();
      if (res.ok && data.status) {
        Swal.fire({ title: "Berhasil!", text: data.message || "Pengaturan WhatsApp Gateway disimpan!", icon: "success" });
      } else {
        Swal.fire({ title: "Gagal", text: data.message || "Gagal menyimpan pengaturan WhatsApp", icon: "error" });
      }
    } catch (e) {
      Swal.fire({ title: "Error", text: "Terjadi kesalahan saat menyimpan pengaturan", icon: "error" });
    } finally {
      setSavingWhatsApp(false);
    }
  };

  const loadAdminTickets = async () => {
    try {
      const res = await fetch("/api/admin/tickets", { credentials: "include" });
      const data = await res.json();
      if (data.status) setAdminTickets(data.data || []);
    } catch (e) { }
  };

  const loadAdminTicketDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/tickets/${id}`, { credentials: "include" });
      const data = await res.json();
      if (data.status) {
        setAdminActiveTicket(data.data.ticket);
        setAdminTicketMessages(data.data.messages);
        setTimeout(() => adminMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } catch (e) { }
  };

  const handleAdminReplyTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReply.trim() || !adminActiveTicket) return;

    try {
      const res = await fetch(`/api/tickets/${adminActiveTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: adminReply })
      });
      const data = await res.json();
      if (data.status) {
        setAdminReply("");
        loadAdminTicketDetail(adminActiveTicket.id);
        loadAdminTickets();
      }
    } catch (e) { }
  };

  const handleAdminCloseTicket = async () => {
    if (!adminActiveTicket) return;
    const res = await Swal.fire({
      title: "Tutup Tiket?",
      text: "Apakah masalah pelanggan sudah selesai diatasi?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Tutup Tiket",
      cancelButtonText: "Batal"
    });
    if (!res.isConfirmed) return;

    try {
      const r = await fetch(`/api/admin/tickets/${adminActiveTicket.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "closed" })
      });
      const data = await r.json();
      if (data.status) {
        Swal.fire({ title: "Selesai", text: "Tiket telah ditutup.", icon: "success", timer: 1500 });
        setAdminActiveTicket(null);
        loadAdminTickets();
      }
    } catch (e) { }
  };

  const handleAdminQuickShareWA = async (trx: any) => {
    const defaultPhone = trx.targetPhone || '';
    const { value: phone } = await Swal.fire({
      title: "Kirim Nota via WhatsApp",
      input: "text",
      inputLabel: "Nomor WhatsApp Pelanggan (misal: 08123456789):",
      inputValue: defaultPhone,
      inputPlaceholder: "08xxxxxxxxxx",
      showCancelButton: true,
      confirmButtonText: "Buka WhatsApp 🚀",
      cancelButtonText: "Batal",
      inputValidator: (val) => {
        if (!val || val.replace(/\D/g, '').length < 9) {
          return "Masukkan nomor WhatsApp yang valid!";
        }
      }
    });

    if (!phone) return;

    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.substring(1);
    else if (!cleanPhone.startsWith('62')) cleanPhone = '62' + cleanPhone;

    const primaryImei = trx.imei ? trx.imei.split(/[\n,]+/)[0].trim().replace(/\D/g, '') : '';
    const verifyUrl = `${window.location.origin}/cek-garansi?imei=${primaryImei}`;

    const text = `Halo Kak, berikut bukti transaksi dari *Ry-ITSolutions*:\n\n` +
      `🧾 *ID Transaksi:* #${(trx.id || '').substring(0, 14)}\n` +
      `📱 *IMEI:* ${trx.imei || '-'}\n` +
      `📦 *Layanan:* ${trx.packageName || trx.service_type || 'Aktivasi IMEI'}\n` +
      `🛡️ *Status:* ${trx.status.toUpperCase()} ✅\n` +
      (trx.admin_note ? `📝 *Catatan:* ${trx.admin_note}\n` : '') +
      `📅 *Tanggal:* ${new Date(trx.createdAt).toLocaleDateString('id-ID')}\n\n` +
      `🔗 *Cek Nota & Garansi Digital:* \n${verifyUrl}\n\n` +
      `Terima kasih atas kepercayaannya! 🙏`;

    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`, '_blank');
  };

  // KPI Calculations
  const pendingOrdersCount = manualOrders.filter(o => o.status === 'pending' || o.status === 'processing').length;
  const openTicketsCount = adminTickets.filter(t => t.status === 'open' || t.status === 'replied').length;
  const totalResellersCount = users.filter(u => u.role === 'reseller').length;

  // Filtered packages
  const filteredPackages = packages.filter(p =>
    p.name.toLowerCase().includes(searchPkg.toLowerCase()) ||
    p.package_code.toLowerCase().includes(searchPkg.toLowerCase())
  );
  const selectedPkg = selectedPkgIndex !== null ? packages[selectedPkgIndex] : null;

  // Filtered users
  const filteredUsers = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUser.toLowerCase());
    if (userRoleFilter === 'admin') return matchSearch && u.role === 'admin';
    if (userRoleFilter === 'reseller') return matchSearch && u.role === 'reseller';
    if (userRoleFilter === 'user') return matchSearch && (u.role === 'user' || !u.role);
    return matchSearch;
  });

  const usersPerPage = 10;
  const totalUserPages = Math.ceil(filteredUsers.length / usersPerPage) || 1;
  const paginatedUsers = filteredUsers.slice((userPage - 1) * usersPerPage, userPage * usersPerPage);

  useEffect(() => {
    setUserPage(1);
  }, [searchUser, userRoleFilter]);

  // Filtered orders in queue
  const filteredOrders = manualOrders.filter(o => {
    if (hideSuccess && o.status === "success") return false;
    if (hideFailed && o.status === "failed") return false;

    if (orderStatusFilter === 'pending' && o.status !== 'pending' && o.status !== 'processing') return false;
    if (orderStatusFilter === 'success' && o.status !== 'success') return false;
    if (orderStatusFilter === 'failed' && o.status !== 'failed') return false;

    if (searchOrder.trim()) {
      const q = searchOrder.toLowerCase();
      const matchImei = (o.imei || '').toLowerCase().includes(q);
      const matchUser = (o.userName || '').toLowerCase().includes(q);
      const matchId = (o.id || '').toLowerCase().includes(q);
      const matchPkg = (o.packageName || '').toLowerCase().includes(q);
      return matchImei || matchUser || matchId || matchPkg;
    }
    return true;
  });

  // Filtered tickets
  const filteredAdminTickets = adminTickets.filter(t => {
    if (ticketFilter === 'open') return t.status === 'open' || t.status === 'replied';
    if (ticketFilter === 'closed') return t.status === 'closed';
    return true;
  });

  // Menu Groups Definition
  const menuCategories = [
    {
      id: "operasional",
      name: "Operasional & CS",
      icon: "📦",
      description: "Pesanan, Tiket, & Pengguna",
      tabs: [
        { id: "pesanan-manual", label: "Antrean Pesanan", icon: "📥", badge: pendingOrdersCount > 0 ? pendingOrdersCount : null, badgeColor: "bg-rose-500" },
        { id: "tiket-bantuan", label: "Pusat Bantuan CS", icon: "💬", badge: openTicketsCount > 0 ? openTicketsCount : null, badgeColor: "bg-amber-500" },
        { id: "pengguna", label: "Kelola Pengguna", icon: "👥", badge: null },
      ]
    },
    {
      id: "produk",
      name: "Produk & Harga",
      icon: "🏷️",
      description: "Harga IMEI, CEIR, & Kuota",
      tabs: [
        { id: "layanan-imei", label: "Layanan & Harga IMEI/CEIR", icon: "📱", badge: null },
        { id: "paket", label: "Paket Kuota KMSP", icon: "🌐", badge: null },
      ]
    },
    {
      id: "marketing",
      name: "Promosi & Marketing",
      icon: "🚀",
      description: "Broadcast, Kupon, & Referral",
      tabs: [
        { id: "broadcast-promo", label: "Broadcast & Promo", icon: "📢", badge: null },
        { id: "kupon-promo", label: "Kupon Diskon", icon: "🎟️", badge: null },
        { id: "referral", label: "Program Referral", icon: "🤝", badge: null },
      ]
    },
    {
      id: "sistem",
      name: "Sistem & Server",
      icon: "⚙️",
      description: "Gateway, Database, & Server",
      tabs: [
        { id: "pengaturan", label: "Pengaturan Umum & Gateway", icon: "⚙️", badge: null },
      ]
    }
  ];

  // Auto switch category if activeTab changes
  const currentCategory = menuCategories.find(c => c.tabs.some(t => t.id === activeTab))?.id || activeCategory;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      
      {/* 1. Header Control Hub & Status Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-canvas to-parchment p-6 rounded-2xl border border-hairline shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary rounded-full border border-primary/20">
              Admin Hub
            </span>
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Sistem Online
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-ink">Control Panel Administrator</h1>
          <p className="text-xs text-ink-muted mt-0.5">Pusat kelola transaksi harian, pengaturan harga, manajemen pengguna, dan sistem promosi.</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="text-xs flex items-center gap-1.5 bg-canvas"
            onClick={() => {
              loadManualData();
              loadUsers();
              loadAdminTickets();
              Swal.fire({ title: "Segar!", text: "Data antrean & pengguna berhasil diperbarui.", icon: "success", timer: 1500, showConfirmButton: false });
            }}
          >
            <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Refresh Semua
          </Button>

          <Button
            size="sm"
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm"
            onClick={() => setShowCeirgoTopUp(true)}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Isi Saldo Pusat
          </Button>
        </div>
      </div>

      {/* 2. Quick Action KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <button
          onClick={() => { setActiveCategory("operasional"); setActiveTab("pesanan-manual"); }}
          className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${activeTab === 'pesanan-manual'
            ? 'bg-canvas border-primary ring-2 ring-primary shadow-sm'
            : 'bg-canvas border-hairline hover:border-primary/40 hover:bg-parchment'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">📥</span>
            {pendingOrdersCount > 0 ? (
              <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-rose-500 text-white animate-bounce">
                {pendingOrdersCount} Pending
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-600">
                Bersih
              </span>
            )}
          </div>
          <div className="mt-3">
            <p className="text-xl font-black text-ink leading-tight">{manualOrders.length}</p>
            <p className="text-xs font-semibold text-ink-muted">Antrean Pesanan</p>
          </div>
        </button>

        <button
          onClick={() => { setActiveCategory("operasional"); setActiveTab("tiket-bantuan"); }}
          className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${activeTab === 'tiket-bantuan'
            ? 'bg-canvas border-primary ring-2 ring-primary shadow-sm'
            : 'bg-canvas border-hairline hover:border-primary/40 hover:bg-parchment'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">💬</span>
            {openTicketsCount > 0 ? (
              <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-500 text-white">
                {openTicketsCount} Aktif
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-600">
                0 Terbuka
              </span>
            )}
          </div>
          <div className="mt-3">
            <p className="text-xl font-black text-ink leading-tight">{adminTickets.length}</p>
            <p className="text-xs font-semibold text-ink-muted">Pusat Bantuan CS</p>
          </div>
        </button>

        <button
          onClick={() => { setActiveCategory("operasional"); setActiveTab("pengguna"); }}
          className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${activeTab === 'pengguna'
            ? 'bg-canvas border-primary ring-2 ring-primary shadow-sm'
            : 'bg-canvas border-hairline hover:border-primary/40 hover:bg-parchment'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">👥</span>
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary/10 text-primary">
              {totalResellersCount} Reseller
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xl font-black text-ink leading-tight">{users.length}</p>
            <p className="text-xs font-semibold text-ink-muted">Total Pengguna</p>
          </div>
        </button>

        <button
          onClick={() => { setActiveCategory("sistem"); setActiveTab("pengaturan"); }}
          className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${activeTab === 'pengaturan'
            ? 'bg-canvas border-primary ring-2 ring-primary shadow-sm'
            : 'bg-canvas border-hairline hover:border-primary/40 hover:bg-parchment'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">💳</span>
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-100 text-emerald-700">
              Gateway OK
            </span>
          </div>
          <div className="mt-3">
            <p className="text-base font-black text-primary leading-tight truncate">
              Rp {providerBalances.ceirgo !== null ? providerBalances.ceirgo.toLocaleString('id-ID') : '...'}
            </p>
            <p className="text-xs font-semibold text-ink-muted">Saldo Server Pusat</p>
          </div>
        </button>
      </div>

      {/* 3. Re-organized Categorized Navigation System */}
      <div className="bg-canvas border border-hairline p-2 rounded-2xl shadow-sm space-y-2">
        {/* Category Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-parchment/60 rounded-xl border border-hairline">
          {menuCategories.map(cat => {
            const isCatActive = currentCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  if (!cat.tabs.some(t => t.id === activeTab)) {
                    setActiveTab(cat.tabs[0].id);
                  }
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${isCatActive
                  ? 'bg-canvas text-primary shadow-sm border border-hairline'
                  : 'text-ink-muted hover:text-ink hover:bg-canvas/50'}`}
              >
                <span>{cat.icon}</span>
                <span className="truncate">{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Sub-Tabs Selector inside Selected Category */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-0.5 px-1 scrollbar-none">
          {menuCategories.find(c => c.id === currentCategory)?.tabs.map(tab => {
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 border ${isTabActive
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-canvas text-ink-muted border-hairline hover:bg-parchment hover:text-ink'}`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badge !== null && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black text-white ${tab.badgeColor || 'bg-rose-500'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ANTREAN PESANAN MANUAL (Transaksional)                             */}
      {/* ========================================================================= */}
      {activeTab === 'pesanan-manual' && (
        <div className="space-y-6">
          <Card glass className="p-6 space-y-5">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-ink flex items-center gap-2">
                  <span className="text-primary">📥</span> Antrean Pesanan Transaksi
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">Pantau dan proses pesanan IMEI & pengecekan status yang masuk dari pelanggan.</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={loadManualData} className="text-xs">
                  🔄 Muat Ulang Antrean
                </Button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row gap-3 pt-2">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Cari berdasarkan IMEI, nama user, layanan, atau ID..."
                  value={searchOrder}
                  onChange={(e) => setSearchOrder(e.target.value)}
                  className="w-full h-10 px-4 rounded-xl border border-hairline bg-canvas text-xs focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                <button
                  onClick={() => setOrderStatusFilter("all")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${orderStatusFilter === 'all' ? 'bg-ink text-white border-ink' : 'bg-canvas text-ink-muted border-hairline'}`}
                >
                  Semua ({manualOrders.length})
                </button>
                <button
                  onClick={() => setOrderStatusFilter("pending")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${orderStatusFilter === 'pending' ? 'bg-amber-500 text-white border-amber-500' : 'bg-canvas text-amber-600 border-hairline'}`}
                >
                  Tertunda ({manualOrders.filter(o => o.status === 'pending' || o.status === 'processing').length})
                </button>
                <button
                  onClick={() => setOrderStatusFilter("success")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${orderStatusFilter === 'success' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-canvas text-emerald-600 border-hairline'}`}
                >
                  Sukses ({manualOrders.filter(o => o.status === 'success').length})
                </button>
                <button
                  onClick={() => setOrderStatusFilter("failed")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${orderStatusFilter === 'failed' ? 'bg-rose-600 text-white border-rose-600' : 'bg-canvas text-rose-600 border-hairline'}`}
                >
                  Gagal ({manualOrders.filter(o => o.status === 'failed').length})
                </button>
              </div>
            </div>

            {/* Order Items */}
            {loadingManual ? (
              <div className="py-12 text-center text-ink-muted text-sm">Memuat daftar antrean pesanan...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-12 text-center border border-dashed rounded-2xl space-y-2">
                <span className="text-3xl block">🎉</span>
                <p className="font-bold text-sm text-ink">Tidak ada pesanan pada filter ini</p>
                <p className="text-xs text-ink-muted">Seluruh antrean telah diproses atau tidak ditemukan hasil pencarian.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map(o => (
                  <div key={o.id} className="p-4 border border-hairline rounded-2xl bg-canvas space-y-3.5 hover:border-primary/30 transition-colors">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-base text-ink">{o.packageName}</span>
                          <span className="text-xs font-mono text-ink-muted bg-parchment px-2 py-0.5 rounded border border-hairline">
                            #{o.id.substring(0, 14)}
                          </span>
                        </div>
                        <p className="text-xs text-ink mt-0.5">
                          Pemesan: <span className="font-bold">{o.userName}</span>
                          {o.targetPhone && <span className="ml-1 text-ink-muted">({o.targetPhone})</span>}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {o.imei?.split(',').map((im: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-lg border border-primary/20 font-mono">
                              {im.trim()}
                            </span>
                          ))}
                        </div>
                        {o.speed_option && (
                          <p className="text-xs font-bold text-primary mt-1.5 flex items-center gap-1">
                            Kecepatan: <span className="capitalize">{o.speed_option === 'fast' ? '⚡ Fast' : o.speed_option === 'semi' ? '🚀 Semi Fast' : '🐌 Slow'}</span>
                          </p>
                        )}
                        <p className="text-[11px] text-ink-muted mt-1">{new Date(o.createdAt).toLocaleString('id-ID')}</p>
                      </div>

                      <div className="flex sm:flex-col items-end justify-between gap-1.5 shrink-0">
                        <span className={`px-2.5 py-1 text-xs font-black rounded-full uppercase tracking-wider ${o.status === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : o.status === 'failed' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                          {o.status}
                        </span>
                        <span className="text-sm font-black text-ink">
                          Rp {(o.platformFee || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    {/* Screenshot Proofs */}
                    {(o.user_image || o.user_image_ceir) && (
                      <div className="flex gap-4 flex-wrap pt-2 border-t border-hairline/60">
                        {o.user_image && (
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-ink">Bukti SS *#06#:</p>
                            <div className="flex flex-wrap gap-2">
                              {o.user_image.split(',').map((imgUrl: string, idx: number) => (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  key={idx}
                                  src={imgUrl}
                                  alt={`Bukti User ${idx + 1}`}
                                  className="h-20 object-contain rounded-xl border border-hairline bg-white p-1 cursor-zoom-in hover:scale-105 transition-transform"
                                  onClick={() => {
                                    Swal.fire({
                                      imageUrl: imgUrl,
                                      imageAlt: 'Bukti User',
                                      showConfirmButton: false,
                                      showCloseButton: true,
                                      background: 'rgba(0,0,0,0.9)',
                                      customClass: { image: 'max-h-[85vh] object-contain' }
                                    });
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                        {o.user_image_ceir && (
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-ink">Bukti SS Pengecekan:</p>
                            <div className="flex flex-wrap gap-2">
                              {o.user_image_ceir.split(',').map((imgUrl: string, idx: number) => (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  key={idx}
                                  src={imgUrl}
                                  alt={`Bukti CEIR User ${idx + 1}`}
                                  className="h-20 object-contain rounded-xl border border-hairline bg-white p-1 cursor-zoom-in hover:scale-105 transition-transform"
                                  onClick={() => {
                                    Swal.fire({
                                      imageUrl: imgUrl,
                                      imageAlt: 'Bukti CEIR User',
                                      showConfirmButton: false,
                                      showCloseButton: true,
                                      background: 'rgba(0,0,0,0.9)',
                                      customClass: { image: 'max-h-[85vh] object-contain' }
                                    });
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Result Note if available */}
                    {(o.admin_note || o.admin_image) && (
                      <div className="p-3 bg-parchment/60 rounded-xl border border-hairline text-xs space-y-1">
                        <p className="font-bold text-primary">HASIL / CATATAN PROSES:</p>
                        {o.admin_note && <p className="text-ink">{o.admin_note}</p>}
                        {o.admin_image && (
                          <a href={o.admin_image} target="_blank" rel="noreferrer" className="text-blue-600 underline font-medium block">
                            Lihat Gambar Bukti Hasil
                          </a>
                        )}
                      </div>
                    )}

                    {/* Action Toolbar */}
                    {manualActionData?.id === o.id ? (
                      <div className="bg-parchment p-4 rounded-xl space-y-3 mt-3 border border-hairline">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-ink">Ubah Status Pengerjaan</label>
                          <select
                            className="w-full h-10 rounded-lg border border-hairline px-3 bg-canvas text-sm font-semibold"
                            value={manualActionData?.status || "pending"}
                            onChange={e => setManualActionData(prev => prev ? { ...prev, status: e.target.value } : null)}
                          >
                            <option value="pending">🟡 Pending (Menunggu)</option>
                            <option value="processing">🔵 Processing (Sedang Diproses)</option>
                            <option value="success">🟢 Success (Selesai & Aktif)</option>
                            <option value="failed">🔴 Failed (Gagal & Refund Saldo Otomatis)</option>
                          </select>
                        </div>
                        <Input
                          label="Catatan Admin / Keterangan untuk User"
                          placeholder="Contoh: Sinyal sudah aktif All Operator / Bukti terlampir"
                          value={manualActionData?.note || ""}
                          onChange={e => setManualActionData(prev => prev ? { ...prev, note: e.target.value } : null)}
                        />
                        <div>
                          <label className="text-xs font-bold text-ink block mb-1">Upload Bukti / Screenshot Hasil (Opsional)</label>
                          <input
                            type="file"
                            className="block w-full text-xs"
                            onChange={e => setManualActionData(prev => prev ? { ...prev, file: e.target.files?.[0] || null } : null)}
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            className="bg-primary text-white"
                            onClick={async () => {
                              const formData = new FormData();
                              formData.append("status", manualActionData?.status || "pending");
                              formData.append("admin_note", manualActionData?.note || "");
                              if (manualActionData?.file) formData.append("image", manualActionData?.file);

                              try {
                                const res = await fetch(`/api/admin/manual-orders/${o.id}`, { method: 'PUT', credentials: 'include', body: formData });
                                if (res.ok) {
                                  Swal.fire({ title: "Tersimpan!", text: "Status pesanan berhasil diperbarui.", icon: "success", timer: 1500 });
                                  setManualActionData(null);
                                  loadManualData();
                                }
                              } catch (e) { }
                            }}
                          >
                            Simpan Perubahan
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setManualActionData(null)}>Batal</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 flex-wrap items-center pt-1 border-t border-hairline/60">
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-primary/5 text-primary border-primary/30 hover:bg-primary hover:text-white"
                          onClick={() => setManualActionData({ id: o.id, status: o.status, note: o.admin_note || '', file: null })}
                        >
                          ⚙️ Proses Pesanan
                        </Button>

                        {o.service_type === 'ceir' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-primary text-primary hover:bg-primary/5"
                            onClick={async () => {
                              const confirm = await Swal.fire({
                                title: 'Re-check Server Pusat?',
                                text: `Kueri ulang IMEI ${o.imei?.split(',')[0]} ke Server Pusat.`,
                                icon: 'question',
                                showCancelButton: true,
                                confirmButtonText: 'Ya, Re-check',
                                cancelButtonText: 'Batal'
                              });
                              if (!confirm.isConfirmed) return;
                              try {
                                const res = await fetch(`/api/admin/manual-orders/${o.id}/recheck`, { method: 'POST', credentials: 'include' });
                                const data = await res.json();
                                if (res.ok && data.status) {
                                  Swal.fire({ title: 'Berhasil!', text: data.data?.adminNote || 'Data berhasil diperbarui.', icon: 'success' });
                                  loadManualData();
                                } else {
                                  Swal.fire({ title: 'Gagal', text: data.message || 'Re-check gagal', icon: 'error' });
                                }
                              } catch (e) { Swal.fire({ title: 'Error', text: 'Kesalahan jaringan', icon: 'error' }); }
                            }}
                          >
                            🔄 Re-check Server Pusat
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const firstImei = o.imei ? o.imei.split(/[\n,]+/)[0].trim() : '';
                            setSelectedInvoiceTrx({
                              trxId: o.id,
                              imei: firstImei || o.targetPhone || 'N/A',
                              packageName: o.packageName || 'Layanan Resmi',
                              serviceType: o.service_type,
                              createdAt: o.createdAt,
                              amount: o.platformFee || 0,
                              status: o.status,
                              adminNote: o.admin_note
                            });
                          }}
                        >
                          🧾 Cetak Nota
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          onClick={() => handleAdminQuickShareWA(o)}
                        >
                          📲 Kirim WA
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LAYANAN & HARGA IMEI / CEIR (Konfigurasi Produk)                   */}
      {/* ========================================================================= */}
      {activeTab === 'layanan-imei' && (
        <div className="space-y-6">
          {/* Status Layanan Toggle */}
          <Card glass className="p-6 space-y-4">
            <div className="flex justify-between items-start flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-bold text-ink flex items-center gap-2">
                  <span className="text-primary">🛠️</span> Status Layanan Buka Gembok IMEI
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">Buka atau tutup akses pemesanan IMEI secara global untuk seluruh pelanggan.</p>
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
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${imeiServiceOpen ? 'bg-emerald-600 text-white shadow-emerald-600/20' : 'bg-rose-600 text-white shadow-rose-600/20'}`}
              >
                {imeiServiceOpen ? '🟢 STATUS: BUKA (OPEN)' : '🔴 STATUS: TUTUP (CLOSE)'}
              </button>
            </div>

            <div className="flex gap-2 items-end pt-2">
              <Input
                label="Catatan Khusus saat Layanan Tutup (Opsional)"
                placeholder="Contoh: Server sedang maintenance rutin, buka kembali pukul 14:00..."
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
                  Swal.fire({ title: 'Berhasil', text: 'Catatan status IMEI berhasil disimpan!', icon: 'success', timer: 2000 });
                }}
              >
                Simpan Catatan
              </Button>
            </div>
          </Card>

          {/* Paket Unblock IMEI */}
          <Card glass className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-ink">Daftar Paket Durasi Unblock IMEI</h2>
            <p className="text-xs text-ink-muted">Kelola pilihan paket garansi durasi aktivasi sinyal yang tampil di menu Buka Gembok IMEI.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {imeiPackages.map(pkg => (
                <div key={pkg.id} className="p-3.5 border border-hairline rounded-2xl flex justify-between items-center bg-canvas">
                  <div>
                    <p className="font-bold text-sm text-ink">{pkg.duration}</p>
                    <p className="text-xs font-black text-primary">Rp {pkg.price.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={async () => {
                        await fetch(`/api/admin/imei-packages/${pkg.id}/toggle`, {
                          method: 'PUT',
                          credentials: 'include',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ isVisible: pkg.isVisible === 1 ? 0 : 1 })
                        });
                        loadManualData();
                      }}
                      className={`px-2 py-1 text-xs font-bold rounded-lg ${pkg.isVisible === 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}
                    >
                      {pkg.isVisible === 1 ? 'Aktif' : 'Hidden'}
                    </button>
                    <button
                      onClick={async () => {
                        const res = await Swal.fire({ title: "Konfirmasi", text: `Hapus paket ${pkg.duration}?`, icon: "warning", showCancelButton: true });
                        if (res.isConfirmed) {
                          await fetch(`/api/admin/imei-packages/${pkg.id}`, { method: 'DELETE', credentials: 'include' });
                          loadManualData();
                        }
                      }}
                      className="text-rose-500 hover:text-rose-700 font-bold p-1 text-lg"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Tambah Paket Baru */}
            <div className="flex gap-2 items-end pt-3 border-t border-hairline">
              <Input
                label="Durasi Baru (Misal: 6 Bulan)"
                value={newImeiPkg.duration}
                onChange={e => setNewImeiPkg({ ...newImeiPkg, duration: e.target.value })}
              />
              <Input
                label="Harga Jual (Rp)"
                type="number"
                value={newImeiPkg.price}
                onChange={e => setNewImeiPkg({ ...newImeiPkg, price: e.target.value })}
              />
              <Button
                className="h-10 shrink-0"
                onClick={async () => {
                  if (!newImeiPkg.duration || !newImeiPkg.price) return Swal.fire({ title: "Info", text: "Isi durasi dan harga", icon: "info" });
                  await fetch('/api/admin/imei-packages', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ duration: newImeiPkg.duration, price: parseInt(newImeiPkg.price) }) });
                  setNewImeiPkg({ duration: "", price: "" });
                  loadManualData();
                }}
              >
                + Tambah Paket
              </Button>
            </div>
          </Card>

          {/* Kecepatan Pengerjaan */}
          <Card glass className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-ink">Kecepatan Pengerjaan IMEI (Biaya Tambahan)</h2>
            <p className="text-xs text-ink-muted">Biaya tambahan opsi express saat pelanggan melakukan checkout IMEI.</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* Fast */}
              <div className="bg-canvas border border-hairline p-4 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-ink">⚡ Fast (1-3 Jam)</span>
                  <button
                    onClick={() => {
                      const updated = { ...pricing, imei_speed_fast_status: pricing.imei_speed_fast_status === 'hidden' ? 'active' : 'hidden' };
                      setPricing(updated);
                      autoSavePricing(updated, true);
                    }}
                    className={`px-2 py-1 text-xs font-bold rounded-lg ${pricing.imei_speed_fast_status !== 'hidden' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}
                  >
                    {pricing.imei_speed_fast_status !== 'hidden' ? 'Aktif' : 'Hidden'}
                  </button>
                </div>
                <Input
                  placeholder="Harga Tambahan (Rp)"
                  type="number"
                  value={pricing.imei_speed_fast || ''}
                  onChange={e => {
                    const updated = { ...pricing, imei_speed_fast: e.target.value };
                    setPricing(updated);
                    autoSavePricing(updated);
                  }}
                />
              </div>

              {/* Semi Fast */}
              <div className="bg-canvas border border-hairline p-4 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-ink">🚀 Semi Fast (1-12 Jam)</span>
                  <button
                    onClick={() => {
                      const updated = { ...pricing, imei_speed_semi_status: pricing.imei_speed_semi_status === 'hidden' ? 'active' : 'hidden' };
                      setPricing(updated);
                      autoSavePricing(updated, true);
                    }}
                    className={`px-2 py-1 text-xs font-bold rounded-lg ${pricing.imei_speed_semi_status !== 'hidden' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}
                  >
                    {pricing.imei_speed_semi_status !== 'hidden' ? 'Aktif' : 'Hidden'}
                  </button>
                </div>
                <Input
                  placeholder="Harga Tambahan (Rp)"
                  type="number"
                  value={pricing.imei_speed_semi || ''}
                  onChange={e => {
                    const updated = { ...pricing, imei_speed_semi: e.target.value };
                    setPricing(updated);
                    autoSavePricing(updated);
                  }}
                />
              </div>

              {/* Slow */}
              <div className="bg-canvas border border-hairline p-4 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-ink">🐌 Standar (1-3 Hari)</span>
                  <button
                    onClick={() => {
                      const updated = { ...pricing, imei_speed_slow_status: pricing.imei_speed_slow_status === 'hidden' ? 'active' : 'hidden' };
                      setPricing(updated);
                      autoSavePricing(updated, true);
                    }}
                    className={`px-2 py-1 text-xs font-bold rounded-lg ${pricing.imei_speed_slow_status !== 'hidden' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}
                  >
                    {pricing.imei_speed_slow_status !== 'hidden' ? 'Aktif' : 'Hidden'}
                  </button>
                </div>
                <Input
                  placeholder="Harga Tambahan (Rp)"
                  type="number"
                  value={pricing.imei_speed_slow || ''}
                  onChange={e => {
                    const updated = { ...pricing, imei_speed_slow: e.target.value };
                    setPricing(updated);
                    autoSavePricing(updated);
                  }}
                />
              </div>
            </div>
          </Card>

          {/* Layanan & Harga Server Pusat (CEIR, Bea Cukai, iCloud, Simlock) */}
          <Card glass className="p-6 space-y-5">
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <h2 className="text-xl font-bold text-ink">Layanan Diagnostik & Server Pusat</h2>
                <p className="text-xs text-ink-muted mt-0.5">Atur visibilitas dan harga jual ke pelanggan untuk Cek Database CEIR, Bea Cukai, iCloud/FMI, dan Carrier Simlock.</p>
              </div>
              <Button size="sm" variant="outline" onClick={loadManualData}>🔄 Refresh Data</Button>
            </div>

            {ceirgoServices.length === 0 ? (
              <div className="text-center text-ink-muted text-sm py-6 border rounded-2xl border-dashed">
                Layanan Server Pusat sedang dimuat atau API belum terhubung.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ceirgoServices.map((svc) => (
                    <div key={svc.code} className={`bg-canvas border p-4 rounded-2xl flex flex-col gap-3 ${ceirgoDisplayCodes.has(svc.code) ? 'border-primary ring-1 ring-primary/30' : 'border-hairline opacity-75'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-ink text-sm">{svc.name}</p>
                          <p className="text-[11px] text-primary font-semibold font-mono">{svc.code}</p>
                          <p className="text-xs text-ink-muted mt-1">Modal Server: Rp {svc.modalPrice.toLocaleString('id-ID')}</p>
                          {ceirgoPricing[svc.code] != null && (
                            <p className="text-xs font-bold text-emerald-600 mt-0.5">Harga Jual: Rp {Number(ceirgoPricing[svc.code]).toLocaleString('id-ID')}</p>
                          )}
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={ceirgoDisplayCodes.has(svc.code)}
                            onChange={(e) => {
                              const newSet = new Set(ceirgoDisplayCodes);
                              if (e.target.checked) newSet.add(svc.code);
                              else newSet.delete(svc.code);
                              setCeirgoDisplayCodes(newSet);
                            }}
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                      <Input
                        label="Harga Jual ke Pelanggan (Rp)"
                        type="number"
                        value={ceirgoPricing[svc.code] ?? svc.modalPrice}
                        onChange={(e) => setCeirgoPricing({ ...ceirgoPricing, [svc.code]: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  ))}
                </div>

                <Button
                  onClick={async () => {
                    try {
                      await fetch('/api/admin/ceirgo-display-settings', {
                        method: 'PUT',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ cekCeir: Array.from(ceirgoDisplayCodes) })
                      });
                      const res = await fetch('/api/admin/ceirgo-pricing', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(ceirgoPricing)
                      });
                      if (res.ok) Swal.fire({ title: "Info", text: "Harga dan tampilan layanan berhasil disimpan!", icon: "info" });
                    } catch (e) { Swal.fire({ title: "Info", text: "Error menyimpan", icon: "info" }); }
                  }}
                  className="w-full"
                >
                  Simpan Harga & Tampilan Layanan
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PAKET SUNTIK KUOTA KMSP                                            */}
      {/* ========================================================================= */}
      {activeTab === 'paket' && (
        <Card glass className="p-6 space-y-6 overflow-visible">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-ink">Kelola Paket Kuota KMSP</h2>
              <p className="text-xs text-ink-muted mt-0.5">Sinkronisasi paket dari KMSP dan atur margin laba.</p>
            </div>
            <Button variant="outline" onClick={handleSync} isLoading={syncing}>🔄 Sync KMSP</Button>
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
                <p className="text-sm text-ink-muted">Harga Asli Modal: Rp {selectedPkg.original_price?.toLocaleString('id-ID')}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Platform Fee (Laba User Rp)"
                  type="number"
                  value={selectedPkg.platform_fee || 0}
                  onChange={(e) => {
                    const newPkgs = [...packages];
                    newPkgs[selectedPkgIndex!] = { ...newPkgs[selectedPkgIndex!], platform_fee: parseInt(e.target.value) || 0 };
                    setPackages(newPkgs);
                  }}
                />
                <Input
                  label="Reseller Fee (Laba Reseller Rp)"
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

      {/* ========================================================================= */}
      {/* TAB 4: KELOLA PENGGUNA                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'pengguna' && (
        <Card glass className="p-6 space-y-5">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-ink flex items-center gap-2">
                <span className="text-primary">👥</span> Kelola Pengguna & Reseller
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">Kelola role, saldo akun, persetujuan member, dan reset akun.</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" className="text-xs text-rose-500 border-rose-200 hover:bg-rose-50" onClick={handleDeleteZeroBalance}>
                🗑 Hapus Semua Saldo 0
              </Button>
            </div>
          </div>

          {/* Search & Role Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="flex-1">
              <input
                type="text"
                className="w-full h-10 rounded-xl border border-hairline bg-canvas px-4 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                placeholder="Cari berdasarkan nama atau email pengguna..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setUserRoleFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${userRoleFilter === 'all' ? 'bg-ink text-white border-ink' : 'bg-canvas text-ink-muted border-hairline'}`}
              >
                Semua ({users.length})
              </button>
              <button
                onClick={() => setUserRoleFilter("reseller")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${userRoleFilter === 'reseller' ? 'bg-primary text-white border-primary' : 'bg-canvas text-primary border-hairline'}`}
              >
                Reseller ({users.filter(u => u.role === 'reseller').length})
              </button>
              <button
                onClick={() => setUserRoleFilter("user")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${userRoleFilter === 'user' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-canvas text-emerald-600 border-hairline'}`}
              >
                Member ({users.filter(u => u.role === 'user' || !u.role).length})
              </button>
            </div>
          </div>

          {loadingUsers ? <p className="text-sm text-ink-muted py-6 text-center">Memuat daftar pengguna...</p> : (
            <div className="space-y-3">
              {paginatedUsers.map(u => (
                <div key={u.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-hairline rounded-2xl bg-canvas gap-4 hover:border-primary/30 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-ink">{u.name}</p>
                      <span className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase ${u.role === 'admin' ? 'bg-rose-100 text-rose-800' : u.role === 'reseller' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-700'}`}>
                        {u.role || 'User'}
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5">{u.email} {u.phone && `• ${u.phone}`}</p>
                    <p className="text-sm font-black text-primary mt-1">Saldo: Rp {u.balance?.toLocaleString('id-ID')}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
                    <select
                      className="h-9 px-3 rounded-lg border border-hairline bg-canvas text-xs font-bold focus:outline-none focus:border-primary cursor-pointer"
                      value={u.role || 'user'}
                      onChange={async (e) => {
                        try {
                          const res = await fetch('/api/admin/update-user-role', {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: u.id, newRole: e.target.value })
                          });
                          if (res.ok) {
                            Swal.fire({ title: "Info", text: "Role diubah!", icon: "info" });
                            loadUsers();
                          } else Swal.fire({ title: "Info", text: "Gagal mengubah role", icon: "info" });
                        } catch (err) { Swal.fire({ title: "Info", text: "Error ubah role", icon: "info" }); }
                      }}
                    >
                      <option value="user">Member (User)</option>
                      <option value="reseller">Reseller</option>
                      <option value="admin">Admin</option>
                    </select>

                    {selectedUserId === u.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Input type="number" placeholder="Gunakan - untuk kurangi saldo" className="w-52 text-xs" value={balAmount} onChange={(e) => setBalAmount(e.target.value)} />
                        <Button size="sm" onClick={() => handleUpdateBalance(u.id)}>Simpan</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setSelectedUserId(null); setBalAmount(""); }}>✕</Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setSelectedUserId(u.id)}>Edit Saldo</Button>
                    )}

                    {u.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-emerald-600 text-white" onClick={async () => {
                          const res = await Swal.fire({ title: "Konfirmasi", text: "Setujui pendaftaran user ini?", icon: "warning", showCancelButton: true }); if (!res.isConfirmed) return;
                          try {
                            const res = await fetch('/api/admin/approve-user', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: u.id }) });
                            if (res.ok) loadUsers();
                          } catch (e) { }
                        }}>Approve</Button>
                        <Button variant="danger" size="sm" onClick={async () => {
                          const res = await Swal.fire({ title: "Konfirmasi", text: "Tolak user ini?", icon: "warning", showCancelButton: true }); if (!res.isConfirmed) return;
                          try {
                            const res = await fetch('/api/admin/reject-user', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: u.id }) });
                            if (res.ok) loadUsers();
                          } catch (e) { }
                        }}>Reject</Button>
                      </div>
                    )}

                    <Button variant="danger" size="sm" onClick={async () => {
                      const res = await Swal.fire({ title: "Konfirmasi", text: `Yakin ingin menghapus pengguna ${u.name}?`, icon: "warning", showCancelButton: true }); if (!res.isConfirmed) return;
                      try {
                        const res = await fetch('/api/admin/delete-user', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: u.id }) });
                        if (res.ok) loadUsers();
                        else Swal.fire({ title: "Info", text: "Gagal hapus pengguna.", icon: "info" });
                      } catch (e) { Swal.fire({ title: "Info", text: "Error", icon: "info" }); }
                    }}>Hapus</Button>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {totalUserPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6">
                  <Button variant="outline" size="sm" onClick={() => setUserPage(p => Math.max(1, p - 1))} disabled={userPage === 1}>
                    Sebelumnya
                  </Button>
                  <span className="text-xs font-semibold text-ink-muted">Halaman {userPage} dari {totalUserPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setUserPage(p => Math.min(totalUserPages, p + 1))} disabled={userPage === totalUserPages}>
                    Selanjutnya
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: PUSAT BANTUAN CS & TIKET                                           */}
      {/* ========================================================================= */}
      {activeTab === 'tiket-bantuan' && (
        <div className="space-y-6">
          {adminActiveTicket ? (
            <Card glass className="p-0 overflow-hidden flex flex-col h-[620px] border-primary/20">
              <div className="p-4 border-b border-hairline bg-canvas/50 flex justify-between items-center">
                <div>
                  <h2 className="font-bold text-lg text-ink">{adminActiveTicket.subject}</h2>
                  <p className="text-xs text-ink-muted">User: <span className="font-semibold text-primary">{adminActiveTicket.user_name}</span> ({adminActiveTicket.user_email})</p>
                </div>
                <div className="flex gap-2 items-center">
                  <Button variant="outline" size="sm" onClick={() => setAdminActiveTicket(null)}>← Kembali</Button>
                  {adminActiveTicket.status !== 'closed' && (
                    <Button variant="danger" size="sm" onClick={handleAdminCloseTicket}>Tutup Tiket</Button>
                  )}
                </div>
              </div>

              {/* Messages Thread */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-parchment/30">
                {adminTicketMessages.map(msg => (
                  <div key={msg.id} className={`flex flex-col ${msg.sender_role === 'admin' ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                        {msg.sender_role === 'admin' ? '👮 Admin Support' : msg.sender_name}
                      </span>
                      <span className="text-[10px] text-ink-muted">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className={`p-3.5 rounded-2xl max-w-[80%] text-sm leading-relaxed ${msg.sender_role === 'admin' ? 'bg-primary text-white rounded-tr-none' : 'bg-canvas border border-hairline text-ink rounded-tl-none'}`}>
                      {msg.message}
                    </div>
                  </div>
                ))}
                <div ref={adminMessagesEndRef} />
              </div>

              {/* Reply Box */}
              {adminActiveTicket.status !== 'closed' ? (
                <form onSubmit={handleAdminReplyTicket} className="p-4 border-t border-hairline bg-canvas flex gap-2">
                  <input
                    type="text"
                    placeholder="Tulis balasan untuk pelanggan..."
                    value={adminReply}
                    onChange={e => setAdminReply(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-hairline bg-parchment text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <Button type="submit">Kirim Balasan</Button>
                </form>
              ) : (
                <div className="p-4 bg-slate-100 text-center text-xs text-slate-500 font-bold border-t">
                  Tiket ini telah ditutup.
                </div>
              )}
            </Card>
          ) : (
            <Card glass className="p-6 space-y-5">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-ink flex items-center gap-2">
                    <span className="text-primary">💬</span> Pusat Bantuan & Layanan Tiket
                  </h2>
                  <p className="text-xs text-ink-muted mt-0.5">Daftar pertanyaan dan kendala langsung dari pelanggan toko.</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setTicketFilter("all")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${ticketFilter === 'all' ? 'bg-ink text-white border-ink' : 'bg-canvas text-ink-muted border-hairline'}`}
                  >
                    Semua ({adminTickets.length})
                  </button>
                  <button
                    onClick={() => setTicketFilter("open")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${ticketFilter === 'open' ? 'bg-amber-500 text-white border-amber-500' : 'bg-canvas text-amber-600 border-hairline'}`}
                  >
                    Terbuka ({adminTickets.filter(t => t.status === 'open' || t.status === 'replied').length})
                  </button>
                  <button
                    onClick={() => setTicketFilter("closed")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${ticketFilter === 'closed' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-canvas text-emerald-600 border-hairline'}`}
                  >
                    Ditutup ({adminTickets.filter(t => t.status === 'closed').length})
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {filteredAdminTickets.length === 0 ? (
                  <div className="py-12 text-center border border-dashed rounded-2xl text-ink-muted text-sm">
                    Tidak ada tiket pada filter ini.
                  </div>
                ) : (
                  filteredAdminTickets.map(t => (
                    <div
                      key={t.id}
                      onClick={() => loadAdminTicketDetail(t.id)}
                      className="p-4 rounded-2xl border border-hairline bg-canvas hover:border-primary cursor-pointer transition-all flex justify-between items-center gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink text-base">{t.subject}</span>
                          <span className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase ${t.status === 'open' ? 'bg-amber-100 text-amber-800' : t.status === 'replied' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                            {t.status}
                          </span>
                        </div>
                        <p className="text-xs text-ink-muted mt-1">User: <span className="font-semibold text-primary">{t.user_name}</span> ({t.user_email}) • {new Date(t.created_at).toLocaleString('id-ID')}</p>
                      </div>
                      <span className="text-sm font-bold text-primary shrink-0">Buka Percakapan →</span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: BROADCAST PROMO MASSAL                                             */}
      {/* ========================================================================= */}
      {activeTab === 'broadcast-promo' && (
        <div className="space-y-6">
          <Card glass className="p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-hairline pb-4">
              <div>
                <h2 className="text-xl font-bold text-ink flex items-center gap-2">
                  <span className="text-primary">📢</span> Broadcast Pesan Promo & Diskon Event
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">Kirim pengumuman promo massal ke Channel/Grup Telegram dan Banner In-App Pengguna.</p>
              </div>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-ink block mb-1">Judul Promo / Event</label>
                  <input
                    type="text"
                    value={broadcastData.title}
                    onChange={e => setBroadcastData({ ...broadcastData, title: e.target.value })}
                    placeholder="Contoh: FLASH SALE 12.12 POTONGAN RP 50.000!"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-hairline bg-canvas text-sm font-bold text-ink outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-ink block mb-1">Kode Voucher Diskon (Opsional)</label>
                  <input
                    type="text"
                    value={broadcastData.voucherCode}
                    onChange={e => setBroadcastData({ ...broadcastData, voucherCode: e.target.value.toUpperCase() })}
                    placeholder="Contoh: PROMO1212"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-hairline bg-canvas text-sm font-mono font-bold text-primary outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-ink block mb-1">Isi Pesan Broadcast</label>
                <textarea
                  rows={4}
                  value={broadcastData.message}
                  onChange={e => setBroadcastData({ ...broadcastData, message: e.target.value })}
                  placeholder="Tuliskan detail promo, syarat ketentuan, dan ajakan checkout ke pelanggan..."
                  className="w-full p-3.5 rounded-xl border border-hairline bg-canvas text-sm text-ink outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                  required
                />
              </div>

              {/* Target Channel Switches */}
              <div className="p-4 rounded-2xl bg-parchment/60 border border-hairline space-y-3">
                <p className="text-xs font-bold text-ink">Saluran Tujuan Broadcast:</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-canvas border border-hairline cursor-pointer hover:bg-parchment transition-colors">
                    <input
                      type="checkbox"
                      checked={broadcastData.targetWhatsApp}
                      onChange={e => setBroadcastData({ ...broadcastData, targetWhatsApp: e.target.checked })}
                      className="w-4 h-4 rounded text-primary"
                    />
                    <div>
                      <span className="text-xs font-bold text-ink block">Pesan WhatsApp</span>
                      <span className="text-[10px] text-ink-muted">Kirim langsung ke WA semua user (Gratis Bot)</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-canvas border border-hairline cursor-pointer hover:bg-parchment transition-colors">
                    <input
                      type="checkbox"
                      checked={broadcastData.targetTelegram}
                      onChange={e => setBroadcastData({ ...broadcastData, targetTelegram: e.target.checked })}
                      className="w-4 h-4 rounded text-primary"
                    />
                    <div>
                      <span className="text-xs font-bold text-ink block">Telegram Bot / Group</span>
                      <span className="text-[10px] text-ink-muted">Kirim notifikasi bot ke grup komunitas</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-canvas border border-hairline cursor-pointer hover:bg-parchment transition-colors">
                    <input
                      type="checkbox"
                      checked={broadcastData.targetInApp}
                      onChange={e => setBroadcastData({ ...broadcastData, targetInApp: e.target.checked })}
                      className="w-4 h-4 rounded text-primary"
                    />
                    <div>
                      <span className="text-xs font-bold text-ink block">Banner In-App Pengguna</span>
                      <span className="text-[10px] text-ink-muted">Tampilkan di dashboard semua user</span>
                    </div>
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                isLoading={broadcasting}
                className="w-full h-12 font-bold bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 flex items-center justify-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
                Kirim Broadcast Promo Sekarang
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: KUPON PROMO DISKON                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'kupon-promo' && (
        <div className="space-y-6">
          <Card glass className="p-6 space-y-5">
            <div>
              <h2 className="text-xl font-bold text-ink flex items-center gap-2">
                <span className="text-primary">🎟️</span> Buat Kupon Diskon Baru
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">Atur kode voucher event (12.12, 10.10, dsb), potongan harga, kuota stok, & masa berlaku.</p>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Kode Kupon / Voucher"
                  placeholder="Misal: PROMO1212"
                  value={newCoupon.code}
                  onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  required
                />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-ink/80">Tipe Potongan</label>
                  <select
                    className="w-full h-11 rounded-lg border border-hairline px-3 bg-canvas text-sm outline-none focus:ring-1 focus:ring-primary"
                    value={newCoupon.discount_type}
                    onChange={e => setNewCoupon({ ...newCoupon, discount_type: e.target.value })}
                  >
                    <option value="fixed">Nominal Tetap (Rp)</option>
                    <option value="percent">Persentase (%)</option>
                  </select>
                </div>
                <Input
                  label={newCoupon.discount_type === 'percent' ? "Nilai Diskon (%)" : "Nilai Diskon (Rp)"}
                  type="number"
                  placeholder={newCoupon.discount_type === 'percent' ? "10" : "20000"}
                  value={newCoupon.discount_value}
                  onChange={e => setNewCoupon({ ...newCoupon, discount_value: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Minimal Transaksi (Rp)"
                  type="number"
                  placeholder="0 (Tanpa minimal)"
                  value={newCoupon.min_order_amount}
                  onChange={e => setNewCoupon({ ...newCoupon, min_order_amount: e.target.value })}
                />
                <Input
                  label="Maksimal Diskon (Rp, Jika %)"
                  type="number"
                  placeholder="0 (Tanpa batas max)"
                  value={newCoupon.max_discount_amount}
                  onChange={e => setNewCoupon({ ...newCoupon, max_discount_amount: e.target.value })}
                />
                <Input
                  label="Kuota / Stok Penggunaan"
                  type="number"
                  placeholder="100"
                  value={newCoupon.max_usage_limit}
                  onChange={e => setNewCoupon({ ...newCoupon, max_usage_limit: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-ink/80 block mb-1">Tanggal Mulai (Opsional)</label>
                  <input
                    type="date"
                    className="w-full h-11 rounded-lg border border-hairline px-3 bg-canvas text-sm outline-none focus:ring-1 focus:ring-primary"
                    value={newCoupon.start_date}
                    onChange={e => setNewCoupon({ ...newCoupon, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/80 block mb-1">Tanggal Berakhir (Opsional)</label>
                  <input
                    type="date"
                    className="w-full h-11 rounded-lg border border-hairline px-3 bg-canvas text-sm outline-none focus:ring-1 focus:ring-primary"
                    value={newCoupon.end_date}
                    onChange={e => setNewCoupon({ ...newCoupon, end_date: e.target.value })}
                  />
                </div>
              </div>

              <Button type="submit" isLoading={creatingCoupon} className="w-full h-11 font-bold">
                + Terbitkan Kupon Promo
              </Button>
            </form>
          </Card>

          {/* Daftar Kupon Aktif */}
          <Card glass className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-ink">Daftar Kupon Promo</h2>
            {loadingCoupons ? <p className="text-sm text-ink-muted">Memuat kupon...</p> : coupons.length === 0 ? (
              <p className="text-sm text-ink-muted py-4 text-center">Belum ada kupon promo yang dibuat.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {coupons.map(c => (
                  <div key={c.id} className={`p-4 rounded-2xl border bg-canvas flex flex-col justify-between gap-3 ${c.is_active ? 'border-primary/40' : 'border-hairline opacity-60'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono font-black text-base text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
                          {c.code}
                        </span>
                        <p className="font-bold text-sm text-ink mt-2">
                          Diskon: {c.discount_type === 'percent' ? `${c.discount_value}%` : `Rp ${Number(c.discount_value).toLocaleString('id-ID')}`}
                        </p>
                        <p className="text-xs text-ink-muted mt-0.5">
                          Min. Order: Rp {Number(c.min_order_amount || 0).toLocaleString('id-ID')} • Terpakai: {c.used_count}/{c.max_usage_limit}
                        </p>
                      </div>

                      <button
                        onClick={() => handleToggleCoupon(c.id, c.is_active)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg ${c.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}
                      >
                        {c.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-hairline">
                      <button onClick={() => handleDeleteCoupon(c.id)} className="text-xs font-bold text-rose-600 hover:text-rose-800">
                        🗑 Hapus Kupon
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: PROGRAM REFERRAL                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'referral' && (
        <div className="space-y-6">
          <Card glass className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-ink flex items-center gap-2">
                <span className="text-primary">🤝</span> Pengaturan Sistem Referral & Komisi
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">Kelola besaran komisi saldo untuk pengguna yang mengajak orang lain serta diskon untuk member baru.</p>
            </div>

            <form onSubmit={handleSaveRefSettings} className="space-y-5">
              <div className="p-4 rounded-2xl bg-canvas border border-hairline space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="font-bold text-sm text-ink">Aktifkan Sistem Referral</p>
                    <p className="text-xs text-ink-muted">Jika diaktifkan, setiap pengguna akan memiliki kode referral unik.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={refSettings.referral_enabled === 'true' || refSettings.referral_enabled === true}
                    onChange={e => setRefSettings({ ...refSettings, referral_enabled: e.target.checked ? 'true' : 'false' })}
                    className="w-5 h-5 text-primary rounded border-hairline"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-ink/80">Tipe Komisi Upline</label>
                  <select
                    className="w-full h-11 rounded-lg border border-hairline px-3 bg-canvas text-sm outline-none focus:ring-1 focus:ring-primary"
                    value={refSettings.referral_commission_type || 'fixed'}
                    onChange={e => setRefSettings({ ...refSettings, referral_commission_type: e.target.value })}
                  >
                    <option value="fixed">Nominal Tetap (Rp)</option>
                    <option value="percent">Persentase (%)</option>
                  </select>
                </div>

                <Input
                  label="Nilai Komisi Upline (Per Order Sukses)"
                  type="number"
                  placeholder="5000"
                  value={refSettings.referral_commission_value || ''}
                  onChange={e => setRefSettings({ ...refSettings, referral_commission_value: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Diskon Saldo Pengguna Baru (Rp)"
                  type="number"
                  placeholder="5000"
                  value={refSettings.referral_new_user_discount || ''}
                  onChange={e => setRefSettings({ ...refSettings, referral_new_user_discount: e.target.value })}
                />
              </div>

              <Button type="submit" isLoading={savingRefSettings} className="w-full h-12 font-bold">
                Simpan Pengaturan Referral
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 9: PENGATURAN UMUM & SISTEM                                           */}
      {/* ========================================================================= */}
      {activeTab === 'pengaturan' && (
        <div className="space-y-6">
          <Card glass className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-ink flex items-center gap-2">
              <span className="text-primary">💳</span> Saldo Modal Provider
            </h2>
            <p className="text-sm text-ink-muted">Sisa saldo di server pusat penyedia layanan.</p>
            <div className="space-y-3 mt-4">
              <div className="flex justify-between items-center p-3.5 bg-canvas border border-hairline rounded-xl">
                <div className="font-bold text-sm">🌐 KMSP Store</div>
                <div className="font-black text-primary">Rp {providerBalances.kmsp !== null ? providerBalances.kmsp?.toLocaleString('id-ID') : '...'}</div>
              </div>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center p-3.5 bg-canvas border border-hairline rounded-xl gap-3">
                <div>
                  <div className="font-bold text-sm flex items-center gap-1.5">📱 Server Pusat</div>
                  <div className="font-black text-primary">Rp {providerBalances.ceirgo !== null ? providerBalances.ceirgo?.toLocaleString('id-ID') : '...'}</div>
                </div>
                <Button size="sm" onClick={() => setShowCeirgoTopUp(true)}>Isi Saldo</Button>
              </div>
            </div>
          </Card>

          <Card glass className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-ink">Payment Gateway (Top Up Saldo)</h2>
            <p className="text-sm text-ink-muted">Pilih gateway pembayaran QRIS yang aktif untuk deposit saldo pengguna.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPaymentGateway("orkut")}
                className={`p-4 rounded-2xl border text-left transition-all ${paymentGateway === 'orkut' ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary' : 'border-hairline bg-canvas hover:bg-parchment'}`}
              >
                <div className="font-bold text-sm">🏦 ORKUT (QRIS Statis)</div>
                <div className="text-xs text-ink-muted mt-1">Polling via ORKUT API, kode unik otomatis</div>
              </button>
              <button
                type="button"
                onClick={() => setPaymentGateway("gopay")}
                className={`p-4 rounded-2xl border text-left transition-all ${paymentGateway === 'gopay' ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary' : 'border-hairline bg-canvas hover:bg-parchment'}`}
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
                  if (res.ok && data.status) Swal.fire({ title: "Info", text: data.message, icon: "info" });
                  else Swal.fire({ title: "Info", text: data.message || 'Gagal menyimpan', icon: "info" });
                } catch (e) { Swal.fire({ title: "Info", text: 'Error menyimpan gateway', icon: "info" }); }
                finally { setSavingGateway(false); }
              }}
            >
              Simpan Gateway Aktif
            </Button>
          </Card>

          {/* CARD 1: WHATSAPP BOT BAILEYS (100% GRATIS & UNLIMITED) */}
          <Card glass className="p-6 space-y-5 border-emerald-500/30">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-ink">
                  <span className="text-emerald-500">🤖</span> WhatsApp Bot Toko (100% Gratis Selamanya)
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">Tautkan nomor WhatsApp toko Anda langsung ke server website tanpa pihak ketiga & tanpa biaya langganan.</p>
              </div>

              <div>
                {baileysStatus.isConnected ? (
                  <span className="px-3 py-1 text-xs font-black rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Terhubung: +{baileysStatus.connectedPhone}
                  </span>
                ) : baileysStatus.state === 'qr_ready' ? (
                  <span className="px-3 py-1 text-xs font-black rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5 animate-bounce">
                    🟡 Menunggu Scan QR
                  </span>
                ) : (
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    ⚪ Belum Login
                  </span>
                )}
              </div>
            </div>

            {/* Content Area Based on Connection State */}
            {baileysStatus.isConnected ? (
              <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-emerald-500 text-white rounded-xl text-xl">✅</div>
                  <div>
                    <h3 className="font-bold text-sm text-emerald-950">WhatsApp Bot Siap & Aktif!</h3>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Nomor <b>+{baileysStatus.connectedPhone}</b> terhubung langsung ke backend server. Seluruh pengiriman nota dan update pesanan akan dikirim via nomor ini secara otomatis tanpa batasan kuota.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap pt-2">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 text-xs"
                    onClick={async () => {
                      const { value: phone } = await Swal.fire({
                        title: "Tes WhatsApp Bot",
                        input: "text",
                        inputLabel: "Masukkan nomor WhatsApp tujuan (misal: 08123456789):",
                        inputPlaceholder: "08xxxxxxxxxx",
                        showCancelButton: true,
                        confirmButtonText: "Kirim Pesan Tes 🚀",
                        cancelButtonText: "Batal",
                        inputValidator: (val) => {
                          if (!val || val.replace(/\D/g, '').length < 9) return "Nomor WA tidak valid!";
                        }
                      });
                      if (!phone) return;

                      try {
                        Swal.showLoading();
                        const res = await fetch('/api/admin/baileys/test', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ targetPhone: phone })
                        });
                        const d = await res.json();
                        if (res.ok && d.status) {
                          Swal.fire({ title: "Berhasil! 🚀", text: d.message, icon: "success" });
                        } else {
                          Swal.fire({ title: "Gagal", text: d.message || "Gagal mengirim pesan tes.", icon: "error" });
                        }
                      } catch (e) {
                        Swal.fire({ title: "Error", text: "Kesalahan jaringan", icon: "error" });
                      }
                    }}
                  >
                    🧪 Tes Kirim Pesan
                  </Button>

                  <Button
                    size="sm"
                    variant="danger"
                    isLoading={loadingBaileys}
                    onClick={handleLogoutBaileys}
                    className="text-xs"
                  >
                    🔌 Putus Koneksi / Logout
                  </Button>
                </div>
              </div>
            ) : baileysStatus.qrCode ? (
              <div className="p-6 bg-canvas border border-hairline rounded-2xl flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
                <div className="space-y-1">
                  <h3 className="font-black text-base text-ink">Pindai Kode QR dengan WhatsApp</h3>
                  <p className="text-xs text-ink-muted max-w-md">
                    Buka WhatsApp di HP Anda &gt; Menu Titik Tiga / Pengaturan &gt; <b>Perangkat Tertaut</b> &gt; <b>Tautkan Perangkat</b> &gt; Arahkan kamera ke QR di bawah:
                  </p>
                </div>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <div className="p-3 bg-white border-2 border-emerald-500/40 rounded-2xl shadow-md">
                  <img
                    src={baileysStatus.qrCode}
                    alt="WhatsApp QR Code"
                    className="w-56 h-56 object-contain"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    isLoading={loadingBaileys}
                    onClick={() => handleInitBaileys(true)}
                    className="text-xs"
                  >
                    🔄 Buat Ulang QR
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleLogoutBaileys}
                    className="text-xs text-rose-600"
                  >
                    Batal
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-5 bg-parchment/60 border border-hairline rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-ink">Tautkan WhatsApp Toko Sekarang</h3>
                  <p className="text-xs text-ink-muted">
                    Klik tombol di samping untuk menghasilkan Kode QR, lalu scan dari aplikasi WhatsApp di HP Anda.
                  </p>
                </div>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 shadow-sm"
                  isLoading={loadingBaileys}
                  onClick={() => handleInitBaileys(false)}
                >
                  📱 Tautkan WhatsApp (Scan QR)
                </Button>
              </div>
            )}

            {/* Toggle Auto Send */}
            <div className="flex items-center justify-between p-4 border border-hairline rounded-2xl bg-canvas">
              <div>
                <p className="font-bold text-sm text-ink">Auto Kirim Notifikasi WhatsApp</p>
                <p className="text-xs text-ink-muted">Kirim pesan otomatis berisi nota & link garansi ke WhatsApp pembeli saat pesanan manual berstatus sukses.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={waAutoSend}
                  onChange={async (e) => {
                    const newAuto = e.target.checked;
                    setWaAutoSend(newAuto);
                    await fetch('/api/admin/whatsapp-settings', {
                      method: 'PUT',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ token: waToken, url: waUrl, autoSend: newAuto })
                    });
                    Swal.fire({ title: "Tersimpan", text: `Auto-send WhatsApp ${newAuto ? 'AKTIF' : 'NONAKTIF'}`, icon: "success", timer: 1500 });
                  }}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </Card>

          {/* CARD 2: EXTERNAL REST API GATEWAY (OPSIONAL / FALLBACK) */}
          <Card glass className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2 text-ink">
                <span>🌐</span> Fallback REST API Gateway (Opsional)
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">Jika Anda juga memiliki API Token dari Fonnte / Wablas, Anda dapat mengisinya di sini sebagai cadangan.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-ink block mb-1">WhatsApp API Token / Key</label>
                <input
                  type="text"
                  className="w-full p-3 border border-hairline rounded-xl bg-canvas text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  placeholder="Contoh: 1a2b3c4d5e6f7g8h9i0j..."
                  value={waToken}
                  onChange={(e) => setWaToken(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-ink block mb-1">WhatsApp Gateway API URL Endpoint</label>
                <input
                  type="text"
                  className="w-full p-3 border border-hairline rounded-xl bg-canvas text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  placeholder="https://api.fonnte.com/send"
                  value={waUrl}
                  onChange={(e) => setWaUrl(e.target.value)}
                />
              </div>
            </div>

            <Button
              className="w-full"
              variant="outline"
              isLoading={savingWhatsApp}
              onClick={handleSaveWhatsAppSettings}
            >
              Simpan Fallback Gateway
            </Button>
          </Card>

          <Card glass className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-ink">Pengumuman Sistem Banner</h2>
            <textarea
              className="w-full p-4 border border-hairline rounded-xl bg-canvas text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              rows={4}
              placeholder="Masukkan pengumuman penting di sini..."
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
            />
            <Button onClick={handleSaveAnnouncement} isLoading={savingAnn}>Simpan Pengumuman</Button>
          </Card>

          <Card glass className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-ink">Pengaturan Menu Sidebar</h2>
            <p className="text-sm text-ink-muted">Atur visibilitas menu di sidebar pengguna.</p>
            <div className="flex items-center justify-between p-4 border border-hairline rounded-xl bg-canvas">
              <div>
                <p className="font-bold text-ink">Menu Suntik Kuota</p>
                <p className="text-xs text-ink-muted">Tampilkan menu Suntik Kuota di sidebar.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={showBeliPaket} onChange={(e) => setShowBeliPaket(e.target.checked)} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            <Button className="w-full" onClick={handleSaveMenuSettings} isLoading={savingMenuSettings}>Simpan Pengaturan Menu</Button>
          </Card>

          <Card glass className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-ink">Database & Sistem</h2>
            <p className="text-sm text-ink-muted">Backup semua data (pengguna, transaksi, paket) ke file .sqlite aman.</p>
            <a href="/api/admin/backup-database" download>
              <Button variant="outline" className="w-full">Unduh Backup Database (.sqlite)</Button>
            </a>

            <div className="pt-4 mt-4 border-t border-hairline space-y-4">
              <div>
                <h3 className="text-md font-bold text-ink">Tarik Update Server (Auto Deploy)</h3>
                <p className="text-xs text-ink-muted">Tarik kode terbaru dari GitHub, build ulang UI, dan restart server otomatis tanpa downtime panjang.</p>
              </div>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0" 
                onClick={() => {
                  Swal.fire({
                    title: 'Mulai Auto Deploy?',
                    text: 'Proses ini memakan CPU server beberapa saat untuk rebuild UI dan restart server otomatis.',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Ya, Jalankan Deploy',
                    cancelButtonText: 'Batal'
                  }).then((res) => {
                    if (res.isConfirmed) startDeploy();
                  });
                }}
              >
                🚀 Jalankan Auto Deploy Sekarang
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Invoice Modal for Admin */}
      <InvoiceModal
        isOpen={Boolean(selectedInvoiceTrx)}
        onClose={() => setSelectedInvoiceTrx(null)}
        data={selectedInvoiceTrx}
      />

      {/* Deploy Terminal Modal */}
      {showDeployConsole && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <Card className="w-full max-w-2xl bg-[#1e1e1e] border border-zinc-700 p-0 overflow-hidden flex flex-col shadow-2xl">
            <div className="flex justify-between items-center bg-zinc-900 p-4 border-b border-zinc-800">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                🚀 Terminal Auto Deploy
                {isDeploying && <span className="animate-spin inline-block w-4 h-4 border-2 border-zinc-500 border-t-amber-400 rounded-full ml-2"></span>}
              </h3>
              {!isDeploying && <button onClick={() => setShowDeployConsole(false)} className="text-zinc-500 hover:text-white font-bold text-2xl transition-colors">&times;</button>}
            </div>
            <pre className="w-full h-[60vh] max-h-[500px] bg-black p-4 overflow-y-auto text-xs text-green-400 font-mono whitespace-pre-wrap leading-relaxed select-all">
              {deployLogs}
            </pre>
            <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex justify-between items-center">
              <span className="text-xs text-zinc-500">*Jangan menutup halaman ini hingga proses selesai.</span>
              {!isDeploying && <Button size="sm" onClick={() => window.location.reload()} className="bg-primary hover:bg-primary-hover text-white">Muat Ulang Halaman</Button>}
            </div>
          </Card>
        </div>
      )}

      {/* Top Up Saldo Pusat Modal */}
      {showCeirgoTopUp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">Top Up Saldo Server Pusat</h3>
              <button onClick={() => { setShowCeirgoTopUp(false); setCeirgoPaymentData(null); }} className="text-gray-500 hover:text-red-500 font-bold text-2xl">&times;</button>
            </div>
            
            {!ceirgoPaymentData ? (
              <>
                <Input 
                  label="Jumlah (Rp)" 
                  type="number" 
                  min={10000}
                  value={ceirgoDepositAmount} 
                  onChange={e => setCeirgoDepositAmount(e.target.value)} 
                />
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Pilih Metode Pembayaran</label>
                  <select 
                    className="w-full h-11 rounded-lg border border-hairline px-3 bg-canvas text-sm"
                    value={ceirgoDepositProviderCode}
                    onChange={e => setCeirgoDepositProviderCode(e.target.value)}
                  >
                    <option value="">-- Pilih --</option>
                    {ceirgoDepositProviders.map(p => (
                      <option key={p.code} value={p.code}>{p.display_name || p.name}</option>
                    ))}
                  </select>
                </div>
                
                <Button 
                  className="w-full" 
                  isLoading={ceirgoTopUpLoading}
                  onClick={async () => {
                    if (!ceirgoDepositAmount || parseInt(ceirgoDepositAmount) < 10000) return Swal.fire('Error', 'Minimal top up Rp 10.000', 'error');
                    if (!ceirgoDepositProviderCode) return Swal.fire('Error', 'Pilih provider', 'error');
                    
                    setCeirgoTopUpLoading(true);
                    try {
                      const res = await fetch('/api/admin/ceirgo-deposit', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ amount: parseInt(ceirgoDepositAmount), provider_code: ceirgoDepositProviderCode })
                      });
                      const d = await res.json();
                      if (d.status) {
                        setCeirgoPaymentData(d.data);
                      } else {
                        Swal.fire('Gagal', d.message, 'error');
                      }
                    } catch(e) {
                      Swal.fire('Error', 'Kesalahan jaringan', 'error');
                    } finally {
                      setCeirgoTopUpLoading(false);
                    }
                  }}
                >
                  Buat Pesanan Deposit
                </Button>
              </>
            ) : (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-green-50 text-green-800 rounded-xl border border-green-200">
                  <p className="text-sm font-semibold mb-1">Total yang harus dibayar:</p>
                  <p className="text-2xl font-black text-green-600">Rp {ceirgoPaymentData.total_pay?.toLocaleString('id-ID')}</p>
                </div>
                
                {ceirgoPaymentData.qr ? (
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm font-medium">Scan QRIS di bawah ini:</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ceirgoPaymentData.qr} alt="QRIS" className="w-48 h-48 border border-gray-200 rounded-lg p-2 bg-white" />
                  </div>
                ) : (
                  <div className="space-y-2 text-sm text-left bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p><b>Provider:</b> {ceirgoPaymentData.provider}</p>
                    {ceirgoPaymentData.account_number && (
                      <p><b>No Rekening/VA:</b> {ceirgoPaymentData.account_number}</p>
                    )}
                    {ceirgoPaymentData.account_holder && (
                      <p><b>Atas Nama:</b> {ceirgoPaymentData.account_holder}</p>
                    )}
                  </div>
                )}
                <Button className="w-full" variant="outline" onClick={() => { setShowCeirgoTopUp(false); setCeirgoPaymentData(null); }}>Tutup & Selesai</Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
