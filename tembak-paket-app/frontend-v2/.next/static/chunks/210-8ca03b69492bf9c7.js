"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[210],{1822:(e,t,a)=>{a.d(t,{AppProvider:()=>p,n:()=>u});var n=a(5155),r=a(2115),i=a(7529),o=a(4788);let s="menu_settings",c="ry_cart_items",l={showBeliPaket:!1},d=(0,r.createContext)(void 0);function p({children:e}){let[t,a]=(0,r.useState)(null),[u,f]=(0,r.useState)(!0),[m,x]=(0,r.useState)(()=>{try{let e=window.localStorage.getItem(c);return e?JSON.parse(e):[]}catch{return[]}}),[g,h]=(0,r.useState)(()=>{try{let e=window.localStorage.getItem(s);return e?{...l,...JSON.parse(e)}:l}catch{return l}}),[b,w]=(0,r.useState)({cekCeir:[],barcode:[]}),y=e=>{x(e),window.localStorage.setItem(c,JSON.stringify(e))},v=e=>{y(m.filter(t=>t.id!==e))},k=m.reduce((e,t)=>e+(t.quantity||1),0),T=e=>{h(e),window.localStorage.setItem(s,JSON.stringify(e)),window.dispatchEvent(new CustomEvent("menu_settings_updated",{detail:e}))};return(0,r.useEffect)(()=>{(0,o.Z2)(),async function(){try{let[e,t,n]=await Promise.all([fetch(`${i.H$}/auth/me`,{credentials:"include"}).catch(()=>null),fetch(`${i.H$}/admin/menu-settings`,{credentials:"include"}).catch(()=>null),fetch(`${i.H$}/admin/ceirgo-display-settings`,{credentials:"include"}).catch(()=>null)]);if(e&&e.ok){let t=await (0,i.oi)(e);t&&t.status&&t.user&&a(t.user)}if(t&&t.ok){let e=await (0,i.oi)(t);e&&e.status&&T({showBeliPaket:!!e.data?.showBeliPaket})}if(n&&n.ok){let e=await (0,i.oi)(n);e&&e.status&&w({cekCeir:Array.isArray(e.data?.cekCeir)?e.data.cekCeir:[],barcode:Array.isArray(e.data?.barcode)?e.data.barcode:[]})}}catch(e){console.error("Failed to load initial data:",e)}finally{f(!1)}}()},[]),(0,r.useEffect)(()=>{if(!t)return;let e=new EventSource(`${i.H$}/stream`,{withCredentials:!0});return e.addEventListener("balance_update",e=>{try{let t=JSON.parse(e.data);"number"==typeof t.balance&&(a(e=>e?{...e,balance:t.balance}:null),(0,o.BS)(),window.dispatchEvent(new CustomEvent("topup_success")))}catch(e){}}),()=>e.close()},[t]),(0,n.jsx)(d.Provider,{value:{user:t,loading:u,cart:m,cartCount:k,menuSettings:g,ceirgoDisplaySettings:b,setUser:a,updateBalance:e=>{a(t=>t?{...t,balance:e}:null)},updateMenuSettings:T,updateCeirgoDisplaySettings:e=>{w(e)},addToCart:e=>{let t=Date.now().toString()+Math.random().toString(36).substring(2,5);y([...m,{...e,id:t}]),(0,o.JA)()},removeFromCart:v,updateCartQty:(e,t)=>{t<=0?v(e):y(m.map(a=>a.id===e?{...a,quantity:t}:a))},clearCart:()=>{y([])}},children:e})}function u(){let e=(0,r.useContext)(d);if(void 0===e)throw Error("useApp must be used within AppProvider");return e}},3321:(e,t,a)=>{var n=a(4645);a.o(n,"redirect")&&a.d(t,{redirect:function(){return n.redirect}}),a.o(n,"usePathname")&&a.d(t,{usePathname:function(){return n.usePathname}}),a.o(n,"useRouter")&&a.d(t,{useRouter:function(){return n.useRouter}}),a.o(n,"useSearchParams")&&a.d(t,{useSearchParams:function(){return n.useSearchParams}})},4037:(e,t,a)=>{a.d(t,{Z:()=>r});var n=a(5155);function r({children:e,className:t="",glass:a,...i}){return(0,n.jsx)("div",{className:`${a?"rounded-[18px] border border-hairline bg-parchment/80 backdrop-blur-md p-6":"rounded-[18px] border border-hairline bg-canvas p-6"} ${t}`,...i,children:e})}a(2115)},4327:(e,t,a)=>{a.d(t,{$:()=>r});var n=a(5155);function r({children:e,variant:t="primary",size:a="md",isLoading:i,className:o="",disabled:s,...c}){return(0,n.jsxs)("button",{className:`inline-flex items-center justify-center font-normal transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus disabled:pointer-events-none disabled:opacity-50 active:scale-[0.95] ${{primary:"bg-primary text-white hover:bg-primary-focus rounded-full shadow-none",secondary:"bg-transparent text-primary border border-primary rounded-full hover:bg-primary/5",outline:"border border-hairline bg-transparent hover:bg-parchment text-ink rounded-lg",ghost:"hover:bg-parchment text-ink rounded-lg",danger:"bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg",pearl:"bg-surface-pearl text-ink-muted border-[3px] border-divider rounded-[11px] hover:bg-divider"}[t]} ${{sm:"h-9 px-4 text-xs",md:"h-11 px-6 text-sm",lg:"h-14 px-8 text-base"}[a]} ${o}`,disabled:i||s,...c,children:[i?(0,n.jsxs)("svg",{className:"animate-spin -ml-1 mr-2 h-4 w-4 text-current",xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",children:[(0,n.jsx)("circle",{className:"opacity-25",cx:"12",cy:"12",r:"10",stroke:"currentColor",strokeWidth:"4"}),(0,n.jsx)("path",{className:"opacity-75",fill:"currentColor",d:"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"})]}):null,e]})}a(2115)},4788:(e,t,a)=>{a.d(t,{BS:()=>o,JA:()=>s,ST:()=>c,Z2:()=>l,hI:()=>i});let n=null;function r(){try{if(!n){let e=window.AudioContext||window.webkitAudioContext;e&&(n=new e)}return n&&"suspended"===n.state&&n.resume().catch(()=>{}),n}catch{return null}}function i(){let e=r();if(!e)return;let t=e.currentTime;[987.77,1318.51,1567.98,2093].forEach((a,n)=>{let r=e.createOscillator(),i=e.createGain();r.type="sine",r.frequency.setValueAtTime(a,t+.06*n),i.gain.setValueAtTime(1e-4,t+.06*n),i.gain.exponentialRampToValueAtTime(.2,t+.06*n+.015),i.gain.exponentialRampToValueAtTime(1e-4,t+.06*n+.4),r.connect(i),i.connect(e.destination),r.start(t+.06*n),r.stop(t+.06*n+.42)})}function o(){let e=r();if(!e)return;let t=e.currentTime;[523.25,783.99,1046.5,1318.51,1567.98,2093].forEach((a,n)=>{let r=e.createOscillator(),i=e.createGain();r.type="triangle",r.frequency.setValueAtTime(a,t+.08*n),i.gain.setValueAtTime(1e-4,t+.08*n),i.gain.exponentialRampToValueAtTime(.22,t+.08*n+.02),i.gain.exponentialRampToValueAtTime(1e-4,t+.08*n+.5),r.connect(i),i.connect(e.destination),r.start(t+.08*n),r.stop(t+.08*n+.52)})}function s(){let e=r();if(!e)return;let t=e.currentTime,a=e.createOscillator(),n=e.createGain();a.type="sine",a.frequency.setValueAtTime(400,t),a.frequency.exponentialRampToValueAtTime(900,t+.06),n.gain.setValueAtTime(.12,t),n.gain.exponentialRampToValueAtTime(1e-4,t+.07),a.connect(n),n.connect(e.destination),a.start(t),a.stop(t+.08)}function c(){let e=r();if(!e)return;let t=e.currentTime,a=e.createOscillator(),n=e.createGain();a.type="triangle",a.frequency.setValueAtTime(750,t),a.frequency.exponentialRampToValueAtTime(250,t+.03),n.gain.setValueAtTime(.08,t),n.gain.exponentialRampToValueAtTime(1e-4,t+.035),a.connect(n),n.connect(e.destination),a.start(t),a.stop(t+.04)}function l(){let e=()=>{r(),window.removeEventListener("click",e),window.removeEventListener("touchstart",e)};if(window.addEventListener("click",e,{once:!0}),window.addEventListener("touchstart",e,{once:!0}),"u">typeof MutationObserver){let e=new MutationObserver(e=>{for(let t of e)for(let e of Array.from(t.addedNodes))if(e instanceof HTMLElement&&(e.classList?.contains("swal2-container")||e.querySelector?.(".swal2-popup"))){let t=e.classList.contains("swal2-popup")?e:e.querySelector(".swal2-popup");if(t){if(t.__soundPlayed)continue;t.__soundPlayed=!0;let e=()=>{t.querySelector(".swal2-success, [class*='swal2-success'], .swal2-icon-success")||t.classList.contains("swal2-success")?function(){let e=r();if(!e)return;let t=e.currentTime;[523.25,659.25,783.99,1046.5].forEach((a,n)=>{let r=e.createOscillator(),i=e.createGain();r.type="sine",r.frequency.setValueAtTime(a,t+.07*n),i.gain.setValueAtTime(1e-4,t+.07*n),i.gain.exponentialRampToValueAtTime(.18,t+.07*n+.02),i.gain.exponentialRampToValueAtTime(1e-4,t+.07*n+.35),r.connect(i),i.connect(e.destination),r.start(t+.07*n),r.stop(t+.07*n+.36)})}():t.querySelector(".swal2-error, [class*='swal2-error'], .swal2-icon-error")||t.classList.contains("swal2-error")?function(){let e=r();if(!e)return;let t=e.currentTime;[220,164.81].forEach((a,n)=>{let r=e.createOscillator(),i=e.createGain();r.type="triangle",r.frequency.setValueAtTime(a,t+.12*n),i.gain.setValueAtTime(1e-4,t+.12*n),i.gain.exponentialRampToValueAtTime(.22,t+.12*n+.02),i.gain.exponentialRampToValueAtTime(1e-4,t+.12*n+.2),r.connect(i),i.connect(e.destination),r.start(t+.12*n),r.stop(t+.12*n+.22)})}():t.querySelector(".swal2-warning, [class*='swal2-warning'], .swal2-icon-warning")||t.classList.contains("swal2-warning")?function(){let e=r();if(!e)return;let t=e.currentTime;[392,523.25].forEach((a,n)=>{let r=e.createOscillator(),i=e.createGain();r.type="sine",r.frequency.setValueAtTime(a,t+.1*n),i.gain.setValueAtTime(1e-4,t+.1*n),i.gain.exponentialRampToValueAtTime(.15,t+.1*n+.02),i.gain.exponentialRampToValueAtTime(1e-4,t+.1*n+.18),r.connect(i),i.connect(e.destination),r.start(t+.1*n),r.stop(t+.1*n+.2)})}():t.querySelector(".swal2-info, .swal2-question, [class*='swal2-info'], [class*='swal2-question']")?function(){let e=r();if(!e)return;let t=e.currentTime,a=e.createOscillator(),n=e.createGain();a.type="sine",a.frequency.setValueAtTime(1318.51,t),n.gain.setValueAtTime(1e-4,t),n.gain.exponentialRampToValueAtTime(.25,t+.01),n.gain.exponentialRampToValueAtTime(1e-4,t+.6),a.connect(n),n.connect(e.destination),a.start(t),a.stop(t+.62)}():s()};t.querySelector(".swal2-icon")?e():setTimeout(e,30)}}});try{e.observe(document.body,{childList:!0,subtree:!0})}catch{}}}},6987:(e,t,a)=>{a.d(t,{D:()=>o});var n=a(5155),r=a(2115),i=a(4788);function o({isOpen:e,onClose:t,amount:a,title:s="Pembayaran Berhasil",statusText:c="Pesanan Anda telah berhasil dibuat!",recipientLabel:l="Tujuan",recipientValue:d,methodValue:p="Saldo Ry-ITSolutions"}){return((0,r.useEffect)(()=>(e?((0,i.BS)(),document.body.style.overflow="hidden"):document.body.style.overflow="",()=>{document.body.style.overflow=""}),[e]),e)?(0,n.jsxs)("div",{className:"fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4",children:[(0,n.jsx)("style",{dangerouslySetInnerHTML:{__html:`
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
      `}}),(0,n.jsxs)("div",{className:"app-screen",children:[(0,n.jsx)("div",{className:"green-bg"}),(0,n.jsxs)("div",{className:"confetti-container",children:[(0,n.jsx)("div",{className:"particle p1"}),(0,n.jsx)("div",{className:"particle p2"}),(0,n.jsx)("div",{className:"particle p3"}),(0,n.jsx)("div",{className:"particle p4"}),(0,n.jsx)("div",{className:"particle p5"}),(0,n.jsx)("div",{className:"particle p6"})]}),(0,n.jsxs)("div",{className:"success-card",children:[(0,n.jsx)("div",{className:"icon-wrapper",children:(0,n.jsx)("svg",{className:"checkmark-svg",viewBox:"0 0 52 52",children:(0,n.jsx)("path",{className:"checkmark-check",fill:"none",d:"M14 27 l7 7 l17 -17"})})}),(0,n.jsx)("div",{className:"badge-success-pop",children:s}),(0,n.jsxs)("div",{className:"amount-pop",children:["Rp ",a.toLocaleString("id-ID")]}),(0,n.jsx)("p",{className:"status-text-pop",children:c}),(0,n.jsxs)("div",{className:"info-box-pop text-white",children:[(0,n.jsxs)("div",{className:"info-row-pop",children:[(0,n.jsx)("span",{className:"info-label-pop",children:l}),(0,n.jsx)("span",{className:"info-value-pop",children:d})]}),(0,n.jsxs)("div",{className:"info-row-pop",children:[(0,n.jsx)("span",{className:"info-label-pop",children:"Metode"}),(0,n.jsx)("span",{className:"info-value-pop",children:p})]})]}),(0,n.jsx)("button",{className:"btn-done-pop",onClick:t,children:"Mantap, Selesai!"})]})]})]}):null}},7529:(e,t,a)=>{a.d(t,{H$:()=>n,gI:()=>o,iD:()=>i,oi:()=>r});let n="/api";async function r(e){try{let t=await e;if(!t)return null;let a=t.headers?.get("content-type");if(!a||!a.includes("application/json"))return null;return await t.json()}catch(e){return null}}async function i(e,t){let a=await fetch(`${n}/auth/login`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e,password:t})}),i=await r(a);if(!a.ok)throw Error(i?.message||"Gagal login");return i}async function o(){let e=await fetch(`${n}/user/packages?t=${Date.now()}`,{cache:"no-store",credentials:"include"});if(!e.ok)throw Error("Gagal mengambil daftar paket");let t=await r(e);return t?.data||[]}}}]);