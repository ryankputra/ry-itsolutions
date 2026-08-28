"use client";
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Swal from "sweetalert2";

export default function ReferralPage() {
  const [loading, setLoading] = useState(true);
  const [referralData, setReferralData] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetch('/api/user/referral-info', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.status) {
          setReferralData(data.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const referralCode = referralData?.referral_code || "RYY...";
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ry-itsolutionts.web.id';
  const referralLink = `${origin}/register?ref=${referralCode}`;

  const copyToClipboard = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
    Swal.fire({
      icon: 'success',
      title: type === 'code' ? 'Kode Disalin' : 'Tautan Disalin',
      text: text,
      toast: true,
      position: 'top-end',
      timer: 2000,
      showConfirmButton: false
    });
  };

  const shareToWhatsapp = () => {
    const text = `Halo! Mau unblock IMEI atau cek status garansi HP tanpa ribet & cepat? Daftar di Ry-ITSolutions lewat link aku dapat promo potongan harga lho: ${referralLink}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-8">
        <Card glass className="p-12 text-center text-ink-muted">
          <div className="w-8 h-8 mx-auto mb-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold">Memuat data referral Anda...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight flex items-center gap-2.5">
          <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          Program Referral & Komisi
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          Ajak teman atau reseller lain bergabung dan dapatkan komisi saldo otomatis setiap kali mereka order.
        </p>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card glass className="p-5 relative overflow-hidden bg-gradient-to-br from-primary/10 via-canvas to-canvas border-primary/20">
          <div className="space-y-1">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Total Komisi Didapat</span>
            <p className="text-2xl sm:text-3xl font-black text-ink">
              Rp {Number(referralData?.totalEarnings || 0).toLocaleString('id-ID')}
            </p>
            <p className="text-[11px] text-ink-muted">Langsung masuk ke saldo akun Anda</p>
          </div>
          <div className="absolute -right-2 -bottom-2 text-primary/10">
            <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm1 14.93V18a1 1 0 01-2 0v-1.07A4.49 4.49 0 018 13a1 1 0 012 0 2.5 2.5 0 002.5 2.5c1.38 0 2.5-1.12 2.5-2.5S13.88 10.5 12.5 10.5A4.5 4.5 0 018 6a4.49 4.49 0 013-4.07V1a1 1 0 012 0v1.07A4.49 4.49 0 0116 6a1 1 0 01-2 0 2.5 2.5 0 00-2.5-2.5C10.12 3.5 9 4.62 9 6s1.12 2.5 2.5 2.5a4.5 4.5 0 014.5 4.5 4.49 4.49 0 01-3 3.93z" />
            </svg>
          </div>
        </Card>

        <Card glass className="p-5 relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">Teman Terdaftar</span>
            <p className="text-2xl sm:text-3xl font-black text-ink">
              {referralData?.referredUsersCount || 0} <span className="text-base font-normal text-ink-muted">Orang</span>
            </p>
            <p className="text-[11px] text-ink-muted">Menggunakan link referral Anda</p>
          </div>
          <div className="absolute -right-2 -bottom-2 text-ink-muted/10">
            <svg className="w-20 h-20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
        </Card>

        <Card glass className="p-5 relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">Komisi Per Transaksi</span>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600">
              Rp {Number(referralData?.commissionValue || 5000).toLocaleString('id-ID')}
            </p>
            <p className="text-[11px] text-ink-muted">Otomatis per transaksi downline</p>
          </div>
          <div className="absolute -right-2 -bottom-2 text-emerald-600/10">
            <svg className="w-20 h-20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
        </Card>
      </div>

      {/* Share Box */}
      <Card glass className="p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-ink">Kode & Tautan Undangan Anda</h2>
          <p className="text-xs text-ink-muted mt-0.5">Bagikan kode atau tautan ini kepada teman, pelanggan, atau relasi Anda.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-canvas border border-hairline space-y-2">
            <span className="text-xs font-semibold text-ink-muted block">Kode Referral</span>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono font-black text-xl text-primary tracking-wider">
                {referralCode}
              </span>
              <button
                onClick={() => copyToClipboard(referralCode, 'code')}
                className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
                {copiedCode ? "Tersalin" : "Salin Kode"}
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-canvas border border-hairline space-y-2">
            <span className="text-xs font-semibold text-ink-muted block">Tautan Undangan Langsung</span>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-ink-muted truncate max-w-[180px]">
                {referralLink}
              </span>
              <button
                onClick={() => copyToClipboard(referralLink, 'link')}
                className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
                {copiedLink ? "Tersalin" : "Salin Link"}
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            onClick={shareToWhatsapp}
            className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.015c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
            </svg>
            Bagikan ke WhatsApp
          </button>
        </div>
      </Card>

      {/* How it works */}
      <Card glass className="p-6 space-y-5">
        <h3 className="font-bold text-base text-ink flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.516 0c.85.493 1.508 1.333 1.508 2.316V18" />
          </svg>
          Cara Kerja Referral
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-canvas border border-hairline space-y-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
              1
            </div>
            <h4 className="font-bold text-sm text-ink">Bagikan Link</h4>
            <p className="text-xs text-ink-muted leading-relaxed">
              Kirimkan tautan undangan atau kode referral Anda ke teman maupun grup media sosial.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-canvas border border-hairline space-y-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
              2
            </div>
            <h4 className="font-bold text-sm text-ink">Teman Mendaftar</h4>
            <p className="text-xs text-ink-muted leading-relaxed">
              Teman Anda mendaftar akun dan melakukan pesanan unblock IMEI atau layanan lainnya.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-canvas border border-hairline space-y-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
              3
            </div>
            <h4 className="font-bold text-sm text-ink">Dapatkan Saldo Otomatis</h4>
            <p className="text-xs text-ink-muted leading-relaxed">
              Komisi langsung masuk secara otomatis ke saldo akun Anda tanpa potongan.
            </p>
          </div>
        </div>
      </Card>

      {/* Downlines Table */}
      <Card glass className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-base text-ink flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            Teman Yang Anda Ajak ({referralData?.referredUsers?.length || 0})
          </h3>
        </div>

        {referralData?.referredUsers && referralData.referredUsers.length > 0 ? (
          <div className="space-y-2">
            {referralData.referredUsers.map((u: any, idx: number) => (
              <div
                key={u.id || idx}
                className="p-3.5 rounded-xl bg-canvas border border-hairline flex justify-between items-center text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-parchment flex items-center justify-center font-bold text-ink">
                    {(u.name || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-ink">{u.name}</p>
                    <p className="text-[11px] text-ink-muted">
                      Terdaftar: {new Date(u.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                  Terdaftar
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-ink-muted bg-canvas rounded-2xl border border-hairline">
            Belum ada teman yang mendaftar melalui link referral Anda. Mulai bagikan sekarang.
          </div>
        )}
      </Card>
    </div>
  );
}
