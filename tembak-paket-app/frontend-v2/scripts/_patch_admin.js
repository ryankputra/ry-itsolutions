const fs = require('fs');
let c = fs.readFileSync('src/app/(main)/admin/page.tsx', 'utf8');

// 1. Tambahkan state kalau belum ada
if (!c.includes('const [showCeirgoTopUp, setShowCeirgoTopUp] = useState(false);')) {
  c = c.replace(
    'const [providerBalances, setProviderBalances] = useState({ kmsp: null, ceirgo: null });',
    \`const [providerBalances, setProviderBalances] = useState({ kmsp: null, ceirgo: null });
  
  // Ceirgo Admin Top Up State
  const [showCeirgoTopUp, setShowCeirgoTopUp] = useState(false);
  const [ceirgoProviders, setCeirgoProviders] = useState<any[]>([]);
  const [ceirgoTopUpAmount, setCeirgoTopUpAmount] = useState("");
  const [ceirgoProviderCode, setCeirgoProviderCode] = useState("");
  const [ceirgoTopUpLoading, setCeirgoTopUpLoading] = useState(false);
  const [ceirgoPaymentData, setCeirgoPaymentData] = useState<any>(null);\`
  );
}

// 2. Tambahkan fetch providers kalau belum ada
if (!c.includes('api/admin/ceirgo-deposit-providers')) {
  c = c.replace(
    /fetch\('\/api\/admin\/ceirgo-balance', \{ credentials: 'include' \}\)\s*\.then\(r => r\.json\(\)\)\s*\.then\(d => setProviderBalances\(prev => \(\{ \.\.\.prev, ceirgo: d\.data\?\.balance \}\)\)\)\s*\.catch\(\(\) => \{\}\);/m,
    \`fetch('/api/admin/ceirgo-balance', { credentials: 'include' })
          .then(r => r.json())
          .then(d => setProviderBalances(prev => ({ ...prev, ceirgo: d.data?.balance })))
          .catch(() => {});
          
        fetch('/api/admin/ceirgo-deposit-providers', { credentials: 'include' })
          .then(r => r.json())
          .then(d => { if (d.status) setCeirgoProviders(d.data); })
          .catch(() => {});\`
  );
}

// 3. Tambahkan tombol "Isi Saldo" di bagian Saldo Ceirgo
if (!c.includes('onClick={() => setShowCeirgoTopUp(true)}')) {
  c = c.replace(
    /<div className="flex justify-between items-center p-3 bg-canvas border border-hairline rounded-xl">\s*<div className="font-bold text-sm">📱 Ceirgo\.id<\/div>\s*<div className="font-black text-primary">Rp \{providerBalances\.ceirgo !== null \? providerBalances\.ceirgo\?\.toLocaleString\('id-ID'\) : '\.\.\.'\}<\/div>\s*<\/div>/m,
    \`<div className="flex flex-col sm:flex-row justify-between sm:items-center p-3 bg-canvas border border-hairline rounded-xl gap-3">
                  <div>
                    <div className="font-bold text-sm flex items-center gap-1.5">📱 Ceirgo.id</div>
                    <div className="font-black text-primary">Rp {providerBalances.ceirgo !== null ? providerBalances.ceirgo?.toLocaleString('id-ID') : '...'}</div>
                  </div>
                  <Button size="sm" onClick={() => setShowCeirgoTopUp(true)}>Isi Saldo</Button>
                </div>\`
  );
}

// 4. Tambahkan JSX Modal sebelum tutup form return
if (!c.includes('{/* Modal Top Up Ceirgo */}')) {
  const modalHTML = \`
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCeirgoTopUpAmount(e.target.value)}
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
                    if (!ceirgoTopUpAmount || !ceirgoProviderCode) return alert('Isi nominal dan pilih provider');
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
                    } catch (e) { alert('Error membuat deposit'); }
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
}\`;
  c = c.replace(/    <\/div>\s*<\/div>\s*\);\s*\}\s*$/m, modalHTML);
}

fs.writeFileSync('src/app/(main)/admin/page.tsx', c);
console.log('UI patch applied');
