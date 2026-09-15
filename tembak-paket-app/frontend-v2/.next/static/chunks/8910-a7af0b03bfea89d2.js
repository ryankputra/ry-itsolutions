"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[8910],{18910:(r,e,a)=>{a.d(e,{ModernAppLoader:()=>l});var t=a(95155),o=a(39092),i=a.n(o),n=a(12115),s=a(79750),d=a(40721);function l({text:r="Memuat Layanan...",subtext:e}){let a=null;try{let r=(0,d.G)();a=r?.theme}catch(r){a=null}let o=a?.id||"default-obsidian",c=a?.category||"default",b="default-obsidian"===o||"default"===c,m=a?.tokens?.["--theme-primary"]||"#0071E3",p=a?.assets?.theme_badge_text||a?.name,g=(0,n.useMemo)(()=>{switch(c){case"islam":return{glow:"radial-gradient(circle at 50% 50%, rgba(5, 150, 105, 0.22) 0%, rgba(217, 119, 6, 0.12) 40%, transparent 70%)",cardBorder:"border-emerald-500/25 dark:border-emerald-400/20",cardShadow:"shadow-[0_24px_60px_-10px_rgba(5,150,105,0.25)] dark:shadow-[0_30px_70px_-12px_rgba(5,150,105,0.4)]",badgeIcon:"\uD83C\uDF19",badgeClass:"bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",tickColors:["#059669","#D97706"],barColor:"from-emerald-500 via-amber-400 to-emerald-500"};case"national":if("national-batik"===o)return{glow:"radial-gradient(circle at 50% 50%, rgba(180, 83, 9, 0.2) 0%, rgba(120, 53, 15, 0.1) 40%, transparent 70%)",cardBorder:"border-amber-600/25 dark:border-amber-500/20",cardShadow:"shadow-[0_24px_60px_-10px_rgba(180,83,9,0.2)] dark:shadow-[0_30px_70px_-12px_rgba(180,83,9,0.35)]",badgeIcon:"✨",badgeClass:"bg-amber-600/15 text-amber-800 dark:text-amber-300 border-amber-600/30",tickColors:["#B45309","#D97706"],barColor:"from-amber-600 via-yellow-500 to-amber-600"};return{glow:"radial-gradient(circle at 50% 50%, rgba(220, 38, 38, 0.22) 0%, rgba(255, 255, 255, 0.1) 40%, transparent 70%)",cardBorder:"border-red-500/25 dark:border-red-400/20",cardShadow:"shadow-[0_24px_60px_-10px_rgba(220,38,38,0.25)] dark:shadow-[0_30px_70px_-12px_rgba(220,38,38,0.35)]",badgeIcon:"\uD83C\uDDEE\uD83C\uDDE9",badgeClass:"bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",tickColors:["#DC2626","#FFFFFF"],barColor:"from-red-600 via-white to-red-600"};case"chinese":return{glow:"radial-gradient(circle at 50% 50%, rgba(225, 29, 72, 0.25) 0%, rgba(245, 158, 11, 0.15) 45%, transparent 70%)",cardBorder:"border-rose-500/25 dark:border-rose-400/20",cardShadow:"shadow-[0_24px_60px_-10px_rgba(225,29,72,0.25)] dark:shadow-[0_30px_70px_-12px_rgba(225,29,72,0.4)]",badgeIcon:"\uD83C\uDFEE",badgeClass:"bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",tickColors:["#E11D48","#F59E0B"],barColor:"from-rose-600 via-amber-400 to-rose-600"};case"christian":return{glow:"radial-gradient(circle at 50% 50%, rgba(2, 132, 199, 0.2) 0%, rgba(16, 185, 129, 0.12) 40%, transparent 70%)",cardBorder:"border-sky-500/25 dark:border-sky-400/20",cardShadow:"shadow-[0_24px_60px_-10px_rgba(2,132,199,0.2)] dark:shadow-[0_30px_70px_-12px_rgba(2,132,199,0.35)]",badgeIcon:"❄️",badgeClass:"bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",tickColors:["#0284C7","#10B981"],barColor:"from-sky-500 via-emerald-400 to-sky-500"};case"buddha":return{glow:"radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.22) 0%, rgba(139, 92, 246, 0.12) 40%, transparent 70%)",cardBorder:"border-amber-500/25 dark:border-amber-400/20",cardShadow:"shadow-[0_24px_60px_-10px_rgba(245,158,11,0.22)] dark:shadow-[0_30px_70px_-12px_rgba(245,158,11,0.35)]",badgeIcon:"\uD83E\uDEB7",badgeClass:"bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",tickColors:["#F59E0B","#8B5CF6"],barColor:"from-amber-500 via-purple-400 to-amber-500"};case"hindu":return{glow:"radial-gradient(circle at 50% 50%, rgba(79, 70, 229, 0.2) 0%, rgba(245, 158, 11, 0.12) 40%, transparent 70%)",cardBorder:"border-indigo-500/25 dark:border-indigo-400/20",cardShadow:"shadow-[0_24px_60px_-10px_rgba(79,70,229,0.2)] dark:shadow-[0_30px_70px_-12px_rgba(79,70,229,0.35)]",badgeIcon:"\uD83D\uDD49️",badgeClass:"bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",tickColors:["#4F46E5","#F59E0B"],barColor:"from-indigo-600 via-amber-400 to-indigo-600"};default:return{glow:"radial-gradient(circle at 50% 50%, rgba(0, 113, 227, 0.1) 0%, rgba(255, 255, 255, 0.03) 40%, transparent 70%)",cardBorder:"border-white/60 dark:border-white/10",cardShadow:"shadow-[0_25px_60px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.65)]",badgeIcon:null,badgeClass:"",tickColors:["currentColor","currentColor"],barColor:"from-[#0071E3] via-[#47a0ff] to-[#0071E3]"}}},[c,o]);return(0,t.jsxs)("div",{className:"jsx-aabe2c43202f44b5 fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/20 dark:bg-black/50 backdrop-blur-2xl text-ink select-none transition-all duration-300 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','Segoe_UI',Roboto,sans-serif]",children:[(0,t.jsx)("div",{style:{background:g.glow},className:"jsx-aabe2c43202f44b5 absolute inset-0 pointer-events-none opacity-50 dark:opacity-40 transition-opacity duration-700"}),(0,t.jsxs)("div",{className:`jsx-aabe2c43202f44b5 relative z-10 flex flex-col items-center p-7 sm:p-8 rounded-[32px] sm:rounded-[36px] bg-white/80 dark:bg-[#1C1C1E]/85 backdrop-blur-3xl border ${g.cardBorder} ${g.cardShadow} min-w-[220px] max-w-[270px] animate-in fade-in zoom-in-95 duration-200 text-center shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.45)] dark:shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.12)]`,children:[!b&&g.badgeIcon&&(0,t.jsxs)("div",{className:`jsx-aabe2c43202f44b5 mb-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold tracking-wide uppercase shadow-2xs ${g.badgeClass}`,children:[(0,t.jsx)("span",{className:"jsx-aabe2c43202f44b5",children:g.badgeIcon}),(0,t.jsx)("span",{className:"jsx-aabe2c43202f44b5 truncate max-w-[130px]",children:p})]}),(0,t.jsx)("div",{className:"jsx-aabe2c43202f44b5 relative mb-3.5 flex items-center justify-center group",children:(0,t.jsx)("div",{style:{boxShadow:b?void 0:`0 6px 20px color-mix(in srgb, ${m} 25%, transparent)`},className:"jsx-aabe2c43202f44b5 w-13 h-13 rounded-[22px] bg-gradient-to-b from-white/95 to-white/70 dark:from-white/15 dark:to-white/5 border border-white/60 dark:border-white/15 shadow-[0_6px_18px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)] flex items-center justify-center backdrop-blur-xl transition-all duration-300",children:(0,t.jsx)("div",{className:"jsx-aabe2c43202f44b5 animate-pulse duration-1000",children:(0,t.jsx)(s.g,{iconOnly:!0,size:28})})})}),(0,t.jsx)("div",{className:"jsx-aabe2c43202f44b5 relative w-8 h-8 my-1.5 flex items-center justify-center text-[#3C3C43] dark:text-white",children:Array.from({length:12}).map((r,e)=>{let a=e%2==1,o=b?"currentColor":a?g.tickColors[1]:g.tickColors[0];return(0,t.jsx)("div",{style:{transformOrigin:"50% 16px",transform:`rotate(${30*e}deg)`,backgroundColor:o,animation:"iosTickFade 1s linear infinite",animationDelay:`${-(1/12*(12-e))}s`},className:"jsx-aabe2c43202f44b5 absolute left-[47%] top-[6%] w-[2.4px] h-[6.8px] rounded-full"},e)})}),(0,t.jsxs)("div",{className:"jsx-aabe2c43202f44b5 mt-3 space-y-0.5 max-w-[210px]",children:[(0,t.jsx)("span",{style:{color:b?void 0:m},className:"jsx-aabe2c43202f44b5 text-[11px] font-black tracking-widest uppercase block text-ink/90 dark:text-white/90",children:"RY-ITSOLUTIONS"}),(0,t.jsx)("p",{className:"jsx-aabe2c43202f44b5 text-[12.5px] font-medium text-slate-700 dark:text-zinc-200 leading-snug",children:r}),e&&(0,t.jsx)("p",{className:"jsx-aabe2c43202f44b5 text-[10.5px] text-slate-400 dark:text-zinc-400 font-normal",children:e})]}),(0,t.jsx)("div",{className:"jsx-aabe2c43202f44b5 w-24 h-[2.5px] rounded-full bg-black/[0.08] dark:bg-white/10 overflow-hidden relative mt-3.5",children:(0,t.jsx)("div",{style:{animation:"iosProgressSlide 1.5s cubic-bezier(0.65, 0, 0.35, 1) infinite"},className:`jsx-aabe2c43202f44b5 absolute top-0 bottom-0 w-12 rounded-full bg-gradient-to-r ${g.barColor}`})})]}),(0,t.jsx)(i(),{id:"aabe2c43202f44b5",children:"@keyframes iosTickFade{0%{opacity:1}100%{opacity:.15}}@keyframes iosProgressSlide{0%{left:-48px}50%{left:50%}100%{left:100%}}"})]})}},40721:(r,e,a)=>{a.d(e,{DynamicThemeProvider:()=>b,G:()=>m});var t=a(95155),o=a(12115),i=a(27529),n=a(39092),s=a.n(n);function d({config:r}){let[e,a]=(0,o.useState)([]),[i,n]=(0,o.useState)(!1);return((0,o.useEffect)(()=>{if(n(!0),!r||!r.enabled||!r.particle_svgs||0===r.particle_svgs.length||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return void a([]);let e=window.innerWidth<640?r.particle_count_mobile||4:r.particle_count_desktop||8,t="fast"===r.speed?8:"medium"===r.speed?12:16;a(Array.from({length:e},(e,a)=>({id:a,svgUrl:r.particle_svgs[a%r.particle_svgs.length],left:Math.round(90*Math.random()+5),size:Math.round(5*Math.random()+11),duration:Math.round((t+6*Math.random())*10)/10,delay:Math.round(8*Math.random()*10)/10,rotation:Math.round(360*Math.random()),drift:Math.round((Math.random()-.5)*30)})))},[r]),i&&r?.enabled&&0!==e.length)?(0,t.jsxs)("div",{"aria-hidden":"true",className:"jsx-59675e8bc51853ac fixed inset-0 pointer-events-none overflow-hidden z-20 select-none",children:[e.map(r=>(0,t.jsx)("img",{src:r.svgUrl,alt:"",style:{left:`${r.left}%`,top:"-24px",width:`${r.size}px`,height:`${r.size}px`,animation:`floatingDriftDown ${r.duration}s cubic-bezier(0.4, 0, 0.2, 1) infinite`,animationDelay:`${r.delay}s`,transform:`rotate(${r.rotation}deg)`},className:"jsx-59675e8bc51853ac absolute will-change-transform opacity-25 dark:opacity-20 select-none pointer-events-none"},r.id)),(0,t.jsx)(s(),{id:"59675e8bc51853ac",children:"@keyframes floatingDriftDown{0%{transform:translatey(-24px)rotate(0deg)translatex(0);opacity:0}15%{opacity:.28}85%{opacity:.28}100%{transform:translatey(105vh)rotate(360deg)translatex(20px);opacity:0}}"})]}):null}let l={id:"default-obsidian",name:"Apple Obsidian (Default)",category:"default",tokens:{"--theme-primary":"#0071E3","--theme-primary-hover":"#0077ED","--theme-accent":"#34C759","--theme-canvas":"#F5F5F7","--theme-parchment":"#FFFFFF","--theme-hairline":"rgba(0, 0, 0, 0.08)","--theme-header-bg":"#1D1D1F","--theme-header-text":"#FFFFFF","--theme-surface-glow":"rgba(0, 113, 227, 0.08)","--theme-card-border":"rgba(0, 0, 0, 0.08)","--theme-dark-canvas":"#000000","--theme-dark-parchment":"#161617","--theme-dark-header-bg":"#1C1C1E","--theme-dark-hairline":"rgba(255, 255, 255, 0.08)"},assets:{pattern_svg_url:"none",theme_badge_text:"Default"},ornaments:{enabled:!1,particle_svgs:[]},meta:{mode:"default_fallback",auto_schedule_enabled:!0}},c=(0,o.createContext)({theme:l,isLoading:!1,refreshTheme:async()=>{},previewTheme:()=>{}});function b({children:r}){let[e,a]=(0,o.useState)(l),[n,s]=(0,o.useState)(null),[m,p]=(0,o.useState)(!0),g=n||e,h=async()=>{try{let r=await fetch(`${i.H$}/theme/active`,{cache:"no-store",headers:{Accept:"application/json"}});if(r.ok){let e=await r.json();e.success&&e.data&&a(e.data)}}catch(r){console.warn("Could not fetch active theme, using obsidian fallback:",r)}finally{p(!1)}};(0,o.useEffect)(()=>{h();let r=setInterval(h,18e4);return()=>clearInterval(r)},[]);let x=(0,o.useMemo)(()=>{if(!g?.tokens)return"";let r=g.tokens,e="default-obsidian"===g.id,a=r["--theme-primary"]||"#0071E3",t=r["--theme-primary-hover"]||"#0077ED",o=r["--theme-accent"]||"#34C759",i=r["--theme-canvas"]||"#F5F5F7",n=r["--theme-parchment"]||"#FFFFFF",s=r["--theme-hairline"]||"rgba(0, 0, 0, 0.08)",d=r["--theme-header-bg"]||"#1D1D1F",l=r["--theme-header-text"]||"#FFFFFF",c=r["--theme-surface-glow"]||"rgba(0, 113, 227, 0.08)",b=r["--theme-card-border"]||"rgba(0, 0, 0, 0.08)",m=r["--theme-dark-canvas"]||"#000000",p=r["--theme-dark-parchment"]||"#161617",h=r["--theme-dark-header-bg"]||"#1C1C1E",x=r["--theme-dark-hairline"]||"rgba(255, 255, 255, 0.08)";return e?`
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
        --color-primary: ${a} !important;
        --color-primary-hover: ${t} !important;
        --color-primary-focus: ${t} !important;
        --color-primary-on-dark: ${a} !important;
        --color-canvas: ${i} !important;
        --color-parchment: ${n} !important;
        --color-surface-tile: ${d} !important;
        --color-hairline: ${s} !important;
        --background: ${i} !important;
        --theme-primary: ${a} !important;
        --theme-primary-hover: ${t} !important;
        --theme-accent: ${o} !important;
        --theme-canvas: ${i} !important;
        --theme-parchment: ${n} !important;
        --theme-surface-glow: ${c} !important;
        --theme-card-border: ${b} !important;
        --theme-header-bg: ${d} !important;
        --theme-header-text: ${l} !important;
      }

      .dark {
        --color-primary: ${a} !important;
        --color-primary-hover: ${t} !important;
        --color-canvas: ${m} !important;
        --color-parchment: ${p} !important;
        --color-surface-tile: ${h} !important;
        --color-hairline: ${x} !important;
        --background: ${m} !important;
        --theme-canvas: ${m} !important;
        --theme-parchment: ${p} !important;
        --theme-header-bg: ${h} !important;
      }

      /* 1. Global Page Background Transformation */
      body {
        background-color: ${i} !important;
        transition: background-color 0.4s ease;
      }
      .dark body {
        background-color: ${m} !important;
      }

      html:not(.dark) .bg-canvas,
      :not(.dark) .bg-canvas {
        background-color: ${i} !important;
      }
      .dark .bg-canvas {
        background-color: ${m} !important;
      }

      /* 2. Global Card & Container Surfaces: Light vs Dark Isolation */
      html:not(.dark) .bg-parchment,
      :not(.dark) .bg-parchment,
      html:not(.dark) .bg-white,
      :not(.dark) .bg-white {
        background-color: ${n} !important;
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
        border-color: ${x} !important;
      }

      /* 4. Luxury Obsidian Titanium Cards (Wallet, Voucher Banner, Profile Card) */
      html:not(.dark) .bg-[#1D1D1F],
      :not(.dark) .bg-[#1D1D1F],
      :not(.dark) .bg-[#1d1d1f],
      :not(.dark) .bg-surface-tile {
        background-color: ${d} !important;
        border-color: ${b} !important;
      }
      .dark .bg-[#1D1D1F],
      .dark .bg-[#1d1d1f],
      .dark .bg-surface-tile {
        background-color: ${h} !important;
        border-color: ${x} !important;
      }

      /* 5. Primary Semantic Colors */
      .bg-primary {
        background-color: ${a} !important;
      }
      .hover\\:bg-primary-hover:hover {
        background-color: ${t} !important;
      }
      .text-primary {
        color: ${a} !important;
      }
      .hover\\:text-primary:hover {
        color: ${t} !important;
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
        background-color: ${t} !important;
      }
      .group:hover [class~="group-hover:text-[#0071E3]"] {
        color: ${a} !important;
      }
      .group:hover [class~="group-hover:bg-[#0071E3]/20"] {
        background-color: color-mix(in srgb, ${a} 20%, transparent) !important;
      }

      /* 7. Navigation Bar Active Highlights */
      .bg-white\\/80, .dark .bg-\\[\\#161617\\]\\/80 {
        border-color: ${s} !important;
      }

      /* 8. Ambient Glowing Shadows */
      .theme-glow {
        box-shadow: 0 4px 28px ${c} !important;
      }
    `},[g]);return(0,t.jsxs)(c.Provider,{value:{theme:g,isLoading:m,refreshTheme:h,previewTheme:s},children:[(0,t.jsx)("style",{id:"dynamic-theme-vars",dangerouslySetInnerHTML:{__html:x}}),g?.id!=="default-obsidian"&&(0,t.jsx)("div",{className:"fixed top-0 left-0 right-0 h-64 pointer-events-none z-0 opacity-15 dark:opacity-20 transition-opacity duration-700 select-none",style:{background:`radial-gradient(ellipse 110% 70% at 50% -20%, ${g.tokens["--theme-primary"]}, transparent 75%)`},"aria-hidden":"true"}),g?.id!=="default-obsidian"&&(0,t.jsx)("div",{className:"fixed bottom-0 left-0 right-0 h-40 pointer-events-none z-0 opacity-10 dark:opacity-15 transition-opacity duration-700 select-none",style:{background:`radial-gradient(ellipse 100% 70% at 50% 120%, ${g.tokens["--theme-primary"]}, transparent 75%)`},"aria-hidden":"true"}),g?.ornaments?.enabled&&(0,t.jsx)(d,{config:g.ornaments}),g?.id!=="default-obsidian"&&(0,t.jsxs)("aside",{className:"w-full py-1.5 px-4 text-xs font-medium text-white flex items-center justify-center gap-2.5 select-none relative z-40 transition-colors border-b border-white/10 backdrop-blur-md",style:{background:`linear-gradient(90deg, rgba(20,20,22,0.95) 0%, color-mix(in srgb, ${g.tokens["--theme-primary"]} 22%, rgba(20,20,22,0.95)) 50%, rgba(20,20,22,0.95) 100%)`},children:[(0,t.jsxs)("span",{className:"inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white",style:{backgroundColor:`color-mix(in srgb, ${g.tokens["--theme-primary"]} 35%, transparent)`,border:`1px solid color-mix(in srgb, ${g.tokens["--theme-primary"]} 50%, transparent)`},children:[(0,t.jsx)("span",{className:"w-1.5 h-1.5 rounded-full animate-pulse",style:{backgroundColor:g.tokens["--theme-primary"]}}),g.meta?.event_name||"Edisi Perayaan"]}),(0,t.jsx)("span",{className:"text-xs text-white/90 font-medium tracking-tight",children:g.name})]}),r]})}function m(){return(0,o.useContext)(c)}},79750:(r,e,a)=>{a.d(e,{g:()=>o});var t=a(95155);function o({className:r="",iconOnly:e=!1,size:a=32}){return(0,t.jsxs)("div",{className:`flex items-center gap-2.5 ${r}`,children:[(0,t.jsxs)("svg",{width:a,height:a,viewBox:"0 0 100 100",fill:"none",xmlns:"http://www.w3.org/2000/svg",className:"shrink-0 drop-shadow-md",children:[(0,t.jsxs)("defs",{children:[(0,t.jsxs)("linearGradient",{id:"logo-bg-grad",x1:"0%",y1:"0%",x2:"100%",y2:"100%",children:[(0,t.jsx)("stop",{offset:"0%",stopColor:"#0b0f19"}),(0,t.jsx)("stop",{offset:"100%",stopColor:"#020617"})]}),(0,t.jsxs)("linearGradient",{id:"logo-border-grad",x1:"0%",y1:"0%",x2:"100%",y2:"100%",children:[(0,t.jsx)("stop",{offset:"0%",stopColor:"#00f2fe"}),(0,t.jsx)("stop",{offset:"50%",stopColor:"#3b82f6"}),(0,t.jsx)("stop",{offset:"100%",stopColor:"#8b5cf6"})]}),(0,t.jsxs)("linearGradient",{id:"logo-bolt-grad",x1:"0%",y1:"0%",x2:"100%",y2:"100%",children:[(0,t.jsx)("stop",{offset:"0%",stopColor:"#38bdf8"}),(0,t.jsx)("stop",{offset:"50%",stopColor:"#facc15"}),(0,t.jsx)("stop",{offset:"100%",stopColor:"#fb923c"})]}),(0,t.jsxs)("filter",{id:"logo-glow",x:"-20%",y:"-20%",width:"140%",height:"140%",children:[(0,t.jsx)("feGaussianBlur",{stdDeviation:"3",result:"blur"}),(0,t.jsxs)("feMerge",{children:[(0,t.jsx)("feMergeNode",{in:"blur"}),(0,t.jsx)("feMergeNode",{in:"SourceGraphic"})]})]})]}),(0,t.jsx)("path",{d:"M50 6 L88 22 V64 L50 94 L12 64 V22 Z",fill:"url(#logo-bg-grad)",stroke:"url(#logo-border-grad)",strokeWidth:"3",strokeLinejoin:"round"}),(0,t.jsx)("path",{d:"M50 12 V28 M22 28 H35 L41 34 M78 28 H65 L59 34 M22 60 H35 L41 54 M78 60 H65 L59 54 M50 88 V74",stroke:"#00f2fe",strokeWidth:"1.2",strokeLinecap:"round",opacity:"0.5"}),(0,t.jsx)("circle",{cx:"50",cy:"28",r:"1.5",fill:"#00f2fe"}),(0,t.jsx)("circle",{cx:"41",cy:"34",r:"1.2",fill:"#38bdf8"}),(0,t.jsx)("circle",{cx:"59",cy:"34",r:"1.2",fill:"#38bdf8"}),(0,t.jsx)("circle",{cx:"41",cy:"54",r:"1.2",fill:"#8b5cf6"}),(0,t.jsx)("circle",{cx:"59",cy:"54",r:"1.2",fill:"#8b5cf6"}),(0,t.jsx)("circle",{cx:"50",cy:"74",r:"1.5",fill:"#8b5cf6"}),(0,t.jsx)("path",{d:"M50 20 L76 32 V58 L50 80 L24 58 V32 Z",fill:"#1e293b",fillOpacity:"0.8",stroke:"rgba(255, 255, 255, 0.2)",strokeWidth:"1",strokeLinejoin:"round"}),(0,t.jsx)("path",{d:"M38 32 H54 C60 32 64 35 64 41 C64 46 61 49 56 50 L66 65 H56 L47 51 H46 V65 H38 V32 Z M46 39 V45 H52 C55 45 57 43 57 42 C57 40 55 39 52 39 H46 Z",fill:"url(#logo-border-grad)",opacity:"0.85"}),(0,t.jsx)("path",{d:"M54 28 L40 52 H51 L46 70 L63 46 H52 L54 28 Z",fill:"url(#logo-bolt-grad)",filter:"url(#logo-glow)"})]}),!e&&(0,t.jsxs)("span",{className:"font-bold tracking-tight text-ink font-sans",children:["Ry-",(0,t.jsx)("span",{className:"text-primary font-extrabold",children:"ITSolutions"})]})]})}a(12115)}}]);