"use client";
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { API_URL } from "@/lib/api";
import { InvoiceModal } from "@/components/ui/InvoiceModal";
import Link from "next/link";
import Swal from "sweetalert2";

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedInvoiceTrx, setSelectedInvoiceTrx] = useState<any>(null);

  const handleQuickShareWhatsApp = async (trx: any) => {
    const { value: phone } = await Swal.fire({
      title: "Kirim Nota via WhatsApp",
      input: "text",
      inputLabel: "Nomor WhatsApp Pelanggan (misal: 08123456789):",
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
      `🧾 *ID Transaksi:* #${trx.id.substring(0, 14)}\n` +
      `📱 *IMEI:* ${trx.imei || '-'}\n` +
      `📦 *Layanan:* ${trx.package_name || trx.service_type || 'Aktivasi IMEI'}\n` +
      `🛡️ *Status:* ${trx.status.toUpperCase()}\n` +
      `📅 *Tanggal:* ${new Date(trx.createdAt).toLocaleDateString('id-ID')}\n\n` +
      `🔗 *Cek Nota & Garansi Digital:* \n${verifyUrl}\n\n` +
      `Terima kasih atas kepercayaannya! 🙏`;

    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`, '_blank');
  };

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
        <p className="text-sm text-ink-muted">Pantau semua aktivitas pembelian, cetak nota, dan status garansi IMEI Anda.</p>
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

              {/* Action Buttons: Cetak Nota & Cek Garansi */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-hairline/60">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      const firstImei = trx.imei ? trx.imei.split(/[\n,]+/)[0].trim() : '';
                      setSelectedInvoiceTrx({
                        trxId: trx.id,
                        imei: firstImei || trx.targetPhone || 'N/A',
                        packageName: trx.packageName || 'Layanan Resmi',
                        serviceType: trx.service_type,
                        createdAt: trx.createdAt,
                        amount: trx.platformFee || trx.originalPrice || 0,
                        status: trx.status,
                        adminNote: trx.admin_note
                      });
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    Cetak Nota
                  </button>

                  <button
                    onClick={() => handleQuickShareWhatsApp(trx)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5 shadow-sm"
                    title="Kirim Nota ke WhatsApp"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824z" />
                    </svg>
                    Kirim WA
                  </button>

                  {trx.imei && (
                    <Link
                      href={`/cek-garansi?imei=${trx.imei.split(/[\n,]+/)[0].trim().replace(/\D/g, '')}`}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                      Cek Status
                    </Link>
                  )}
                </div>

                <span className="text-[11px] text-ink-muted font-mono">
                  #{trx.id.substring(0, 14)}
                </span>
              </div>
              
              {/* Hasil Manual Order */}
              {(trx.admin_note || trx.admin_image) && (
                <div className="mt-1 pt-3 border-t border-hairline space-y-2 bg-parchment/50 p-3 rounded-xl">
                  <p className="text-xs font-bold text-primary">HASIL / CATATAN ADMIN</p>
                  {trx.admin_note && (() => {
                    try {
                      const note = JSON.parse(trx.admin_note);
                      return (
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-ink">{note.status}</p>
                          {note.data && <pre className="text-[10px] bg-white p-2 rounded border border-divider overflow-x-auto">{JSON.stringify(note.data, null, 2)}</pre>}
                        </div>
                      );
                    } catch {
                      return <p className="text-sm text-ink">{trx.admin_note}</p>;
                    }
                  })()}
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

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={!!selectedInvoiceTrx}
        onClose={() => setSelectedInvoiceTrx(null)}
        data={selectedInvoiceTrx}
      />
    </div>
  );
}
