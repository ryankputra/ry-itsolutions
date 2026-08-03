const fs = require('fs');

const adminCode = `"use client";
import React, { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AdminPage() {
  const { user, loading: userLoading, menuSettings, updateMenuSettings } = useApp();
  const [activeTab, setActiveTab] = useState("paket");

  // State dasar
  const [users, setUsers] = useState<any[]>([]);
  const [manualOrders, setManualOrders] = useState<any[]>([]);
  const [paymentGateway, setPaymentGateway] = useState("orkut");
  const [savingGateway, setSavingGateway] = useState(false);

  useEffect(() => {
    if (!userLoading && user?.role !== 'admin') redirect("/dashboard");
  }, [user, userLoading]);

  useEffect(() => {
    if (user?.role === 'admin') {
      if (activeTab === "pengguna") {
        fetch('/api/admin/users', { credentials: 'include' })
          .then(r => r.json())
          .then(d => { if (d.status) setUsers(d.data); });
      }
      if (activeTab === "pesanan-manual") {
        fetch('/api/admin/manual-orders', { credentials: 'include' })
          .then(r => r.json())
          .then(d => { if (d.status) setManualOrders(d.data); });
      }
      if (activeTab === "pengaturan") {
        fetch('/api/admin/payment-gateway')
          .then(r => r.json())
          .then(d => { if (d.status) setPaymentGateway(d.data.gateway); });
      }
    }
  }, [user, activeTab]);

  if (userLoading) return <p className="p-6">Memuat Admin Panel...</p>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex gap-4 border-b border-hairline pb-4 overflow-x-auto">
        {['paket', 'pengguna', 'pesanan-manual', 'pengaturan'].map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={\`px-4 py-2 text-sm font-semibold capitalize rounded-full transition-colors whitespace-nowrap \${activeTab === tab ? 'bg-primary text-white' : 'text-ink-muted hover:bg-parchment hover:text-ink'}\`}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      {activeTab === 'paket' && (
        <Card glass className="p-6 text-center">
          <p className="text-ink-muted mb-4">Fitur kelola paket sedang dalam penyesuaian untuk mendukung PPOB Digiflazz.</p>
        </Card>
      )}

      {activeTab === 'pengguna' && (
        <Card glass className="p-6 space-y-4">
          <h2 className="text-xl font-bold">Daftar Pengguna ({users.length})</h2>
          <div className="space-y-3">
            {users.map(u => (
              <div key={u.id} className="p-4 bg-canvas border border-hairline rounded-lg flex justify-between">
                <div>
                  <p className="font-bold">{u.name} <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">{u.role}</span></p>
                  <p className="text-xs text-ink-muted">{u.email}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">Rp {u.balance?.toLocaleString('id-ID')}</p>
                  <p className="text-xs">{u.status}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'pesanan-manual' && (
        <Card glass className="p-6 space-y-4">
          <h2 className="text-xl font-bold">Antrean Pesanan</h2>
          {manualOrders.length === 0 ? <p className="text-ink-muted">Tidak ada pesanan masuk.</p> : (
            <div className="space-y-4">
              {manualOrders.map(o => (
                <div key={o.id} className="p-4 bg-canvas border border-hairline rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-bold">{o.packageName}</p>
                    <p className="text-sm">User: {o.userName} • IMEI: <b>{o.imei}</b></p>
                    <p className="text-xs text-ink-muted mt-1">{new Date(o.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={\`px-2 py-1 text-xs font-bold rounded uppercase \${o.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}\`}>
                    {o.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'pengaturan' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card glass className="p-6 space-y-4">
            <h2 className="text-xl font-bold">Menu User</h2>
            <div className="flex justify-between items-center p-4 bg-canvas border border-hairline rounded-xl">
              <div>
                <p className="font-bold text-sm">Menu "Beli Paket"</p>
                <p className="text-xs text-ink-muted">Paket Data & Pulsa</p>
              </div>
              <button onClick={async () => {
                const newVal = !menuSettings?.showBeliPaket;
                updateMenuSettings({ showBeliPaket: newVal });
                try {
                  await fetch('/api/admin/menu-settings', {
                    method: 'PUT', credentials: 'include',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ showBeliPaket: newVal })
                  });
                } catch(e) {}
              }} className={\`px-3 py-1.5 text-xs font-bold rounded-lg \${menuSettings?.showBeliPaket ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}\`}>
                {menuSettings?.showBeliPaket ? 'Ditampilkan' : 'Disembunyikan'}
              </button>
            </div>
          </Card>

          <Card glass className="p-6 space-y-4">
            <h2 className="text-xl font-bold">Payment Gateway</h2>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setPaymentGateway("orkut")} className={\`p-4 rounded-xl border text-center \${paymentGateway === 'orkut' ? 'border-primary ring-2 ring-primary' : 'bg-canvas'}\`}>
                ORKUT
              </button>
              <button onClick={() => setPaymentGateway("gopay")} className={\`p-4 rounded-xl border text-center \${paymentGateway === 'gopay' ? 'border-primary ring-2 ring-primary' : 'bg-canvas'}\`}>
                GoPay
              </button>
            </div>
            <Button className="w-full" isLoading={savingGateway} onClick={async () => {
              setSavingGateway(true);
              try {
                await fetch('/api/admin/payment-gateway', {
                  method: 'PUT', credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ gateway: paymentGateway })
                });
                alert("Tersimpan");
              } finally { setSavingGateway(false); }
            }}>Simpan Gateway</Button>
          </Card>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync('src/app/(main)/admin/page.tsx', adminCode);
console.log('Done cleaning admin page to perfectly safe code');
