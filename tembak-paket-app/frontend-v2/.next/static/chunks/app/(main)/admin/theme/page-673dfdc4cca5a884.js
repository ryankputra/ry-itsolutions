(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[125],{23333:()=>{},27529:(e,t,r)=>{"use strict";let a;r.d(t,{H$:()=>s,gI:()=>d,iD:()=>l,oi:()=>i});let n=(a=r(41463).env.NEXT_PUBLIC_API_URL||"","localhost"!==window.location.hostname&&"127.0.0.1"!==window.location.hostname&&(a.includes("localhost")||a.includes("127.0.0.1"))?"":a),s=n?`${n.replace(/\/$/,"")}/api`:"/api";async function i(e){try{let t=await e;if(!t)return null;let r=t.headers?.get("content-type");if(!r||!r.includes("application/json"))return t.ok||console.warn(`[API Warning] Received non-JSON response with HTTP ${t.status} from ${t.url}`),null;let a=await t.json(),n=function(e){if(!e||"object"!=typeof e)return e;let t=!0===e.status||!0===e.success,r=!1===e.status||!1===e.success;return t?(e.status=!0,e.success=!0):r&&(e.status=!1,e.success=!1),e}(a);return t.ok||console.error(`[API Error ${t.status}] ${t.url}:`,n?.message||n),n}catch(e){return console.error("[API JSON Parse Error]:",e),null}}async function o(e,t={}){let r=e.startsWith("http")?e:e.startsWith("/api")?`${n?n.replace(/\/$/,""):""}${e}`:`${s}${e.startsWith("/")?"":"/"}${e}`,a=function(){{let e=window.Telegram?.WebApp;if(e&&"string"==typeof e.initData)return e.initData}return""}(),l={Accept:"application/json",...t.headers||{}};a&&(l["x-telegram-init-data"]=a);try{let e=await fetch(r,{credentials:"include",...t,headers:l}),a=await i(e);if(!e.ok){let t=a?.message||`Request failed with HTTP status ${e.status}`;console.error(`[API Network Error] ${e.status} ${r}:`,t);let n=Error(t);throw n.status=e.status,n.data=a,n}return a}catch(e){throw e.status||console.error(`[API Connection Failed] ${r}:`,e.message||e),e}}async function l(e,t){return await o("/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e,password:t})})}async function d(){try{let e=await o(`/user/packages?t=${Date.now()}`,{cache:"no-store"});return Array.isArray(e?.data)?e.data:Array.isArray(e)?e:[]}catch(e){return console.error("[API] fetchPackages failed:",e),[]}}},39092:(e,t,r)=>{"use strict";e.exports=r(73279).style},40721:(e,t,r)=>{"use strict";r.d(t,{DynamicThemeProvider:()=>m,G:()=>h});var a=r(95155),n=r(12115),s=r(27529),i=r(39092),o=r.n(i);function l({config:e}){let[t,r]=(0,n.useState)([]),[s,i]=(0,n.useState)(!1);return((0,n.useEffect)(()=>{if(i(!0),!e||!e.enabled||!e.particle_svgs||0===e.particle_svgs.length||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return void r([]);let t=window.innerWidth<640?e.particle_count_mobile||4:e.particle_count_desktop||8,a="fast"===e.speed?8:"medium"===e.speed?12:16;r(Array.from({length:t},(t,r)=>({id:r,svgUrl:e.particle_svgs[r%e.particle_svgs.length],left:Math.round(90*Math.random()+5),size:Math.round(5*Math.random()+11),duration:Math.round((a+6*Math.random())*10)/10,delay:Math.round(8*Math.random()*10)/10,rotation:Math.round(360*Math.random()),drift:Math.round((Math.random()-.5)*30)})))},[e]),s&&e?.enabled&&0!==t.length)?(0,a.jsxs)("div",{"aria-hidden":"true",className:"jsx-59675e8bc51853ac fixed inset-0 pointer-events-none overflow-hidden z-20 select-none",children:[t.map(e=>(0,a.jsx)("img",{src:e.svgUrl,alt:"",style:{left:`${e.left}%`,top:"-24px",width:`${e.size}px`,height:`${e.size}px`,animation:`floatingDriftDown ${e.duration}s cubic-bezier(0.4, 0, 0.2, 1) infinite`,animationDelay:`${e.delay}s`,transform:`rotate(${e.rotation}deg)`},className:"jsx-59675e8bc51853ac absolute will-change-transform opacity-25 dark:opacity-20 select-none pointer-events-none"},e.id)),(0,a.jsx)(o(),{id:"59675e8bc51853ac",children:"@keyframes floatingDriftDown{0%{transform:translatey(-24px)rotate(0deg)translatex(0);opacity:0}15%{opacity:.28}85%{opacity:.28}100%{transform:translatey(105vh)rotate(360deg)translatex(20px);opacity:0}}"})]}):null}let d={id:"default-obsidian",name:"Apple Obsidian (Default)",category:"default",tokens:{"--theme-primary":"#0071E3","--theme-primary-hover":"#0077ED","--theme-accent":"#34C759","--theme-canvas":"#F5F5F7","--theme-parchment":"#FFFFFF","--theme-hairline":"rgba(0, 0, 0, 0.08)","--theme-header-bg":"#1D1D1F","--theme-header-text":"#FFFFFF","--theme-surface-glow":"rgba(0, 113, 227, 0.08)","--theme-card-border":"rgba(0, 0, 0, 0.08)","--theme-dark-canvas":"#000000","--theme-dark-parchment":"#161617","--theme-dark-header-bg":"#1C1C1E","--theme-dark-hairline":"rgba(255, 255, 255, 0.08)"},assets:{pattern_svg_url:"none",theme_badge_text:"Default"},ornaments:{enabled:!1,particle_svgs:[]},meta:{mode:"default_fallback",auto_schedule_enabled:!0}},c=(0,n.createContext)({theme:d,isLoading:!1,refreshTheme:async()=>{},previewTheme:()=>{}});function m({children:e}){let[t,r]=(0,n.useState)(d),[i,o]=(0,n.useState)(null),[h,u]=(0,n.useState)(!0),p=i||t,b=async()=>{try{let e=await fetch(`${s.H$}/theme/active`,{cache:"no-store",headers:{Accept:"application/json"}});if(e.ok){let t=await e.json();t.success&&t.data&&r(t.data)}}catch(e){console.warn("Could not fetch active theme, using obsidian fallback:",e)}finally{u(!1)}};(0,n.useEffect)(()=>{b();let e=setInterval(b,18e4);return()=>clearInterval(e)},[]);let g=(0,n.useMemo)(()=>{if(!p?.tokens)return"";let e=p.tokens,t="default-obsidian"===p.id,r=e["--theme-primary"]||"#0071E3",a=e["--theme-primary-hover"]||"#0077ED",n=e["--theme-accent"]||"#34C759",s=e["--theme-canvas"]||"#F5F5F7",i=e["--theme-parchment"]||"#FFFFFF",o=e["--theme-hairline"]||"rgba(0, 0, 0, 0.08)",l=e["--theme-header-bg"]||"#1D1D1F",d=e["--theme-header-text"]||"#FFFFFF",c=e["--theme-surface-glow"]||"rgba(0, 113, 227, 0.08)",m=e["--theme-card-border"]||"rgba(0, 0, 0, 0.08)",h=e["--theme-dark-canvas"]||"#000000",u=e["--theme-dark-parchment"]||"#161617",b=e["--theme-dark-header-bg"]||"#1C1C1E",g=e["--theme-dark-hairline"]||"rgba(255, 255, 255, 0.08)";return t?`
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
        --color-canvas: ${s} !important;
        --color-parchment: ${i} !important;
        --color-surface-tile: ${l} !important;
        --color-hairline: ${o} !important;
        --background: ${s} !important;
        --theme-primary: ${r} !important;
        --theme-primary-hover: ${a} !important;
        --theme-accent: ${n} !important;
        --theme-canvas: ${s} !important;
        --theme-parchment: ${i} !important;
        --theme-surface-glow: ${c} !important;
        --theme-card-border: ${m} !important;
        --theme-header-bg: ${l} !important;
        --theme-header-text: ${d} !important;
      }

      .dark {
        --color-primary: ${r} !important;
        --color-primary-hover: ${a} !important;
        --color-canvas: ${h} !important;
        --color-parchment: ${u} !important;
        --color-surface-tile: ${b} !important;
        --color-hairline: ${g} !important;
        --background: ${h} !important;
        --theme-canvas: ${h} !important;
        --theme-parchment: ${u} !important;
        --theme-header-bg: ${b} !important;
      }

      /* 1. Global Page Background Transformation */
      body {
        background-color: ${s} !important;
        transition: background-color 0.4s ease;
      }
      .dark body {
        background-color: ${h} !important;
      }

      html:not(.dark) .bg-canvas,
      :not(.dark) .bg-canvas {
        background-color: ${s} !important;
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
        background-color: ${u} !important;
      }

      /* 3. Global Hairlines & Borders */
      html:not(.dark) .border-hairline,
      :not(.dark) .border-hairline,
      html:not(.dark) .divide-hairline > * + *,
      :not(.dark) .divide-hairline > * + *,
      :not(.dark) .border-black/[0.05],
      :not(.dark) .border-black/[0.06],
      :not(.dark) .divide-black/[0.05] > * + * {
        border-color: ${o} !important;
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
        border-color: ${o} !important;
      }

      /* 8. Ambient Glowing Shadows */
      .theme-glow {
        box-shadow: 0 4px 28px ${c} !important;
      }
    `},[p]);return(0,a.jsxs)(c.Provider,{value:{theme:p,isLoading:h,refreshTheme:b,previewTheme:o},children:[(0,a.jsx)("style",{id:"dynamic-theme-vars",dangerouslySetInnerHTML:{__html:g}}),p?.id!=="default-obsidian"&&(0,a.jsx)("div",{className:"fixed top-0 left-0 right-0 h-64 pointer-events-none z-0 opacity-15 dark:opacity-20 transition-opacity duration-700 select-none",style:{background:`radial-gradient(ellipse 110% 70% at 50% -20%, ${p.tokens["--theme-primary"]}, transparent 75%)`},"aria-hidden":"true"}),p?.id!=="default-obsidian"&&(0,a.jsx)("div",{className:"fixed bottom-0 left-0 right-0 h-40 pointer-events-none z-0 opacity-10 dark:opacity-15 transition-opacity duration-700 select-none",style:{background:`radial-gradient(ellipse 100% 70% at 50% 120%, ${p.tokens["--theme-primary"]}, transparent 75%)`},"aria-hidden":"true"}),p?.ornaments?.enabled&&(0,a.jsx)(l,{config:p.ornaments}),p?.id!=="default-obsidian"&&(0,a.jsxs)("aside",{className:"w-full py-1.5 px-4 text-xs font-medium text-white flex items-center justify-center gap-2.5 select-none relative z-40 transition-colors border-b border-white/10 backdrop-blur-md",style:{background:`linear-gradient(90deg, rgba(20,20,22,0.95) 0%, color-mix(in srgb, ${p.tokens["--theme-primary"]} 22%, rgba(20,20,22,0.95)) 50%, rgba(20,20,22,0.95) 100%)`},children:[(0,a.jsxs)("span",{className:"inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white",style:{backgroundColor:`color-mix(in srgb, ${p.tokens["--theme-primary"]} 35%, transparent)`,border:`1px solid color-mix(in srgb, ${p.tokens["--theme-primary"]} 50%, transparent)`},children:[(0,a.jsx)("span",{className:"w-1.5 h-1.5 rounded-full animate-pulse",style:{backgroundColor:p.tokens["--theme-primary"]}}),p.meta?.event_name||"Edisi Perayaan"]}),(0,a.jsx)("span",{className:"text-xs text-white/90 font-medium tracking-tight",children:p.name})]}),e]})}function h(){return(0,n.useContext)(c)}},44037:(e,t,r)=>{"use strict";r.d(t,{Z:()=>n});var a=r(95155);function n({children:e,className:t="",glass:r,...s}){return(0,a.jsx)("div",{className:`${r?"rounded-xl border border-gray-200/60 bg-white/80 backdrop-blur-md p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]":"rounded-xl border border-gray-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"} ${t}`,...s,children:e})}r(12115)},54327:(e,t,r)=>{"use strict";r.d(t,{$:()=>n});var a=r(95155);function n({children:e,variant:t="primary",size:r="md",isLoading:s,className:i="",disabled:o,...l}){return(0,a.jsxs)("button",{className:`inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] ${{primary:"bg-gray-900 text-white hover:bg-gray-800 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-transparent",secondary:"bg-white text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 shadow-[0_1px_2px_rgba(0,0,0,0.02)]",outline:"border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.02)]",ghost:"hover:bg-gray-100/70 text-gray-600 hover:text-gray-900 rounded-lg",danger:"bg-red-50 text-red-600 hover:bg-red-100/80 border border-red-200/60 rounded-lg",pearl:"bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100"}[t]} ${{sm:"h-8 px-3 text-xs tracking-tight",md:"h-10 px-4 text-sm tracking-tight",lg:"h-12 px-6 text-sm tracking-tight"}[r]} ${i}`,disabled:s||o,...l,children:[s?(0,a.jsxs)("svg",{className:"animate-spin -ml-1 mr-2 h-4 w-4 text-current",xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",children:[(0,a.jsx)("circle",{className:"opacity-25",cx:"12",cy:"12",r:"10",stroke:"currentColor",strokeWidth:"4"}),(0,a.jsx)("path",{className:"opacity-75",fill:"currentColor",d:"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"})]}):null,e]})}r(12115)},68755:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>h});var a=r(95155),n=r(12115),s=r(44037),i=r(54327),o=r(27529),l=r(40721),d=r(37042),c=r.n(d);function m(){let{refreshTheme:e,previewTheme:t}=(0,l.G)(),[r,d]=(0,n.useState)(null),[m,h]=(0,n.useState)(!0),[u,p]=(0,n.useState)(!1),[b,g]=(0,n.useState)(null),[x,f]=(0,n.useState)({}),y=async()=>{try{h(!0);let e=await fetch(`${o.H$}/theme/admin/overview`,{credentials:"include",headers:{Accept:"application/json"}});if(!e.ok)throw Error("Gagal memuat data tema");let t=await e.json();if(t.success&&t.data){d(t.data);let e={};t.data.schedules.forEach(t=>{e[t.id]={before:t.buffer_days_before,after:t.buffer_days_after}}),f(e)}}catch(e){console.error(e),c().fire({icon:"error",title:"Gagal Memuat Tema",text:e.message||"Terjadi kesalahan saat memuat konfigurasi tema"})}finally{h(!1)}};(0,n.useEffect)(()=>{y()},[]);let v=async a=>{try{p(!0);let n={autoScheduleEnabled:a,manualOverrideThemeId:a?null:r?.settings.manualOverrideThemeId||"default-obsidian"},s=await fetch(`${o.H$}/theme/admin/settings`,{method:"PUT",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(n)}),i=await s.json();if(!s.ok||!i.success)throw Error(i.message||"Gagal menyimpan pengaturan");await e(),t(null),await y(),c().fire({icon:"success",title:"Pengaturan Disimpan",text:a?"Penjadwalan otomatis berbasis kalender momentum telah AKTIF.":"Penjadwalan otomatis NONAKTIF. Sistem beralih ke mode manual override.",timer:2e3,showConfirmButton:!1})}catch(e){c().fire({icon:"error",title:"Gagal",text:e.message||"Terjadi kesalahan"})}finally{p(!1)}},k=async r=>{try{p(!0);let a=await fetch(`${o.H$}/theme/admin/settings`,{method:"PUT",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({autoScheduleEnabled:!1,manualOverrideThemeId:r})}),n=await a.json();if(!a.ok||!n.success)throw Error(n.message||"Gagal mengunci tema");await e(),t(null),await y(),c().fire({icon:"success",title:"Tema Diterapkan",text:`Tema "${n.data?.activeTheme?.name||r}" berhasil dikunci dan diterapkan ke seluruh halaman website.`,timer:2200,showConfirmButton:!1})}catch(e){c().fire({icon:"error",title:"Gagal Menerapkan Tema",text:e.message||"Terjadi kesalahan"})}finally{p(!1)}},w=async t=>{let r=x[t];if(r)try{p(!0);let a=await fetch(`${o.H$}/theme/admin/schedule/${t}`,{method:"PUT",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({bufferDaysBefore:r.before,bufferDaysAfter:r.after})}),n=await a.json();if(!a.ok||!n.success)throw Error(n.message||"Gagal memperbarui jadwal");await e(),await y(),g(null),c().fire({icon:"success",title:"Jadwal Diperbarui",text:"Ambang batas hari aktif (H-X s.d H+X) berhasil disimpan.",timer:1800,showConfirmButton:!1})}catch(e){c().fire({icon:"error",title:"Gagal",text:e.message||"Terjadi kesalahan saat menyimpan jadwal"})}finally{p(!1)}};if(m&&!r)return(0,a.jsxs)("div",{className:"p-8 text-center space-y-3",children:[(0,a.jsx)("div",{className:"w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"}),(0,a.jsx)("p",{className:"text-xs text-ink-muted",children:"Memuat engine tema dan kalender momentum..."})]});let _=r?.activeTheme,j=r?.settings.autoScheduleEnabled??!0;return(0,a.jsxs)("div",{className:"space-y-6",children:[(0,a.jsx)(s.Z,{glass:!0,className:"p-5 sm:p-6 border border-hairline relative overflow-hidden",children:(0,a.jsxs)("div",{className:"flex flex-col md:flex-row md:items-center justify-between gap-5",children:[(0,a.jsxs)("div",{className:"space-y-1.5",children:[(0,a.jsxs)("div",{className:"flex items-center gap-2",children:[(0,a.jsx)("span",{className:"px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary rounded-full border border-primary/20",children:"Dynamic Theme Engine"}),(0,a.jsxs)("span",{className:`flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${j?"bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20":"bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"}`,children:[(0,a.jsx)("span",{className:`w-1.5 h-1.5 rounded-full ${j?"bg-emerald-500 animate-pulse":"bg-amber-500"}`}),j?"Mode Otomatis (Auto-Schedule ON)":"Manual Override Aktif"]})]}),(0,a.jsx)("h2",{className:"text-xl sm:text-2xl font-black tracking-tight text-ink",children:_?.name||"Apple Obsidian"}),(0,a.jsx)("p",{className:"text-xs text-ink-muted max-w-2xl leading-relaxed",children:_?.description||"Desain bawaan sistem."}),_?.meta?.event_name&&(0,a.jsxs)("div",{className:"pt-1 flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400",children:[(0,a.jsx)("span",{className:"w-2 h-2 rounded-full bg-emerald-500"}),"Momentum Kalender Aktif: ",_.meta.event_name]})]}),(0,a.jsxs)("div",{className:"flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0 bg-parchment/60 dark:bg-white/5 p-4 rounded-2xl border border-hairline",children:[(0,a.jsxs)("div",{className:"space-y-1",children:[(0,a.jsx)("p",{className:"text-[10px] font-bold uppercase tracking-wider text-ink-muted",children:"Palet Aktif"}),(0,a.jsxs)("div",{className:"flex items-center gap-2",children:[(0,a.jsx)("div",{className:"w-7 h-7 rounded-xl border border-black/10 shadow-xs",style:{backgroundColor:_?.tokens["--theme-primary"]||"#0071E3"},title:"Primary Color"}),(0,a.jsx)("div",{className:"w-7 h-7 rounded-xl border border-black/10 shadow-xs",style:{backgroundColor:_?.tokens["--theme-accent"]||"#34C759"},title:"Accent Color"}),(0,a.jsx)("div",{className:"w-7 h-7 rounded-xl border border-black/10 shadow-xs",style:{backgroundColor:_?.tokens["--theme-header-bg"]||"#1D1D1F"},title:"Header / Obsidian Card"})]})]}),(0,a.jsx)("div",{className:"h-8 w-px bg-hairline hidden sm:block"}),(0,a.jsxs)("div",{className:"space-y-1",children:[(0,a.jsx)("p",{className:"text-[10px] font-bold uppercase tracking-wider text-ink-muted",children:"Auto-Schedule"}),(0,a.jsx)(i.$,{size:"sm",variant:j?"primary":"outline",disabled:u,onClick:()=>v(!j),className:"text-xs font-bold",children:j?"Otomatis: ON":"Otomatis: OFF"})]})]})]})}),(0,a.jsxs)("div",{className:"space-y-3",children:[(0,a.jsxs)("div",{className:"flex flex-col sm:flex-row sm:items-center justify-between gap-1",children:[(0,a.jsxs)("div",{children:[(0,a.jsx)("h3",{className:"text-base font-bold text-ink",children:"Preset Tema Momentum Indonesia"}),(0,a.jsx)("p",{className:"text-xs text-ink-muted",children:"Pilih tema di bawah untuk menerapkan dan mengunci tampilan secara manual (One-Click Apply)."})]}),!j&&(0,a.jsx)(i.$,{size:"sm",variant:"outline",onClick:()=>v(!0),className:"text-xs font-bold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10",children:"Kembalikan ke Auto-Schedule"})]}),(0,a.jsx)("div",{className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5",children:r?.themes.map(e=>{let r=_?.id===e.id,n=e.tokens["--theme-primary"]||"#0071E3",s=e.tokens["--theme-accent"]||"#34C759",o=e.tokens["--theme-header-bg"]||"#1D1D1F";return(0,a.jsxs)("div",{className:`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 bg-canvas ${r?"border-primary ring-2 ring-primary/30 shadow-md":"border-hairline hover:border-primary/40 shadow-xs"}`,children:[(0,a.jsxs)("div",{className:"space-y-2",children:[(0,a.jsxs)("div",{className:"flex items-center justify-between gap-2",children:[(0,a.jsx)("span",{className:"px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-parchment border border-hairline text-ink-muted",children:e.category}),r&&(0,a.jsx)("span",{className:"px-2 py-0.5 rounded-full text-[9px] font-bold bg-primary text-white",children:"Aktif Sekarang"})]}),(0,a.jsxs)("div",{children:[(0,a.jsx)("h4",{className:"font-bold text-sm text-ink",children:e.name}),(0,a.jsx)("p",{className:"text-[11px] text-ink-muted line-clamp-2 mt-0.5",children:e.description})]}),(0,a.jsxs)("div",{className:"flex items-center gap-1.5 pt-1",children:[(0,a.jsx)("div",{className:"w-5 h-5 rounded-lg border border-black/10 shadow-2xs",style:{backgroundColor:n},title:"Primary"}),(0,a.jsx)("div",{className:"w-5 h-5 rounded-lg border border-black/10 shadow-2xs",style:{backgroundColor:s},title:"Accent"}),(0,a.jsx)("div",{className:"w-5 h-5 rounded-lg border border-black/10 shadow-2xs",style:{backgroundColor:o},title:"Card Header"}),(0,a.jsx)("span",{className:"text-[10px] text-ink-muted font-mono ml-1",children:n})]})]}),(0,a.jsxs)("div",{className:"flex items-center gap-2 pt-2 border-t border-hairline",children:[(0,a.jsx)(i.$,{size:"sm",variant:r?"outline":"primary",disabled:u||r,onClick:()=>k(e.id),className:"flex-1 text-xs font-bold",children:r?"Sedang Digunakan":"Kunci Tema Ini"}),(0,a.jsx)(i.$,{size:"sm",variant:"ghost",onClick:()=>t(e),className:"text-xs text-ink-muted hover:text-ink px-2.5",title:"Coba pratinjau tema di browser Anda",children:"Pratinjau"})]})]},e.id)})})]}),(0,a.jsxs)("div",{className:"space-y-3",children:[(0,a.jsxs)("div",{children:[(0,a.jsx)("h3",{className:"text-base font-bold text-ink",children:"Jadwal Kalender & Aturan Buffer (H-X s.d H+X)"}),(0,a.jsx)("p",{className:"text-xs text-ink-muted",children:"Tentukan berapa hari sebelum (H-) dan sesudah (H+) hari perayaan tema momentum akan aktif otomatis."})]}),(0,a.jsx)("div",{className:"border border-hairline rounded-2xl overflow-hidden bg-canvas",children:(0,a.jsx)("div",{className:"overflow-x-auto",children:(0,a.jsxs)("table",{className:"w-full text-left text-xs",children:[(0,a.jsx)("thead",{className:"bg-parchment/60 dark:bg-white/5 border-b border-hairline text-ink-muted uppercase font-bold text-[10px] tracking-wider",children:(0,a.jsxs)("tr",{children:[(0,a.jsx)("th",{className:"p-3.5",children:"Momentum & Hari Besar"}),(0,a.jsx)("th",{className:"p-3.5",children:"Jenis Kalender"}),(0,a.jsx)("th",{className:"p-3.5 text-center",children:"Buffer Mulai (H-X)"}),(0,a.jsx)("th",{className:"p-3.5 text-center",children:"Buffer Berakhir (H+X)"}),(0,a.jsx)("th",{className:"p-3.5 text-center",children:"Prioritas"}),(0,a.jsx)("th",{className:"p-3.5 text-right",children:"Aksi"})]})}),(0,a.jsx)("tbody",{className:"divide-y divide-hairline",children:r?.schedules.map(e=>{let t=b===e.id,r=x[e.id]||{before:e.buffer_days_before,after:e.buffer_days_after};return(0,a.jsxs)("tr",{className:"hover:bg-parchment/40 dark:hover:bg-white/5 transition-colors",children:[(0,a.jsxs)("td",{className:"p-3.5",children:[(0,a.jsx)("div",{className:"font-bold text-ink",children:e.event_name}),(0,a.jsxs)("div",{className:"text-[10px] text-ink-muted font-mono",children:["ID Tema: ",e.theme_id]})]}),(0,a.jsx)("td",{className:"p-3.5",children:(0,a.jsx)("span",{className:"px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-white/10 text-ink",children:"SOLAR_FIXED"===e.calendar_type?`Masehi (${String(e.solar_day).padStart(2,"0")}/${String(e.solar_month).padStart(2,"0")})`:`Dinamis Lunar (${e.lunar_event_key})`})}),(0,a.jsx)("td",{className:"p-3.5 text-center",children:t?(0,a.jsxs)("div",{className:"inline-flex items-center gap-1",children:[(0,a.jsx)("span",{className:"text-ink-muted font-bold",children:"H-"}),(0,a.jsx)("input",{type:"number",min:"0",max:"30",value:r.before,onChange:t=>f(a=>({...a,[e.id]:{...r,before:parseInt(t.target.value,10)||0}})),className:"w-14 p-1 text-center font-bold border border-hairline rounded-lg bg-canvas text-ink"}),(0,a.jsx)("span",{className:"text-ink-muted text-[10px]",children:"hari"})]}):(0,a.jsxs)("span",{className:"font-bold text-ink",children:["H-",e.buffer_days_before," hari"]})}),(0,a.jsx)("td",{className:"p-3.5 text-center",children:t?(0,a.jsxs)("div",{className:"inline-flex items-center gap-1",children:[(0,a.jsx)("span",{className:"text-ink-muted font-bold",children:"H+"}),(0,a.jsx)("input",{type:"number",min:"0",max:"30",value:r.after,onChange:t=>f(a=>({...a,[e.id]:{...r,after:parseInt(t.target.value,10)||0}})),className:"w-14 p-1 text-center font-bold border border-hairline rounded-lg bg-canvas text-ink"}),(0,a.jsx)("span",{className:"text-ink-muted text-[10px]",children:"hari"})]}):(0,a.jsxs)("span",{className:"font-bold text-ink",children:["H+",e.buffer_days_after," hari"]})}),(0,a.jsx)("td",{className:"p-3.5 text-center",children:(0,a.jsx)("span",{className:"font-mono font-bold text-ink-muted",children:e.priority_score})}),(0,a.jsx)("td",{className:"p-3.5 text-right",children:t?(0,a.jsxs)("div",{className:"flex items-center justify-end gap-1.5",children:[(0,a.jsx)(i.$,{size:"sm",variant:"primary",disabled:u,onClick:()=>w(e.id),className:"text-[11px] py-1 px-2.5",children:"Simpan"}),(0,a.jsx)(i.$,{size:"sm",variant:"ghost",onClick:()=>g(null),className:"text-[11px] py-1 px-2",children:"Batal"})]}):(0,a.jsx)(i.$,{size:"sm",variant:"outline",onClick:()=>g(e.id),className:"text-[11px] py-1 px-2.5",children:"Ubah Buffer"})})]},e.id)})})]})})})]})]})}function h(){return(0,a.jsx)("div",{className:"space-y-4",children:(0,a.jsx)(m,{})})}},73279:(e,t,r)=>{"use strict";var a=r(41463);r(23333);var n=r(12115),s=n&&"object"==typeof n&&"default"in n?n:{default:n},i=void 0!==a&&a.env&&!0,o=function(e){return"[object String]"===Object.prototype.toString.call(e)},l=function(){function e(e){var t=void 0===e?{}:e,r=t.name,a=void 0===r?"stylesheet":r,n=t.optimizeForSpeed,s=void 0===n?i:n;d(o(a),"`name` must be a string"),this._name=a,this._deletedRulePlaceholder="#"+a+"-deleted-rule____{}",d("boolean"==typeof s,"`optimizeForSpeed` must be a boolean"),this._optimizeForSpeed=s,this._serverSheet=void 0,this._tags=[],this._injected=!1,this._rulesCount=0;var l="u">typeof window&&document.querySelector('meta[property="csp-nonce"]');this._nonce=l?l.getAttribute("content"):null}var t,r=e.prototype;return r.setOptimizeForSpeed=function(e){d("boolean"==typeof e,"`setOptimizeForSpeed` accepts a boolean"),d(0===this._rulesCount,"optimizeForSpeed cannot be when rules have already been inserted"),this.flush(),this._optimizeForSpeed=e,this.inject()},r.isOptimizeForSpeed=function(){return this._optimizeForSpeed},r.inject=function(){var e=this;if(d(!this._injected,"sheet already injected"),this._injected=!0,"u">typeof window&&this._optimizeForSpeed){this._tags[0]=this.makeStyleTag(this._name),this._optimizeForSpeed="insertRule"in this.getSheet(),this._optimizeForSpeed||(i||console.warn("StyleSheet: optimizeForSpeed mode not supported falling back to standard mode."),this.flush(),this._injected=!0);return}this._serverSheet={cssRules:[],insertRule:function(t,r){return"number"==typeof r?e._serverSheet.cssRules[r]={cssText:t}:e._serverSheet.cssRules.push({cssText:t}),r},deleteRule:function(t){e._serverSheet.cssRules[t]=null}}},r.getSheetForTag=function(e){if(e.sheet)return e.sheet;for(var t=0;t<document.styleSheets.length;t++)if(document.styleSheets[t].ownerNode===e)return document.styleSheets[t]},r.getSheet=function(){return this.getSheetForTag(this._tags[this._tags.length-1])},r.insertRule=function(e,t){if(d(o(e),"`insertRule` accepts only strings"),"u"<typeof window)return"number"!=typeof t&&(t=this._serverSheet.cssRules.length),this._serverSheet.insertRule(e,t),this._rulesCount++;if(this._optimizeForSpeed){var r=this.getSheet();"number"!=typeof t&&(t=r.cssRules.length);try{r.insertRule(e,t)}catch(t){return i||console.warn("StyleSheet: illegal rule: \n\n"+e+"\n\nSee https://stackoverflow.com/q/20007992 for more info"),-1}}else{var a=this._tags[t];this._tags.push(this.makeStyleTag(this._name,e,a))}return this._rulesCount++},r.replaceRule=function(e,t){if(this._optimizeForSpeed||"u"<typeof window){var r="u">typeof window?this.getSheet():this._serverSheet;if(t.trim()||(t=this._deletedRulePlaceholder),!r.cssRules[e])return e;r.deleteRule(e);try{r.insertRule(t,e)}catch(a){i||console.warn("StyleSheet: illegal rule: \n\n"+t+"\n\nSee https://stackoverflow.com/q/20007992 for more info"),r.insertRule(this._deletedRulePlaceholder,e)}}else{var a=this._tags[e];d(a,"old rule at index `"+e+"` not found"),a.textContent=t}return e},r.deleteRule=function(e){if("u"<typeof window)return void this._serverSheet.deleteRule(e);if(this._optimizeForSpeed)this.replaceRule(e,"");else{var t=this._tags[e];d(t,"rule at index `"+e+"` not found"),t.parentNode.removeChild(t),this._tags[e]=null}},r.flush=function(){this._injected=!1,this._rulesCount=0,"u">typeof window?(this._tags.forEach(function(e){return e&&e.parentNode.removeChild(e)}),this._tags=[]):this._serverSheet.cssRules=[]},r.cssRules=function(){var e=this;return"u"<typeof window?this._serverSheet.cssRules:this._tags.reduce(function(t,r){return r?t=t.concat(Array.prototype.map.call(e.getSheetForTag(r).cssRules,function(t){return t.cssText===e._deletedRulePlaceholder?null:t})):t.push(null),t},[])},r.makeStyleTag=function(e,t,r){t&&d(o(t),"makeStyleTag accepts only strings as second parameter");var a=document.createElement("style");this._nonce&&a.setAttribute("nonce",this._nonce),a.type="text/css",a.setAttribute("data-"+e,""),t&&a.appendChild(document.createTextNode(t));var n=document.head||document.getElementsByTagName("head")[0];return r?n.insertBefore(a,r):n.appendChild(a),a},t=[{key:"length",get:function(){return this._rulesCount}}],function(e,t){for(var r=0;r<t.length;r++){var a=t[r];a.enumerable=a.enumerable||!1,a.configurable=!0,"value"in a&&(a.writable=!0),Object.defineProperty(e,a.key,a)}}(e.prototype,t),e}();function d(e,t){if(!e)throw Error("StyleSheet: "+t+".")}var c=function(e){for(var t=5381,r=e.length;r;)t=33*t^e.charCodeAt(--r);return t>>>0},m={};function h(e,t){if(!t)return"jsx-"+e;var r=String(t),a=e+r;return m[a]||(m[a]="jsx-"+c(e+"-"+r)),m[a]}function u(e,t){"u"<typeof window&&(t=t.replace(/\/style/gi,"\\/style"));var r=e+t;return m[r]||(m[r]=t.replace(/__jsx-style-dynamic-selector/g,e)),m[r]}var p=function(){function e(e){var t=void 0===e?{}:e,r=t.styleSheet,a=void 0===r?null:r,n=t.optimizeForSpeed,s=void 0!==n&&n;this._sheet=a||new l({name:"styled-jsx",optimizeForSpeed:s}),this._sheet.inject(),a&&"boolean"==typeof s&&(this._sheet.setOptimizeForSpeed(s),this._optimizeForSpeed=this._sheet.isOptimizeForSpeed()),this._fromServer=void 0,this._indices={},this._instancesCounts={}}var t=e.prototype;return t.add=function(e){var t=this;void 0===this._optimizeForSpeed&&(this._optimizeForSpeed=Array.isArray(e.children),this._sheet.setOptimizeForSpeed(this._optimizeForSpeed),this._optimizeForSpeed=this._sheet.isOptimizeForSpeed()),"u">typeof window&&!this._fromServer&&(this._fromServer=this.selectFromServer(),this._instancesCounts=Object.keys(this._fromServer).reduce(function(e,t){return e[t]=0,e},{}));var r=this.getIdAndRules(e),a=r.styleId,n=r.rules;if(a in this._instancesCounts){this._instancesCounts[a]+=1;return}var s=n.map(function(e){return t._sheet.insertRule(e)}).filter(function(e){return -1!==e});this._indices[a]=s,this._instancesCounts[a]=1},t.remove=function(e){var t=this,r=this.getIdAndRules(e).styleId;if(function(e,t){if(!e)throw Error("StyleSheetRegistry: "+t+".")}(r in this._instancesCounts,"styleId: `"+r+"` not found"),this._instancesCounts[r]-=1,this._instancesCounts[r]<1){var a=this._fromServer&&this._fromServer[r];a?(a.parentNode.removeChild(a),delete this._fromServer[r]):(this._indices[r].forEach(function(e){return t._sheet.deleteRule(e)}),delete this._indices[r]),delete this._instancesCounts[r]}},t.update=function(e,t){this.add(t),this.remove(e)},t.flush=function(){this._sheet.flush(),this._sheet.inject(),this._fromServer=void 0,this._indices={},this._instancesCounts={}},t.cssRules=function(){var e=this,t=this._fromServer?Object.keys(this._fromServer).map(function(t){return[t,e._fromServer[t]]}):[],r=this._sheet.cssRules();return t.concat(Object.keys(this._indices).map(function(t){return[t,e._indices[t].map(function(e){return r[e].cssText}).join(e._optimizeForSpeed?"":"\n")]}).filter(function(e){return!!e[1]}))},t.styles=function(e){var t,r;return t=this.cssRules(),void 0===(r=e)&&(r={}),t.map(function(e){var t=e[0],a=e[1];return s.default.createElement("style",{id:"__"+t,key:"__"+t,nonce:r.nonce?r.nonce:void 0,dangerouslySetInnerHTML:{__html:a}})})},t.getIdAndRules=function(e){var t=e.children,r=e.dynamic,a=e.id;if(r){var n=h(a,r);return{styleId:n,rules:Array.isArray(t)?t.map(function(e){return u(n,e)}):[u(n,t)]}}return{styleId:h(a),rules:Array.isArray(t)?t:[t]}},t.selectFromServer=function(){return Array.prototype.slice.call(document.querySelectorAll('[id^="__jsx-"]')).reduce(function(e,t){return e[t.id.slice(2)]=t,e},{})},e}(),b=n.createContext(null);b.displayName="StyleSheetContext";var g=s.default.useInsertionEffect||s.default.useLayoutEffect,x="u">typeof window?new p:void 0;function f(e){var t=x||n.useContext(b);return t&&("u"<typeof window?t.add(e):g(function(){return t.add(e),function(){t.remove(e)}},[e.id,String(e.dynamic)])),null}f.dynamic=function(e){return e.map(function(e){return h(e[0],e[1])}).join(" ")},t.style=f},92015:(e,t,r)=>{Promise.resolve().then(r.bind(r,68755))}},e=>{e.O(0,[8320,8441,8928,7358],()=>e(e.s=92015)),_N_E=e.O()}]);