"use client";
import React from "react";

export function QrisLogo({ className = "h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="42" rx="6" fill="#1C1C1E"/>
      <path d="M12 10H24V14H16V22H24V26H12V10Z" fill="white"/>
      <path d="M18 16H22V20H18V16Z" fill="#EE3124"/>
      <path d="M28 10H38C40.2 10 42 11.8 42 14V22C42 24.2 40.2 26 38 26H28V10ZM32 14V22H38V14H32Z" fill="white"/>
      <path d="M46 10H58V14H52V16H57V20H52V22H58V26H46V10Z" fill="white"/>
      <path d="M62 10H66V26H62V10Z" fill="white"/>
      <path d="M70 22H80V26H70V22ZM70 10H80V14H70V10ZM70 14H74V18H78V22H74V18H70V14Z" fill="white"/>
      <text x="86" y="24" fill="#EE3124" fontSize="13" fontWeight="900" fontFamily="sans-serif">QRIS</text>
    </svg>
  );
}

export function GopayLogo({ className = "h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 95 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="12" fill="#00AED6"/>
      <circle cx="14" cy="14" r="5.5" fill="white"/>
      <circle cx="15.5" cy="12.5" r="2" fill="#00AED6"/>
      <text x="32" y="19.5" fill="#00AED6" fontSize="16" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="-0.5px">
        gopay
      </text>
    </svg>
  );
}

export function ShopeePayLogo({ className = "h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 115 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="28" rx="8" fill="#EE4D2D"/>
      <path d="M14 6C11.5 6 9.5 7.8 9.5 10H11.5C11.5 8.9 12.6 8 14 8C15.4 8 16.5 8.9 16.5 10H18.5C18.5 7.8 16.5 6 14 6Z" fill="white"/>
      <rect x="7" y="10" width="14" height="13" rx="2.5" fill="white"/>
      <path d="M14 12C12.5 12 11.5 13 11.5 14C11.5 15.5 13 16 14 16.5C15 17 16.5 17.5 16.5 19C16.5 20.5 15 21.5 14 21.5C12.5 21.5 11.5 20.5 11.5 20.5" stroke="#EE4D2D" strokeWidth="1.5" strokeLinecap="round"/>
      <text x="34" y="19" fill="#EE4D2D" fontSize="13.5" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif">
        Shopee<tspan fill="#F26522">Pay</tspan>
      </text>
    </svg>
  );
}

export function DanaLogo({ className = "h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 90 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="12" fill="#118EEA"/>
      <path d="M9 14L14 8L19 14L14 20L9 14Z" fill="white"/>
      <circle cx="14" cy="14" r="2.5" fill="#118EEA"/>
      <text x="32" y="19" fill="#118EEA" fontSize="16" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.5px">
        DANA
      </text>
    </svg>
  );
}

export function OvoLogo({ className = "h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 75 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="75" height="28" rx="6" fill="#4C3494"/>
      <text x="37.5" y="19" fill="#7357C6" textAnchor="middle" fontSize="15" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="2px">
        <tspan fill="white">O</tspan>V<tspan fill="white">O</tspan>
      </text>
    </svg>
  );
}

export function LinkAjaLogo({ className = "h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 90 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="28" rx="7" fill="#ED1C24"/>
      <text x="14" y="19" fill="white" textAnchor="middle" fontSize="11" fontWeight="900" fontFamily="sans-serif">LA</text>
      <text x="33" y="19" fill="#ED1C24" fontSize="13.5" fontWeight="800" fontFamily="system-ui, -apple-system, sans-serif">
        Link<tspan fill="#231F20">Aja!</tspan>
      </text>
    </svg>
  );
}

export function BcaLogo({ className = "h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 65 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="65" height="28" rx="6" fill="#00529C"/>
      <text x="32.5" y="19" fill="white" textAnchor="middle" fontSize="14" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="1px">
        BCA
      </text>
    </svg>
  );
}

export function MandiriLogo({ className = "h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 85 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="85" height="28" rx="6" fill="#003D79"/>
      <circle cx="15" cy="14" r="5" fill="#FDB813"/>
      <text x="48" y="18.5" fill="white" textAnchor="middle" fontSize="11.5" fontWeight="800" fontFamily="system-ui, -apple-system, sans-serif">
        mandırı
      </text>
    </svg>
  );
}

export function BriLogo({ className = "h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 65 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="65" height="28" rx="6" fill="#00529C"/>
      <text x="32.5" y="19" fill="white" textAnchor="middle" fontSize="14" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="1px">
        <tspan fill="#F37024">B</tspan>RI
      </text>
    </svg>
  );
}

export function BniLogo({ className = "h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 65 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="65" height="28" rx="6" fill="#005E6A"/>
      <text x="32.5" y="19" fill="white" textAnchor="middle" fontSize="14" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="1px">
        BN<tspan fill="#F15A24">I</tspan>
      </text>
    </svg>
  );
}

export function PaymentLogosGrid() {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-ink flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
          Metode Pembayaran QRIS Otomatis:
        </span>
        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
          Semua Bank & E-Wallet
        </span>
      </div>

      {/* E-Wallet & Bank Badges Grid */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        <div className="bg-canvas border border-hairline hover:border-primary/40 rounded-xl p-1.5 flex items-center justify-center h-9 shadow-2xs transition-all" title="QRIS Nasional">
          <QrisLogo className="h-5 w-auto" />
        </div>
        <div className="bg-canvas border border-hairline hover:border-primary/40 rounded-xl p-1.5 flex items-center justify-center h-9 shadow-2xs transition-all" title="GoPay">
          <GopayLogo className="h-4.5 w-auto" />
        </div>
        <div className="bg-canvas border border-hairline hover:border-primary/40 rounded-xl p-1.5 flex items-center justify-center h-9 shadow-2xs transition-all" title="ShopeePay">
          <ShopeePayLogo className="h-4.5 w-auto" />
        </div>
        <div className="bg-canvas border border-hairline hover:border-primary/40 rounded-xl p-1.5 flex items-center justify-center h-9 shadow-2xs transition-all" title="DANA">
          <DanaLogo className="h-4.5 w-auto" />
        </div>
        <div className="bg-canvas border border-hairline hover:border-primary/40 rounded-xl p-1.5 flex items-center justify-center h-9 shadow-2xs transition-all" title="OVO">
          <OvoLogo className="h-5 w-auto" />
        </div>
        <div className="bg-canvas border border-hairline hover:border-primary/40 rounded-xl p-1.5 flex items-center justify-center h-9 shadow-2xs transition-all" title="LinkAja">
          <LinkAjaLogo className="h-4.5 w-auto" />
        </div>
        <div className="bg-canvas border border-hairline hover:border-primary/40 rounded-xl p-1.5 flex items-center justify-center h-9 shadow-2xs transition-all" title="Bank BCA">
          <BcaLogo className="h-5 w-auto" />
        </div>
        <div className="bg-canvas border border-hairline hover:border-primary/40 rounded-xl p-1.5 flex items-center justify-center h-9 shadow-2xs transition-all" title="Bank Mandiri">
          <MandiriLogo className="h-4.5 w-auto" />
        </div>
        <div className="bg-canvas border border-hairline hover:border-primary/40 rounded-xl p-1.5 flex items-center justify-center h-9 shadow-2xs transition-all" title="Bank BRI">
          <BriLogo className="h-5 w-auto" />
        </div>
        <div className="bg-canvas border border-hairline hover:border-primary/40 rounded-xl p-1.5 flex items-center justify-center h-9 shadow-2xs transition-all" title="Bank BNI">
          <BniLogo className="h-5 w-auto" />
        </div>
      </div>
      
      <p className="text-[10px] text-ink-muted text-center pt-0.5">
        ⚡ Scan menggunakan aplikasi bank atau e-wallet apapun di atas, saldo otomatis masuk detik ini juga.
      </p>
    </div>
  );
}
