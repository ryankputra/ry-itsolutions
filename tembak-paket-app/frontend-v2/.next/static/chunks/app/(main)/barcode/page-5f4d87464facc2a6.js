(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[6372],{7313:(e,a,r)=>{"use strict";r.d(a,{p:()=>n});var t=r(95155);function n({label:e,error:a,icon:r,className:l="",...d}){return(0,t.jsxs)("div",{className:"w-full flex flex-col gap-1.5",children:[e&&(0,t.jsx)("label",{className:"text-sm font-medium text-ink/80",children:e}),(0,t.jsxs)("div",{className:"relative",children:[r&&(0,t.jsx)("div",{className:"absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted",children:r}),(0,t.jsx)("input",{className:`w-full h-11 rounded-full border border-black/5 bg-canvas px-5 text-[17px] text-ink transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50 ${r?"pl-10":""} ${a?"border-red-500 focus:border-red-500 focus:ring-red-500":""} ${l}`,...d})]}),a&&(0,t.jsx)("span",{className:"text-[14px] text-red-500 mt-1",children:a})]})}r(12115)},21988:(e,a,r)=>{"use strict";r.r(a),r.d(a,{default:()=>g});var t=r(95155),n=r(12115),l=r(44037),d=r(7313),o=r(54327),p=r(61822),i=r(88637),s=r(73321),c=r(96987),x=r(35019),m=r(27529),b=r(37390);let h={create_barcode:"Create Barcode Universal",create_barcode_samsung:"Barcode Samsung",create_barcode_redmi:"Barcode Redmi",create_barcode_ios26:"Barcode iOS 26"},u=[{code:"create_barcode",name:"Create Barcode Universal",modalPrice:5e3},{code:"create_barcode_samsung",name:"Barcode Samsung",modalPrice:4997},{code:"create_barcode_redmi",name:"Barcode Redmi",modalPrice:5e3},{code:"create_barcode_ios26",name:"Barcode iOS 26",modalPrice:5e3}];function g(){let e,{user:a,updateBalance:r}=(0,p.n)(),g=(0,s.useRouter)(),[f,y]=(0,n.useState)({}),[P,v]=(0,n.useState)([]),[j,A]=(0,n.useState)(!0),[k,N]=(0,n.useState)(""),[w,S]=(0,n.useState)(""),[M,G]=(0,n.useState)("dark"),[B,I]=(0,n.useState)("create_barcode"),[_,C]=(0,n.useState)(!1),[L,W]=(0,n.useState)(""),[D,$]=(0,n.useState)(!1),[V,X]=(0,n.useState)(null),[R,E]=(0,n.useState)("balance"),[O,U]=(0,n.useState)(!1);(0,n.useEffect)(()=>{Promise.all([fetch("/api/ceirgo-pricing").then(e=>(0,m.oi)(e)).catch(()=>null),fetch("/api/ceirgo-services").then(e=>(0,m.oi)(e)).catch(()=>({status:!1})),fetch("/api/admin/ceirgo-display-settings",{credentials:"include"}).then(e=>(0,m.oi)(e)).catch(()=>({status:!1}))]).then(([e,a,r])=>{e?.status&&e.data&&y(e.data);let t=Array.isArray(a?.data?.page?.items)?a.data.page.items:Array.isArray(a?.data)?a.data:[],n=[...u];t.forEach(e=>{if(!e?.code||!/barcode|create/i.test(`${e.code} ${e.name}`))return;let a=n.find(a=>a.code===e.code);a?(a.name=e.name||h[e.code]||a.name,a.modalPrice=Number(e.modalPrice??e.unit_price??a.modalPrice)):n.push({code:e.code,name:e.name||h[e.code]||e.code,modalPrice:Number(e.modalPrice??e.unit_price??5e3)})});let l=new Set(r?.status&&r.data&&Array.isArray(r.data.barcode)?r.data.barcode:n.map(e=>e.code)),d=n.filter(e=>l.has(e.code));v(d),d.length>0&&!l.has(B)&&I(d[0].code)}).finally(()=>A(!1))},[]);let z=e=>{let a=P.find(a=>a.code===e);for(let a of[e,`ceirgo_price_${e}`,e.startsWith("ceirgo_price_")?e.replace(/^ceirgo_price_/,""):null,e.startsWith("price_")?e.replace(/^price_/,""):null].filter(Boolean)){let e=Number(f?.[a]);if(Number.isFinite(e)&&e>0)return e}let r=Number(a?.modalPrice);return Number.isFinite(r)&&r>0?r:5e3},T=async e=>{W(""),C(!0);try{let a=new FormData;a.append("service_type","barcode"),a.append("service_code",B),a.append("price_key",B),a.append("imei",k),w&&a.append("imei2",w),a.append("theme",M),a.append("duration",h[B]||B),a.append("payment_method",e||R);let t=await fetch("/api/order/barcode",{method:"POST",credentials:"include",body:a}),n=await t.json();if(t.ok&&n.status){"number"==typeof n.data?.newBalance?r(n.data.newBalance):"number"==typeof n.newBalance&&r(n.newBalance);let e=n.data?.adminNote||("string"==typeof n.data?.result?n.data.result:"Barcode berhasil digenerate."),a=n.data?.result?.qr_url||n.data?.result?.image_url||n.data?.adminImage||null;X({note:e,image:a}),$(!0)}else i.default.fire({title:"Gagal Membuat Barcode",text:n.message||"Gagal membuat barcode.",icon:"error"}),W(n.message||"Gagal membuat barcode.")}catch(e){i.default.fire({title:"Error Jaringan",text:"Kesalahan jaringan saat memproses pesanan.",icon:"error"}),W("Kesalahan jaringan.")}finally{C(!1)}},F=async e=>{if(e.preventDefault(),!B)return W("Pilih varian barcode terlebih dahulu.");if(!k||k.length<15)return W("IMEI Utama tidak valid (minimal 15 digit angka).");if(w&&w.length<15)return W("IMEI Kedua tidak valid (minimal 15 digit angka).");let r=z(B);"qris"===R||a&&a.balance<r?U(!0):(await i.default.fire({title:"Konfirmasi Cetak Barcode",text:`Anda akan membuat ${h[B]||B} untuk IMEI ${k}. Biaya: Rp ${r.toLocaleString("id-ID")}. Lanjutkan?`,icon:"question",showCancelButton:!0,confirmButtonColor:"#9333ea",cancelButtonColor:"#6b7280",confirmButtonText:"Ya, Generate Barcode!",cancelButtonText:"Batal"})).isConfirmed&&T("balance")};return(0,t.jsxs)("div",{className:"space-y-5 max-w-2xl mx-auto pb-12",children:[(0,t.jsxs)("div",{className:"flex p-1 bg-parchment rounded-2xl border border-hairline max-w-sm mx-auto shadow-2xs",children:[(0,t.jsxs)("button",{type:"button",onClick:()=>g.push("/cek-ceir"),className:"flex-1 py-2 px-3 text-xs font-semibold text-ink-muted hover:text-ink rounded-xl flex items-center justify-center gap-1.5 transition-all",children:[(0,t.jsx)("span",{children:"\uD83D\uDD0D"})," Diagnostik IMEI"]}),(0,t.jsxs)("button",{type:"button",className:"flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-purple-600 text-white shadow-xs flex items-center justify-center gap-1.5 transition-all",children:[(0,t.jsx)("span",{children:"\uD83C\uDFF7️"})," Generator Barcode"]})]}),(0,t.jsxs)("div",{className:"flex items-center gap-4 mb-2",children:[(0,t.jsx)("button",{onClick:()=>g.push("/dashboard"),className:"w-10 h-10 flex items-center justify-center rounded-full bg-canvas border border-hairline hover:bg-parchment transition-colors",children:(0,t.jsx)("svg",{width:"20",height:"20",fill:"none",stroke:"currentColor",children:(0,t.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M15 19l-7-7 7-7"})})}),(0,t.jsxs)("div",{children:[(0,t.jsxs)("h1",{className:"text-xl sm:text-2xl font-bold tracking-tight text-ink flex items-center gap-2",children:[(0,t.jsx)("span",{className:"p-1.5 rounded-xl bg-purple-500/10 text-purple-600",children:"\uD83C\uDFF7️"}),"Generator Barcode Device"]}),(0,t.jsx)("p",{className:"text-xs sm:text-sm text-ink-muted",children:"Cetak label barcode IMEI resmi untuk Samsung, Redmi, iOS 26, dan universal."})]})]}),(0,t.jsxs)(l.Z,{glass:!0,className:"p-5 sm:p-6 space-y-6",children:[L&&(0,t.jsxs)("div",{className:"p-3.5 bg-rose-50 text-rose-700 rounded-xl text-xs border border-rose-200 flex items-center gap-2",children:[(0,t.jsx)("svg",{className:"w-4 h-4 text-rose-600 shrink-0",fill:"none",stroke:"currentColor",strokeWidth:2,viewBox:"0 0 24 24",children:(0,t.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"})}),L]}),(0,t.jsxs)("form",{onSubmit:F,className:"space-y-6",children:[(0,t.jsxs)("div",{className:"space-y-2.5",children:[(0,t.jsxs)("label",{className:"text-xs font-bold text-ink flex items-center gap-2",children:[(0,t.jsx)("span",{className:"w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[11px] font-bold",children:"1"}),"Pilih Varian Barcode Device"]}),(0,t.jsx)("div",{className:"grid grid-cols-2 gap-2.5",children:j?(0,t.jsx)("p",{className:"text-sm text-ink-muted col-span-full py-4 text-center",children:"Memuat varian barcode..."}):0===P.length?(0,t.jsx)("div",{className:"col-span-full p-4 text-center text-sm text-ink-muted border rounded-xl border-dashed",children:"Belum ada varian Barcode Device yang diaktifkan oleh Admin."}):P.map(e=>{let a=B===e.code,r=z(e.code);return(0,t.jsxs)("button",{type:"button",onClick:()=>I(e.code),className:`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between gap-2 ${a?"border-purple-600 bg-purple-500/5 shadow-md shadow-purple-500/10 ring-1 ring-purple-600":"border-hairline bg-canvas hover:bg-parchment hover:border-purple-400/40"}`,children:[(0,t.jsxs)("div",{children:[(0,t.jsx)("div",{className:"font-bold text-xs text-ink line-clamp-1",children:e.name}),(0,t.jsx)("div",{className:"text-[10px] text-purple-600 font-mono mt-0.5",children:e.code})]}),(0,t.jsxs)("div",{className:`text-xs font-bold px-2 py-0.5 rounded-lg self-start ${a?"bg-purple-600 text-white":"bg-parchment text-purple-700"}`,children:["Rp ",r.toLocaleString("id-ID")]})]},e.code)})})]}),(0,t.jsxs)("div",{className:"pt-4 border-t border-hairline space-y-4",children:[(0,t.jsxs)("label",{className:"text-xs font-bold text-ink flex items-center gap-2 mb-1",children:[(0,t.jsx)("span",{className:"w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[11px] font-bold",children:"2"}),"Detail IMEI & Tema Barcode"]}),(0,t.jsxs)("div",{children:[(0,t.jsx)(d.p,{label:"Nomor IMEI Utama (SIM 1)",placeholder:"Masukkan 15 digit IMEI",value:k,onChange:e=>N(e.target.value.replace(/\D/g,"")),maxLength:15,required:!0}),k.length>=8&&(e=(0,x.rM)(k),(0,t.jsxs)("div",{className:`mt-2 flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${e.isValidLength&&e.isValidLuhn?"bg-emerald-50/60 border-emerald-200 text-emerald-900":e.isValidLength&&!e.isValidLuhn?"bg-amber-50/60 border-amber-200 text-amber-900":"bg-canvas border-hairline text-ink-muted"}`,children:[(0,t.jsxs)("div",{className:"flex items-center gap-2.5",children:[(0,t.jsx)("div",{className:"w-7 h-7 rounded-lg bg-white border border-hairline flex items-center justify-center text-slate-700 shadow-xs shrink-0",children:(0,t.jsx)("svg",{className:"w-4 h-4",fill:"none",stroke:"currentColor",strokeWidth:2,viewBox:"0 0 24 24",children:(0,t.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"})})}),(0,t.jsxs)("div",{children:[(0,t.jsx)("p",{className:"font-bold text-ink text-xs",children:e.brand?`${e.brand} ${e.model}`:"Perangkat Terdeteksi"}),(0,t.jsxs)("p",{className:"text-[10px] opacity-75 font-mono",children:[e.clean," (",e.clean.length,"/15 digit)"]})]})]}),(0,t.jsx)("div",{children:e.isValidLength&&e.isValidLuhn?(0,t.jsx)("span",{className:"inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md text-[11px]",children:"Luhn Valid"}):e.isValidLength&&!e.isValidLuhn?(0,t.jsx)("span",{className:"inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md text-[11px]",children:"Periksa Digit"}):(0,t.jsxs)("span",{className:"text-ink-muted text-[11px]",children:[15-e.clean.length," digit lagi"]})})]}))]}),(0,t.jsx)("div",{children:(0,t.jsx)(d.p,{label:"Nomor IMEI Kedua (SIM 2) - Opsional",placeholder:"Contoh: 358921098765433 (Dual SIM)",value:w,onChange:e=>S(e.target.value.replace(/\D/g,"")),maxLength:15})}),(0,t.jsxs)("div",{className:"p-3.5 bg-canvas border border-hairline rounded-xl space-y-2",children:[(0,t.jsx)("label",{className:"text-xs font-bold text-ink",children:"Pilihan Tema Barcode"}),(0,t.jsxs)("div",{className:"grid grid-cols-2 gap-3",children:[(0,t.jsxs)("label",{className:`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${"dark"===M?"border-purple-600 bg-purple-500/10 text-purple-700 font-bold":"border-hairline hover:bg-parchment"}`,children:[(0,t.jsx)("input",{type:"radio",name:"barcode_theme",value:"dark",checked:"dark"===M,onChange:()=>G("dark"),className:"w-4 h-4 text-purple-600"}),(0,t.jsx)("span",{className:"text-xs",children:"Dark Mode (Hitam)"})]}),(0,t.jsxs)("label",{className:`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${"light"===M?"border-purple-600 bg-purple-500/10 text-purple-700 font-bold":"border-hairline hover:bg-parchment"}`,children:[(0,t.jsx)("input",{type:"radio",name:"barcode_theme",value:"light",checked:"light"===M,onChange:()=>G("light"),className:"w-4 h-4 text-purple-600"}),(0,t.jsx)("span",{className:"text-xs",children:"Light Mode (Putih)"})]})]})]})]}),(0,t.jsxs)("div",{className:"space-y-2 pt-4 border-t border-hairline",children:[(0,t.jsxs)("label",{className:"text-xs font-bold text-ink flex items-center justify-between",children:[(0,t.jsxs)("span",{className:"flex items-center gap-2",children:[(0,t.jsx)("span",{className:"w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[11px] font-bold",children:"4"}),"Pilih Metode Pembayaran"]}),(0,t.jsx)("span",{className:"text-[10px] text-ink-muted",children:"Langsung diproses otomatis 24 Jam"})]}),(0,t.jsxs)("div",{className:"grid grid-cols-1 sm:grid-cols-2 gap-3",children:[(0,t.jsxs)("button",{type:"button",onClick:()=>E("balance"),className:`p-3.5 rounded-2xl border text-left transition-all ${"balance"===R?"border-purple-600 bg-purple-500/10 ring-1 ring-purple-600 font-bold shadow-xs text-purple-900 dark:text-purple-300":"border-hairline bg-canvas hover:bg-parchment"}`,children:[(0,t.jsxs)("div",{className:"flex items-center justify-between",children:[(0,t.jsxs)("span",{className:"text-xs font-bold flex items-center gap-1.5",children:[(0,t.jsx)("span",{children:"\uD83D\uDCB3"})," Saldo Akun"]}),(0,t.jsx)("input",{type:"radio",checked:"balance"===R,onChange:()=>{},className:"text-purple-600"})]}),(0,t.jsxs)("div",{className:"text-xs text-purple-600 font-mono font-bold mt-1.5",children:["Rp ",Number(a?.balance||0).toLocaleString("id-ID")]}),(0,t.jsx)("p",{className:"text-[10px] text-ink-muted mt-0.5",children:"Potong langsung dari dompet akun"})]}),(0,t.jsxs)("button",{type:"button",onClick:()=>E("qris"),className:`p-3.5 rounded-2xl border text-left transition-all ${"qris"===R?"border-purple-600 bg-purple-500/10 ring-1 ring-purple-600 font-bold shadow-xs text-purple-900 dark:text-purple-300":"border-hairline bg-canvas hover:bg-parchment"}`,children:[(0,t.jsxs)("div",{className:"flex items-center justify-between",children:[(0,t.jsxs)("span",{className:"text-xs font-bold flex items-center gap-1.5",children:[(0,t.jsx)("span",{children:"⚡"})," Direct QRIS Instan"]}),(0,t.jsx)("input",{type:"radio",checked:"qris"===R,onChange:()=>{},className:"text-purple-600"})]}),(0,t.jsx)("div",{className:"text-xs text-emerald-600 font-bold mt-1.5",children:"Scan & Langsung Selesai"}),(0,t.jsx)("p",{className:"text-[10px] text-ink-muted mt-0.5",children:"BCA, GoPay, OVO, Dana, ShopeePay & Semua Bank"})]})]})]}),(0,t.jsx)(o.$,{className:"w-full h-12 text-sm font-bold shadow-md shadow-purple-500/20 mt-4 bg-purple-600 hover:bg-purple-700 text-white",type:"submit",isLoading:_,children:_?"Membuat Barcode...":"qris"===R||a&&a.balance<z(B)?`Bayar via QRIS Direct (Rp ${z(B).toLocaleString("id-ID")}) ➔`:`Generate Barcode (Rp ${z(B).toLocaleString("id-ID")}) ➔`})]})]}),V&&(0,t.jsxs)(l.Z,{className:"mt-4 p-5 border border-purple-500/30 bg-purple-500/5 animate-fade-in space-y-3",children:[(0,t.jsxs)("h3",{className:"font-bold text-sm text-purple-700 flex items-center gap-2",children:[(0,t.jsx)("span",{children:"\uD83C\uDF89"})," Hasil Generator Barcode:"]}),(0,t.jsx)("p",{className:"text-xs text-ink font-medium leading-relaxed bg-canvas p-3 rounded-xl border border-hairline whitespace-pre-line",children:V.note}),V.image&&(0,t.jsx)("img",{src:V.image,alt:"Barcode Hasil",className:"mt-3 rounded-xl border border-hairline w-full max-w-sm object-contain bg-white p-2 shadow-sm mx-auto"})]}),(0,t.jsx)(c.D,{isOpen:D,onClose:()=>{$(!1),g.push("/history")},amount:z(B),title:"Barcode Berhasil Dibuat",statusText:"Barcode IMEI Anda berhasil digenerate dan tersimpan di riwayat transaksi.",recipientLabel:"IMEI Perangkat",recipientValue:k}),(0,t.jsx)(b.A,{isOpen:O,onClose:()=>U(!1),amount:z(B),orderTitle:`Generate ${h[B]||B} (${k})`,onSuccess:()=>{U(!1),T("qris")}})]})}},35019:(e,a,r)=>{"use strict";r.d(a,{rM:()=>n,t6:()=>l});let t={0x217f0d8:{brand:"Apple",model:"iPhone 16",type:"apple"},0x217f13c:{brand:"Apple",model:"iPhone 16 Plus",type:"apple"},0x217f1a0:{brand:"Apple",model:"iPhone 16 Pro",type:"apple"},0x217f204:{brand:"Apple",model:"iPhone 16 Pro Max",type:"apple"},0x21cf150:{brand:"Apple",model:"iPhone 16",type:"apple"},0x21cf1b4:{brand:"Apple",model:"iPhone 16 Plus",type:"apple"},0x21cf218:{brand:"Apple",model:"iPhone 16 Pro",type:"apple"},0x21cf27c:{brand:"Apple",model:"iPhone 16 Pro Max",type:"apple"},0x21bacb5:{brand:"Apple",model:"iPhone 15",type:"apple"},0x21bad19:{brand:"Apple",model:"iPhone 15 Plus",type:"apple"},0x21bad7d:{brand:"Apple",model:"iPhone 15 Pro",type:"apple"},0x21bade1:{brand:"Apple",model:"iPhone 15 Pro Max",type:"apple"},0x219d29b:{brand:"Apple",model:"iPhone 15 Pro Max",type:"apple"},0x219d237:{brand:"Apple",model:"iPhone 15 Pro",type:"apple"},0x219d1d3:{brand:"Apple",model:"iPhone 15 Plus",type:"apple"},0x219d16f:{brand:"Apple",model:"iPhone 15",type:"apple"},0x221daf9:{brand:"Apple",model:"iPhone 15",type:"apple"},0x221db5d:{brand:"Apple",model:"iPhone 15 Plus",type:"apple"},0x221dbc1:{brand:"Apple",model:"iPhone 15 Pro",type:"apple"},0x221dc25:{brand:"Apple",model:"iPhone 15 Pro Max",type:"apple"},0x223de5d:{brand:"Apple",model:"iPhone 15",type:"apple"},0x223dec1:{brand:"Apple",model:"iPhone 15 Plus",type:"apple"},0x223df25:{brand:"Apple",model:"iPhone 15 Pro",type:"apple"},0x223df89:{brand:"Apple",model:"iPhone 15 Pro Max",type:"apple"},0x21c228d:{brand:"Apple",model:"iPhone 14 Pro Max",type:"apple"},0x21c2229:{brand:"Apple",model:"iPhone 14 Pro",type:"apple"},0x21c21c5:{brand:"Apple",model:"iPhone 14 Plus",type:"apple"},0x21c2161:{brand:"Apple",model:"iPhone 14",type:"apple"},0x21a1e6b:{brand:"Apple",model:"iPhone 14 Pro Max",type:"apple"},0x21a1e07:{brand:"Apple",model:"iPhone 14 Pro",type:"apple"},0x21a1da3:{brand:"Apple",model:"iPhone 14",type:"apple"},0x21a1d3f:{brand:"Apple",model:"iPhone 14 Plus",type:"apple"},0x217577b:{brand:"Apple",model:"iPhone 14",type:"apple"},0x21757df:{brand:"Apple",model:"iPhone 14 Plus",type:"apple"},0x2175843:{brand:"Apple",model:"iPhone 14 Pro",type:"apple"},0x21758a7:{brand:"Apple",model:"iPhone 14 Pro Max",type:"apple"},0x21ccbb0:{brand:"Apple",model:"iPhone 13 Pro Max",type:"apple"},0x21ccb4c:{brand:"Apple",model:"iPhone 13 Pro",type:"apple"},0x21ccae8:{brand:"Apple",model:"iPhone 13",type:"apple"},0x21cca84:{brand:"Apple",model:"iPhone 13 Mini",type:"apple"},0x2167f55:{brand:"Apple",model:"iPhone 13 Pro Max",type:"apple"},0x2167ef1:{brand:"Apple",model:"iPhone 13 Pro",type:"apple"},0x2167e8d:{brand:"Apple",model:"iPhone 13",type:"apple"},0x2167e29:{brand:"Apple",model:"iPhone 13 Mini",type:"apple"},0x21d991d:{brand:"Apple",model:"iPhone 13",type:"apple"},0x21d9981:{brand:"Apple",model:"iPhone 13 Mini",type:"apple"},0x21d99e5:{brand:"Apple",model:"iPhone 13 Pro",type:"apple"},0x21d9a49:{brand:"Apple",model:"iPhone 13 Pro Max",type:"apple"},0x21724bc:{brand:"Apple",model:"iPhone 13 Mini",type:"apple"},0x2172520:{brand:"Apple",model:"iPhone 13",type:"apple"},0x2172584:{brand:"Apple",model:"iPhone 13 Pro",type:"apple"},0x21725e8:{brand:"Apple",model:"iPhone 13 Pro Max",type:"apple"},0x220b687:{brand:"Apple",model:"iPhone 12 Pro Max",type:"apple"},0x220b623:{brand:"Apple",model:"iPhone 12 Pro",type:"apple"},0x220b5bf:{brand:"Apple",model:"iPhone 12",type:"apple"},0x220b55b:{brand:"Apple",model:"iPhone 12 Mini",type:"apple"},0x21ab507:{brand:"Apple",model:"iPhone 12 Pro Max",type:"apple"},0x21ab4a3:{brand:"Apple",model:"iPhone 12 Pro",type:"apple"},0x21ab43f:{brand:"Apple",model:"iPhone 12",type:"apple"},0x21ab3db:{brand:"Apple",model:"iPhone 12 Mini",type:"apple"},0x21cc397:{brand:"Apple",model:"iPhone 12 Mini",type:"apple"},0x21cc3fb:{brand:"Apple",model:"iPhone 12",type:"apple"},0x21cc45f:{brand:"Apple",model:"iPhone 12 Pro",type:"apple"},0x21cc4c3:{brand:"Apple",model:"iPhone 12 Pro Max",type:"apple"},0x21c1d2e:{brand:"Apple",model:"iPhone 11 (A2221 / A2111)",type:"apple"},0x21c1d92:{brand:"Apple",model:"iPhone 11 Pro (A2215)",type:"apple"},0x21c1df6:{brand:"Apple",model:"iPhone 11 Pro Max (A2218)",type:"apple"},0x21c04f6:{brand:"Apple",model:"iPhone 11",type:"apple"},0x21c055a:{brand:"Apple",model:"iPhone 11 Pro",type:"apple"},0x21c05be:{brand:"Apple",model:"iPhone 11 Pro Max",type:"apple"},0x2200f56:{brand:"Apple",model:"iPhone 11",type:"apple"},0x2200fba:{brand:"Apple",model:"iPhone 11 Pro",type:"apple"},0x220101e:{brand:"Apple",model:"iPhone 11 Pro Max",type:"apple"},0x21a65ba:{brand:"Apple",model:"iPhone 11",type:"apple"},0x21a661e:{brand:"Apple",model:"iPhone 11 Pro",type:"apple"},0x21a6682:{brand:"Apple",model:"iPhone 11 Pro Max",type:"apple"},0x2201852:{brand:"Apple",model:"iPhone 11",type:"apple"},0x22018b6:{brand:"Apple",model:"iPhone 11 Pro",type:"apple"},0x220191a:{brand:"Apple",model:"iPhone 11 Pro Max",type:"apple"},0x2212c7d:{brand:"Apple",model:"iPhone XS Max",type:"apple"},0x2212c19:{brand:"Apple",model:"iPhone XS",type:"apple"},0x2212bb5:{brand:"Apple",model:"iPhone XR",type:"apple"},0x21a9df9:{brand:"Apple",model:"iPhone XR",type:"apple"},0x21a9e5d:{brand:"Apple",model:"iPhone XS",type:"apple"},0x21a9ec1:{brand:"Apple",model:"iPhone XS Max",type:"apple"},0x22062ec:{brand:"Apple",model:"iPhone X",type:"apple"},0x2206288:{brand:"Apple",model:"iPhone 8 Plus",type:"apple"},0x2206224:{brand:"Apple",model:"iPhone 8",type:"apple"},0x2246838:{brand:"Apple",model:"iPhone 7",type:"apple"},0x224689c:{brand:"Apple",model:"iPhone 7 Plus",type:"apple"},0x2236d72:{brand:"Apple",model:"iPhone SE (2020)",type:"apple"},0x2236dd7:{brand:"Apple",model:"iPhone SE (2022)",type:"apple"},0x21a9f27:{brand:"Samsung",model:"Galaxy S25 Ultra",type:"samsung"},0x21a6def:{brand:"Samsung",model:"Galaxy S24 Ultra",type:"samsung"},0x21a6d8b:{brand:"Samsung",model:"Galaxy S24+",type:"samsung"},0x21a6d27:{brand:"Samsung",model:"Galaxy S24",type:"samsung"},0x218b86f:{brand:"Samsung",model:"Galaxy S23 Ultra",type:"samsung"},0x218b80b:{brand:"Samsung",model:"Galaxy S23+",type:"samsung"},0x218b7a7:{brand:"Samsung",model:"Galaxy S23",type:"samsung"},0x2251ea6:{brand:"Samsung",model:"Galaxy S22 Ultra",type:"samsung"},0x2251e42:{brand:"Samsung",model:"Galaxy S22+",type:"samsung"},0x2251dde:{brand:"Samsung",model:"Galaxy S22",type:"samsung"},0x21fd843:{brand:"Samsung",model:"Galaxy S21 Ultra",type:"samsung"},0x21fd7df:{brand:"Samsung",model:"Galaxy S21+",type:"samsung"},0x21fd77b:{brand:"Samsung",model:"Galaxy S21",type:"samsung"},0x222e582:{brand:"Samsung",model:"Galaxy S20 Ultra",type:"samsung"},0x222e51e:{brand:"Samsung",model:"Galaxy S20+",type:"samsung"},0x222e4ba:{brand:"Samsung",model:"Galaxy S20",type:"samsung"},0x2230c92:{brand:"Samsung",model:"Galaxy Note 20 Ultra",type:"samsung"},0x219cef3:{brand:"Samsung",model:"Galaxy Z Fold6",type:"samsung"},0x219ce8f:{brand:"Samsung",model:"Galaxy Z Flip6",type:"samsung"},0x21d5d7e:{brand:"Samsung",model:"Galaxy Z Fold5",type:"samsung"},0x21d5d1a:{brand:"Samsung",model:"Galaxy Z Flip5",type:"samsung"},0x21b138e:{brand:"Samsung",model:"Galaxy Z Fold4",type:"samsung"},0x21b132a:{brand:"Samsung",model:"Galaxy Z Flip4",type:"samsung"},0x21ace6b:{brand:"Samsung",model:"Galaxy A55 5G",type:"samsung"},0x218f9ab:{brand:"Samsung",model:"Galaxy A54 5G",type:"samsung"},0x218d29b:{brand:"Samsung",model:"Galaxy A34 5G",type:"samsung"},0x21db36f:{brand:"Google",model:"Pixel 9 Pro XL",type:"android"},0x21db30b:{brand:"Google",model:"Pixel 9 Pro",type:"android"},0x21db2a7:{brand:"Google",model:"Pixel 9",type:"android"},0x21c2c6b:{brand:"Google",model:"Pixel 8 Pro",type:"android"},0x21c2c07:{brand:"Google",model:"Pixel 8",type:"android"},0x221745e:{brand:"Google",model:"Pixel 7 Pro",type:"android"},0x22173fa:{brand:"Google",model:"Pixel 7",type:"android"},0x223491d:{brand:"Google",model:"Pixel 6 Pro",type:"android"},0x22348b9:{brand:"Google",model:"Pixel 6",type:"android"},0x520ea44:{brand:"Xiaomi",model:"Xiaomi 14 / 14 Ultra",type:"android"},0x520eaa8:{brand:"Xiaomi",model:"Xiaomi 14 Pro",type:"android"},0x52c3161:{brand:"Xiaomi",model:"Xiaomi 13 / 13 Pro",type:"android"},0x52f3ea1:{brand:"Xiaomi",model:"Xiaomi 12 / 12 Pro",type:"android"},0x5223c8d:{brand:"Poco",model:"Poco F6 / F6 Pro",type:"android"},0x522157d:{brand:"Poco",model:"Poco F5 / X6 Pro",type:"android"},0x523c32d:{brand:"Redmi",model:"Redmi Note 13 Pro+",type:"android"},0x5239c1d:{brand:"Redmi",model:"Redmi Note 12 Pro",type:"android"},0x5257655:{brand:"Oppo",model:"Find X7 / X6 Ultra",type:"android"},0x5259d65:{brand:"Oppo",model:"Reno 12 / 11 Pro",type:"android"},0x526fcf5:{brand:"Vivo",model:"Vivo X100 / X90 Pro",type:"android"},0x5272405:{brand:"Vivo",model:"Vivo V30 / V29 5G",type:"android"},0x528aaa5:{brand:"Realme",model:"Realme GT 6 / GT 5 Pro",type:"android"},0x52a5855:{brand:"Infinix",model:"Infinix GT 20 Pro / Zero 30",type:"android"},0x21d667b:{brand:"Asus",model:"ROG Phone 8 / 8 Pro",type:"android"}};function n(e){var a;let r=e.replace(/\D/g,""),n=15===r.length,l=!!n&&function(e){let a=e.replace(/\D/g,"");if(15!==a.length)return!1;let r=0;for(let e=0;e<15;e++){let t=parseInt(a[e],10);e%2==1&&(t*=2)>9&&(t-=9),r+=t}return r%10==0}(r);if(r.length<8)return{raw:e,clean:r,isValidLength:!1,isValidLuhn:!1,brand:"",model:"",type:"generic",isApple:!1};let d=t[r.substring(0,8)];if(d)return{raw:e,clean:r,isValidLength:n,isValidLuhn:l,brand:d.brand,model:d.model,type:d.type||"generic",isApple:"Apple"===d.brand};let o=(a=r.substring(0,6)).startsWith("35")&&(a.endsWith("10")||a.endsWith("11")||a.endsWith("12")||a.endsWith("13")||a.endsWith("14")||a.endsWith("15")||a.endsWith("16")||a.endsWith("17")||a.endsWith("21")||a.endsWith("09")||a.endsWith("08"))?a.endsWith("16")||a.endsWith("17")?{brand:"Apple",model:"iPhone 15 / 16 Series (iOS Device)",type:"apple"}:a.endsWith("14")||a.endsWith("15")||a.endsWith("55")||a.endsWith("85")?{brand:"Apple",model:"iPhone 13 / 14 Series (iOS Device)",type:"apple"}:a.endsWith("11")||a.endsWith("21")?{brand:"Apple",model:"iPhone 12 / 13 Series (iOS Device)",type:"apple"}:a.endsWith("10")?{brand:"Apple",model:"iPhone 11 Series (A2221 / A2215 / A2218)",type:"apple"}:a.endsWith("09")||a.endsWith("08")?{brand:"Apple",model:"iPhone X / XR / XS / 8 Series",type:"apple"}:{brand:"Apple",model:"iPhone / iOS Smartphone",type:"apple"}:a.startsWith("35")||a.startsWith("01")||a.startsWith("99")?{brand:"Apple / Global",model:"iOS / Smartphone",type:"apple"}:a.startsWith("86")?{brand:"Xiaomi / Oppo / Vivo / Android",model:"Android Smartphone",type:"android"}:{brand:"Smartphone",model:"Mobile Device",type:"generic"};return{raw:e,clean:r,isValidLength:n,isValidLuhn:l,brand:o.brand,model:o.model,type:o.type,isApple:o.brand.includes("Apple")}}function l(e){return e.split(/[\n,;]+/).map(e=>e.trim()).filter(e=>e.length>0).map(e=>n(e))}},44037:(e,a,r)=>{"use strict";r.d(a,{Z:()=>n});var t=r(95155);function n({children:e,className:a="",glass:r,...l}){return(0,t.jsx)("div",{className:`${r?"rounded-[18px] border border-hairline bg-parchment/80 backdrop-blur-md p-6":"rounded-[18px] border border-hairline bg-canvas p-6"} ${a}`,...l,children:e})}r(12115)},54327:(e,a,r)=>{"use strict";r.d(a,{$:()=>n});var t=r(95155);function n({children:e,variant:a="primary",size:r="md",isLoading:l,className:d="",disabled:o,...p}){return(0,t.jsxs)("button",{className:`inline-flex items-center justify-center font-normal transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus disabled:pointer-events-none disabled:opacity-50 active:scale-[0.95] ${{primary:"bg-primary text-white hover:bg-primary-focus rounded-full shadow-none",secondary:"bg-transparent text-primary border border-primary rounded-full hover:bg-primary/5",outline:"border border-hairline bg-transparent hover:bg-parchment text-ink rounded-lg",ghost:"hover:bg-parchment text-ink rounded-lg",danger:"bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg",pearl:"bg-surface-pearl text-ink-muted border-[3px] border-divider rounded-[11px] hover:bg-divider"}[a]} ${{sm:"h-9 px-4 text-xs",md:"h-11 px-6 text-sm",lg:"h-14 px-8 text-base"}[r]} ${d}`,disabled:l||o,...p,children:[l?(0,t.jsxs)("svg",{className:"animate-spin -ml-1 mr-2 h-4 w-4 text-current",xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",children:[(0,t.jsx)("circle",{className:"opacity-25",cx:"12",cy:"12",r:"10",stroke:"currentColor",strokeWidth:"4"}),(0,t.jsx)("path",{className:"opacity-75",fill:"currentColor",d:"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"})]}):null,e]})}r(12115)},84814:(e,a,r)=>{Promise.resolve().then(r.bind(r,21988))},96987:(e,a,r)=>{"use strict";r.d(a,{D:()=>d});var t=r(95155),n=r(12115),l=r(44788);function d({isOpen:e,onClose:a,amount:r,title:o="Pembayaran Berhasil",statusText:p="Pesanan Anda telah berhasil dibuat!",recipientLabel:i="Tujuan",recipientValue:s,methodValue:c="Saldo Ry-ITSolutions"}){return((0,n.useEffect)(()=>(e?((0,l.BS)(),document.body.style.overflow="hidden"):document.body.style.overflow="",()=>{document.body.style.overflow=""}),[e]),e)?(0,t.jsxs)("div",{className:"fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4",children:[(0,t.jsx)("style",{dangerouslySetInnerHTML:{__html:`
        .app-screen {
          position: relative;
          width: 100%;
          max-width: 380px;
          height: 600px;
          background: #18181b;
          border-radius: 36px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1);
        }

        .green-bg {
          position: absolute;
          width: 30px;
          height: 30px;
          background: linear-gradient(135deg, #00B919, #008A11);
          border-radius: 50%;
          z-index: 1;
          transform: scale(0);
          animation: expandBg 0.7s cubic-bezier(0.85, 0, 0.15, 1) 0.1s forwards;
        }

        .confetti-container {
          position: absolute;
          width: 100%;
          height: 100%;
          z-index: 2;
          pointer-events: none;
        }

        .particle {
          position: absolute;
          top: 35%;
          left: 50%;
          width: 8px;
          height: 8px;
          border-radius: 2px;
          opacity: 0;
          animation: popConfetti 0.6s cubic-bezier(0.25, 1, 0.5, 1) 0.7s forwards;
        }

        .p1 { background: #ffffff; --x: -120px; --y: -100px; --r: 45deg; }
        .p2 { background: #ffd166; --x: 130px; --y: -80px; --r: -60deg; }
        .p3 { background: #06d6a0; --x: -140px; --y: 40px; --r: 120deg; }
        .p4 { background: #118ab2; --x: 120px; --y: 60px; --r: -90deg; }
        .p5 { background: #ef476f; --x: -80px; --y: -140px; --r: 30deg; }
        .p6 { background: #ffffff; --x: 90px; --y: -130px; --r: -45deg; }

        .success-card {
          position: relative;
          z-index: 10;
          text-align: center;
          color: #ffffff;
          padding: 0 28px;
          width: 100%;
        }

        .icon-wrapper {
          width: 84px;
          height: 84px;
          margin: 0 auto 20px auto;
          position: relative;
          transform: scale(0);
          animation: popIcon 0.6s cubic-bezier(0.34, 1.75, 0.64, 1) 0.5s forwards;
        }

        .checkmark-svg {
          width: 84px;
          height: 84px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
        }

        .checkmark-check {
          stroke: #00AA13;
          stroke-width: 4.5;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 50;
          stroke-dashoffset: 50;
          animation: drawCheck 0.4s ease-out 0.8s forwards;
        }

        .badge-success-pop {
          display: inline-block;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-bottom: 12px;
          opacity: 0;
          animation: fadeInUp 0.4s ease 0.9s forwards;
        }

        .amount-pop {
          font-size: 34px;
          font-weight: 900;
          letter-spacing: -1px;
          margin-bottom: 6px;
          opacity: 0;
          animation: fadeInUp 0.4s ease 1.0s forwards;
        }

        .status-text-pop {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.85);
          margin-bottom: 24px;
          opacity: 0;
          animation: fadeInUp 0.4s ease 1.1s forwards;
        }

        .info-box-pop {
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          padding: 16px 20px;
          margin-bottom: 24px;
          text-align: left;
          opacity: 0;
          animation: fadeInUp 0.4s ease 1.2s forwards;
        }

        .info-row-pop {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          margin-bottom: 8px;
          color: #ffffff;
        }

        .info-row-pop:last-child {
          margin-bottom: 0;
        }

        .info-label-pop { color: rgba(255, 255, 255, 0.7); }
        .info-value-pop { 
          font-weight: 600; 
          word-break: break-all; 
          max-width: 65%; 
          text-align: right; 
        }

        .btn-done-pop {
          width: 100%;
          background: #ffffff;
          color: #00AA13;
          border: none;
          padding: 16px;
          border-radius: 24px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          opacity: 0;
          animation: fadeInUp 0.4s ease 1.3s forwards;
          transition: all 0.2s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .btn-done-pop:active {
          transform: scale(0.95);
          background: rgba(255, 255, 255, 0.9);
        }

        @keyframes expandBg {
          0% { transform: scale(0); }
          100% { transform: scale(40); }
        }

        @keyframes popIcon {
          0% { transform: scale(0); }
          100% { transform: scale(1); }
        }

        @keyframes drawCheck {
          to { stroke-dashoffset: 0; }
        }

        @keyframes popConfetti {
          0% {
            opacity: 1;
            transform: translate(0, 0) rotate(0deg) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(var(--x), var(--y)) rotate(var(--r)) scale(0.3);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}}),(0,t.jsxs)("div",{className:"app-screen",children:[(0,t.jsx)("div",{className:"green-bg"}),(0,t.jsxs)("div",{className:"confetti-container",children:[(0,t.jsx)("div",{className:"particle p1"}),(0,t.jsx)("div",{className:"particle p2"}),(0,t.jsx)("div",{className:"particle p3"}),(0,t.jsx)("div",{className:"particle p4"}),(0,t.jsx)("div",{className:"particle p5"}),(0,t.jsx)("div",{className:"particle p6"})]}),(0,t.jsxs)("div",{className:"success-card",children:[(0,t.jsx)("div",{className:"icon-wrapper",children:(0,t.jsx)("svg",{className:"checkmark-svg",viewBox:"0 0 52 52",children:(0,t.jsx)("path",{className:"checkmark-check",fill:"none",d:"M14 27 l7 7 l17 -17"})})}),(0,t.jsx)("div",{className:"badge-success-pop",children:o}),(0,t.jsxs)("div",{className:"amount-pop",children:["Rp ",r.toLocaleString("id-ID")]}),(0,t.jsx)("p",{className:"status-text-pop",children:p}),(0,t.jsxs)("div",{className:"info-box-pop text-white",children:[(0,t.jsxs)("div",{className:"info-row-pop",children:[(0,t.jsx)("span",{className:"info-label-pop",children:i}),(0,t.jsx)("span",{className:"info-value-pop",children:s})]}),(0,t.jsxs)("div",{className:"info-row-pop",children:[(0,t.jsx)("span",{className:"info-label-pop",children:"Metode"}),(0,t.jsx)("span",{className:"info-value-pop",children:c})]})]}),(0,t.jsx)("button",{className:"btn-done-pop",onClick:a,children:"Mantap, Selesai!"})]})]})]}):null}}},e=>{e.O(0,[8320,1822,8934,8441,8928,7358],()=>e(e.s=84814)),_N_E=e.O()}]);