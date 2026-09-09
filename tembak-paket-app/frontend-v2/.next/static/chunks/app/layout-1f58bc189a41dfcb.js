(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[7177],{40721:(r,e,t)=>{"use strict";t.d(e,{DynamicThemeProvider:()=>m,G:()=>h});var a=t(95155),o=t(12115),n=t(27529),i=t(39092),s=t.n(i);function c({config:r}){let[e,t]=(0,o.useState)([]),[n,i]=(0,o.useState)(!1);return((0,o.useEffect)(()=>{if(i(!0),!r||!r.enabled||!r.particle_svgs||0===r.particle_svgs.length||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return void t([]);let e=window.innerWidth<640?r.particle_count_mobile||4:r.particle_count_desktop||8,a="fast"===r.speed?8:"medium"===r.speed?12:16;t(Array.from({length:e},(e,t)=>({id:t,svgUrl:r.particle_svgs[t%r.particle_svgs.length],left:Math.round(90*Math.random()+5),size:Math.round(5*Math.random()+11),duration:Math.round((a+6*Math.random())*10)/10,delay:Math.round(8*Math.random()*10)/10,rotation:Math.round(360*Math.random()),drift:Math.round((Math.random()-.5)*30)})))},[r]),n&&r?.enabled&&0!==e.length)?(0,a.jsxs)("div",{"aria-hidden":"true",className:"jsx-59675e8bc51853ac fixed inset-0 pointer-events-none overflow-hidden z-20 select-none",children:[e.map(r=>(0,a.jsx)("img",{src:r.svgUrl,alt:"",style:{left:`${r.left}%`,top:"-24px",width:`${r.size}px`,height:`${r.size}px`,animation:`floatingDriftDown ${r.duration}s cubic-bezier(0.4, 0, 0.2, 1) infinite`,animationDelay:`${r.delay}s`,transform:`rotate(${r.rotation}deg)`},className:"jsx-59675e8bc51853ac absolute will-change-transform opacity-25 dark:opacity-20 select-none pointer-events-none"},r.id)),(0,a.jsx)(s(),{id:"59675e8bc51853ac",children:"@keyframes floatingDriftDown{0%{transform:translatey(-24px)rotate(0deg)translatex(0);opacity:0}15%{opacity:.28}85%{opacity:.28}100%{transform:translatey(105vh)rotate(360deg)translatex(20px);opacity:0}}"})]}):null}let l={id:"default-obsidian",name:"Apple Obsidian (Default)",category:"default",tokens:{"--theme-primary":"#0071E3","--theme-primary-hover":"#0077ED","--theme-accent":"#34C759","--theme-canvas":"#F5F5F7","--theme-parchment":"#FFFFFF","--theme-hairline":"rgba(0, 0, 0, 0.08)","--theme-header-bg":"#1D1D1F","--theme-header-text":"#FFFFFF","--theme-surface-glow":"rgba(0, 113, 227, 0.08)","--theme-card-border":"rgba(0, 0, 0, 0.08)","--theme-dark-canvas":"#000000","--theme-dark-parchment":"#161617","--theme-dark-header-bg":"#1C1C1E","--theme-dark-hairline":"rgba(255, 255, 255, 0.08)"},assets:{pattern_svg_url:"none",theme_badge_text:"Default"},ornaments:{enabled:!1,particle_svgs:[]},meta:{mode:"default_fallback",auto_schedule_enabled:!0}},d=(0,o.createContext)({theme:l,isLoading:!1,refreshTheme:async()=>{},previewTheme:()=>{}});function m({children:r}){let[e,t]=(0,o.useState)(l),[i,s]=(0,o.useState)(null),[h,p]=(0,o.useState)(!0),b=i||e,g=async()=>{try{let r=await fetch(`${n.H$}/theme/active`,{cache:"no-store",headers:{Accept:"application/json"}});if(r.ok){let e=await r.json();e.success&&e.data&&t(e.data)}}catch(r){console.warn("Could not fetch active theme, using obsidian fallback:",r)}finally{p(!1)}};(0,o.useEffect)(()=>{g();let r=setInterval(g,18e4);return()=>clearInterval(r)},[]);let u=(0,o.useMemo)(()=>{if(!b?.tokens)return"";let r=b.tokens,e="default-obsidian"===b.id,t=r["--theme-primary"]||"#0071E3",a=r["--theme-primary-hover"]||"#0077ED",o=r["--theme-accent"]||"#34C759",n=r["--theme-canvas"]||"#F5F5F7",i=r["--theme-parchment"]||"#FFFFFF",s=r["--theme-hairline"]||"rgba(0, 0, 0, 0.08)",c=r["--theme-header-bg"]||"#1D1D1F",l=r["--theme-header-text"]||"#FFFFFF",d=r["--theme-surface-glow"]||"rgba(0, 113, 227, 0.08)",m=r["--theme-card-border"]||"rgba(0, 0, 0, 0.08)",h=r["--theme-dark-canvas"]||"#000000",p=r["--theme-dark-parchment"]||"#161617",g=r["--theme-dark-header-bg"]||"#1C1C1E",u=r["--theme-dark-hairline"]||"rgba(255, 255, 255, 0.08)";return e?`
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
        --color-primary: ${t} !important;
        --color-primary-hover: ${a} !important;
        --color-primary-focus: ${a} !important;
        --color-primary-on-dark: ${t} !important;
        --color-canvas: ${n} !important;
        --color-parchment: ${i} !important;
        --color-surface-tile: ${c} !important;
        --color-hairline: ${s} !important;
        --background: ${n} !important;
        --theme-primary: ${t} !important;
        --theme-primary-hover: ${a} !important;
        --theme-accent: ${o} !important;
        --theme-canvas: ${n} !important;
        --theme-parchment: ${i} !important;
        --theme-surface-glow: ${d} !important;
        --theme-card-border: ${m} !important;
        --theme-header-bg: ${c} !important;
        --theme-header-text: ${l} !important;
      }

      .dark {
        --color-primary: ${t} !important;
        --color-primary-hover: ${a} !important;
        --color-canvas: ${h} !important;
        --color-parchment: ${p} !important;
        --color-surface-tile: ${g} !important;
        --color-hairline: ${u} !important;
        --background: ${h} !important;
        --theme-canvas: ${h} !important;
        --theme-parchment: ${p} !important;
        --theme-header-bg: ${g} !important;
      }

      /* 1. Global Page Background Transformation */
      body {
        background-color: ${n} !important;
        transition: background-color 0.4s ease;
      }
      .dark body {
        background-color: ${h} !important;
      }

      html:not(.dark) .bg-canvas,
      :not(.dark) .bg-canvas {
        background-color: ${n} !important;
      }
      .dark .bg-canvas {
        background-color: ${h} !important;
      }

      /* 2. Global Card & Container Surfaces: Light vs Dark Isolation */
      html:not(.dark) .bg-parchment,
      :not(.dark) .bg-parchment,
      html:not(.dark) .bg-white,
      :not(.dark) .bg-white {
        background-color: ${i} !important;
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
        border-color: ${u} !important;
      }

      /* 4. Luxury Obsidian Titanium Cards (Wallet, Voucher Banner, Profile Card) */
      html:not(.dark) .bg-[#1D1D1F],
      :not(.dark) .bg-[#1D1D1F],
      :not(.dark) .bg-[#1d1d1f],
      :not(.dark) .bg-surface-tile {
        background-color: ${c} !important;
        border-color: ${m} !important;
      }
      .dark .bg-[#1D1D1F],
      .dark .bg-[#1d1d1f],
      .dark .bg-surface-tile {
        background-color: ${g} !important;
        border-color: ${u} !important;
      }

      /* 5. Primary Semantic Colors */
      .bg-primary {
        background-color: ${t} !important;
      }
      .hover\\:bg-primary-hover:hover {
        background-color: ${a} !important;
      }
      .text-primary {
        color: ${t} !important;
      }
      .hover\\:text-primary:hover {
        color: ${a} !important;
      }
      .group:hover .group-hover\\:text-primary {
        color: ${t} !important;
      }
      .border-primary {
        border-color: ${t} !important;
      }
      .ring-primary {
        --tw-ring-color: ${t} !important;
      }
      .bg-primary\\/5 {
        background-color: color-mix(in srgb, ${t} 5%, transparent) !important;
      }
      .bg-primary\\/10 {
        background-color: color-mix(in srgb, ${t} 10%, transparent) !important;
      }
      .bg-primary\\/15 {
        background-color: color-mix(in srgb, ${t} 15%, transparent) !important;
      }
      .bg-primary\\/20 {
        background-color: color-mix(in srgb, ${t} 20%, transparent) !important;
      }
      .group:hover .group-hover\\:bg-primary\\/20 {
        background-color: color-mix(in srgb, ${t} 20%, transparent) !important;
      }
      .border-primary\\/20 {
        border-color: color-mix(in srgb, ${t} 20%, transparent) !important;
      }
      .border-primary\\/30 {
        border-color: color-mix(in srgb, ${t} 30%, transparent) !important;
      }
      .border-primary\\/40 {
        border-color: color-mix(in srgb, ${t} 40%, transparent) !important;
      }

      /* 6. Strict Fallback for Legacy Hardcoded Hex Selectors (Exact match [class~="..."] to never clobber /10 or group-hover) */
      [class~="bg-[#0071E3]"], [class~="bg-[#0071e3]"] {
        background-color: ${t} !important;
      }
      [class~="bg-[#0071E3]/10"], [class~="bg-[#0071e3]/10"] {
        background-color: color-mix(in srgb, ${t} 10%, transparent) !important;
      }
      [class~="bg-[#0071E3]/15"], [class~="bg-[#0071e3]/15"] {
        background-color: color-mix(in srgb, ${t} 15%, transparent) !important;
      }
      [class~="bg-[#0071E3]/20"], [class~="bg-[#0071e3]/20"] {
        background-color: color-mix(in srgb, ${t} 20%, transparent) !important;
      }
      [class~="text-[#0071E3]"], [class~="text-[#0071e3]"], [class~="text-[#2997FF]"], [class~="text-[#2997ff]"] {
        color: ${t} !important;
      }
      [class~="border-[#0071E3]"], [class~="border-[#0071e3]"] {
        border-color: ${t} !important;
      }
      [class~="border-[#0071E3]/20"], [class~="border-[#0071e3]/20"] {
        border-color: color-mix(in srgb, ${t} 20%, transparent) !important;
      }
      [class~="border-[#0071E3]/30"], [class~="border-[#0071e3]/30"] {
        border-color: color-mix(in srgb, ${t} 30%, transparent) !important;
      }
      [class~="hover:bg-[#0077ED]"]:hover, [class~="hover:bg-[#0071E3]"]:hover {
        background-color: ${a} !important;
      }
      .group:hover [class~="group-hover:text-[#0071E3]"] {
        color: ${t} !important;
      }
      .group:hover [class~="group-hover:bg-[#0071E3]/20"] {
        background-color: color-mix(in srgb, ${t} 20%, transparent) !important;
      }

      /* 7. Navigation Bar Active Highlights */
      .bg-white\\/80, .dark .bg-\\[\\#161617\\]\\/80 {
        border-color: ${s} !important;
      }

      /* 8. Ambient Glowing Shadows */
      .theme-glow {
        box-shadow: 0 4px 28px ${d} !important;
      }
    `},[b]);return(0,a.jsxs)(d.Provider,{value:{theme:b,isLoading:h,refreshTheme:g,previewTheme:s},children:[(0,a.jsx)("style",{id:"dynamic-theme-vars",dangerouslySetInnerHTML:{__html:u}}),b?.id!=="default-obsidian"&&(0,a.jsx)("div",{className:"fixed top-0 left-0 right-0 h-64 pointer-events-none z-0 opacity-15 dark:opacity-20 transition-opacity duration-700 select-none",style:{background:`radial-gradient(ellipse 110% 70% at 50% -20%, ${b.tokens["--theme-primary"]}, transparent 75%)`},"aria-hidden":"true"}),b?.id!=="default-obsidian"&&(0,a.jsx)("div",{className:"fixed bottom-0 left-0 right-0 h-40 pointer-events-none z-0 opacity-10 dark:opacity-15 transition-opacity duration-700 select-none",style:{background:`radial-gradient(ellipse 100% 70% at 50% 120%, ${b.tokens["--theme-primary"]}, transparent 75%)`},"aria-hidden":"true"}),b?.ornaments?.enabled&&(0,a.jsx)(c,{config:b.ornaments}),b?.id!=="default-obsidian"&&(0,a.jsxs)("aside",{className:"w-full py-1.5 px-4 text-xs font-medium text-white flex items-center justify-center gap-2.5 select-none relative z-40 transition-colors border-b border-white/10 backdrop-blur-md",style:{background:`linear-gradient(90deg, rgba(20,20,22,0.95) 0%, color-mix(in srgb, ${b.tokens["--theme-primary"]} 22%, rgba(20,20,22,0.95)) 50%, rgba(20,20,22,0.95) 100%)`},children:[(0,a.jsxs)("span",{className:"inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white",style:{backgroundColor:`color-mix(in srgb, ${b.tokens["--theme-primary"]} 35%, transparent)`,border:`1px solid color-mix(in srgb, ${b.tokens["--theme-primary"]} 50%, transparent)`},children:[(0,a.jsx)("span",{className:"w-1.5 h-1.5 rounded-full animate-pulse",style:{backgroundColor:b.tokens["--theme-primary"]}}),b.meta?.event_name||"Edisi Perayaan"]}),(0,a.jsx)("span",{className:"text-xs text-white/90 font-medium tracking-tight",children:b.name})]}),r]})}function h(){return(0,o.useContext)(d)}},51743:()=>{},55755:(r,e,t)=>{"use strict";t.d(e,{NavigationProgressBar:()=>i});var a=t(95155),o=t(12115),n=t(73321);function i(){let r=(0,n.usePathname)(),[e,t]=(0,o.useState)(!1),[i,s]=(0,o.useState)(0);return((0,o.useEffect)(()=>{if(e||i>0){s(100);let r=setTimeout(()=>{t(!1),s(0)},350);return()=>clearTimeout(r)}},[r]),(0,o.useEffect)(()=>{let r=r=>{let e=r.target.closest("a");if(!e)return;let a=e.getAttribute("href");if(a&&a.startsWith("/")&&!a.startsWith("//")&&!e.getAttribute("target")&&!e.getAttribute("download")){if("u">typeof navigator&&"function"==typeof navigator.vibrate)try{navigator.vibrate(15)}catch{}t(!0),s(30);let r=setTimeout(()=>s(r=>r<70?70:r),100),e=setTimeout(()=>s(r=>r<88?88:r),300);return()=>{clearTimeout(r),clearTimeout(e)}}};return document.addEventListener("click",r,{capture:!0}),()=>document.removeEventListener("click",r,{capture:!0})},[r]),e||0!==i)?(0,a.jsx)("div",{className:"fixed top-0 left-0 right-0 z-[999999] pointer-events-none h-[3.5px] bg-transparent overflow-hidden",children:(0,a.jsx)("div",{className:"h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 shadow-[0_0_15px_rgba(59,130,246,1)] transition-all ease-out",style:{width:`${i}%`,opacity:+(100!==i),transition:100===i?"width 0.2s ease-out, opacity 0.35s 0.1s ease":"width 0.4s cubic-bezier(0.1, 0.6, 0.1, 1)"}})}):null}},83746:(r,e,t)=>{Promise.resolve().then(t.bind(t,93053)),Promise.resolve().then(t.t.bind(t,42593,23)),Promise.resolve().then(t.t.bind(t,95642,23)),Promise.resolve().then(t.t.bind(t,51743,23)),Promise.resolve().then(t.bind(t,55755)),Promise.resolve().then(t.bind(t,61822)),Promise.resolve().then(t.bind(t,40721))}},r=>{r.O(0,[4781,3334,8320,4877,1822,8441,8928,7358],()=>r(r.s=83746)),_N_E=r.O()}]);