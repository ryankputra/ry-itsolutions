"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[210],{1822:(e,a,r)=>{r.d(a,{AppProvider:()=>d,n:()=>l});var t=r(5155),n=r(2115),o=r(7529);let s="menu_settings",i={showBeliPaket:!1},c=(0,n.createContext)(void 0);function d({children:e}){let[a,r]=(0,n.useState)(null),[l,p]=(0,n.useState)(!0),[u,f]=(0,n.useState)(()=>{try{let e=window.localStorage.getItem(s);return e?{...i,...JSON.parse(e)}:i}catch{return i}}),[x,h]=(0,n.useState)({cekCeir:[],barcode:[]}),m=e=>{f(e),window.localStorage.setItem(s,JSON.stringify(e)),window.dispatchEvent(new CustomEvent("menu_settings_updated",{detail:e}))};return(0,n.useEffect)(()=>{!async function(){try{let[e,a,t]=await Promise.all([fetch(`${o.H$}/auth/me`,{credentials:"include"}).catch(()=>null),fetch(`${o.H$}/admin/menu-settings`,{credentials:"include"}).catch(()=>null),fetch(`${o.H$}/admin/ceirgo-display-settings`,{credentials:"include"}).catch(()=>null)]);if(e&&e.ok){let a=await (0,o.oi)(e);a&&a.status&&a.user&&r(a.user)}if(a&&a.ok){let e=await (0,o.oi)(a);e&&e.status&&m({showBeliPaket:!!e.data?.showBeliPaket})}if(t&&t.ok){let e=await (0,o.oi)(t);e&&e.status&&h({cekCeir:Array.isArray(e.data?.cekCeir)?e.data.cekCeir:[],barcode:Array.isArray(e.data?.barcode)?e.data.barcode:[]})}}catch(e){console.error("Failed to load initial data:",e)}finally{p(!1)}}()},[]),(0,n.useEffect)(()=>{if(!a)return;let e=new EventSource(`${o.H$}/stream`,{withCredentials:!0});return e.addEventListener("balance_update",e=>{try{let a=JSON.parse(e.data);"number"==typeof a.balance&&(r(e=>e?{...e,balance:a.balance}:null),window.dispatchEvent(new CustomEvent("topup_success")))}catch(e){}}),()=>e.close()},[a]),(0,t.jsx)(c.Provider,{value:{user:a,loading:l,menuSettings:u,ceirgoDisplaySettings:x,setUser:r,updateBalance:e=>{r(a=>a?{...a,balance:e}:null)},updateMenuSettings:m,updateCeirgoDisplaySettings:e=>{h(e)}},children:e})}function l(){let e=(0,n.useContext)(c);if(void 0===e)throw Error("useApp must be used within AppProvider");return e}},3321:(e,a,r)=>{var t=r(4645);r.o(t,"redirect")&&r.d(a,{redirect:function(){return t.redirect}}),r.o(t,"usePathname")&&r.d(a,{usePathname:function(){return t.usePathname}}),r.o(t,"useRouter")&&r.d(a,{useRouter:function(){return t.useRouter}}),r.o(t,"useSearchParams")&&r.d(a,{useSearchParams:function(){return t.useSearchParams}})},4037:(e,a,r)=>{r.d(a,{Z:()=>n});var t=r(5155);function n({children:e,className:a="",glass:r,...o}){return(0,t.jsx)("div",{className:`${r?"rounded-[18px] border border-hairline bg-parchment/80 backdrop-blur-md p-6":"rounded-[18px] border border-hairline bg-canvas p-6"} ${a}`,...o,children:e})}r(2115)},4327:(e,a,r)=>{r.d(a,{$:()=>n});var t=r(5155);function n({children:e,variant:a="primary",size:r="md",isLoading:o,className:s="",disabled:i,...c}){return(0,t.jsxs)("button",{className:`inline-flex items-center justify-center font-normal transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus disabled:pointer-events-none disabled:opacity-50 active:scale-[0.95] ${{primary:"bg-primary text-white hover:bg-primary-focus rounded-full shadow-none",secondary:"bg-transparent text-primary border border-primary rounded-full hover:bg-primary/5",outline:"border border-hairline bg-transparent hover:bg-parchment text-ink rounded-lg",ghost:"hover:bg-parchment text-ink rounded-lg",danger:"bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg",pearl:"bg-surface-pearl text-ink-muted border-[3px] border-divider rounded-[11px] hover:bg-divider"}[a]} ${{sm:"h-9 px-4 text-xs",md:"h-11 px-6 text-sm",lg:"h-14 px-8 text-base"}[r]} ${s}`,disabled:o||i,...c,children:[o?(0,t.jsxs)("svg",{className:"animate-spin -ml-1 mr-2 h-4 w-4 text-current",xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",children:[(0,t.jsx)("circle",{className:"opacity-25",cx:"12",cy:"12",r:"10",stroke:"currentColor",strokeWidth:"4"}),(0,t.jsx)("path",{className:"opacity-75",fill:"currentColor",d:"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"})]}):null,e]})}r(2115)},6987:(e,a,r)=>{r.d(a,{D:()=>o});var t=r(5155),n=r(2115);function o({isOpen:e,onClose:a,amount:r,title:s="Pembayaran Berhasil",statusText:i="Pesanan Anda telah berhasil dibuat!",recipientLabel:c="Tujuan",recipientValue:d,methodValue:l="Saldo Ry-ITSolutions"}){return((0,n.useEffect)(()=>(e?document.body.style.overflow="hidden":document.body.style.overflow="",()=>{document.body.style.overflow=""}),[e]),e)?(0,t.jsxs)("div",{className:"fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4",children:[(0,t.jsx)("style",{dangerouslySetInnerHTML:{__html:`
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
      `}}),(0,t.jsxs)("div",{className:"app-screen",children:[(0,t.jsx)("div",{className:"green-bg"}),(0,t.jsxs)("div",{className:"confetti-container",children:[(0,t.jsx)("div",{className:"particle p1"}),(0,t.jsx)("div",{className:"particle p2"}),(0,t.jsx)("div",{className:"particle p3"}),(0,t.jsx)("div",{className:"particle p4"}),(0,t.jsx)("div",{className:"particle p5"}),(0,t.jsx)("div",{className:"particle p6"})]}),(0,t.jsxs)("div",{className:"success-card",children:[(0,t.jsx)("div",{className:"icon-wrapper",children:(0,t.jsx)("svg",{className:"checkmark-svg",viewBox:"0 0 52 52",children:(0,t.jsx)("path",{className:"checkmark-check",fill:"none",d:"M14 27 l7 7 l17 -17"})})}),(0,t.jsx)("div",{className:"badge-success-pop",children:s}),(0,t.jsxs)("div",{className:"amount-pop",children:["Rp ",r.toLocaleString("id-ID")]}),(0,t.jsx)("p",{className:"status-text-pop",children:i}),(0,t.jsxs)("div",{className:"info-box-pop text-white",children:[(0,t.jsxs)("div",{className:"info-row-pop",children:[(0,t.jsx)("span",{className:"info-label-pop",children:c}),(0,t.jsx)("span",{className:"info-value-pop",children:d})]}),(0,t.jsxs)("div",{className:"info-row-pop",children:[(0,t.jsx)("span",{className:"info-label-pop",children:"Metode"}),(0,t.jsx)("span",{className:"info-value-pop",children:l})]})]}),(0,t.jsx)("button",{className:"btn-done-pop",onClick:a,children:"Mantap, Selesai!"})]})]})]}):null}},7529:(e,a,r)=>{r.d(a,{H$:()=>t,gI:()=>i,iD:()=>o,oi:()=>n,ri:()=>s});let t="/api";async function n(e){try{let a=await e;if(!a)return null;let r=a.headers?.get("content-type");if(!r||!r.includes("application/json"))return null;return await a.json()}catch(e){return null}}async function o(e,a){let r=await fetch(`${t}/auth/login`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e,password:a})}),o=await n(r);if(!r.ok)throw Error(o?.message||"Gagal login");return o}async function s(){let e=await fetch(`${t}/auth/logout`,{method:"POST",credentials:"include"});if(!e.ok)throw Error("Gagal logout");return await n(e)}async function i(){let e=await fetch(`${t}/user/packages?t=${Date.now()}`,{cache:"no-store",credentials:"include"});if(!e.ok)throw Error("Gagal mengambil daftar paket");let a=await n(e);return a?.data||[]}}}]);