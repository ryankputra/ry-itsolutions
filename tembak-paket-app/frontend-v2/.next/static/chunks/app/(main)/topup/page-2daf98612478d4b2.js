(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[226],{3243:(e,a,t)=>{"use strict";t.d(a,{Z:()=>r});var s=t(5155);function r({coupon:e,onClaim:a,onUse:t,isClaiming:n=!1,compact:i=!1,selected:o=!1}){let l=1===e.is_claimed||!0===e.is_claimed,d=e.max_claim_limit||e.max_usage_limit||100,c=e.total_claimed_count||0,p=c>=d&&!l,m=Math.min(100,Math.round(c/d*100)),u="percent"===e.discount_type?`Diskon ${e.discount_value}%`:`Potongan Rp ${(e.discount_value||0).toLocaleString("id-ID")}`,x=e.min_order_amount&&e.min_order_amount>0?`Min. Order Rp ${Number(e.min_order_amount).toLocaleString("id-ID")}`:"Tanpa Minimal Order",h=e.end_date?`s/d ${new Date(e.end_date).toLocaleDateString("id-ID",{day:"numeric",month:"short"})}`:"Berlaku Selamanya";return(0,s.jsxs)("div",{className:`relative flex items-stretch rounded-2xl border transition-all overflow-hidden select-none bg-canvas ${o?"border-primary ring-2 ring-primary/30 shadow-md":"border-hairline hover:border-primary/40 shadow-xs"} ${i?"min-w-[280px] max-w-[320px]":"w-full"}`,children:[(0,s.jsxs)("div",{className:"w-[100px] sm:w-[115px] bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 text-white flex flex-col items-center justify-center p-3 text-center shrink-0 relative overflow-hidden",children:[(0,s.jsx)("div",{className:"absolute -top-3 -right-3 w-6 h-6 rounded-full bg-canvas border border-hairline z-10"}),(0,s.jsx)("div",{className:"absolute -bottom-3 -right-3 w-6 h-6 rounded-full bg-canvas border border-hairline z-10"}),(0,s.jsx)("div",{className:"absolute inset-0 bg-white/10 opacity-30 pointer-events-none"}),(0,s.jsx)("span",{className:"text-[10px] font-extrabold uppercase tracking-wider text-white/90 bg-black/20 px-1.5 py-0.5 rounded mb-1",children:"Voucher"}),(0,s.jsx)("span",{className:"text-xs sm:text-sm font-black leading-tight drop-shadow-sm",children:"percent"===e.discount_type?`${e.discount_value}%`:`Rp ${e.discount_value>=1e3?`${e.discount_value/1e3}RB`:e.discount_value}`}),(0,s.jsx)("span",{className:"text-[9px] font-bold text-white/90 mt-0.5",children:"percent"===e.discount_type?"OFF":"POTONGAN"})]}),(0,s.jsxs)("div",{className:"flex-1 p-3 sm:p-3.5 flex flex-col justify-between gap-2 bg-canvas relative pl-4",children:[(0,s.jsx)("div",{className:"absolute left-0 top-3 bottom-3 border-l border-dashed border-hairline"}),(0,s.jsxs)("div",{children:[(0,s.jsxs)("div",{className:"flex items-center justify-between gap-1.5",children:[(0,s.jsx)("span",{className:"font-mono font-black text-[11px] text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20",children:e.code}),(0,s.jsx)("span",{className:"text-[9px] font-semibold text-ink-muted",children:h})]}),(0,s.jsx)("h4",{className:"font-bold text-xs text-ink mt-1 line-clamp-1",children:u}),(0,s.jsx)("p",{className:"text-[10px] text-ink-muted line-clamp-1",children:x})]}),(0,s.jsxs)("div",{className:"flex items-center justify-between gap-2 pt-1 border-t border-hairline/60",children:[(0,s.jsxs)("div",{className:"flex-1 min-w-0",children:[(0,s.jsx)("div",{className:"flex justify-between items-center text-[9px] text-ink-muted mb-0.5",children:(0,s.jsx)("span",{children:p?"Kuota Habis":`${m}% Diklaim`})}),(0,s.jsx)("div",{className:"w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-hairline",children:(0,s.jsx)("div",{className:`h-full rounded-full transition-all ${p?"bg-slate-400":m>80?"bg-rose-500":"bg-primary"}`,style:{width:`${m}%`}})})]}),l?t?(0,s.jsx)("button",{type:"button",onClick:()=>t(e),className:"px-3 py-1 rounded-xl text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors shrink-0",children:"Gunakan"}):(0,s.jsxs)("span",{className:"px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0 flex items-center gap-1",children:[(0,s.jsx)("svg",{className:"w-3 h-3",fill:"none",stroke:"currentColor",strokeWidth:2.5,viewBox:"0 0 24 24",children:(0,s.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M4.5 12.75l6 6 9-13.5"})}),"Terklaim"]}):p?(0,s.jsx)("button",{type:"button",disabled:!0,className:"px-3 py-1 rounded-xl text-[11px] font-bold bg-slate-200 text-slate-500 cursor-not-allowed shrink-0",children:"Habis"}):(0,s.jsx)("button",{type:"button",disabled:n,onClick:()=>a&&a(e),className:"px-3.5 py-1 rounded-xl text-[11px] font-bold bg-primary hover:bg-primary-focus text-white shadow-xs transition-all active:scale-95 shrink-0 flex items-center gap-1",children:n?"...":"Klaim"})]})]})]})}t(2115)},3321:(e,a,t)=>{"use strict";var s=t(4645);t.o(s,"redirect")&&t.d(a,{redirect:function(){return s.redirect}}),t.o(s,"usePathname")&&t.d(a,{usePathname:function(){return s.usePathname}}),t.o(s,"useRouter")&&t.d(a,{useRouter:function(){return s.useRouter}}),t.o(s,"useSearchParams")&&t.d(a,{useSearchParams:function(){return s.useSearchParams}})},4037:(e,a,t)=>{"use strict";t.d(a,{Z:()=>r});var s=t(5155);function r({children:e,className:a="",glass:t,...n}){return(0,s.jsx)("div",{className:`${t?"rounded-[18px] border border-hairline bg-parchment/80 backdrop-blur-md p-6":"rounded-[18px] border border-hairline bg-canvas p-6"} ${a}`,...n,children:e})}t(2115)},4327:(e,a,t)=>{"use strict";t.d(a,{$:()=>r});var s=t(5155);function r({children:e,variant:a="primary",size:t="md",isLoading:n,className:i="",disabled:o,...l}){return(0,s.jsxs)("button",{className:`inline-flex items-center justify-center font-normal transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus disabled:pointer-events-none disabled:opacity-50 active:scale-[0.95] ${{primary:"bg-primary text-white hover:bg-primary-focus rounded-full shadow-none",secondary:"bg-transparent text-primary border border-primary rounded-full hover:bg-primary/5",outline:"border border-hairline bg-transparent hover:bg-parchment text-ink rounded-lg",ghost:"hover:bg-parchment text-ink rounded-lg",danger:"bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg",pearl:"bg-surface-pearl text-ink-muted border-[3px] border-divider rounded-[11px] hover:bg-divider"}[a]} ${{sm:"h-9 px-4 text-xs",md:"h-11 px-6 text-sm",lg:"h-14 px-8 text-base"}[t]} ${i}`,disabled:n||o,...l,children:[n?(0,s.jsxs)("svg",{className:"animate-spin -ml-1 mr-2 h-4 w-4 text-current",xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",children:[(0,s.jsx)("circle",{className:"opacity-25",cx:"12",cy:"12",r:"10",stroke:"currentColor",strokeWidth:"4"}),(0,s.jsx)("path",{className:"opacity-75",fill:"currentColor",d:"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"})]}):null,e]})}t(2115)},5598:(e,a,t)=>{"use strict";t.r(a),t.d(a,{default:()=>h});var s=t(5155),r=t(2115),n=t(4037),i=t(4327),o=t(1822),l=t(3321),d=t(6987),c=t(3243),p=t(9633),m=t(7529),u=t(8637);let x=[{amount:2e4,label:"Rp 20.000",tag:"Pemula",badge:null},{amount:5e4,label:"Rp 50.000",tag:"Rekomendasi",badge:null},{amount:1e5,label:"Rp 100.000",tag:"Paling Populer",badge:"HOT"},{amount:25e4,label:"Rp 250.000",tag:"Hemat Order",badge:"HEMAT"},{amount:5e5,label:"Rp 500.000",tag:"Paket Reseller",badge:"BEST SELLER"},{amount:1e6,label:"Rp 1.000.000",tag:"Sultan / VIP",badge:"VIP"}];function h(){let{user:e,setUser:a,updateBalance:t}=(0,o.n)(),h=(0,l.useRouter)(),[b,f]=(0,r.useState)("100000"),[g,k]=(0,r.useState)(null),[v,y]=(0,r.useState)(!1),[j,w]=(0,r.useState)(""),[N,S]=(0,r.useState)(!1),[C,B]=(0,r.useState)(null),[L,I]=(0,r.useState)(!0),[_,A]=(0,r.useState)([]),[M,R]=(0,r.useState)(null),[P,T]=(0,r.useState)(0),[D,$]=(0,r.useState)(null),[O,z]=(0,r.useState)(!1),[E,W]=(0,r.useState)(!1),V=e=>{N||(S(!0),"number"==typeof e&&t(e),setTimeout(()=>{h.push("/dashboard")},3500))},[Q,q]=(0,r.useState)(null);(0,r.useEffect)(()=>{{let e=localStorage.getItem("ry_show_balance");null!==e&&I("true"===e)}let e=e=>{void 0!==e.detail&&I(e.detail)};return window.addEventListener("balance_visibility_changed",e),fetch("/api/coupons/public",{credentials:"include"}).then(e=>(0,m.oi)(e)).then(e=>{e&&e.status&&Array.isArray(e.data)&&A(e.data)}).catch(()=>{}),fetch("/api/topup/gateway-info",{credentials:"include"}).then(e=>(0,m.oi)(e)).then(e=>{e&&e.status&&e.data&&q(e.data)}).catch(()=>{}),()=>{window.removeEventListener("balance_visibility_changed",e)}},[]);let H=async e=>{R(e.id);try{let a=await fetch("/api/coupons/claim",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({coupon_id:e.id})}),t=await (0,m.oi)(a);a.ok&&t?.status?(u.default.fire({title:"Voucher Berhasil Diklaim!",text:t.message,icon:"success",timer:2e3,showConfirmButton:!1}),A(a=>a.map(a=>a.id===e.id?{...a,is_claimed:!0,total_claimed_count:(a.total_claimed_count||0)+1}:a))):u.default.fire({title:"Gagal Mengklaim",text:t.message||"Voucher tidak dapat diklaim saat ini.",icon:"error"})}catch(e){u.default.fire({title:"Error",text:"Kesalahan jaringan.",icon:"error"})}finally{R(null)}};(0,r.useEffect)(()=>{let e,a,t=()=>{V()};return window.addEventListener("topup_success",t),g&&!N&&(e=setInterval(()=>{T(e=>e<=1?(k(null),$(null),w("Waktu pembayaran telah habis. Silakan buat QRIS baru."),0):e-1)},1e3),a=setInterval(async()=>{try{let e=await fetch("/api/topup/latest-status",{credentials:"include"});if(e.ok){let a=await (0,m.oi)(e);if(a?.status&&a?.transactionStatus==="completed")return void V(a.balance)}let a=await fetch("/api/auth/me",{credentials:"include"});if(a.ok){let e=await (0,m.oi)(a);e?.status&&e?.user&&null!==C&&e.user.balance>C&&V(e.user.balance)}}catch(e){}},2500)),()=>{window.removeEventListener("topup_success",t),e&&clearInterval(e),a&&clearInterval(a)}},[g,N,D,C,h,a]),(0,r.useEffect)(()=>{g&&!N&&null!==C&&e&&e.balance>C&&V(e.balance)},[e?.balance,C,g,N]);let U=async()=>{z(!0);try{let e=await fetch(D?`/api/topup/status/${D}`:"/api/topup/latest-status",{credentials:"include"}),a=await (0,m.oi)(e);a?.status&&a?.transactionStatus==="completed"?(u.default.fire({title:"Pembayaran Berhasil!",text:"Saldo otomatis ditambahkan ke akun Anda.",icon:"success",timer:2e3,showConfirmButton:!1}),V(a.balance)):u.default.fire({title:"Menunggu Mutasi Bank",text:"Pembayaran belum terdeteksi di mutasi gateway. Jika Anda baru saja transfer, mohon tunggu beberapa detik lagi lalu tekan tombol ini kembali.",icon:"info",confirmButtonText:"Mengerti",confirmButtonColor:"#2563eb"})}catch(e){u.default.fire({title:"Error",text:"Gagal menghubungi server.",icon:"error"})}finally{z(!1)}},G=async()=>{if((await u.default.fire({title:"Simulasi Bayar QRIS",html:`Simulasikan pembayaran QRIS sebesar <b>Rp ${(g?.uniqueAmount||0).toLocaleString("id-ID")}</b> berhasil secara instan tanpa perlu bayar uang asli?`,icon:"question",showCancelButton:!0,confirmButtonText:"Ya, Simulasikan Sukses",cancelButtonText:"Batal",confirmButtonColor:"#7c3aed"})).isConfirmed){W(!0);try{let e=await fetch("/api/topup/simulate-pay",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({topUpId:D})}),a=await (0,m.oi)(e);e.ok&&a?.status?(u.default.fire({title:"Simulasi Berhasil!",text:a.message||"Saldo uji coba berhasil ditambahkan ke akun Anda.",icon:"success",timer:2e3,showConfirmButton:!1}),V(a.balance)):u.default.fire({title:"Gagal Simulasi",text:a?.message||"Hanya akun admin yang dapat menggunakan fitur simulasi.",icon:"error"})}catch(e){u.default.fire({title:"Error",text:"Gagal menghubungi server.",icon:"error"})}finally{W(!1)}}},K=async a=>{a.preventDefault();let t=parseInt(b),s=e?.role==="admin"?1:1e4;if(!t||t<s)return void w(`Minimal top up saldo adalah Rp ${s.toLocaleString("id-ID")}`);w(""),y(!0),B(e?.balance||0);try{let e=await fetch("/api/topup/request-qris",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:t})}),a=await (0,m.oi)(e);a?.status?(k(a.qrisData),$(a.topUpId||null),T(a.qrisData?.expiresAt?a.qrisData.expiresAt-Math.floor(Date.now()/1e3):300)):(w(a?.message||"Gagal membuat QRIS"),B(null))}catch(e){w("Kesalahan jaringan"),B(null)}finally{y(!1)}},J=parseInt(b)||0;return(0,s.jsxs)("div",{className:"space-y-5 max-w-xl mx-auto pb-14",children:[(0,s.jsxs)("div",{className:"flex items-center justify-between",children:[(0,s.jsxs)("div",{className:"flex items-center gap-3",children:[(0,s.jsx)("button",{onClick:()=>h.push("/dashboard"),className:"w-9 h-9 flex items-center justify-center rounded-xl bg-canvas border border-hairline hover:bg-parchment transition-colors",children:(0,s.jsx)("svg",{width:"18",height:"18",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",children:(0,s.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M15 19l-7-7 7-7"})})}),(0,s.jsxs)("div",{children:[(0,s.jsx)("h1",{className:"text-xl font-bold tracking-tight text-ink",children:"Isi Saldo Akun"}),(0,s.jsx)("p",{className:"text-xs text-ink-muted",children:"Top up otomatis 24 Jam via QRIS Nasional"})]})]}),(0,s.jsxs)("div",{className:"flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-300",children:[(0,s.jsx)("span",{className:"w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"}),"QRIS Online"]})]}),(0,s.jsxs)("div",{className:"relative rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-primary via-blue-700 to-indigo-900 text-white shadow-lg shadow-primary/20 overflow-hidden",children:[(0,s.jsx)("div",{className:"absolute top-0 right-0 w-36 h-36 bg-white/10 blur-2xl rounded-full translate-x-10 -translate-y-10"}),(0,s.jsx)("div",{className:"absolute bottom-0 left-0 w-28 h-28 bg-orange-400/20 blur-xl rounded-full -translate-x-10 translate-y-10"}),(0,s.jsxs)("div",{className:"relative z-10 flex flex-col justify-between gap-4",children:[(0,s.jsxs)("div",{className:"flex justify-between items-start",children:[(0,s.jsxs)("div",{children:[(0,s.jsx)("p",{className:"text-xs font-semibold text-white/80 uppercase tracking-wider",children:"Saldo Dompet Anda"}),(0,s.jsxs)("div",{className:"flex items-center gap-2 mt-1",children:[(0,s.jsx)("h2",{className:"text-2xl sm:text-3xl font-black tracking-tight",children:L?`Rp ${(e?.balance||0).toLocaleString("id-ID")}`:"******"}),(0,s.jsx)("button",{type:"button",onClick:()=>{let e=!L;I(e),localStorage.setItem("ry_show_balance",e.toString()),window.dispatchEvent(new CustomEvent("balance_visibility_changed",{detail:e}))},className:"p-1 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors",title:L?"Sembunyikan Saldo":"Tampilkan Saldo",children:L?(0,s.jsxs)("svg",{className:"w-5 h-5",fill:"none",stroke:"currentColor",strokeWidth:2,viewBox:"0 0 24 24",children:[(0,s.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"}),(0,s.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M15 12a3 3 0 11-6 0 3 3 0 016 0z"})]}):(0,s.jsx)("svg",{className:"w-5 h-5",fill:"none",stroke:"currentColor",strokeWidth:2,viewBox:"0 0 24 24",children:(0,s.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"})})})]})]}),(0,s.jsx)("div",{className:"px-2.5 py-1 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-[11px] font-bold",children:"Bebas Admin (Rp 0)"})]}),(0,s.jsxs)("div",{className:"flex items-center gap-3 text-[11px] text-white/90 pt-2 border-t border-white/15",children:[(0,s.jsxs)("span",{className:"flex items-center gap-1",children:[(0,s.jsx)("svg",{className:"w-3.5 h-3.5 text-emerald-300",fill:"none",stroke:"currentColor",strokeWidth:2.5,viewBox:"0 0 24 24",children:(0,s.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M4.5 12.75l6 6 9-13.5"})}),"Auto-Detect Masuk Instan"]}),(0,s.jsx)("span",{children:"•"}),(0,s.jsxs)("span",{className:"flex items-center gap-1",children:[(0,s.jsx)("svg",{className:"w-3.5 h-3.5 text-emerald-300",fill:"none",stroke:"currentColor",strokeWidth:2.5,viewBox:"0 0 24 24",children:(0,s.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"})}),"Aman Terenkripsi"]})]})]})]}),(0,s.jsx)(n.Z,{glass:!0,className:"p-0 overflow-hidden",children:N?(0,s.jsxs)("div",{className:"text-center space-y-4 py-14 px-6",children:[(0,s.jsx)("div",{className:"w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl animate-bounce",children:(0,s.jsx)("svg",{className:"w-8 h-8",fill:"none",stroke:"currentColor",strokeWidth:3,viewBox:"0 0 24 24",children:(0,s.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M4.5 12.75l6 6 9-13.5"})})}),(0,s.jsx)("h3",{className:"text-2xl font-black text-ink",children:"Top Up Saldo Sukses!"}),(0,s.jsx)("p",{className:"text-xs text-ink-muted",children:"Mengalihkan kembali ke dashboard..."})]}):g?(0,s.jsxs)("div",{className:"p-6 sm:p-8 flex flex-col items-center text-center space-y-6 bg-gradient-to-b from-canvas to-parchment/50",children:[(0,s.jsxs)("div",{className:"space-y-1",children:[(0,s.jsx)("p",{className:"text-xs font-bold text-ink-muted uppercase tracking-wider",children:"Total Pembayaran Tepat"}),(0,s.jsx)("div",{className:"bg-canvas border-2 border-primary/30 p-3.5 rounded-2xl shadow-xs",children:(0,s.jsxs)("p",{className:"text-3xl sm:text-4xl font-black text-primary",children:["Rp ",g.uniqueAmount.toLocaleString("id-ID")]})})]}),(0,s.jsxs)("div",{className:"relative w-60 h-60 bg-white p-3.5 rounded-3xl border-2 border-hairline shadow-xl mx-auto",children:[(0,s.jsxs)("div",{className:"absolute -top-3 -right-3 bg-rose-600 text-white font-bold px-3 py-1 rounded-full text-xs shadow-md flex items-center gap-1.5 animate-pulse",children:[(0,s.jsx)("svg",{className:"w-3.5 h-3.5",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",children:(0,s.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"})}),(e=>{if(e<=0)return"00:00";let a=Math.floor(e/60).toString().padStart(2,"0"),t=(e%60).toString().padStart(2,"0");return`${a}:${t}`})(P)]}),(0,s.jsx)("img",{src:g.base64Image,alt:"QRIS Code",className:"w-full h-full object-contain"})]}),(0,s.jsxs)("button",{type:"button",onClick:()=>{if(!g.base64Image)return;let e=document.createElement("a");e.href=g.base64Image,e.download=`QRIS-Topup-${g.uniqueAmount}.png`,document.body.appendChild(e),e.click(),document.body.removeChild(e)},className:"px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm mx-auto",children:[(0,s.jsx)("svg",{className:"w-4 h-4",fill:"none",stroke:"currentColor",strokeWidth:2,viewBox:"0 0 24 24",children:(0,s.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"})}),(0,s.jsx)("span",{children:"Unduh Gambar QRIS"})]}),(0,s.jsxs)("div",{className:"space-y-3 max-w-sm",children:[(0,s.jsxs)("div",{className:"bg-amber-50 border border-amber-200 p-3 rounded-xl flex gap-2.5 text-left",children:[(0,s.jsx)("svg",{className:"w-5 h-5 text-amber-600 shrink-0 mt-0.5",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",children:(0,s.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"})}),(0,s.jsxs)("p",{className:"text-[11px] text-amber-900 leading-relaxed font-medium",children:["Transfer ",(0,s.jsxs)("b",{children:["tepat Rp ",g.uniqueAmount.toLocaleString("id-ID")]})," (termasuk kode unik) agar sistem mendeteksi dan saldo masuk otomatis detik ini juga."]})]}),(0,s.jsxs)("div",{className:"flex items-center justify-center gap-2 text-ink-muted text-xs font-semibold",children:[(0,s.jsx)("span",{className:"w-2 h-2 bg-emerald-500 rounded-full animate-ping"}),"Menunggu pembayaran QRIS Anda..."]}),(0,s.jsxs)(i.$,{type:"button",onClick:U,isLoading:O,className:"w-full h-11 text-xs font-bold bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary-hover flex items-center justify-center gap-2",children:[(0,s.jsx)("svg",{className:"w-4 h-4",fill:"none",stroke:"currentColor",strokeWidth:2,viewBox:"0 0 24 24",children:(0,s.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"})}),(0,s.jsx)("span",{children:"Sudah Bayar? Cek Status Sekarang"})]}),e?.role==="admin"&&(0,s.jsxs)("button",{type:"button",onClick:G,disabled:E,className:"w-full py-2.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs group",children:[(0,s.jsx)("svg",{className:"w-4 h-4 text-purple-600 group-hover:rotate-12 transition-transform",fill:"none",stroke:"currentColor",strokeWidth:2,viewBox:"0 0 24 24",children:(0,s.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.942A2.25 2.25 0 0117.07 16.5H6.93a2.25 2.25 0 01-1.16-.322L4.2 15.3"})}),(0,s.jsx)("span",{children:E?"Memproses Simulasi...":"Mode Admin: Simulasi Bayar Berhasil (Rp 0)"})]}),(0,s.jsx)(i.$,{variant:"ghost",size:"sm",className:"w-full text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50",onClick:async()=>{if((await u.default.fire({title:"Batalkan Top Up?",text:"Apakah Anda yakin ingin membatalkan transaksi top up ini?",icon:"warning",showCancelButton:!0,confirmButtonText:"Ya, Batalkan",cancelButtonText:"Batal",confirmButtonColor:"#ef4444"})).isConfirmed)try{await fetch("/api/topup/cancel",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({topup_id:D})}),u.default.fire({title:"Dibatalkan",text:"Transaksi top up telah dibatalkan.",icon:"info",timer:1500,showConfirmButton:!1})}catch(e){}finally{k(null),$(null),B(null)}},children:"Batalkan & Ganti Nominal"})]})]}):(0,s.jsxs)("form",{onSubmit:K,className:"p-5 sm:p-6 space-y-5",children:[j&&(0,s.jsxs)("div",{className:"p-3.5 bg-rose-50 text-rose-700 rounded-2xl text-xs border border-rose-200 flex gap-2 items-center",children:[(0,s.jsx)("svg",{className:"w-4 h-4 shrink-0",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",children:(0,s.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"})}),(0,s.jsx)("span",{children:j})]}),Q&&!Q.is_ready&&(0,s.jsxs)("div",{className:"p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-2",children:[(0,s.jsxs)("div",{className:"flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300",children:[(0,s.jsx)("svg",{className:"w-5 h-5 shrink-0 text-amber-600 animate-bounce",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:(0,s.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"})}),(0,s.jsx)("span",{children:"Pembayaran QRIS Otomatis Sedang Dalam Pemeliharaan"})]}),(0,s.jsx)("p",{className:"text-[11px] leading-relaxed text-amber-700 dark:text-amber-300/80",children:Q.message||"Sesi pembayaran otomatis GoPay sedang tidak aktif / belum disiapkan admin. Silakan hubungi CS Admin untuk deposit saldo manual via WhatsApp."}),(0,s.jsx)("div",{className:"pt-1 flex gap-2",children:(0,s.jsxs)("a",{href:"https://wa.me/6288706611370",target:"_blank",rel:"noreferrer",className:"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-emerald-600 text-white font-bold text-[11px] transition-colors shadow-xs",children:[(0,s.jsx)("svg",{className:"w-3.5 h-3.5 fill-current",viewBox:"0 0 24 24",children:(0,s.jsx)("path",{d:"M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.015c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"})}),"Hubungi CS WhatsApp"]})})]}),(0,s.jsxs)("div",{className:"space-y-2.5",children:[(0,s.jsxs)("div",{className:"flex justify-between items-center",children:[(0,s.jsx)("label",{className:"text-xs font-bold text-ink",children:"Pilih Nominal Top Up"}),(0,s.jsx)("span",{className:"text-[11px] text-ink-muted",children:e?.role==="admin"?"Admin: Bebas Nominal (Min Rp 1)":"Min. Rp 10.000"})]}),(0,s.jsx)("div",{className:"grid grid-cols-2 sm:grid-cols-3 gap-2.5",children:x.map(e=>{let a=parseInt(b)===e.amount;return(0,s.jsxs)("button",{type:"button",onClick:()=>f(e.amount.toString()),className:`relative p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1 select-none ${a?"border-primary bg-primary/5 ring-2 ring-primary/40 shadow-sm":"border-hairline bg-canvas hover:border-primary/40 hover:bg-parchment/60"}`,children:[e.badge&&(0,s.jsx)("span",{className:"absolute -top-2 right-2 px-1.5 py-0.5 rounded-md bg-gradient-to-r from-orange-500 to-rose-500 text-white font-extrabold text-[9px] shadow-xs",children:e.badge}),(0,s.jsx)("p",{className:`font-black text-sm ${a?"text-primary":"text-ink"}`,children:e.label}),(0,s.jsx)("p",{className:"text-[10px] text-ink-muted font-medium",children:e.tag})]},e.amount)})})]}),(0,s.jsxs)("div",{className:"space-y-1.5",children:[(0,s.jsx)("label",{className:"text-xs font-bold text-ink",children:"Atau Masukkan Nominal Lain (Rp)"}),(0,s.jsxs)("div",{className:"relative",children:[(0,s.jsx)("span",{className:"absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-muted",children:"Rp"}),(0,s.jsx)("input",{type:"number",min:e?.role==="admin"?"1":"10000",step:e?.role==="admin"?"1":"1000",placeholder:e?.role==="admin"?"Bebas (Contoh: 1, 500, 10000)":"Contoh: 75000",value:b,onChange:e=>f(e.target.value),className:"w-full pl-10 pr-4 py-3 rounded-2xl border border-hairline bg-canvas text-sm font-bold text-ink outline-none focus:ring-2 focus:ring-primary focus:border-primary",required:!0})]})]}),(0,s.jsx)("div",{className:"p-4 rounded-2xl bg-parchment/50 border border-hairline",children:(0,s.jsx)(p.t,{})}),(0,s.jsx)(i.$,{type:"submit",isLoading:v,disabled:!!Q&&!Q.is_ready,className:`w-full h-12 text-sm font-bold shadow-md ${Q&&!Q.is_ready?"opacity-60 cursor-not-allowed bg-gray-500 hover:bg-gray-500":"shadow-primary/20"}`,children:Q&&!Q.is_ready?"Pembayaran Otomatis Offline (Hubungi Admin)":`Lanjut Bayar (Rp ${J.toLocaleString("id-ID")}) ➔`})]})}),_.length>0&&!g&&(0,s.jsxs)("div",{className:"space-y-3 pt-2",children:[(0,s.jsxs)("div",{className:"flex justify-between items-center",children:[(0,s.jsxs)("h3",{className:"text-sm font-bold text-ink flex items-center gap-1.5",children:[(0,s.jsx)("span",{children:"Voucher Diskon Siap Klaim"}),(0,s.jsx)("span",{className:"text-[9px] font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full",children:"Promo Spesial"})]}),(0,s.jsx)("span",{className:"text-[11px] text-ink-muted",children:"Klaim untuk order layanan"})]}),(0,s.jsx)("div",{className:"flex gap-2.5 overflow-x-auto pb-1 no-scrollbar snap-x snap-mandatory",children:_.map(e=>(0,s.jsx)("div",{className:"snap-start shrink-0",children:(0,s.jsx)(c.Z,{coupon:e,compact:!0,isClaiming:M===e.id,onClaim:H})},e.id))})]}),(0,s.jsx)(d.D,{isOpen:N,onClose:()=>h.push("/dashboard"),amount:g?g.uniqueAmount:parseInt(b)||0,title:"Top Up Berhasil",statusText:"Saldo Anda telah berhasil bertambah secara instan!",recipientLabel:"Username",recipientValue:e?.name||"Member",methodValue:"QRIS Auto-Detect"})]})}},6987:(e,a,t)=>{"use strict";t.d(a,{D:()=>i});var s=t(5155),r=t(2115),n=t(4788);function i({isOpen:e,onClose:a,amount:t,title:o="Pembayaran Berhasil",statusText:l="Pesanan Anda telah berhasil dibuat!",recipientLabel:d="Tujuan",recipientValue:c,methodValue:p="Saldo Ry-ITSolutions"}){return((0,r.useEffect)(()=>(e?((0,n.BS)(),document.body.style.overflow="hidden"):document.body.style.overflow="",()=>{document.body.style.overflow=""}),[e]),e)?(0,s.jsxs)("div",{className:"fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4",children:[(0,s.jsx)("style",{dangerouslySetInnerHTML:{__html:`
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
      `}}),(0,s.jsxs)("div",{className:"app-screen",children:[(0,s.jsx)("div",{className:"green-bg"}),(0,s.jsxs)("div",{className:"confetti-container",children:[(0,s.jsx)("div",{className:"particle p1"}),(0,s.jsx)("div",{className:"particle p2"}),(0,s.jsx)("div",{className:"particle p3"}),(0,s.jsx)("div",{className:"particle p4"}),(0,s.jsx)("div",{className:"particle p5"}),(0,s.jsx)("div",{className:"particle p6"})]}),(0,s.jsxs)("div",{className:"success-card",children:[(0,s.jsx)("div",{className:"icon-wrapper",children:(0,s.jsx)("svg",{className:"checkmark-svg",viewBox:"0 0 52 52",children:(0,s.jsx)("path",{className:"checkmark-check",fill:"none",d:"M14 27 l7 7 l17 -17"})})}),(0,s.jsx)("div",{className:"badge-success-pop",children:o}),(0,s.jsxs)("div",{className:"amount-pop",children:["Rp ",t.toLocaleString("id-ID")]}),(0,s.jsx)("p",{className:"status-text-pop",children:l}),(0,s.jsxs)("div",{className:"info-box-pop text-white",children:[(0,s.jsxs)("div",{className:"info-row-pop",children:[(0,s.jsx)("span",{className:"info-label-pop",children:d}),(0,s.jsx)("span",{className:"info-value-pop",children:c})]}),(0,s.jsxs)("div",{className:"info-row-pop",children:[(0,s.jsx)("span",{className:"info-label-pop",children:"Metode"}),(0,s.jsx)("span",{className:"info-value-pop",children:p})]})]}),(0,s.jsx)("button",{className:"btn-done-pop",onClick:a,children:"Mantap, Selesai!"})]})]})]}):null}},8024:(e,a,t)=>{Promise.resolve().then(t.bind(t,5598))},8637:(e,a,t)=>{"use strict";t.r(a),t.d(a,{Swal:()=>n,default:()=>i});var s=t(7042),r=t.n(s);let n={...r(),fire:(...e)=>{let a={};if(1===e.length&&"object"==typeof e[0]&&null!==e[0])a={...e[0]};else if(e.length>=2&&"string"==typeof e[0])a={title:e[0],text:e[1],icon:e[2]||"info"};else{if(1!==e.length||"string"!=typeof e[0])return r().fire(...e);a={title:e[0]}}if(!(a.showCancelButton||a.showDenyButton||a.input||a.preConfirm)){void 0===a.timer&&(a.timer=2500),void 0===a.timerProgressBar&&(a.timerProgressBar=!0);let e=a.didOpen;a.didOpen=t=>{"function"==typeof e&&e(t),setTimeout(()=>{try{r().isVisible()&&r().close()}catch{}},(Number(a.timer)||2500)+100)}}return void 0===a.allowOutsideClick&&(a.allowOutsideClick=!0),void 0===a.allowEscapeKey&&(a.allowEscapeKey=!0),r().fire(a)},close:(...e)=>r().close(...e),isVisible:()=>r().isVisible(),getPopup:()=>r().getPopup(),getContainer:()=>r().getContainer(),getTitle:()=>r().getTitle(),getHtmlContainer:()=>r().getHtmlContainer(),getImage:()=>r().getImage(),getIcon:()=>r().getIcon(),getConfirmButton:()=>r().getConfirmButton(),getDenyButton:()=>r().getDenyButton(),getCancelButton:()=>r().getCancelButton(),showLoading:(...e)=>r().showLoading(...e),hideLoading:()=>r().hideLoading(),isLoading:()=>r().isLoading(),mixin:(...e)=>r().mixin(...e)},i=n},9633:(e,a,t)=>{"use strict";t.d(a,{t:()=>n});var s=t(5155);t(2115);let r=[{name:"QRIS",src:"/payments/qris.png",alt:"QRIS Nasional",heightClass:"h-6 sm:h-7"},{name:"GoPay",src:"/payments/gopay.png",alt:"GoPay",heightClass:"h-5 sm:h-6"},{name:"ShopeePay",src:"/payments/shopeepay.png",alt:"ShopeePay",heightClass:"h-5 sm:h-6"},{name:"DANA",src:"/payments/dana.png",alt:"DANA",heightClass:"h-5 sm:h-6"},{name:"OVO",src:"/payments/ovo.png",alt:"OVO",heightClass:"h-5 sm:h-6"},{name:"LinkAja",src:"/payments/linkaja.png",alt:"LinkAja",heightClass:"h-5 sm:h-6"},{name:"BCA",src:"/payments/bca.png",alt:"Bank BCA",heightClass:"h-5 sm:h-6"},{name:"Mandiri",src:"/payments/mandiri.png",alt:"Bank Mandiri",heightClass:"h-5 sm:h-6"},{name:"BRI",src:"/payments/bri.png",alt:"Bank BRI",heightClass:"h-5 sm:h-6"},{name:"BNI",src:"/payments/bni.png",alt:"Bank BNI",heightClass:"h-5 sm:h-6"}];function n(){return(0,s.jsxs)("div",{className:"space-y-3 pt-3 border-t border-hairline/80",children:[(0,s.jsxs)("div",{className:"flex items-center justify-between",children:[(0,s.jsxs)("span",{className:"text-xs font-bold text-ink flex items-center gap-1.5",children:[(0,s.jsx)("svg",{className:"w-4 h-4 text-primary",fill:"none",stroke:"currentColor",strokeWidth:2,viewBox:"0 0 24 24",children:(0,s.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"})}),"Metode Pembayaran QRIS Otomatis:"]}),(0,s.jsx)("span",{className:"text-[10px] font-bold text-emerald-700 bg-emerald-100/80 border border-emerald-200 px-2 py-0.5 rounded-full",children:"Semua Bank & E-Wallet"})]}),(0,s.jsx)("div",{className:"grid grid-cols-5 gap-1.5 sm:gap-2",children:r.map(e=>(0,s.jsx)("div",{className:"bg-white border border-slate-200/80 hover:border-primary/50 hover:shadow-xs rounded-xl p-1.5 flex items-center justify-center h-10 sm:h-11 shadow-2xs transition-all group",title:e.alt,children:(0,s.jsx)("img",{src:e.src,alt:e.alt,className:`${e.heightClass||"h-5 sm:h-6"} w-auto max-w-[85%] object-contain group-hover:scale-105 transition-transform duration-200`,loading:"lazy"})},e.name))}),(0,s.jsx)("p",{className:"text-[10.5px] text-ink-muted text-center pt-0.5",children:"⚡ Scan menggunakan aplikasi bank atau e-wallet apapun di atas, saldo otomatis masuk detik ini juga."})]})}}},e=>{e.O(0,[320,822,441,928,358],()=>e(e.s=8024)),_N_E=e.O()}]);