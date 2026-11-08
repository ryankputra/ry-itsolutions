(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[1016,7177],{16890:(e,t,r)=>{"use strict";r.d(t,{AntiScreenshotGuard:()=>p});var a=r(95155),n=r(12115),i=r(47650),o=r(61822),s=r(69203),l=r(11012),c=r(5736),d=r(50981),m=r(25182),u=r(89034);function p(){let{user:e}=(0,o.n)(),t=e?.role==="admin",[r,p]=(0,n.useState)(!1),[h,b]=(0,n.useState)(!1),g=!t||r,x=(0,n.useRef)(null),f=(0,n.useRef)(null);(0,n.useEffect)(()=>{b(!0)},[]);let y=(0,n.useMemo)(()=>e?.phone||e?.verifiedPhone||e?.email||e?.name||"GUEST_USER",[e]),k=(0,n.useMemo)(()=>e?.id?String(e.id).slice(0,8):"GUEST",[e]);(0,n.useEffect)(()=>{let e=x.current,t=()=>{document.body.classList.remove("privacy-shield-active"),e&&(e.style.opacity="0",e.style.pointerEvents="none",e.style.visibility="hidden"),f.current&&(clearTimeout(f.current),f.current=null)};if(!g)return void t();let r=(r=0)=>{document.body.classList.add("privacy-shield-active"),e&&(e.style.opacity="1",e.style.pointerEvents="auto",e.style.visibility="visible"),f.current&&clearTimeout(f.current),r>0&&(f.current=setTimeout(()=>{t()},r))},a=e=>{let t=e.ctrlKey||e.metaKey;if("AudioVolumeDown"===e.key||"VolumeDown"===e.key||"VolumeDown"===e.code||174===e.keyCode||25===e.keyCode||174===e.which||25===e.which||"AudioVolumeUp"===e.key||"VolumeUp"===e.key||"VolumeUp"===e.code||175===e.keyCode||24===e.keyCode||175===e.which||24===e.which)return void r(3500);if("PrintScreen"===e.key||"PrintScreen"===e.code||(t||"Meta"===e.key)&&e.shiftKey&&("s"===e.key||"S"===e.key||"KeyS"===e.code)){e.preventDefault(),r();return}if("Meta"===e.key||e.altKey&&("PrintScreen"===e.key||"PrintScreen"===e.code))return void r();if(t&&("p"===e.key||"P"===e.key||"KeyP"===e.code)||t&&("s"===e.key||"S"===e.key||"KeyS"===e.code)||"F12"===e.key||t&&e.shiftKey&&["i","I","j","J","c","C"].includes(e.key)||t&&("u"===e.key||"U"===e.key)){e.preventDefault(),r();return}},n=e=>{("PrintScreen"===e.key||"PrintScreen"===e.code)&&navigator.clipboard?.writeText&&navigator.clipboard.writeText("⚠️ Tangkapan layar dinonaktifkan demi privasi dan keamanan akun (RY-ITSOLUTIONS).").catch(()=>{})},i=()=>{r()},o=()=>{setTimeout(()=>{t()},250)},s=()=>{document.hidden?r():setTimeout(()=>{t()},250)},l=e=>{e.touches&&e.touches.length>=3&&r(3e3)},c=e=>{e.preventDefault()},d=e=>{e.preventDefault()};return window.addEventListener("keydown",a,{capture:!0,passive:!1}),window.addEventListener("keyup",n,{capture:!0,passive:!0}),window.addEventListener("blur",i,{capture:!0}),window.addEventListener("focus",o,{capture:!0}),document.addEventListener("visibilitychange",s),window.addEventListener("touchstart",l,{passive:!0}),document.addEventListener("contextmenu",c),document.addEventListener("dragstart",d),()=>{t(),window.removeEventListener("keydown",a,{capture:!0}),window.removeEventListener("keyup",n,{capture:!0}),window.removeEventListener("blur",i,{capture:!0}),window.removeEventListener("focus",o,{capture:!0}),document.removeEventListener("visibilitychange",s),window.removeEventListener("touchstart",l),document.removeEventListener("contextmenu",c),document.removeEventListener("dragstart",d)}},[g]);let v=(0,a.jsx)("div",{ref:x,id:"privacy-screen-shield",style:{opacity:0,pointerEvents:"none",visibility:"hidden",transform:"translateZ(0)",willChange:"opacity",transition:"none"},className:"fixed inset-0 z-[2147483647] flex flex-col items-center justify-center bg-black/90 backdrop-blur-2xl p-6 text-center select-none",onClick:()=>{document.body.classList.remove("privacy-shield-active"),x.current&&(x.current.style.opacity="0",x.current.style.pointerEvents="none",x.current.style.visibility="hidden")},children:(0,a.jsxs)("div",{className:"flex max-w-sm w-full flex-col items-center rounded-3xl border border-rose-500/40 bg-[#121214] p-7 shadow-2xl text-white",onClick:e=>e.stopPropagation(),children:[(0,a.jsx)("div",{className:"mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-500 ring-4 ring-rose-500/10",children:(0,a.jsx)(s.A,{className:"h-9 w-9 animate-pulse"})}),(0,a.jsxs)("div",{className:"inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1 text-[11px] font-extrabold text-rose-400 border border-rose-500/20 mb-3",children:[(0,a.jsx)(l.A,{className:"h-3.5 w-3.5"}),(0,a.jsx)("span",{children:"TANGKAPAN LAYAR TERDETEKSI"})]}),(0,a.jsx)("h2",{className:"text-xl font-black tracking-tight text-white",children:"Layar Dilindungi"}),(0,a.jsx)("p",{className:"mt-2 text-xs font-medium leading-relaxed text-neutral-300",children:"Tangkapan layar dinonaktifkan demi privasi transaksi dan keamanan akun Anda di RY-ITSOLUTIONS."}),(0,a.jsxs)("div",{className:"mt-4 w-full rounded-2xl bg-white/5 p-3 text-left border border-white/5 space-y-1",children:[(0,a.jsx)("div",{className:"text-[10px] font-bold text-neutral-400 uppercase tracking-wider",children:"Informasi Sesi Pengguna:"}),(0,a.jsx)("div",{className:"text-xs font-mono font-bold text-emerald-400 truncate",children:y}),(0,a.jsxs)("div",{className:"text-[10px] font-mono text-neutral-400",children:["ID Akun: #",k," • Status: Terlindungi"]})]}),(0,a.jsx)("button",{type:"button",onClick:()=>{document.body.classList.remove("privacy-shield-active"),x.current&&(x.current.style.opacity="0",x.current.style.pointerEvents="none",x.current.style.visibility="hidden")},className:"mt-5 w-full rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 py-3.5 text-xs font-black text-white shadow-lg shadow-rose-600/30 transition-transform active:scale-95 cursor-pointer hover:brightness-110",children:"Buka Kunci Layar"})]})});return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)("style",{dangerouslySetInnerHTML:{__html:`
            @media print {
              body, html { display: none !important; }
            }
            ${g?`
              body {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
                -webkit-touch-callout: none !important;
              }
              img {
                -webkit-user-drag: none !important;
                user-drag: none !important;
                pointer-events: none;
              }
              /* Hanya blur konten anak body KECUALI portal #privacy-screen-shield */
              body.privacy-shield-active > *:not(#privacy-screen-shield) {
                filter: blur(40px) brightness(0.25) !important;
                pointer-events: none !important;
                user-select: none !important;
              }
            `:""}
          `}}),g&&(0,a.jsx)("div",{className:"pointer-events-none fixed bottom-2 left-1/2 -translate-x-1/2 z-[40] select-none opacity-60 hover:opacity-90 transition-opacity","aria-hidden":"true",children:(0,a.jsxs)("div",{className:"flex items-center gap-1.5 rounded-full border border-slate-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-900/80 px-3 py-0.5 text-[10px] font-mono font-medium text-slate-700 dark:text-neutral-200 backdrop-blur-md shadow-sm",children:[(0,a.jsx)(c.A,{className:"h-3 w-3 text-primary"}),(0,a.jsxs)("span",{children:["SECURE SESSION: ",y," • ID:",k]})]})}),h&&(0,i.createPortal)(v,document.body),t&&(0,a.jsxs)("div",{className:"fixed bottom-4 right-4 z-[99999] flex items-center gap-2 rounded-full border border-slate-300 dark:border-neutral-700 bg-white/95 dark:bg-neutral-900/95 px-3 py-1.5 shadow-xl backdrop-blur-md text-[11px] font-bold text-slate-800 dark:text-neutral-100",children:[(0,a.jsx)(d.A,{className:"h-3.5 w-3.5 text-emerald-500"}),(0,a.jsx)("span",{children:"Admin"}),(0,a.jsxs)("button",{type:"button",onClick:()=>p(!r),className:`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black transition-all cursor-pointer ${r?"bg-rose-500 text-white shadow-sm":"bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-200 hover:text-black dark:hover:text-white"}`,title:"Klik untuk mensimulasikan tampilan pengguna biasa (Anti-Screenshot Aktif)",children:[r?(0,a.jsx)(m.A,{className:"h-3 w-3"}):(0,a.jsx)(u.A,{className:"h-3 w-3"}),r?"Simulasi User: AKTIF":"Tes Mode User"]})]})]})}},40721:(e,t,r)=>{"use strict";r.d(t,{DynamicThemeProvider:()=>m,G:()=>u});var a=r(95155),n=r(12115),i=r(27529),o=r(39092),s=r.n(o);function l({config:e}){let[t,r]=(0,n.useState)([]),[i,o]=(0,n.useState)(!1);return((0,n.useEffect)(()=>{if(o(!0),!e||!e.enabled||!e.particle_svgs||0===e.particle_svgs.length||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return void r([]);let t=window.innerWidth<640?e.particle_count_mobile||4:e.particle_count_desktop||8,a="fast"===e.speed?8:"medium"===e.speed?12:16;r(Array.from({length:t},(t,r)=>({id:r,svgUrl:e.particle_svgs[r%e.particle_svgs.length],left:Math.round(90*Math.random()+5),size:Math.round(5*Math.random()+11),duration:Math.round((a+6*Math.random())*10)/10,delay:Math.round(8*Math.random()*10)/10,rotation:Math.round(360*Math.random()),drift:Math.round((Math.random()-.5)*30)})))},[e]),i&&e?.enabled&&0!==t.length)?(0,a.jsxs)("div",{"aria-hidden":"true",className:"jsx-59675e8bc51853ac fixed inset-0 pointer-events-none overflow-hidden z-20 select-none",children:[t.map(e=>(0,a.jsx)("img",{src:e.svgUrl,alt:"",style:{left:`${e.left}%`,top:"-24px",width:`${e.size}px`,height:`${e.size}px`,animation:`floatingDriftDown ${e.duration}s cubic-bezier(0.4, 0, 0.2, 1) infinite`,animationDelay:`${e.delay}s`,transform:`rotate(${e.rotation}deg)`},className:"jsx-59675e8bc51853ac absolute will-change-transform opacity-25 dark:opacity-20 select-none pointer-events-none"},e.id)),(0,a.jsx)(s(),{id:"59675e8bc51853ac",children:"@-webkit-keyframes floatingDriftDown{0%{-webkit-transform:translatey(-24px)rotate(0deg)translatex(0);transform:translatey(-24px)rotate(0deg)translatex(0);opacity:0}15%{opacity:.28}85%{opacity:.28}100%{-webkit-transform:translatey(105vh)rotate(360deg)translatex(20px);transform:translatey(105vh)rotate(360deg)translatex(20px);opacity:0}}@-moz-keyframes floatingDriftDown{0%{-moz-transform:translatey(-24px)rotate(0deg)translatex(0);transform:translatey(-24px)rotate(0deg)translatex(0);opacity:0}15%{opacity:.28}85%{opacity:.28}100%{-moz-transform:translatey(105vh)rotate(360deg)translatex(20px);transform:translatey(105vh)rotate(360deg)translatex(20px);opacity:0}}@-o-keyframes floatingDriftDown{0%{-o-transform:translatey(-24px)rotate(0deg)translatex(0);transform:translatey(-24px)rotate(0deg)translatex(0);opacity:0}15%{opacity:.28}85%{opacity:.28}100%{-o-transform:translatey(105vh)rotate(360deg)translatex(20px);transform:translatey(105vh)rotate(360deg)translatex(20px);opacity:0}}@keyframes floatingDriftDown{0%{-webkit-transform:translatey(-24px)rotate(0deg)translatex(0);-moz-transform:translatey(-24px)rotate(0deg)translatex(0);-o-transform:translatey(-24px)rotate(0deg)translatex(0);transform:translatey(-24px)rotate(0deg)translatex(0);opacity:0}15%{opacity:.28}85%{opacity:.28}100%{-webkit-transform:translatey(105vh)rotate(360deg)translatex(20px);-moz-transform:translatey(105vh)rotate(360deg)translatex(20px);-o-transform:translatey(105vh)rotate(360deg)translatex(20px);transform:translatey(105vh)rotate(360deg)translatex(20px);opacity:0}}"})]}):null}let c={id:"default-obsidian",name:"Apple Obsidian (Default)",category:"default",tokens:{"--theme-primary":"#0071E3","--theme-primary-hover":"#0077ED","--theme-accent":"#34C759","--theme-canvas":"#F5F5F7","--theme-parchment":"#FFFFFF","--theme-hairline":"rgba(0, 0, 0, 0.08)","--theme-header-bg":"#1D1D1F","--theme-header-text":"#FFFFFF","--theme-surface-glow":"rgba(0, 113, 227, 0.08)","--theme-card-border":"rgba(0, 0, 0, 0.08)","--theme-dark-canvas":"#000000","--theme-dark-parchment":"#161617","--theme-dark-header-bg":"#1C1C1E","--theme-dark-hairline":"rgba(255, 255, 255, 0.08)"},assets:{pattern_svg_url:"none",theme_badge_text:"Default"},ornaments:{enabled:!1,particle_svgs:[]},meta:{mode:"default_fallback",auto_schedule_enabled:!0}},d=(0,n.createContext)({theme:c,isLoading:!1,refreshTheme:async()=>{},previewTheme:()=>{}});function m({children:e}){let[t,r]=(0,n.useState)(c),[o,s]=(0,n.useState)(null),[u,p]=(0,n.useState)(!0),h=o||t,b=async()=>{try{let e=await fetch(`${i.H$}/theme/active`,{cache:"no-store",headers:{Accept:"application/json"}});if(e.ok){let t=await e.json();t.success&&t.data&&r(t.data)}}catch(e){console.warn("Could not fetch active theme, using obsidian fallback:",e)}finally{p(!1)}};(0,n.useEffect)(()=>{b();let e=setInterval(b,18e4);return()=>clearInterval(e)},[]);let g=(0,n.useMemo)(()=>{if(!h?.tokens)return"";let e=h.tokens,t="default-obsidian"===h.id,r=e["--theme-primary"]||"#0071E3",a=e["--theme-primary-hover"]||"#0077ED",n=e["--theme-accent"]||"#34C759",i=e["--theme-canvas"]||"#F5F5F7",o=e["--theme-parchment"]||"#FFFFFF",s=e["--theme-hairline"]||"rgba(0, 0, 0, 0.08)",l=e["--theme-header-bg"]||"#1D1D1F",c=e["--theme-header-text"]||"#FFFFFF",d=e["--theme-surface-glow"]||"rgba(0, 113, 227, 0.08)",m=e["--theme-card-border"]||"rgba(0, 0, 0, 0.08)",u=e["--theme-dark-canvas"]||"#000000",p=e["--theme-dark-parchment"]||"#161617",b=e["--theme-dark-header-bg"]||"#1C1C1E",g=e["--theme-dark-hairline"]||"rgba(255, 255, 255, 0.08)";return t?`
        :root {
          --color-primary: #0071E3;
          --color-primary-hover: #0077ED;
          --theme-primary: #0071E3;
          --theme-accent: #34C759;
          --theme-canvas: #F5F5F7;
          --theme-parchment: #FFFFFF;
          --theme-header-bg: #1D1D1F;
          --theme-header-text: #FFFFFF;
        }
        .dark {
          --color-primary: #2997FF;
          --color-primary-hover: #52A9FF;
        }
      `:`
      :root {
        --color-primary: ${r} !important;
        --color-primary-hover: ${a} !important;
        --color-primary-focus: ${a} !important;
        --color-primary-on-dark: ${r} !important;
        --color-canvas: ${i} !important;
        --color-parchment: ${o} !important;
        --color-surface-tile: ${l} !important;
        --color-hairline: ${s} !important;
        --background: ${i} !important;
        --theme-primary: ${r} !important;
        --theme-primary-hover: ${a} !important;
        --theme-accent: ${n} !important;
        --theme-canvas: ${i} !important;
        --theme-parchment: ${o} !important;
        --theme-surface-glow: ${d} !important;
        --theme-card-border: ${m} !important;
        --theme-header-bg: ${l} !important;
        --theme-header-text: ${c} !important;
      }

      .dark {
        --color-primary: ${r} !important;
        --color-primary-hover: ${a} !important;
        --color-canvas: ${u} !important;
        --color-parchment: ${p} !important;
        --color-surface-tile: ${b} !important;
        --color-hairline: ${g} !important;
        --background: ${u} !important;
        --theme-canvas: ${u} !important;
        --theme-parchment: ${p} !important;
        --theme-header-bg: ${b} !important;
      }

      /* 1. Global Page Background Transformation */
      body {
        background-color: ${i} !important;
        transition: background-color 0.4s ease;
      }
      .dark body {
        background-color: ${u} !important;
      }

      html:not(.dark) .bg-canvas,
      :not(.dark) .bg-canvas {
        background-color: ${i} !important;
      }
      .dark .bg-canvas {
        background-color: ${u} !important;
      }

      /* 2. Global Card & Container Surfaces: Light vs Dark Isolation */
      html:not(.dark) .bg-parchment,
      :not(.dark) .bg-parchment,
      html:not(.dark) .bg-white,
      :not(.dark) .bg-white {
        background-color: ${o} !important;
      }
      .dark .bg-parchment,
      .dark .bg-white,
      .dark .bg-slate-900,
      .dark [class*="dark:bg-[#161617]"],
      .dark [class*="dark:bg-[#1C1C1E]"],
      .dark [class*="dark:bg-[#1c1c1e]"],
      .dark [class*="dark:bg-[#2C2C2E]"] {
        background-color: ${p} !important;
      }

      /* 3. Global Hairlines & Borders */
      html:not(.dark) .border-hairline,
      :not(.dark) .border-hairline,
      html:not(.dark) .divide-hairline > * + *,
      :not(.dark) .divide-hairline > * + *,
      :not(.dark) .border-black/[0.05],
      :not(.dark) .border-black/[0.06],
      :not(.dark) .divide-black/[0.05] > * + * {
        border-color: ${s} !important;
      }
      .dark .border-hairline,
      .dark .divide-hairline > * + *,
      .dark .border-white/[0.08],
      .dark .border-white/[0.06],
      .dark .divide-white/[0.06] > * + * {
        border-color: ${g} !important;
      }

      /* 4. Luxury Obsidian Titanium Cards (Wallet, Voucher Banner, Profile Card) */
      html:not(.dark) .bg-[#1D1D1F],
      :not(.dark) .bg-[#1D1D1F],
      :not(.dark) .bg-[#1d1d1f],
      :not(.dark) .bg-surface-tile {
        background-color: ${l} !important;
        border-color: ${m} !important;
      }
      .dark .bg-[#1D1D1F],
      .dark .bg-[#1d1d1f],
      .dark .bg-surface-tile {
        background-color: ${b} !important;
        border-color: ${g} !important;
      }

      /* 5. Primary Semantic Colors */
      .bg-primary {
        background-color: ${r} !important;
      }
      .hover\\:bg-primary-hover:hover {
        background-color: ${a} !important;
      }
      .text-primary {
        color: ${r} !important;
      }
      .hover\\:text-primary:hover {
        color: ${a} !important;
      }
      .group:hover .group-hover\\:text-primary {
        color: ${r} !important;
      }
      .border-primary {
        border-color: ${r} !important;
      }
      .ring-primary {
        --tw-ring-color: ${r} !important;
      }
      .bg-primary\\/5 {
        background-color: color-mix(in srgb, ${r} 5%, transparent) !important;
      }
      .bg-primary\\/10 {
        background-color: color-mix(in srgb, ${r} 10%, transparent) !important;
      }
      .bg-primary\\/15 {
        background-color: color-mix(in srgb, ${r} 15%, transparent) !important;
      }
      .bg-primary\\/20 {
        background-color: color-mix(in srgb, ${r} 20%, transparent) !important;
      }
      .group:hover .group-hover\\:bg-primary\\/20 {
        background-color: color-mix(in srgb, ${r} 20%, transparent) !important;
      }
      .border-primary\\/20 {
        border-color: color-mix(in srgb, ${r} 20%, transparent) !important;
      }
      .border-primary\\/30 {
        border-color: color-mix(in srgb, ${r} 30%, transparent) !important;
      }
      .border-primary\\/40 {
        border-color: color-mix(in srgb, ${r} 40%, transparent) !important;
      }

      /* 6. Strict Fallback for Legacy Hardcoded Hex Selectors (Exact match [class~="..."] to never clobber /10 or group-hover) */
      [class~="bg-[#0071E3]"], [class~="bg-[#0071e3]"] {
        background-color: ${r} !important;
      }
      [class~="bg-[#0071E3]/10"], [class~="bg-[#0071e3]/10"] {
        background-color: color-mix(in srgb, ${r} 10%, transparent) !important;
      }
      [class~="bg-[#0071E3]/15"], [class~="bg-[#0071e3]/15"] {
        background-color: color-mix(in srgb, ${r} 15%, transparent) !important;
      }
      [class~="bg-[#0071E3]/20"], [class~="bg-[#0071e3]/20"] {
        background-color: color-mix(in srgb, ${r} 20%, transparent) !important;
      }
      [class~="text-[#0071E3]"], [class~="text-[#0071e3]"], [class~="text-[#2997FF]"], [class~="text-[#2997ff]"] {
        color: ${r} !important;
      }
      [class~="border-[#0071E3]"], [class~="border-[#0071e3]"] {
        border-color: ${r} !important;
      }
      [class~="border-[#0071E3]/20"], [class~="border-[#0071e3]/20"] {
        border-color: color-mix(in srgb, ${r} 20%, transparent) !important;
      }
      [class~="border-[#0071E3]/30"], [class~="border-[#0071e3]/30"] {
        border-color: color-mix(in srgb, ${r} 30%, transparent) !important;
      }
      [class~="hover:bg-[#0077ED]"]:hover, [class~="hover:bg-[#0071E3]"]:hover {
        background-color: ${a} !important;
      }
      .group:hover [class~="group-hover:text-[#0071E3]"] {
        color: ${r} !important;
      }
      .group:hover [class~="group-hover:bg-[#0071E3]/20"] {
        background-color: color-mix(in srgb, ${r} 20%, transparent) !important;
      }

      /* 7. Navigation Bar Active Highlights */
      .bg-white\\/80, .dark .bg-\\[\\#161617\\]\\/80 {
        border-color: ${s} !important;
      }

      /* 8. Ambient Glowing Shadows */
      .theme-glow {
        box-shadow: 0 4px 28px ${d} !important;
      }
    `},[h]);return(0,a.jsxs)(d.Provider,{value:{theme:h,isLoading:u,refreshTheme:b,previewTheme:s},children:[(0,a.jsx)("style",{id:"dynamic-theme-vars",dangerouslySetInnerHTML:{__html:g}}),h?.id!=="default-obsidian"&&(0,a.jsx)("div",{className:"fixed top-0 left-0 right-0 h-64 pointer-events-none z-0 opacity-15 dark:opacity-20 transition-opacity duration-700 select-none",style:{background:`radial-gradient(ellipse 110% 70% at 50% -20%, ${h.tokens["--theme-primary"]}, transparent 75%)`},"aria-hidden":"true"}),h?.id!=="default-obsidian"&&(0,a.jsx)("div",{className:"fixed bottom-0 left-0 right-0 h-40 pointer-events-none z-0 opacity-10 dark:opacity-15 transition-opacity duration-700 select-none",style:{background:`radial-gradient(ellipse 100% 70% at 50% 120%, ${h.tokens["--theme-primary"]}, transparent 75%)`},"aria-hidden":"true"}),h?.ornaments?.enabled&&(0,a.jsx)(l,{config:h.ornaments}),h?.id!=="default-obsidian"&&(0,a.jsxs)("aside",{className:"w-full py-1.5 px-4 text-xs font-medium text-white flex items-center justify-center gap-2.5 select-none relative z-40 transition-colors border-b border-white/10 backdrop-blur-md",style:{background:`linear-gradient(90deg, rgba(20,20,22,0.95) 0%, color-mix(in srgb, ${h.tokens["--theme-primary"]} 22%, rgba(20,20,22,0.95)) 50%, rgba(20,20,22,0.95) 100%)`},children:[(0,a.jsxs)("span",{className:"inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white",style:{backgroundColor:`color-mix(in srgb, ${h.tokens["--theme-primary"]} 35%, transparent)`,border:`1px solid color-mix(in srgb, ${h.tokens["--theme-primary"]} 50%, transparent)`},children:[(0,a.jsx)("span",{className:"w-1.5 h-1.5 rounded-full animate-pulse",style:{backgroundColor:h.tokens["--theme-primary"]}}),h.meta?.event_name||"Edisi Perayaan"]}),(0,a.jsx)("span",{className:"text-xs text-white/90 font-medium tracking-tight",children:h.name})]}),e]})}function u(){return(0,n.useContext)(d)}},51016:(e,t,r)=>{"use strict";function a(e){let t="=".repeat((4-e.length%4)%4),r=(e+t).replace(/-/g,"+").replace(/_/g,"/"),a=window.atob(r),n=new Uint8Array(a.length);for(let e=0;e<a.length;++e)n[e]=a.charCodeAt(e);return n}function n(){return"serviceWorker"in navigator&&"PushManager"in window&&"Notification"in window}function i(){return"Notification"in window?Notification.permission:"unsupported"}async function o(){if(!("serviceWorker"in navigator))return null;try{let e=await navigator.serviceWorker.register("/sw.js");return console.log("Service Worker registered successfully:",e),e}catch(e){return console.error("Service Worker registration failed:",e),null}}async function s(){if(!n())return{success:!1,message:"Browser perangkat ini belum mendukung Web Push Notifications (misal: iOS memerlukan Add to Home Screen)."};try{let e=await Notification.requestPermission();if("granted"!==e)return{success:!1,message:"Izin notifikasi belum diberikan. Silakan izinkan notifikasi pada pop-up browser."};let t=await o();if(!t)return{success:!1,message:"Gagal mengaktifkan Service Worker di browser Anda."};let r=await fetch("/api/push/vapid-public-key"),n=await r.json();if(!n?.status||!n.publicKey)return{success:!1,message:"Kunci VAPID push notifikasi server tidak tersedia."};let i=await t.pushManager.getSubscription();if(!i){let e=a(n.publicKey);i=await t.pushManager.subscribe({userVisibleOnly:!0,applicationServerKey:e})}let s=await fetch("/api/push/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({subscription:i})}),l=await s.json();if(l?.status)return{success:!0,message:"Notifikasi status bar HP berhasil diaktifkan!",subscription:i};return{success:!1,message:l?.message||"Gagal mendaftarkan perangkat ke server."}}catch(e){return console.error("[PushClient] Error subscribing:",e),{success:!1,message:e?.message||"Terjadi gangguan saat mendaftarkan notifikasi."}}}async function l(){if(!n()||"granted"!==Notification.permission)return!1;try{let e=await o();if(!e)return!1;let t=await fetch("/api/push/vapid-public-key"),r=await t.json();if(!r?.status||!r.publicKey)return!1;let n=await e.pushManager.getSubscription();if(!n){let t=a(r.publicKey);n=await e.pushManager.subscribe({userVisibleOnly:!0,applicationServerKey:t})}return await fetch("/api/push/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({subscription:n})}),!0}catch(e){return console.warn("[PushClient] Auto-sync skipped:",e),!1}}async function c(){try{let e=await o(),t=e?await e.pushManager.getSubscription():null,r=await fetch("/api/push/test-me",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({endpoint:t?.endpoint})}),a=await r.json();return{success:!!a.status,message:a.message||(a.status?"Notifikasi tes terkirim!":"Gagal mengirim")}}catch(e){return{success:!1,message:e?.message||"Gagal menghubungi server untuk uji notifikasi."}}}r.r(t),r.d(t,{autoSyncPushIfGranted:()=>l,getNotificationPermission:()=>i,isPushSupported:()=>n,registerServiceWorker:()=>o,subscribeToPushNotifications:()=>s,testPushNotification:()=>c})},51743:()=>{},54327:(e,t,r)=>{"use strict";r.d(t,{$:()=>n});var a=r(95155);function n({children:e,variant:t="primary",size:r="md",isLoading:i,className:o="",disabled:s,...l}){return(0,a.jsxs)("button",{className:`inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] ${{primary:"bg-gray-900 text-white hover:bg-gray-800 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-transparent",secondary:"bg-white text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 shadow-[0_1px_2px_rgba(0,0,0,0.02)]",outline:"border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.02)]",ghost:"hover:bg-gray-100/70 text-gray-600 hover:text-gray-900 rounded-lg",danger:"bg-red-50 text-red-600 hover:bg-red-100/80 border border-red-200/60 rounded-lg",pearl:"bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100"}[t]} ${{sm:"h-8 px-3 text-xs tracking-tight",md:"h-10 px-4 text-sm tracking-tight",lg:"h-12 px-6 text-sm tracking-tight"}[r]} ${o}`,disabled:i||s,...l,children:[i?(0,a.jsxs)("svg",{className:"animate-spin -ml-1 mr-2 h-4 w-4 text-current",xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",children:[(0,a.jsx)("circle",{className:"opacity-25",cx:"12",cy:"12",r:"10",stroke:"currentColor",strokeWidth:"4"}),(0,a.jsx)("path",{className:"opacity-75",fill:"currentColor",d:"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"})]}):null,e]})}r(12115)},54828:(e,t,r)=>{"use strict";r.d(t,{PushNotificationBanner:()=>u});var a=r(95155),n=r(12115),i=r(9005),o=r(15298),s=r(86272),l=r(54327),c=r(88637),d=r(51016);let m="ry_push_dismissed_until",u=()=>{let[e,t]=(0,n.useState)(!1),[r,u]=(0,n.useState)(!1),[p,h]=(0,n.useState)(!1);(0,n.useEffect)(()=>{let e=(0,d.isPushSupported)();if(h(e),!e)return;let r=(0,d.getNotificationPermission)();if("granted"===r)return void(0,d.autoSyncPushIfGranted)();if("denied"===r)return;let a=localStorage.getItem(m);if(a&&Date.now()<Number(a))return;let n=setTimeout(()=>{t(!0)},1200);return()=>clearTimeout(n)},[]);let b=()=>{t(!1);try{localStorage.setItem(m,String(Date.now()+6048e5))}catch(e){}},g=async()=>{u(!0);try{let e=await (0,d.subscribeToPushNotifications)();e.success?(t(!1),await (0,d.testPushNotification)(),c.default.fire({title:"Notifikasi Bar HP Aktif! \uD83D\uDD14",text:"Pemberitahuan layanan baru & promo spesial kini akan langsung berdering di status bar HP Anda.",icon:"success",timer:3500,showConfirmButton:!1})):"denied"===Notification.permission?(t(!1),c.default.fire({title:"Izin Notifikasi Diblokir",text:"Izin notifikasi diblokir di setelan browser. Ketuk ikon gembok \uD83D\uDD12 di sebelah alamat web browser Anda -> Izin -> Izinkan Notifikasi.",icon:"warning"})):c.default.fire({title:"Perhatian",text:e.message,icon:"info"})}catch(e){console.error("[PushBanner] Subscribe error:",e)}finally{u(!1)}};return p&&e?(0,a.jsx)("div",{className:"fixed bottom-24 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 z-50 max-w-md animate-in slide-in-from-bottom-5 duration-300",children:(0,a.jsxs)("div",{className:"relative p-4 sm:p-4.5 rounded-2xl border border-primary/30 bg-canvas/95 backdrop-blur-md shadow-2xl space-y-3 ring-1 ring-primary/20",children:[(0,a.jsx)("button",{onClick:b,className:"absolute top-3 right-3 text-ink-muted hover:text-ink transition-colors p-1 rounded-lg","aria-label":"Tutup",children:(0,a.jsx)(i.A,{className:"w-4 h-4"})}),(0,a.jsxs)("div",{className:"flex items-start gap-3 pr-6",children:[(0,a.jsxs)("div",{className:"relative p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20",children:[(0,a.jsx)(o.A,{className:"w-5 h-5 animate-bounce"}),(0,a.jsxs)("span",{className:"absolute -top-1 -right-1 flex h-2.5 w-2.5",children:[(0,a.jsx)("span",{className:"animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"}),(0,a.jsx)("span",{className:"relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"})]})]}),(0,a.jsxs)("div",{className:"min-w-0 space-y-1",children:[(0,a.jsxs)("h4",{className:"text-xs sm:text-sm font-bold text-ink flex items-center gap-1.5",children:[(0,a.jsx)("span",{children:"Aktifkan Notifikasi Bar HP"}),(0,a.jsx)(s.A,{className:"w-3.5 h-3.5 text-amber-500 shrink-0"})]}),(0,a.jsx)("p",{className:"text-[11px] sm:text-xs text-ink-muted leading-relaxed",children:"Dapatkan info di status bar HP saat ada layanan baru (misal: Add Roamer) & promo diskon spesial."})]})]}),(0,a.jsxs)("div",{className:"flex items-center justify-end gap-2 pt-1",children:[(0,a.jsx)("button",{onClick:b,className:"px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink transition-colors",children:"Nanti Saja"}),(0,a.jsx)(l.$,{size:"sm",className:"h-8 px-4 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 text-white shadow-xs",onClick:g,isLoading:r,children:"Aktifkan Sekarang"})]})]})}):null}},55755:(e,t,r)=>{"use strict";r.d(t,{NavigationProgressBar:()=>o});var a=r(95155),n=r(12115),i=r(73321);function o(){let e=(0,i.usePathname)(),[t,r]=(0,n.useState)(!1),[o,s]=(0,n.useState)(0);return((0,n.useEffect)(()=>{if(t||o>0){s(100);let e=setTimeout(()=>{r(!1),s(0)},350);return()=>clearTimeout(e)}},[e]),(0,n.useEffect)(()=>{let e=e=>{let t=e.target.closest("a");if(!t)return;let a=t.getAttribute("href");if(a&&a.startsWith("/")&&!a.startsWith("//")&&!t.getAttribute("target")&&!t.getAttribute("download")){if("u">typeof navigator&&"function"==typeof navigator.vibrate)try{navigator.vibrate(15)}catch{}r(!0),s(30);let e=setTimeout(()=>s(e=>e<70?70:e),100),t=setTimeout(()=>s(e=>e<88?88:e),300);return()=>{clearTimeout(e),clearTimeout(t)}}};return document.addEventListener("click",e,{capture:!0}),()=>document.removeEventListener("click",e,{capture:!0})},[e]),t||0!==o)?(0,a.jsx)("div",{className:"fixed top-0 left-0 right-0 z-[999999] pointer-events-none h-[3.5px] bg-transparent overflow-hidden",children:(0,a.jsx)("div",{className:"h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 shadow-[0_0_15px_rgba(59,130,246,1)] transition-all ease-out",style:{width:`${o}%`,opacity:+(100!==o),transition:100===o?"width 0.2s ease-out, opacity 0.35s 0.1s ease":"width 0.4s cubic-bezier(0.1, 0.6, 0.1, 1)"}})}):null}},64626:(e,t,r)=>{Promise.resolve().then(r.bind(r,93053)),Promise.resolve().then(r.t.bind(r,42593,23)),Promise.resolve().then(r.t.bind(r,22824,23)),Promise.resolve().then(r.t.bind(r,51743,23)),Promise.resolve().then(r.bind(r,16890)),Promise.resolve().then(r.bind(r,55755)),Promise.resolve().then(r.bind(r,54828)),Promise.resolve().then(r.bind(r,71758)),Promise.resolve().then(r.bind(r,61822)),Promise.resolve().then(r.bind(r,40721))},71758:(e,t,r)=>{"use strict";r.d(t,{UpdateNotifier:()=>i});var a=r(95155),n=r(12115);function i(){let[e,t]=(0,n.useState)(!1);return((0,n.useEffect)(()=>{async function e(){try{let e=await fetch(`/version.json?t=${Date.now()}`,{cache:"no-store"});if(!e.ok)return;let r=await e.json(),a=r.timestamp||r.version;if(!a)return;let n=localStorage.getItem("app_build_version");n?n!==String(a)&&t(!0):localStorage.setItem("app_build_version",String(a))}catch(e){}}e();let r=setInterval(e,6e4);return()=>clearInterval(r)},[]),e)?(0,a.jsxs)("div",{className:"fixed top-20 right-4 sm:bottom-4 sm:top-auto z-50 bg-blue-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-blue-400 animate-bounce",children:[(0,a.jsxs)("div",{children:[(0,a.jsx)("p",{className:"font-bold text-sm",children:"Update Baru Tersedia! \uD83D\uDE80"}),(0,a.jsx)("p",{className:"text-xs text-blue-100",children:"Versi baru aplikasi telah di-deploy."})]}),(0,a.jsx)("button",{onClick:()=>{localStorage.removeItem("app_build_version"),window.location.reload()},className:"bg-white text-blue-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-50 transition",children:"Muat Ulang"})]}):null}}},e=>{e.O(0,[5283,3334,8320,2225,1822,8441,8928,7358],()=>e(e.s=64626)),_N_E=e.O()}]);