"use client";
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { API_URL } from "@/lib/api";

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`${API_URL}/user/transactions`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.status) setHistory(data.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const filteredHistory = history.filter(trx => {
    if (filter === "all") return true;
    
    // Normalisasi status (completed dari topup dianggap sebagai success)
    const normalizedStatus = trx.status === 'completed' ? 'success' : 
                             trx.status === 'canceled' ? 'failed' : 
                             trx.status;
                             
    return normalizedStatus === filter;
  });

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Riwayat Transaksi</h1>
        <p className="text-sm text-ink-muted">Pantau semua aktivitas pembelian dan status transaksi Anda.</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-hairline pb-3 overflow-x-auto">
        {[
          { label: "Semua", value: "all" },
          { label: "Diproses", value: "processing" },
          { label: "Sukses", value: "success" },
          { label: "Gagal", value: "failed" }
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${filter === tab.value ? 'bg-primary text-white' : 'bg-parchment text-ink-muted hover:bg-divider hover:text-ink'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 w-full animate-pulse bg-parchment rounded-[18px]"></div>
            ))}
          </div>
        ) : filteredHistory.length === 0 ? (
          <Card className="p-12 text-center text-ink-muted bg-canvas border border-hairline">
            Belum ada transaksi dengan status ini.
          </Card>
        ) : (
          filteredHistory.map((trx, idx) => (
            <Card key={idx} className="flex flex-col p-4 bg-canvas border border-hairline hover:border-primary/30 transition-colors gap-3">
              {console.log("Transaction Data:", trx)}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-lg">
                    {trx.service_type === 'imei' ? '🔓' : trx.service_type === 'ceir' ? '🔍' : trx.packageName?.toLowerCase().includes('pulsa') ? '📱' : '🌐'}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-ink">{trx.packageName || "Paket Data"}</p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {trx.imei ? `IMEI: ${trx.imei.split(',').length > 1 ? `${trx.imei.split(',')[0]} (+${trx.imei.split(',').length - 1} IMEI)` : trx.imei}` : trx.targetPhone} • {new Date(trx.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    {trx.speed_option && (
                      <span className="inline-block bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded capitalize mt-1">
                        Kecepatan: {trx.speed_option === 'fast' ? '⚡ Fast' : trx.speed_option === 'semi' ? '🚀 Semi Fast' : '🐌 Slow'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-ink">Rp {(trx.originalPrice || trx.baseAmount || 0).toLocaleString('id-ID')}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                    trx.status === 'success' || trx.status === 'completed' ? 'bg-green-100 text-green-700' : 
                    trx.status === 'failed' || trx.status === 'canceled' ? 'bg-red-100 text-red-700' : 
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {trx.status === 'completed' ? 'success' : trx.status}
                  </span>
                </div>
              </div>
              
              {/* Hasil Manual Order */}
              {(trx.admin_note || trx.admin_image) && (
                <div className="mt-2 pt-3 border-t border-hairline space-y-2 bg-parchment/50 p-3 rounded-xl">
                  <p className="text-xs font-bold text-primary">HASIL / CATATAN ADMIN</p>
                  {trx.admin_note && <p className="text-sm text-ink">{trx.admin_note}</p>}
                  {trx.admin_image && (
                    <a href={trx.admin_image} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline font-medium mt-1 block">
                      Lihat Gambar Bukti / Hasil
                    </a>
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
