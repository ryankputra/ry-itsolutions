(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[563],{1019:(e,a,r)=>{"use strict";r.r(a),r.d(a,{default:()=>b});var t=r(5155),n=r(2115),i=r(4037),l=r(7313),o=r(4327),d=r(1822),p=r(8637),s=r(3321),m=r(6987),c=r(5019);let x={cek_history_imei:"Cek Riwayat Database CEIR",cek_imei_beacukai:"Cek IMEI Bea Cukai",cek_icloud:"Cek iCloud & FMI (Clean / Lost)",cek_fmi:"Cek iCloud & FMI (Clean / Lost)",cek_simlock:"Cek Carrier Simlock (Operator Asal)",cek_carrier:"Cek Carrier Simlock (Operator Asal)",cek_validity:"Cek Masa Aktif Sinyal",cek_digi:"Cek DIGI",cek_sf:"Cek Smartfren",cek_imei:"Cek Status IMEI"};function b(){let e,{user:a,updateBalance:r}=(0,d.n)(),b=(0,s.useRouter)(),[h,u]=(0,n.useState)({}),[g,y]=(0,n.useState)({}),[f,P]=(0,n.useState)([]),[k,A]=(0,n.useState)(!0),[v,j]=(0,n.useState)(""),[w,S]=(0,n.useState)(""),[N,C]=(0,n.useState)("dark"),[M,I]=(0,n.useState)("cek_history_imei"),[G,B]=(0,n.useState)(!1),[L,_]=(0,n.useState)(""),[W,E]=(0,n.useState)(""),[R,V]=(0,n.useState)(!1),[X,D]=(0,n.useState)(null);(0,n.useEffect)(()=>{Promise.all([fetch("/api/manual-services-pricing").then(e=>e.json()),fetch("/api/ceirgo-pricing").then(e=>e.json()),fetch("/api/ceirgo-services").then(e=>e.json()).catch(()=>({status:!1})),fetch("/api/admin/ceirgo-display-settings",{credentials:"include"}).then(e=>e.json()).catch(()=>({status:!1}))]).then(([e,a,r,t])=>{var n;e.status&&u(e.data),a.status&&y(a.data);let i=r.status?(Array.isArray(n=r.data)?n:Array.isArray(n?.data)?n.data:Array.isArray(n?.data?.page?.items)?n.data.page.items:[]).map(e=>({code:e?.code,name:e?.name||x[e?.code]||e?.code,modalPrice:Number(e?.modalPrice??e?.price??e?.unit_price??0)||0})).filter(e=>e.code&&!/barcode|create|dummy|test|sample|demo/i.test(`${e.code} ${e.name}`)):[];[{code:"cek_history_imei",name:"Cek Riwayat Database CEIR",modalPrice:5100},{code:"cek_imei_beacukai",name:"Cek IMEI Bea Cukai",modalPrice:1500}].forEach(e=>{i.some(a=>a.code===e.code)||i.push(e)});let l=t?.status&&t.data&&Object.prototype.hasOwnProperty.call(t.data,"cekCeir")?new Set(Array.isArray(t.data.cekCeir)?t.data.cekCeir:[]):null;P(l?i.filter(e=>l.has(e.code)):i)}).finally(()=>A(!1))},[]);let O=e=>{let a=f.find(a=>a.code===e);for(let a of[e,`ceirgo_price_${e}`,e.startsWith("ceirgo_price_")?e.replace(/^ceirgo_price_/,""):null,e.startsWith("price_")?e.replace(/^price_/,""):null].filter(Boolean)){let e=Number(g?.[a]);if(Number.isFinite(e)&&e>0)return e}let r=Number(a?.modalPrice);return Number.isFinite(r)&&r>0?r:0},U=async e=>{if(e.preventDefault(),!v||v.length<15)return _("IMEI Utama tidak valid (minimal 15 digit).");let t=M.includes("barcode");if(t&&w&&w.length<15)return _("IMEI Kedua tidak valid (minimal 15 digit).");let n=O(M);if(a&&a.balance<n)return p.default.fire({title:"Saldo Tidak Mencukupi",text:"Saldo Anda kurang untuk melakukan pesanan ini. Silakan isi saldo terlebih dahulu.",icon:"warning",showCancelButton:!0,confirmButtonText:"Top Up Sekarang",cancelButtonText:"Batal"}).then(e=>{e.isConfirmed&&b.push("/topup")}),_("Saldo tidak mencukupi.");_(""),B(!0);try{let e=new FormData;e.append("service_type","ceir"),e.append("imei",v),t&&w&&e.append("imei2",w),t&&e.append("theme",N);let a="Cek Layanan CEIR",n=f.find(e=>e.code===M);if(n?a=n.name:"register"===M?a="Cek Beacukai":"history"===M&&(a="Cek History CEIR"),e.append("duration",a),e.append("price_key","register"===M?"price_ceir_register":"history"===M?"price_ceir_history":M),!(await p.default.fire({title:"Ready buat checkout? \uD83D\uDCB8",text:"Udah fix nih mau lanjut bayar? Saldo lo bakal kepotong ya.",icon:"question",showCancelButton:!0,confirmButtonColor:"#3085d6",cancelButtonColor:"#d33",confirmButtonText:"Gass!",cancelButtonText:"Ntar Dulu"})).isConfirmed)return void B(!1);let i=await fetch("/api/order/ceir",{method:"POST",credentials:"include",body:e}),l=await i.json();i.ok&&l.status?("number"==typeof l.newBalance&&r(l.newBalance),(l.data?.adminNote||l.data?.adminImage)&&D({note:l.data.adminNote,image:l.data.adminImage}),V(!0)):(p.default.fire({title:"Gagal Membuat Pesanan",text:l.message||"Gagal membuat pesanan.",icon:"error"}),_(l.message||"Gagal membuat pesanan."))}catch(e){p.default.fire({title:"Error Jaringan",text:"Kesalahan jaringan saat memproses pesanan.",icon:"error"}),_("Kesalahan jaringan.")}finally{B(!1)}},T=M.includes("barcode");return(0,t.jsxs)("div",{className:"space-y-6 max-w-2xl mx-auto pb-12",children:[(0,t.jsxs)("div",{className:"flex items-center gap-4 mb-4",children:[(0,t.jsx)("button",{onClick:()=>b.push("/dashboard"),className:"w-10 h-10 flex items-center justify-center rounded-full bg-canvas border border-hairline hover:bg-parchment transition-colors",children:(0,t.jsx)("svg",{width:"20",height:"20",fill:"none",stroke:"currentColor",children:(0,t.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M15 19l-7-7 7-7"})})}),(0,t.jsxs)("div",{children:[(0,t.jsxs)("h1",{className:"text-2xl font-bold tracking-tight text-ink flex items-center gap-2",children:[(0,t.jsx)("svg",{className:"w-6 h-6 text-primary",fill:"none",stroke:"currentColor",strokeWidth:2,viewBox:"0 0 24 24",children:(0,t.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"})}),"Cek CEIR & Status HP"]}),(0,t.jsx)("p",{className:"text-sm text-ink-muted",children:"Pemeriksaan database CEIR Kemenperin, Bea Cukai, Status iCloud & FMI (Clean/Lost), dan Simlock Operator."})]})]}),(0,t.jsxs)(i.Z,{glass:!0,className:"p-6 space-y-6",children:[L&&(0,t.jsxs)("div",{className:"p-3.5 bg-rose-50 text-rose-700 rounded-xl text-xs border border-rose-200 flex items-center gap-2",children:[(0,t.jsx)("svg",{className:"w-4 h-4 text-rose-600 shrink-0",fill:"none",stroke:"currentColor",strokeWidth:2,viewBox:"0 0 24 24",children:(0,t.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"})}),L]}),W&&(0,t.jsxs)("div",{className:"p-3.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs border border-emerald-200 flex items-center gap-2",children:[(0,t.jsx)("svg",{className:"w-4 h-4 text-emerald-600 shrink-0",fill:"none",stroke:"currentColor",strokeWidth:2,viewBox:"0 0 24 24",children:(0,t.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M4.5 12.75l6 6 9-13.5"})}),W]}),(0,t.jsxs)("form",{onSubmit:U,className:"space-y-6",children:[(0,t.jsxs)("div",{className:"space-y-2",children:[(0,t.jsxs)("label",{className:"text-sm font-bold text-ink flex items-center gap-2",children:[(0,t.jsx)("span",{className:"w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs",children:"1"}),"Pilih Jenis Layanan"]}),(0,t.jsx)("div",{className:"grid grid-cols-2 sm:grid-cols-3 gap-3",children:(()=>{if(k)return(0,t.jsx)("p",{className:"text-sm text-ink-muted col-span-2",children:"Memuat layanan..."});let e=[];return(f.map(e=>e.code),f.forEach(a=>{var r,t;let n=O(a.code);n>0&&(r=a.code,t=a.name||x[a.code]||a.code.replace(/_/g," ").toUpperCase(),n>0&&!e.some(e=>e.id===r)&&e.push({id:r,label:t,price:n}))}),0===e.length)?(0,t.jsx)("p",{className:"text-sm text-ink-muted col-span-2",children:"Belum ada layanan yang diaktifkan Admin."}):e.map(e=>{let a=M===e.id;return(0,t.jsxs)("button",{type:"button",onClick:()=>I(e.id),className:`p-4 rounded-xl border text-center transition-all duration-200 flex flex-col items-center justify-center gap-1 ${a?"border-primary bg-primary/5 shadow-md shadow-primary/10 text-primary ring-1 ring-primary scale-[1.02]":"border-hairline bg-canvas hover:bg-parchment hover:border-primary/30"}`,children:[(0,t.jsx)("div",{className:"font-bold text-sm leading-tight px-1",children:e.label}),(0,t.jsxs)("div",{className:`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${a?"bg-primary/10 text-primary":"bg-parchment text-ink-muted"}`,children:["Rp ",e.price.toLocaleString("id-ID")]})]},e.id)})})()})]}),(0,t.jsxs)("div",{className:"pt-4 border-t border-hairline space-y-4",children:[(0,t.jsxs)("label",{className:"text-sm font-bold text-ink flex items-center gap-2 mb-2",children:[(0,t.jsx)("span",{className:"w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs",children:"2"}),"Detail Perangkat"]}),(0,t.jsxs)("div",{children:[(0,t.jsx)(l.p,{label:T?"IMEI Utama (SIM 1)":"Nomor IMEI",placeholder:"Masukkan 15 digit IMEI",value:v,onChange:e=>j(e.target.value.replace(/\D/g,"")),maxLength:15,required:!0}),v.length>=8&&(e=(0,c.rM)(v),(0,t.jsxs)("div",{className:`mt-2 flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${e.isValidLength&&e.isValidLuhn?"bg-emerald-50/60 border-emerald-200 text-emerald-900":e.isValidLength&&!e.isValidLuhn?"bg-amber-50/60 border-amber-200 text-amber-900":"bg-canvas border-hairline text-ink-muted"}`,children:[(0,t.jsxs)("div",{className:"flex items-center gap-2.5",children:[(0,t.jsx)("div",{className:"w-7 h-7 rounded-lg bg-white border border-hairline flex items-center justify-center text-slate-700 shadow-xs shrink-0",children:(0,t.jsx)("svg",{className:"w-4 h-4",fill:"none",stroke:"currentColor",strokeWidth:2,viewBox:"0 0 24 24",children:(0,t.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"})})}),(0,t.jsxs)("div",{children:[(0,t.jsx)("p",{className:"font-bold text-ink",children:e.brand?`${e.brand} ${e.model}`:"Perangkat Terdeteksi"}),(0,t.jsxs)("p",{className:"text-[11px] opacity-75 font-mono",children:[e.clean," (",e.clean.length,"/15 digit)"]})]})]}),(0,t.jsx)("div",{children:e.isValidLength&&e.isValidLuhn?(0,t.jsx)("span",{className:"inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md",children:"Luhn Valid"}):e.isValidLength&&!e.isValidLuhn?(0,t.jsx)("span",{className:"inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md",children:"Cek Ulang Digit"}):(0,t.jsxs)("span",{className:"text-ink-muted",children:[15-e.clean.length," digit lagi"]})})]}))]}),T&&(0,t.jsxs)("div",{className:"p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-4 mt-2",children:[(0,t.jsx)(l.p,{label:"IMEI Kedua (SIM 2) - Opsional",placeholder:"Masukkan 15 digit IMEI SIM 2",value:w,onChange:e=>S(e.target.value),maxLength:15}),(0,t.jsxs)("div",{className:"space-y-1.5",children:[(0,t.jsx)("label",{className:"text-sm font-medium text-ink/80",children:"Tema Barcode"}),(0,t.jsxs)("div",{className:"flex gap-4",children:[(0,t.jsxs)("label",{className:"flex items-center gap-2 cursor-pointer",children:[(0,t.jsx)("input",{type:"radio",name:"theme",value:"dark",checked:"dark"===N,onChange:()=>C("dark"),className:"w-4 h-4 text-primary"}),(0,t.jsx)("span",{className:"text-sm font-medium",children:"Dark Mode (Hitam)"})]}),(0,t.jsxs)("label",{className:"flex items-center gap-2 cursor-pointer",children:[(0,t.jsx)("input",{type:"radio",name:"theme",value:"light",checked:"light"===N,onChange:()=>C("light"),className:"w-4 h-4 text-primary"}),(0,t.jsx)("span",{className:"text-sm font-medium",children:"Light Mode (Putih)"})]})]})]})]})]}),(0,t.jsxs)(o.$,{className:"w-full h-14 text-lg font-bold shadow-md shadow-primary/20 mt-4",type:"submit",isLoading:G,children:["Bayar Rp ",O(M).toLocaleString("id-ID")]})]})]}),X&&(0,t.jsxs)(i.Z,{className:"mt-6 p-6 border-2 border-primary/30 bg-primary/5 animate-fade-in",children:[(0,t.jsx)("h3",{className:"font-bold text-lg mb-2 text-primary",children:"\uD83C\uDF89 Hasil Pengecekan:"}),(0,t.jsx)("p",{className:"text-ink font-medium leading-relaxed",children:X.note}),X.image&&(0,t.jsx)("img",{src:X.image,alt:"Barcode/Hasil CEIR",className:"mt-4 rounded-xl border border-hairline w-full max-w-sm object-contain bg-white p-2 shadow-sm"})]}),(0,t.jsx)(m.D,{isOpen:R,onClose:()=>{V(!1),X||b.push("/history")},amount:O(M),title:"Pembayaran Berhasil",statusText:"Cek CEIR otomatis berhasil!",recipientLabel:"IMEI Target",recipientValue:v})]})}},2044:(e,a,r)=>{Promise.resolve().then(r.bind(r,1019))},3321:(e,a,r)=>{"use strict";var t=r(4645);r.o(t,"redirect")&&r.d(a,{redirect:function(){return t.redirect}}),r.o(t,"usePathname")&&r.d(a,{usePathname:function(){return t.usePathname}}),r.o(t,"useRouter")&&r.d(a,{useRouter:function(){return t.useRouter}}),r.o(t,"useSearchParams")&&r.d(a,{useSearchParams:function(){return t.useSearchParams}})},4037:(e,a,r)=>{"use strict";r.d(a,{Z:()=>n});var t=r(5155);function n({children:e,className:a="",glass:r,...i}){return(0,t.jsx)("div",{className:`${r?"rounded-[18px] border border-hairline bg-parchment/80 backdrop-blur-md p-6":"rounded-[18px] border border-hairline bg-canvas p-6"} ${a}`,...i,children:e})}r(2115)},4327:(e,a,r)=>{"use strict";r.d(a,{$:()=>n});var t=r(5155);function n({children:e,variant:a="primary",size:r="md",isLoading:i,className:l="",disabled:o,...d}){return(0,t.jsxs)("button",{className:`inline-flex items-center justify-center font-normal transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus disabled:pointer-events-none disabled:opacity-50 active:scale-[0.95] ${{primary:"bg-primary text-white hover:bg-primary-focus rounded-full shadow-none",secondary:"bg-transparent text-primary border border-primary rounded-full hover:bg-primary/5",outline:"border border-hairline bg-transparent hover:bg-parchment text-ink rounded-lg",ghost:"hover:bg-parchment text-ink rounded-lg",danger:"bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg",pearl:"bg-surface-pearl text-ink-muted border-[3px] border-divider rounded-[11px] hover:bg-divider"}[a]} ${{sm:"h-9 px-4 text-xs",md:"h-11 px-6 text-sm",lg:"h-14 px-8 text-base"}[r]} ${l}`,disabled:i||o,...d,children:[i?(0,t.jsxs)("svg",{className:"animate-spin -ml-1 mr-2 h-4 w-4 text-current",xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",children:[(0,t.jsx)("circle",{className:"opacity-25",cx:"12",cy:"12",r:"10",stroke:"currentColor",strokeWidth:"4"}),(0,t.jsx)("path",{className:"opacity-75",fill:"currentColor",d:"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"})]}):null,e]})}r(2115)},5019:(e,a,r)=>{"use strict";r.d(a,{rM:()=>n,t6:()=>i});let t={0x217f0d8:{brand:"Apple",model:"iPhone 16",type:"apple"},0x217f13c:{brand:"Apple",model:"iPhone 16 Plus",type:"apple"},0x217f1a0:{brand:"Apple",model:"iPhone 16 Pro",type:"apple"},0x217f204:{brand:"Apple",model:"iPhone 16 Pro Max",type:"apple"},0x21cf150:{brand:"Apple",model:"iPhone 16",type:"apple"},0x21cf1b4:{brand:"Apple",model:"iPhone 16 Plus",type:"apple"},0x21cf218:{brand:"Apple",model:"iPhone 16 Pro",type:"apple"},0x21cf27c:{brand:"Apple",model:"iPhone 16 Pro Max",type:"apple"},0x21bacb5:{brand:"Apple",model:"iPhone 15",type:"apple"},0x21bad19:{brand:"Apple",model:"iPhone 15 Plus",type:"apple"},0x21bad7d:{brand:"Apple",model:"iPhone 15 Pro",type:"apple"},0x21bade1:{brand:"Apple",model:"iPhone 15 Pro Max",type:"apple"},0x219d29b:{brand:"Apple",model:"iPhone 15 Pro Max",type:"apple"},0x219d237:{brand:"Apple",model:"iPhone 15 Pro",type:"apple"},0x219d1d3:{brand:"Apple",model:"iPhone 15 Plus",type:"apple"},0x219d16f:{brand:"Apple",model:"iPhone 15",type:"apple"},0x221daf9:{brand:"Apple",model:"iPhone 15",type:"apple"},0x221db5d:{brand:"Apple",model:"iPhone 15 Plus",type:"apple"},0x221dbc1:{brand:"Apple",model:"iPhone 15 Pro",type:"apple"},0x221dc25:{brand:"Apple",model:"iPhone 15 Pro Max",type:"apple"},0x223de5d:{brand:"Apple",model:"iPhone 15",type:"apple"},0x223dec1:{brand:"Apple",model:"iPhone 15 Plus",type:"apple"},0x223df25:{brand:"Apple",model:"iPhone 15 Pro",type:"apple"},0x223df89:{brand:"Apple",model:"iPhone 15 Pro Max",type:"apple"},0x21c228d:{brand:"Apple",model:"iPhone 14 Pro Max",type:"apple"},0x21c2229:{brand:"Apple",model:"iPhone 14 Pro",type:"apple"},0x21c21c5:{brand:"Apple",model:"iPhone 14 Plus",type:"apple"},0x21c2161:{brand:"Apple",model:"iPhone 14",type:"apple"},0x21a1e6b:{brand:"Apple",model:"iPhone 14 Pro Max",type:"apple"},0x21a1e07:{brand:"Apple",model:"iPhone 14 Pro",type:"apple"},0x21a1da3:{brand:"Apple",model:"iPhone 14",type:"apple"},0x21a1d3f:{brand:"Apple",model:"iPhone 14 Plus",type:"apple"},0x217577b:{brand:"Apple",model:"iPhone 14",type:"apple"},0x21757df:{brand:"Apple",model:"iPhone 14 Plus",type:"apple"},0x2175843:{brand:"Apple",model:"iPhone 14 Pro",type:"apple"},0x21758a7:{brand:"Apple",model:"iPhone 14 Pro Max",type:"apple"},0x21ccbb0:{brand:"Apple",model:"iPhone 13 Pro Max",type:"apple"},0x21ccb4c:{brand:"Apple",model:"iPhone 13 Pro",type:"apple"},0x21ccae8:{brand:"Apple",model:"iPhone 13",type:"apple"},0x21cca84:{brand:"Apple",model:"iPhone 13 Mini",type:"apple"},0x2167f55:{brand:"Apple",model:"iPhone 13 Pro Max",type:"apple"},0x2167ef1:{brand:"Apple",model:"iPhone 13 Pro",type:"apple"},0x2167e8d:{brand:"Apple",model:"iPhone 13",type:"apple"},0x2167e29:{brand:"Apple",model:"iPhone 13 Mini",type:"apple"},0x21d991d:{brand:"Apple",model:"iPhone 13",type:"apple"},0x21d9981:{brand:"Apple",model:"iPhone 13 Mini",type:"apple"},0x21d99e5:{brand:"Apple",model:"iPhone 13 Pro",type:"apple"},0x21d9a49:{brand:"Apple",model:"iPhone 13 Pro Max",type:"apple"},0x21724bc:{brand:"Apple",model:"iPhone 13 Mini",type:"apple"},0x2172520:{brand:"Apple",model:"iPhone 13",type:"apple"},0x2172584:{brand:"Apple",model:"iPhone 13 Pro",type:"apple"},0x21725e8:{brand:"Apple",model:"iPhone 13 Pro Max",type:"apple"},0x220b687:{brand:"Apple",model:"iPhone 12 Pro Max",type:"apple"},0x220b623:{brand:"Apple",model:"iPhone 12 Pro",type:"apple"},0x220b5bf:{brand:"Apple",model:"iPhone 12",type:"apple"},0x220b55b:{brand:"Apple",model:"iPhone 12 Mini",type:"apple"},0x21ab507:{brand:"Apple",model:"iPhone 12 Pro Max",type:"apple"},0x21ab4a3:{brand:"Apple",model:"iPhone 12 Pro",type:"apple"},0x21ab43f:{brand:"Apple",model:"iPhone 12",type:"apple"},0x21ab3db:{brand:"Apple",model:"iPhone 12 Mini",type:"apple"},0x21cc397:{brand:"Apple",model:"iPhone 12 Mini",type:"apple"},0x21cc3fb:{brand:"Apple",model:"iPhone 12",type:"apple"},0x21cc45f:{brand:"Apple",model:"iPhone 12 Pro",type:"apple"},0x21cc4c3:{brand:"Apple",model:"iPhone 12 Pro Max",type:"apple"},0x21c1d2e:{brand:"Apple",model:"iPhone 11 (A2221 / A2111)",type:"apple"},0x21c1d92:{brand:"Apple",model:"iPhone 11 Pro (A2215)",type:"apple"},0x21c1df6:{brand:"Apple",model:"iPhone 11 Pro Max (A2218)",type:"apple"},0x21c04f6:{brand:"Apple",model:"iPhone 11",type:"apple"},0x21c055a:{brand:"Apple",model:"iPhone 11 Pro",type:"apple"},0x21c05be:{brand:"Apple",model:"iPhone 11 Pro Max",type:"apple"},0x2200f56:{brand:"Apple",model:"iPhone 11",type:"apple"},0x2200fba:{brand:"Apple",model:"iPhone 11 Pro",type:"apple"},0x220101e:{brand:"Apple",model:"iPhone 11 Pro Max",type:"apple"},0x21a65ba:{brand:"Apple",model:"iPhone 11",type:"apple"},0x21a661e:{brand:"Apple",model:"iPhone 11 Pro",type:"apple"},0x21a6682:{brand:"Apple",model:"iPhone 11 Pro Max",type:"apple"},0x2201852:{brand:"Apple",model:"iPhone 11",type:"apple"},0x22018b6:{brand:"Apple",model:"iPhone 11 Pro",type:"apple"},0x220191a:{brand:"Apple",model:"iPhone 11 Pro Max",type:"apple"},0x2212c7d:{brand:"Apple",model:"iPhone XS Max",type:"apple"},0x2212c19:{brand:"Apple",model:"iPhone XS",type:"apple"},0x2212bb5:{brand:"Apple",model:"iPhone XR",type:"apple"},0x21a9df9:{brand:"Apple",model:"iPhone XR",type:"apple"},0x21a9e5d:{brand:"Apple",model:"iPhone XS",type:"apple"},0x21a9ec1:{brand:"Apple",model:"iPhone XS Max",type:"apple"},0x22062ec:{brand:"Apple",model:"iPhone X",type:"apple"},0x2206288:{brand:"Apple",model:"iPhone 8 Plus",type:"apple"},0x2206224:{brand:"Apple",model:"iPhone 8",type:"apple"},0x2246838:{brand:"Apple",model:"iPhone 7",type:"apple"},0x224689c:{brand:"Apple",model:"iPhone 7 Plus",type:"apple"},0x2236d72:{brand:"Apple",model:"iPhone SE (2020)",type:"apple"},0x2236dd7:{brand:"Apple",model:"iPhone SE (2022)",type:"apple"},0x21a9f27:{brand:"Samsung",model:"Galaxy S25 Ultra",type:"samsung"},0x21a6def:{brand:"Samsung",model:"Galaxy S24 Ultra",type:"samsung"},0x21a6d8b:{brand:"Samsung",model:"Galaxy S24+",type:"samsung"},0x21a6d27:{brand:"Samsung",model:"Galaxy S24",type:"samsung"},0x218b86f:{brand:"Samsung",model:"Galaxy S23 Ultra",type:"samsung"},0x218b80b:{brand:"Samsung",model:"Galaxy S23+",type:"samsung"},0x218b7a7:{brand:"Samsung",model:"Galaxy S23",type:"samsung"},0x2251ea6:{brand:"Samsung",model:"Galaxy S22 Ultra",type:"samsung"},0x2251e42:{brand:"Samsung",model:"Galaxy S22+",type:"samsung"},0x2251dde:{brand:"Samsung",model:"Galaxy S22",type:"samsung"},0x21fd843:{brand:"Samsung",model:"Galaxy S21 Ultra",type:"samsung"},0x21fd7df:{brand:"Samsung",model:"Galaxy S21+",type:"samsung"},0x21fd77b:{brand:"Samsung",model:"Galaxy S21",type:"samsung"},0x222e582:{brand:"Samsung",model:"Galaxy S20 Ultra",type:"samsung"},0x222e51e:{brand:"Samsung",model:"Galaxy S20+",type:"samsung"},0x222e4ba:{brand:"Samsung",model:"Galaxy S20",type:"samsung"},0x2230c92:{brand:"Samsung",model:"Galaxy Note 20 Ultra",type:"samsung"},0x219cef3:{brand:"Samsung",model:"Galaxy Z Fold6",type:"samsung"},0x219ce8f:{brand:"Samsung",model:"Galaxy Z Flip6",type:"samsung"},0x21d5d7e:{brand:"Samsung",model:"Galaxy Z Fold5",type:"samsung"},0x21d5d1a:{brand:"Samsung",model:"Galaxy Z Flip5",type:"samsung"},0x21b138e:{brand:"Samsung",model:"Galaxy Z Fold4",type:"samsung"},0x21b132a:{brand:"Samsung",model:"Galaxy Z Flip4",type:"samsung"},0x21ace6b:{brand:"Samsung",model:"Galaxy A55 5G",type:"samsung"},0x218f9ab:{brand:"Samsung",model:"Galaxy A54 5G",type:"samsung"},0x218d29b:{brand:"Samsung",model:"Galaxy A34 5G",type:"samsung"},0x21db36f:{brand:"Google",model:"Pixel 9 Pro XL",type:"android"},0x21db30b:{brand:"Google",model:"Pixel 9 Pro",type:"android"},0x21db2a7:{brand:"Google",model:"Pixel 9",type:"android"},0x21c2c6b:{brand:"Google",model:"Pixel 8 Pro",type:"android"},0x21c2c07:{brand:"Google",model:"Pixel 8",type:"android"},0x221745e:{brand:"Google",model:"Pixel 7 Pro",type:"android"},0x22173fa:{brand:"Google",model:"Pixel 7",type:"android"},0x223491d:{brand:"Google",model:"Pixel 6 Pro",type:"android"},0x22348b9:{brand:"Google",model:"Pixel 6",type:"android"},0x520ea44:{brand:"Xiaomi",model:"Xiaomi 14 / 14 Ultra",type:"android"},0x520eaa8:{brand:"Xiaomi",model:"Xiaomi 14 Pro",type:"android"},0x52c3161:{brand:"Xiaomi",model:"Xiaomi 13 / 13 Pro",type:"android"},0x52f3ea1:{brand:"Xiaomi",model:"Xiaomi 12 / 12 Pro",type:"android"},0x5223c8d:{brand:"Poco",model:"Poco F6 / F6 Pro",type:"android"},0x522157d:{brand:"Poco",model:"Poco F5 / X6 Pro",type:"android"},0x523c32d:{brand:"Redmi",model:"Redmi Note 13 Pro+",type:"android"},0x5239c1d:{brand:"Redmi",model:"Redmi Note 12 Pro",type:"android"},0x5257655:{brand:"Oppo",model:"Find X7 / X6 Ultra",type:"android"},0x5259d65:{brand:"Oppo",model:"Reno 12 / 11 Pro",type:"android"},0x526fcf5:{brand:"Vivo",model:"Vivo X100 / X90 Pro",type:"android"},0x5272405:{brand:"Vivo",model:"Vivo V30 / V29 5G",type:"android"},0x528aaa5:{brand:"Realme",model:"Realme GT 6 / GT 5 Pro",type:"android"},0x52a5855:{brand:"Infinix",model:"Infinix GT 20 Pro / Zero 30",type:"android"},0x21d667b:{brand:"Asus",model:"ROG Phone 8 / 8 Pro",type:"android"}};function n(e){var a;let r=e.replace(/\D/g,""),n=15===r.length,i=!!n&&function(e){let a=e.replace(/\D/g,"");if(15!==a.length)return!1;let r=0;for(let e=0;e<15;e++){let t=parseInt(a[e],10);e%2==1&&(t*=2)>9&&(t-=9),r+=t}return r%10==0}(r);if(r.length<8)return{raw:e,clean:r,isValidLength:!1,isValidLuhn:!1,brand:"",model:"",type:"generic",isApple:!1};let l=t[r.substring(0,8)];if(l)return{raw:e,clean:r,isValidLength:n,isValidLuhn:i,brand:l.brand,model:l.model,type:l.type||"generic",isApple:"Apple"===l.brand};let o=(a=r.substring(0,6)).startsWith("35")&&(a.endsWith("10")||a.endsWith("11")||a.endsWith("12")||a.endsWith("13")||a.endsWith("14")||a.endsWith("15")||a.endsWith("16")||a.endsWith("17")||a.endsWith("21")||a.endsWith("09")||a.endsWith("08"))?a.endsWith("16")||a.endsWith("17")?{brand:"Apple",model:"iPhone 15 / 16 Series (iOS Device)",type:"apple"}:a.endsWith("14")||a.endsWith("15")||a.endsWith("55")||a.endsWith("85")?{brand:"Apple",model:"iPhone 13 / 14 Series (iOS Device)",type:"apple"}:a.endsWith("11")||a.endsWith("21")?{brand:"Apple",model:"iPhone 12 / 13 Series (iOS Device)",type:"apple"}:a.endsWith("10")?{brand:"Apple",model:"iPhone 11 Series (A2221 / A2215 / A2218)",type:"apple"}:a.endsWith("09")||a.endsWith("08")?{brand:"Apple",model:"iPhone X / XR / XS / 8 Series",type:"apple"}:{brand:"Apple",model:"iPhone / iOS Smartphone",type:"apple"}:a.startsWith("35")||a.startsWith("01")||a.startsWith("99")?{brand:"Apple / Global",model:"iOS / Smartphone",type:"apple"}:a.startsWith("86")?{brand:"Xiaomi / Oppo / Vivo / Android",model:"Android Smartphone",type:"android"}:{brand:"Smartphone",model:"Mobile Device",type:"generic"};return{raw:e,clean:r,isValidLength:n,isValidLuhn:i,brand:o.brand,model:o.model,type:o.type,isApple:o.brand.includes("Apple")}}function i(e){return e.split(/[\n,;]+/).map(e=>e.trim()).filter(e=>e.length>0).map(e=>n(e))}},6987:(e,a,r)=>{"use strict";r.d(a,{D:()=>l});var t=r(5155),n=r(2115),i=r(4788);function l({isOpen:e,onClose:a,amount:r,title:o="Pembayaran Berhasil",statusText:d="Pesanan Anda telah berhasil dibuat!",recipientLabel:p="Tujuan",recipientValue:s,methodValue:m="Saldo Ry-ITSolutions"}){return((0,n.useEffect)(()=>(e?((0,i.BS)(),document.body.style.overflow="hidden"):document.body.style.overflow="",()=>{document.body.style.overflow=""}),[e]),e)?(0,t.jsxs)("div",{className:"fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4",children:[(0,t.jsx)("style",{dangerouslySetInnerHTML:{__html:`
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
      `}}),(0,t.jsxs)("div",{className:"app-screen",children:[(0,t.jsx)("div",{className:"green-bg"}),(0,t.jsxs)("div",{className:"confetti-container",children:[(0,t.jsx)("div",{className:"particle p1"}),(0,t.jsx)("div",{className:"particle p2"}),(0,t.jsx)("div",{className:"particle p3"}),(0,t.jsx)("div",{className:"particle p4"}),(0,t.jsx)("div",{className:"particle p5"}),(0,t.jsx)("div",{className:"particle p6"})]}),(0,t.jsxs)("div",{className:"success-card",children:[(0,t.jsx)("div",{className:"icon-wrapper",children:(0,t.jsx)("svg",{className:"checkmark-svg",viewBox:"0 0 52 52",children:(0,t.jsx)("path",{className:"checkmark-check",fill:"none",d:"M14 27 l7 7 l17 -17"})})}),(0,t.jsx)("div",{className:"badge-success-pop",children:o}),(0,t.jsxs)("div",{className:"amount-pop",children:["Rp ",r.toLocaleString("id-ID")]}),(0,t.jsx)("p",{className:"status-text-pop",children:d}),(0,t.jsxs)("div",{className:"info-box-pop text-white",children:[(0,t.jsxs)("div",{className:"info-row-pop",children:[(0,t.jsx)("span",{className:"info-label-pop",children:p}),(0,t.jsx)("span",{className:"info-value-pop",children:s})]}),(0,t.jsxs)("div",{className:"info-row-pop",children:[(0,t.jsx)("span",{className:"info-label-pop",children:"Metode"}),(0,t.jsx)("span",{className:"info-value-pop",children:m})]})]}),(0,t.jsx)("button",{className:"btn-done-pop",onClick:a,children:"Mantap, Selesai!"})]})]})]}):null}},7313:(e,a,r)=>{"use strict";r.d(a,{p:()=>n});var t=r(5155);function n({label:e,error:a,icon:r,className:i="",...l}){return(0,t.jsxs)("div",{className:"w-full flex flex-col gap-1.5",children:[e&&(0,t.jsx)("label",{className:"text-sm font-medium text-ink/80",children:e}),(0,t.jsxs)("div",{className:"relative",children:[r&&(0,t.jsx)("div",{className:"absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted",children:r}),(0,t.jsx)("input",{className:`w-full h-11 rounded-full border border-black/5 bg-canvas px-5 text-[17px] text-ink transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50 ${r?"pl-10":""} ${a?"border-red-500 focus:border-red-500 focus:ring-red-500":""} ${i}`,...l})]}),a&&(0,t.jsx)("span",{className:"text-[14px] text-red-500 mt-1",children:a})]})}r(2115)},8637:(e,a,r)=>{"use strict";r.r(a),r.d(a,{Swal:()=>i,default:()=>l});var t=r(7042),n=r.n(t);let i={...n(),fire:(...e)=>{let a={};if(1===e.length&&"object"==typeof e[0]&&null!==e[0])a={...e[0]};else if(e.length>=2&&"string"==typeof e[0])a={title:e[0],text:e[1],icon:e[2]||"info"};else{if(1!==e.length||"string"!=typeof e[0])return n().fire(...e);a={title:e[0]}}if(!(a.showCancelButton||a.showDenyButton||a.input||a.preConfirm)){void 0===a.timer&&(a.timer=2500),void 0===a.timerProgressBar&&(a.timerProgressBar=!0);let e=a.didOpen;a.didOpen=r=>{"function"==typeof e&&e(r),setTimeout(()=>{try{n().isVisible()&&n().close()}catch{}},(Number(a.timer)||2500)+100)}}return void 0===a.allowOutsideClick&&(a.allowOutsideClick=!0),void 0===a.allowEscapeKey&&(a.allowEscapeKey=!0),n().fire(a)},close:(...e)=>n().close(...e),isVisible:()=>n().isVisible(),getPopup:()=>n().getPopup(),getContainer:()=>n().getContainer(),getTitle:()=>n().getTitle(),getHtmlContainer:()=>n().getHtmlContainer(),getImage:()=>n().getImage(),getIcon:()=>n().getIcon(),getConfirmButton:()=>n().getConfirmButton(),getDenyButton:()=>n().getDenyButton(),getCancelButton:()=>n().getCancelButton(),showLoading:(...e)=>n().showLoading(...e),hideLoading:()=>n().hideLoading(),isLoading:()=>n().isLoading(),mixin:(...e)=>n().mixin(...e)},l=i}},e=>{e.O(0,[320,822,441,928,358],()=>e(e.s=2044)),_N_E=e.O()}]);