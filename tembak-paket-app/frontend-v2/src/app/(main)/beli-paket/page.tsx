"use client";
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { fetchPackages } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useApp } from "@/lib/store";

export default function BeliPaketPage() {
  const { user } = useApp();
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // States for Selection Flow
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const [search, setSearch] = useState("");

  // States for Purchase
  const [phone, setPhone] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [otp, setOtp] = useState("");
  const [authId, setAuthId] = useState("");
  const [savedTokens, setSavedTokens] = useState<any[]>([]);
  const [accessToken, setAccessToken] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const pkgs = await fetchPackages();
        setPackages(pkgs);
        
        const tokenRes = await fetch('/api/auth/token-list', { credentials: 'include' });
        if (tokenRes.ok) {
          const tData = await tokenRes.json();
          if (tData.status && Array.isArray(tData.data)) {
            setSavedTokens(tData.data);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const providers = [
    { 
      id: "xl", 
      name: "XL Axiata", 
      logo: "/logos/xl.svg",
      keywords: ["xl", "akrab", "xtra combo"] 
    },
    { 
      id: "axis", 
      name: "Axis", 
      logo: "/logos/axis.svg",
      keywords: ["axis", "bronet", "owsem"] 
    },
    { 
      id: "indosat", 
      name: "Indosat", 
      logo: "/logos/indosat.svg",
      keywords: ["indosat", "isat", "im3"] 
    },
    { 
      id: "indosat-hype", 
      name: "Indosat Hype", 
      logo: "/logos/indosat.svg",
      badge: "HYPE",
      keywords: ["indosat hype", "indosat hyfe"] 
    },
    { 
      id: "tri", 
      name: "Tri", 
      logo: "/logos/tri.svg",
      keywords: ["tri", "three", "bima"] 
    },
    { 
      id: "tri-hype", 
      name: "Tri Hype", 
      logo: "/logos/tri.svg",
      badge: "HYPE",
      keywords: ["tri hype", "tri hyfe"] 
    },
    { 
      id: "telkomsel", 
      name: "Telkomsel", 
      logo: "/logos/telkomsel.svg",
      keywords: ["telkomsel", "tsel", "simpati"] 
    },
  ];

  const filteredPackages = packages.filter(p => {
    if (!selectedProvider) return false;
    
    // Check search term
    const matchSearch = search === "" || p.name.toLowerCase().includes(search.toLowerCase()) || p.package_code.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    
    const providerObj = providers.find(pr => pr.id === selectedProvider);
    if (!providerObj) return true;
    
    const pName = p.name.toLowerCase();
    return providerObj.keywords?.some(kw => pName.includes(kw));
  });

  const getPrice = (p: any) => p.original_price + (user?.role === 'reseller' ? (p.reseller_fee || 0) : (p.platform_fee || 0));

  const handleRequestOtp = async () => {
    if (!phone) return setError("Nomor tujuan harus diisi");
    setError("");
    setPurchasing(true);
    try {
      const res = await fetch("/api/phone/request-otp", {
        method: "POST",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (res.ok && data.status) {
        setAuthId(data.data?.auth_id || data.auth_id);
        setOtpRequested(true);
        setSuccess("OTP berhasil dikirim ke nomor tersebut.");
      } else {
        setError(data.message || "Gagal meminta OTP.");
      }
    } catch (err) {
      setError("Kesalahan jaringan saat meminta OTP.");
    } finally {
      setPurchasing(false);
    }
  };

  const [paymentMethod, setPaymentMethod] = useState("balance");
  const [ewalletNumber, setEwalletNumber] = useState("");
  const [paymentInfo, setPaymentInfo] = useState<any>(null);

  const handleUseSavedSession = async (sessionPhone: string, token: string) => {
    setError("");
    setSuccess("");
    setPurchasing(true);
    try {
      const res = await fetch("/api/phone/check-token", {
        method: "POST",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: token })
      });
      const data = await res.json();
      if (res.ok && data.status) {
        setPhone(sessionPhone);
        setAccessToken(token);
        setOtpRequested(true);
        setSuccess(`Sesi aktif untuk nomor ${sessionPhone} VALID! Silakan langsung Beli Sekarang.`);
      } else {
        setError(data.message || "Sesi aktif ini sudah kedaluwarsa (Invalid Access Token). Silakan Kirim OTP Baru.");
      }
    } catch (err) {
      setError("Gagal memvalidasi sesi.");
    } finally {
      setPurchasing(false);
    }
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;
    setError("");
    setSuccess("");
    setPurchasing(true);

    try {
      if (requiresOtp) {
        let finalAccessToken = accessToken;
        
        if (!finalAccessToken) {
          if (!otp) throw new Error("Kode OTP harus diisi.");
          const verifyRes = await fetch("/api/phone/verify-otp", {
            method: "POST",
            credentials: 'include',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, auth_id: authId, otp }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok || !verifyData.status) {
            throw new Error(verifyData.message || "Gagal verifikasi OTP.");
          }
          finalAccessToken = verifyData.data.access_token;
        }
        
        const purchaseRes = await fetch("/api/purchase", {
          method: "POST",
          credentials: 'include',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packageId: selectedPkg.package_code, phone, access_token: finalAccessToken, paymentMethod, ewallet_number: ewalletNumber }),
        });
        const purchaseData = await purchaseRes.json();
        
        if (purchaseRes.status === 202 && purchaseData.payment_data) {
          setPaymentInfo(purchaseData.payment_data);
          setSuccess("Silakan selesaikan pembayaran E-Wallet Anda.");
        } else if (purchaseRes.ok && purchaseData.status) {
          setSuccess(purchaseData.message || "Pembelian sukses/masuk antrean!");
          setOtpRequested(false);
          setOtp("");
          setPhone("");
        } else {
          throw new Error(purchaseData.message || "Gagal melakukan pembelian.");
        }
      } else {
        const res = await fetch("/api/purchase/non-otp", {
          method: "POST",
          credentials: 'include',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packageId: selectedPkg.package_code, phone, paymentMethod, ewallet_number: ewalletNumber }),
        });
        const data = await res.json();
        
        if (res.status === 202 && data.payment_data) {
          setPaymentInfo(data.payment_data);
          setSuccess("Silakan selesaikan pembayaran E-Wallet Anda.");
        } else if (res.ok && data.status) {
          setSuccess(data.message || "Pembelian sukses/masuk antrean!");
          setPhone("");
        } else {
          throw new Error(data.message || "Gagal melakukan pembelian.");
        }
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan.");
    } finally {
      setPurchasing(false);
    }
  };

  const requiresOtp = selectedPkg && 
    selectedPkg.category !== 'non-otp' && 
    !selectedPkg.name.toLowerCase().includes('non-otp') &&
    !selectedPkg.name.toLowerCase().includes('no otp') &&
    !selectedPkg.name.toLowerCase().includes('non otp');

  useEffect(() => {
    if (!requiresOtp) {
      setPaymentMethod("balance");
      setEwalletNumber("");
    }
  }, [requiresOtp]);

  // STEP 1: Select Provider
  if (!selectedProvider) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto pb-12">
        <div className="flex flex-col gap-1 mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Beli Paket</h1>
          <p className="text-sm text-ink-muted">Pilih provider layanan yang ingin Anda beli.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {providers.map(prov => (
            <Card 
              key={prov.id} 
              glass 
              className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all flex flex-col items-center justify-center p-6 gap-4 relative overflow-hidden group"
              onClick={() => setSelectedProvider(prov.id)}
            >
              {prov.badge && (
                <div className="absolute top-2 right-2 bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wider shadow-sm">
                  {prov.badge}
                </div>
              )}
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center border border-hairline shadow-sm overflow-hidden group-hover:scale-105 transition-transform p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={prov.logo} alt={prov.name} referrerPolicy="no-referrer" className="w-full h-full object-contain" />
              </div>
              <p className="font-bold text-ink text-sm text-center">{prov.name}</p>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // STEP 2 & 3: Show Packages List OR Purchase Form
  const activeProvider = providers.find(p => p.id === selectedProvider);

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-4">
        <button 
          onClick={() => {
            if (selectedPkg) {
              setSelectedPkg(null);
            } else {
              setSelectedProvider(null);
              setSearch("");
            }
          }}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-canvas border border-hairline hover:bg-parchment transition-colors"
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            {selectedPkg ? "Detail Pembelian" : `Paket ${activeProvider?.name}`}
          </h1>
          <p className="text-sm text-ink-muted">
            {selectedPkg ? "Selesaikan pembayaran Anda." : "Pilih paket yang sesuai."}
          </p>
        </div>
      </div>

      {!selectedPkg ? (
        <div className="space-y-4">
          <Input 
            placeholder={`Cari paket ${activeProvider?.name}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          
          {loading ? (
            <p className="text-sm text-ink-muted text-center py-8">Memuat paket...</p>
          ) : filteredPackages.length === 0 ? (
            <div className="text-center py-12 bg-canvas border border-hairline rounded-2xl">
              <p className="text-sm text-ink-muted">Tidak ada paket yang sesuai atau tersedia untuk provider ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredPackages.map(p => (
                <Card 
                  key={p.package_code}
                  className="cursor-pointer hover:border-primary transition-colors flex flex-col justify-between p-5"
                  onClick={() => setSelectedPkg(p)}
                >
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">{p.category === 'non-otp' ? 'NON-OTP' : 'OTP'}</p>
                    <h3 className="font-bold text-ink text-sm leading-tight line-clamp-2">{p.name}</h3>
                  </div>
                  <div className="flex justify-between items-end mt-auto pt-4 border-t border-hairline">
                    <span className="text-xs text-ink-muted">{p.package_code}</span>
                    <span className="text-lg font-black text-primary">Rp {getPrice(p).toLocaleString('id-ID')}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Card glass className="p-6 space-y-6">
          {error && <div className="p-3 bg-red-500/10 text-red-500 rounded-xl text-sm">{error}</div>}
          {success && <div className="p-3 bg-green-500/10 text-green-700 rounded-xl text-sm">{success}</div>}

          <div className="bg-parchment/50 border border-hairline p-4 rounded-2xl space-y-2">
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Paket Terpilih</p>
                <h4 className="font-bold text-ink">{selectedPkg.name}</h4>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={activeProvider?.logo} alt={activeProvider?.name} referrerPolicy="no-referrer" className="w-10 h-10 object-contain rounded-full bg-white p-1 border border-hairline shadow-sm" />
            </div>
            <div className="text-sm text-ink-muted mt-2" dangerouslySetInnerHTML={{ __html: selectedPkg.description || "Tidak ada deskripsi khusus." }} />
            
            {requiresOtp && (
              <div className="mt-3 text-xs font-medium bg-amber-100 text-amber-800 px-2 py-1 rounded inline-block">
                ⚠️ Paket ini memerlukan Verifikasi OTP
              </div>
            )}

            <div className="flex justify-between items-center pt-3 mt-3 border-t border-hairline">
              <span className="text-sm font-medium">Total Harga</span>
              <span className="text-xl font-black text-primary">Rp {getPrice(selectedPkg).toLocaleString('id-ID')}</span>
            </div>
          </div>

          {paymentInfo ? (
            <div className="space-y-4 text-center p-4 border border-primary/20 bg-canvas rounded-2xl">
              <h3 className="font-bold text-lg text-ink">Selesaikan Pembayaran</h3>
              <p className="text-sm text-ink-muted mb-4">Metode: {paymentMethod}</p>
              
              {paymentInfo.is_qris && paymentInfo.qris_data?.qr_code && (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm border border-hairline inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={paymentInfo.qris_data.qr_code} alt="QRIS" className="w-48 h-48 object-contain" />
                  </div>
                  <p className="text-xs text-ink-muted">Scan QRIS ini menggunakan aplikasi E-Wallet Anda.</p>
                </div>
              )}
              
              {paymentInfo.have_deeplink && paymentInfo.deeplink_url && (
                <a href={paymentInfo.deeplink_url} target="_blank" rel="noreferrer" className="block w-full text-center bg-primary text-white font-bold py-3 rounded-full hover:opacity-90 transition-opacity">
                  Buka Aplikasi Pembayaran
                </a>
              )}
              
              <Button variant="outline" className="w-full mt-4" onClick={() => { setPaymentInfo(null); setSelectedPkg(null); }}>Kembali ke Daftar Paket</Button>
            </div>
          ) : (
            <form onSubmit={handlePurchase} className="space-y-4">
              <Input 
                label="Nomor Tujuan" 
                type="tel" 
                placeholder="Contoh: 081234567890" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required 
                disabled={otpRequested}
              />

              {requiresOtp && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-ink/80">Metode Pembayaran</label>
                    <select 
                      className="w-full h-12 rounded-full border border-hairline px-4 bg-canvas text-ink text-sm outline-none focus:border-primary/50 transition-colors"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      disabled={otpRequested}
                    >
                      <option value="balance">Saldo Ry-ITSolutions</option>
                      <option value="QRIS">QRIS</option>
                      <option value="OVO">OVO</option>
                      <option value="DANA">DANA</option>
                      <option value="SHOPEEPAY">ShopeePay</option>
                      <option value="LINKAJA">LinkAja</option>
                    </select>
                  </div>

                  {paymentMethod === 'OVO' && (
                    <Input 
                      label="Nomor OVO" 
                      type="tel" 
                      placeholder="Contoh: 081234567890" 
                      value={ewalletNumber}
                      onChange={(e) => setEwalletNumber(e.target.value)}
                      required 
                      disabled={otpRequested}
                    />
                  )}
                </>
              )}

              {requiresOtp && !otpRequested ? (
                <div className="space-y-3">
                  {savedTokens.length > 0 && (
                    <div className="bg-parchment/80 p-3.5 rounded-xl border border-hairline space-y-2">
                      <p className="text-xs font-semibold text-ink-muted">Gunakan Sesi OTP Aktif Anda:</p>
                      <div className="flex gap-2 flex-wrap">
                        {savedTokens.map(t => (
                          <button
                            key={t.session_id}
                            type="button"
                            onClick={() => handleUseSavedSession(t.msisdn, t.token)}
                            className="bg-white hover:bg-parchment border border-hairline text-ink text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                            disabled={purchasing}
                          >
                            📱 {t.msisdn}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button className="w-full h-12" type="button" onClick={handleRequestOtp} isLoading={purchasing}>Kirim OTP Baru</Button>
                </div>
              ) : requiresOtp && otpRequested ? (
                <div className="space-y-4 p-4 border border-primary/20 bg-primary/5 rounded-2xl">
                  {!accessToken && (
                    <Input 
                      label="Kode OTP" 
                      type="text" 
                      placeholder="Masukkan OTP dari SMS" 
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required 
                    />
                  )}
                  <Button className="w-full h-12" type="submit" isLoading={purchasing}>
                    {accessToken ? "Beli Sekarang (Menggunakan Sesi)" : "Verifikasi & Beli"}
                  </Button>
                  {accessToken && (
                    <button type="button" className="text-xs text-rose-500 underline font-medium block mx-auto pt-1" onClick={() => { setAccessToken(""); setOtpRequested(false); setPhone(""); }}>
                      Batalkan & Gunakan Nomor Lain
                    </button>
                  )}
                </div>
              ) : (
                <Button className="w-full h-12" type="submit" isLoading={purchasing}>Beli Sekarang</Button>
              )}
            </form>
          )}
        </Card>
      )}
    </div>
  );
}
