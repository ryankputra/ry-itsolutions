const fs = require('fs');
let c = fs.readFileSync('src/app/(main)/admin/page.tsx', 'utf8');

const regexCard = /<Card glass className="p-6 space-y-4">\s*<div className="flex justify-between items-center flex-wrap gap-4">\s*<h2 className="text-xl font-bold">Antrean Pesanan Manual<\/h2>[\s\S]*?<\/Card>/m;

const newCard = \`<Card glass className="p-6 space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <h2 className="text-xl font-bold">Antrean Pesanan Manual</h2>
              <label className="flex items-center gap-2 cursor-pointer bg-parchment px-3 py-1.5 rounded-full border border-hairline hover:border-primary/50 transition-colors">
                <input 
                  type="checkbox" 
                  checked={showOnlyPendingManual} 
                  onChange={(e) => setShowOnlyPendingManual(e.target.checked)} 
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm font-semibold text-ink">Hanya Tampilkan Pending</span>
              </label>
            </div>
            {loadingManual ? (
              <p>Memuat...</p>
            ) : manualOrders.length === 0 ? (
              <p className="text-ink-muted">Tidak ada pesanan.</p>
            ) : (
              <div className="space-y-4">
                {manualOrders.filter(o => !showOnlyPendingManual || o.status === 'pending' || o.status === 'processing').length === 0 ? (
                  <p className="text-ink-muted text-sm italic">Tidak ada pesanan yang sedang diproses.</p>
                ) : (
                  manualOrders.filter(o => !showOnlyPendingManual || o.status === 'pending' || o.status === 'processing').map(o => (
                    <div key={o.id} className="p-4 border border-hairline rounded-lg bg-canvas space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold">{o.packageName}</p>
                          <p className="text-sm">User: {o.userName} • IMEI: <b>{o.imei}</b></p>
                          {o.speed_option && (
                            <p className="text-xs font-semibold text-primary mt-1">
                              Kecepatan: <span className="capitalize">{o.speed_option === 'fast' ? '⚡ Fast' : o.speed_option === 'semi' ? '🚀 Semi Fast' : '🐌 Slow'}</span>
                            </p>
                          )}
                          <p className="text-xs text-ink-muted mt-1">{new Date(o.createdAt).toLocaleString()}</p>
                        </div>
                        <span className={\`px-2 py-1 text-xs font-bold rounded uppercase \${o.status === 'success' ? 'bg-green-100 text-green-700' : o.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}\`}>{o.status}</span>
                      </div>

                      <div className="flex gap-4 flex-wrap">
                        {o.user_image && (
                          <div>
                            <p className="text-xs font-semibold mb-1">Bukti SS *#06#:</p>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={o.user_image} alt="Bukti User" className="h-32 object-contain rounded border border-hairline bg-white p-1" />
                          </div>
                        )}
                        {o.user_image_ceir && (
                          <div>
                            <p className="text-xs font-semibold mb-1">Bukti SS Cek CEIR:</p>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={o.user_image_ceir} alt="Bukti CEIR User" className="h-32 object-contain rounded border border-hairline bg-white p-1" />
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
                              if (manualActionData?.file) formData.append("image", manualActionData.file);
                              
                              try {
                                const res = await fetch(\`/api/admin/manual-orders/\${o.id}\`, { method: 'PUT', credentials: 'include', body: formData });
                                if(res.ok) {
                                  alert("Tersimpan!");
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
                  ))
                )}
              </div>
            )}
          </Card>\`;

c = c.replace(regexCard, newCard);
fs.writeFileSync('src/app/(main)/admin/page.tsx', c);
console.log('Fixed syntax error in admin page');
