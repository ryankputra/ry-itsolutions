"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[721],{40721:(r,t,a)=>{a.d(t,{DynamicThemeProvider:()=>d,G:()=>p});var e=a(95155),o=a(12115),n=a(27529),i=a(39092),l=a.n(i);function c({config:r}){let[t,a]=(0,o.useState)([]),[n,i]=(0,o.useState)(!1);return((0,o.useEffect)(()=>{if(i(!0),!r||!r.enabled||!r.particle_svgs||0===r.particle_svgs.length||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return void a([]);let t=window.innerWidth<640?r.particle_count_mobile||4:r.particle_count_desktop||8,e="fast"===r.speed?8:"medium"===r.speed?12:16;a(Array.from({length:t},(t,a)=>({id:a,svgUrl:r.particle_svgs[a%r.particle_svgs.length],left:Math.round(90*Math.random()+5),size:Math.round(5*Math.random()+11),duration:Math.round((e+6*Math.random())*10)/10,delay:Math.round(8*Math.random()*10)/10,rotation:Math.round(360*Math.random()),drift:Math.round((Math.random()-.5)*30)})))},[r]),n&&r?.enabled&&0!==t.length)?(0,e.jsxs)("div",{"aria-hidden":"true",className:"jsx-59675e8bc51853ac fixed inset-0 pointer-events-none overflow-hidden z-20 select-none",children:[t.map(r=>(0,e.jsx)("img",{src:r.svgUrl,alt:"",style:{left:`${r.left}%`,top:"-24px",width:`${r.size}px`,height:`${r.size}px`,animation:`floatingDriftDown ${r.duration}s cubic-bezier(0.4, 0, 0.2, 1) infinite`,animationDelay:`${r.delay}s`,transform:`rotate(${r.rotation}deg)`},className:"jsx-59675e8bc51853ac absolute will-change-transform opacity-25 dark:opacity-20 select-none pointer-events-none"},r.id)),(0,e.jsx)(l(),{id:"59675e8bc51853ac",children:"@-webkit-keyframes floatingDriftDown{0%{-webkit-transform:translatey(-24px)rotate(0deg)translatex(0);transform:translatey(-24px)rotate(0deg)translatex(0);opacity:0}15%{opacity:.28}85%{opacity:.28}100%{-webkit-transform:translatey(105vh)rotate(360deg)translatex(20px);transform:translatey(105vh)rotate(360deg)translatex(20px);opacity:0}}@-moz-keyframes floatingDriftDown{0%{-moz-transform:translatey(-24px)rotate(0deg)translatex(0);transform:translatey(-24px)rotate(0deg)translatex(0);opacity:0}15%{opacity:.28}85%{opacity:.28}100%{-moz-transform:translatey(105vh)rotate(360deg)translatex(20px);transform:translatey(105vh)rotate(360deg)translatex(20px);opacity:0}}@-o-keyframes floatingDriftDown{0%{-o-transform:translatey(-24px)rotate(0deg)translatex(0);transform:translatey(-24px)rotate(0deg)translatex(0);opacity:0}15%{opacity:.28}85%{opacity:.28}100%{-o-transform:translatey(105vh)rotate(360deg)translatex(20px);transform:translatey(105vh)rotate(360deg)translatex(20px);opacity:0}}@keyframes floatingDriftDown{0%{-webkit-transform:translatey(-24px)rotate(0deg)translatex(0);-moz-transform:translatey(-24px)rotate(0deg)translatex(0);-o-transform:translatey(-24px)rotate(0deg)translatex(0);transform:translatey(-24px)rotate(0deg)translatex(0);opacity:0}15%{opacity:.28}85%{opacity:.28}100%{-webkit-transform:translatey(105vh)rotate(360deg)translatex(20px);-moz-transform:translatey(105vh)rotate(360deg)translatex(20px);-o-transform:translatey(105vh)rotate(360deg)translatex(20px);transform:translatey(105vh)rotate(360deg)translatex(20px);opacity:0}}"})]}):null}let s={id:"default-obsidian",name:"Apple Obsidian (Default)",category:"default",tokens:{"--theme-primary":"#0071E3","--theme-primary-hover":"#0077ED","--theme-accent":"#34C759","--theme-canvas":"#F5F5F7","--theme-parchment":"#FFFFFF","--theme-hairline":"rgba(0, 0, 0, 0.08)","--theme-header-bg":"#1D1D1F","--theme-header-text":"#FFFFFF","--theme-surface-glow":"rgba(0, 113, 227, 0.08)","--theme-card-border":"rgba(0, 0, 0, 0.08)","--theme-dark-canvas":"#000000","--theme-dark-parchment":"#161617","--theme-dark-header-bg":"#1C1C1E","--theme-dark-hairline":"rgba(255, 255, 255, 0.08)"},assets:{pattern_svg_url:"none",theme_badge_text:"Default"},ornaments:{enabled:!1,particle_svgs:[]},meta:{mode:"default_fallback",auto_schedule_enabled:!0}},m=(0,o.createContext)({theme:s,isLoading:!1,refreshTheme:async()=>{},previewTheme:()=>{}});function d({children:r}){let[t,a]=(0,o.useState)(s),[i,l]=(0,o.useState)(null),[p,h]=(0,o.useState)(!0),g=i||t,b=async()=>{try{let r=await fetch(`${n.H$}/theme/active`,{cache:"no-store",headers:{Accept:"application/json"}});if(r.ok){let t=await r.json();t.success&&t.data&&a(t.data)}}catch(r){console.warn("Could not fetch active theme, using obsidian fallback:",r)}finally{h(!1)}};(0,o.useEffect)(()=>{b();let r=setInterval(b,18e4);return()=>clearInterval(r)},[]);let k=(0,o.useMemo)(()=>{if(!g?.tokens)return"";let r=g.tokens,t="default-obsidian"===g.id,a=r["--theme-primary"]||"#0071E3",e=r["--theme-primary-hover"]||"#0077ED",o=r["--theme-accent"]||"#34C759",n=r["--theme-canvas"]||"#F5F5F7",i=r["--theme-parchment"]||"#FFFFFF",l=r["--theme-hairline"]||"rgba(0, 0, 0, 0.08)",c=r["--theme-header-bg"]||"#1D1D1F",s=r["--theme-header-text"]||"#FFFFFF",m=r["--theme-surface-glow"]||"rgba(0, 113, 227, 0.08)",d=r["--theme-card-border"]||"rgba(0, 0, 0, 0.08)",p=r["--theme-dark-canvas"]||"#000000",h=r["--theme-dark-parchment"]||"#161617",b=r["--theme-dark-header-bg"]||"#1C1C1E",k=r["--theme-dark-hairline"]||"rgba(255, 255, 255, 0.08)";return t?`
        :root, html.light, html:not(.dark) {
          --color-primary: #0071E3;
          --color-primary-hover: #0077ED;
          --color-primary-focus: #0055C6;
          --color-primary-on-dark: #F5F5F7;
          --color-canvas: #F5F5F7;
          --color-parchment: #FFFFFF;
          --color-surface-pearl: #FFFFFF;
          --color-surface-tile: #FFFFFF;
          --color-ink: #1D1D1F;
          --color-ink-muted: #86868B;
          --color-hairline: rgba(0, 0, 0, 0.08);
          --color-divider: #E5E5EA;
          --theme-primary: #0071E3;
          --theme-accent: #34C759;
          --theme-canvas: #F5F5F7;
          --theme-parchment: #FFFFFF;
          --theme-header-bg: #1D1D1F;
          --theme-header-text: #FFFFFF;
          --background: #F5F5F7;
          --foreground: #1D1D1F;
        }
        .dark, html.dark {
          --color-primary: #2997FF;
          --color-primary-hover: #52A9FF;
          --color-primary-focus: #0071E3;
          --color-primary-on-dark: #1D1D1F;
          --color-canvas: #000000;
          --color-parchment: #161617;
          --color-surface-pearl: #1C1C1E;
          --color-surface-tile: #2C2C2E;
          --color-ink: #F5F5F7;
          --color-ink-muted: #A1A1A6;
          --color-hairline: rgba(255, 255, 255, 0.08);
          --color-divider: #2D2D2F;
          --theme-canvas: #000000;
          --theme-parchment: #161617;
          --theme-header-bg: #1C1C1E;
          --background: #000000;
          --foreground: #F5F5F7;
        }
        html:not(.dark) .bg-parchment,
        html.light .bg-parchment {
          background-color: #FFFFFF !important;
        }
        html:not(.dark) .text-ink,
        html.light .text-ink {
          color: #1D1D1F !important;
        }
        .dark .bg-parchment,
        html.dark .bg-parchment {
          background-color: #161617 !important;
        }
        .dark .text-ink,
        html.dark .text-ink {
          color: #F5F5F7 !important;
        }
      `:`
      :root, html.light, html:not(.dark) {
        --color-primary: ${a} !important;
        --color-primary-hover: ${e} !important;
        --color-primary-focus: ${e} !important;
        --color-primary-on-dark: ${a} !important;
        --color-canvas: ${n} !important;
        --color-parchment: ${i} !important;
        --color-surface-pearl: ${i} !important;
        --color-surface-tile: ${c} !important;
        --color-hairline: ${l} !important;
        --color-ink: #1D1D1F !important;
        --color-ink-muted: #86868B !important;
        --color-divider: #E5E5EA !important;
        --background: ${n} !important;
        --foreground: #1D1D1F !important;
        --theme-primary: ${a} !important;
        --theme-primary-hover: ${e} !important;
        --theme-accent: ${o} !important;
        --theme-canvas: ${n} !important;
        --theme-parchment: ${i} !important;
        --theme-surface-glow: ${m} !important;
        --theme-card-border: ${d} !important;
        --theme-header-bg: ${c} !important;
        --theme-header-text: ${s} !important;
      }

      .dark, html.dark {
        --color-primary: ${a} !important;
        --color-primary-hover: ${e} !important;
        --color-canvas: ${p} !important;
        --color-parchment: ${h} !important;
        --color-surface-pearl: #1C1C1E !important;
        --color-surface-tile: ${b} !important;
        --color-hairline: ${k} !important;
        --color-ink: #F5F5F7 !important;
        --color-ink-muted: #A1A1A6 !important;
        --color-divider: #2D2D2F !important;
        --background: ${p} !important;
        --foreground: #F5F5F7 !important;
        --theme-canvas: ${p} !important;
        --theme-parchment: ${h} !important;
        --theme-header-bg: ${b} !important;
      }

      /* 1. Global Page Background Transformation */
      body {
        background-color: ${n} !important;
        transition: background-color 0.4s ease;
      }
      .dark body, html.dark body {
        background-color: ${p} !important;
      }

      html:not(.dark) .bg-canvas,
      html.light .bg-canvas,
      :not(.dark) .bg-canvas {
        background-color: ${n} !important;
      }
      .dark .bg-canvas,
      html.dark .bg-canvas {
        background-color: ${p} !important;
      }

      /* 2. Global Card & Container Surfaces: Light vs Dark Isolation */
      html:not(.dark) .bg-parchment,
      html.light .bg-parchment,
      :not(.dark) .bg-parchment,
      html:not(.dark) .bg-white,
      html.light .bg-white,
      :not(.dark) .bg-white {
        background-color: ${i} !important;
      }
      .dark .bg-parchment,
      html.dark .bg-parchment,
      .dark .bg-white,
      html.dark .bg-white,
      .dark .bg-slate-900,
      html.dark .bg-slate-900,
      .dark [class*="dark:bg-[#161617]"],
      .dark [class*="dark:bg-[#1C1C1E]"],
      .dark [class*="dark:bg-[#1c1c1e]"],
      .dark [class*="dark:bg-[#2C2C2E]"] {
        background-color: ${h} !important;
      }

      html:not(.dark) .text-ink,
      html.light .text-ink {
        color: #1D1D1F !important;
      }
      .dark .text-ink,
      html.dark .text-ink {
        color: #F5F5F7 !important;
      }

      /* 3. Global Hairlines & Borders */
      html:not(.dark) .border-hairline,
      :not(.dark) .border-hairline,
      html:not(.dark) .divide-hairline > * + *,
      :not(.dark) .divide-hairline > * + *,
      :not(.dark) .border-black/[0.05],
      :not(.dark) .border-black/[0.06],
      :not(.dark) .divide-black/[0.05] > * + * {
        border-color: ${l} !important;
      }
      .dark .border-hairline,
      .dark .divide-hairline > * + *,
      .dark .border-white/[0.08],
      .dark .border-white/[0.06],
      .dark .divide-white/[0.06] > * + * {
        border-color: ${k} !important;
      }

      /* 4. Luxury Obsidian Titanium Cards (Wallet, Voucher Banner, Profile Card) */
      html:not(.dark) .bg-[#1D1D1F],
      :not(.dark) .bg-[#1D1D1F],
      :not(.dark) .bg-[#1d1d1f],
      :not(.dark) .bg-surface-tile {
        background-color: ${c} !important;
        border-color: ${d} !important;
      }
      .dark .bg-[#1D1D1F],
      .dark .bg-[#1d1d1f],
      .dark .bg-surface-tile {
        background-color: ${b} !important;
        border-color: ${k} !important;
      }

      /* 5. Primary Semantic Colors */
      .bg-primary {
        background-color: ${a} !important;
      }
      .hover\\:bg-primary-hover:hover {
        background-color: ${e} !important;
      }
      .text-primary {
        color: ${a} !important;
      }
      .hover\\:text-primary:hover {
        color: ${e} !important;
      }
      .group:hover .group-hover\\:text-primary {
        color: ${a} !important;
      }
      .border-primary {
        border-color: ${a} !important;
      }
      .ring-primary {
        --tw-ring-color: ${a} !important;
      }
      .bg-primary\\/5 {
        background-color: color-mix(in srgb, ${a} 5%, transparent) !important;
      }
      .bg-primary\\/10 {
        background-color: color-mix(in srgb, ${a} 10%, transparent) !important;
      }
      .bg-primary\\/15 {
        background-color: color-mix(in srgb, ${a} 15%, transparent) !important;
      }
      .bg-primary\\/20 {
        background-color: color-mix(in srgb, ${a} 20%, transparent) !important;
      }
      .group:hover .group-hover\\:bg-primary\\/20 {
        background-color: color-mix(in srgb, ${a} 20%, transparent) !important;
      }
      .border-primary\\/20 {
        border-color: color-mix(in srgb, ${a} 20%, transparent) !important;
      }
      .border-primary\\/30 {
        border-color: color-mix(in srgb, ${a} 30%, transparent) !important;
      }
      .border-primary\\/40 {
        border-color: color-mix(in srgb, ${a} 40%, transparent) !important;
      }

      /* 6. Strict Fallback for Legacy Hardcoded Hex Selectors (Exact match [class~="..."] to never clobber /10 or group-hover) */
      [class~="bg-[#0071E3]"], [class~="bg-[#0071e3]"] {
        background-color: ${a} !important;
      }
      [class~="bg-[#0071E3]/10"], [class~="bg-[#0071e3]/10"] {
        background-color: color-mix(in srgb, ${a} 10%, transparent) !important;
      }
      [class~="bg-[#0071E3]/15"], [class~="bg-[#0071e3]/15"] {
        background-color: color-mix(in srgb, ${a} 15%, transparent) !important;
      }
      [class~="bg-[#0071E3]/20"], [class~="bg-[#0071e3]/20"] {
        background-color: color-mix(in srgb, ${a} 20%, transparent) !important;
      }
      [class~="text-[#0071E3]"], [class~="text-[#0071e3]"], [class~="text-[#2997FF]"], [class~="text-[#2997ff]"] {
        color: ${a} !important;
      }
      [class~="border-[#0071E3]"], [class~="border-[#0071e3]"] {
        border-color: ${a} !important;
      }
      [class~="border-[#0071E3]/20"], [class~="border-[#0071e3]/20"] {
        border-color: color-mix(in srgb, ${a} 20%, transparent) !important;
      }
      [class~="border-[#0071E3]/30"], [class~="border-[#0071e3]/30"] {
        border-color: color-mix(in srgb, ${a} 30%, transparent) !important;
      }
      [class~="hover:bg-[#0077ED]"]:hover, [class~="hover:bg-[#0071E3]"]:hover {
        background-color: ${e} !important;
      }
      .group:hover [class~="group-hover:text-[#0071E3]"] {
        color: ${a} !important;
      }
      .group:hover [class~="group-hover:bg-[#0071E3]/20"] {
        background-color: color-mix(in srgb, ${a} 20%, transparent) !important;
      }

      /* 7. Navigation Bar Active Highlights */
      .bg-white\\/80, .dark .bg-\\[\\#161617\\]\\/80 {
        border-color: ${l} !important;
      }

      /* 8. Ambient Glowing Shadows */
      .theme-glow {
        box-shadow: 0 4px 28px ${m} !important;
      }
    `},[g]);return(0,e.jsxs)(m.Provider,{value:{theme:g,isLoading:p,refreshTheme:b,previewTheme:l},children:[(0,e.jsx)("style",{id:"dynamic-theme-vars",dangerouslySetInnerHTML:{__html:k}}),g?.id!=="default-obsidian"&&(0,e.jsx)("div",{className:"fixed top-0 left-0 right-0 h-64 pointer-events-none z-0 opacity-15 dark:opacity-20 transition-opacity duration-700 select-none",style:{background:`radial-gradient(ellipse 110% 70% at 50% -20%, ${g.tokens["--theme-primary"]}, transparent 75%)`},"aria-hidden":"true"}),g?.id!=="default-obsidian"&&(0,e.jsx)("div",{className:"fixed bottom-0 left-0 right-0 h-40 pointer-events-none z-0 opacity-10 dark:opacity-15 transition-opacity duration-700 select-none",style:{background:`radial-gradient(ellipse 100% 70% at 50% 120%, ${g.tokens["--theme-primary"]}, transparent 75%)`},"aria-hidden":"true"}),g?.ornaments?.enabled&&(0,e.jsx)(c,{config:g.ornaments}),g?.id!=="default-obsidian"&&(0,e.jsxs)("aside",{className:"w-full py-1.5 px-4 text-xs font-medium text-white flex items-center justify-center gap-2.5 select-none relative z-40 transition-colors border-b border-white/10 backdrop-blur-md",style:{background:`linear-gradient(90deg, rgba(20,20,22,0.95) 0%, color-mix(in srgb, ${g.tokens["--theme-primary"]} 22%, rgba(20,20,22,0.95)) 50%, rgba(20,20,22,0.95) 100%)`},children:[(0,e.jsxs)("span",{className:"inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white",style:{backgroundColor:`color-mix(in srgb, ${g.tokens["--theme-primary"]} 35%, transparent)`,border:`1px solid color-mix(in srgb, ${g.tokens["--theme-primary"]} 50%, transparent)`},children:[(0,e.jsx)("span",{className:"w-1.5 h-1.5 rounded-full animate-pulse",style:{backgroundColor:g.tokens["--theme-primary"]}}),g.meta?.event_name||"Edisi Perayaan"]}),(0,e.jsx)("span",{className:"text-xs text-white/90 font-medium tracking-tight",children:g.name})]}),r]})}function p(){return(0,o.useContext)(m)}}}]);