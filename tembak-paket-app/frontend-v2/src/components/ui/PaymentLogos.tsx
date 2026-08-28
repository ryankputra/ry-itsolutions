"use client";
import React from "react";
import Image from "next/image";

export interface PaymentMethodItem {
  name: string;
  src: string;
  alt: string;
  heightClass?: string;
}

export const PAYMENT_METHODS: PaymentMethodItem[] = [
  { name: "QRIS", src: "/payments/qris.png", alt: "QRIS Nasional", heightClass: "h-6 sm:h-7" },
  { name: "GoPay", src: "/payments/gopay.png", alt: "GoPay", heightClass: "h-5 sm:h-6" },
  { name: "ShopeePay", src: "/payments/shopeepay.png", alt: "ShopeePay", heightClass: "h-5 sm:h-6" },
  { name: "DANA", src: "/payments/dana.png", alt: "DANA", heightClass: "h-5 sm:h-6" },
  { name: "OVO", src: "/payments/ovo.png", alt: "OVO", heightClass: "h-5 sm:h-6" },
  { name: "LinkAja", src: "/payments/linkaja.png", alt: "LinkAja", heightClass: "h-5 sm:h-6" },
  { name: "BCA", src: "/payments/bca.png", alt: "Bank BCA", heightClass: "h-5 sm:h-6" },
  { name: "Mandiri", src: "/payments/mandiri.png", alt: "Bank Mandiri", heightClass: "h-5 sm:h-6" },
  { name: "BRI", src: "/payments/bri.png", alt: "Bank BRI", heightClass: "h-5 sm:h-6" },
  { name: "BNI", src: "/payments/bni.png", alt: "Bank BNI", heightClass: "h-5 sm:h-6" },
];

export function PaymentLogosGrid() {
  return (
    <div className="space-y-3 pt-3 border-t border-hairline/80">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-ink flex items-center gap-1.5">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
          Metode Pembayaran QRIS Otomatis:
        </span>
        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 border border-emerald-200 px-2 py-0.5 rounded-full">
          Semua Bank & E-Wallet
        </span>
      </div>

      {/* Official PNG Logos Grid */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {PAYMENT_METHODS.map((item) => (
          <div
            key={item.name}
            className="bg-white border border-slate-200/80 hover:border-primary/50 hover:shadow-xs rounded-xl p-1.5 flex items-center justify-center h-10 sm:h-11 shadow-2xs transition-all group"
            title={item.alt}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.src}
              alt={item.alt}
              className={`${item.heightClass || "h-5 sm:h-6"} w-auto max-w-[85%] object-contain group-hover:scale-105 transition-transform duration-200`}
              loading="lazy"
            />
          </div>
        ))}
      </div>

      <p className="text-[10.5px] text-ink-muted text-center pt-0.5">
        ⚡ Scan menggunakan aplikasi bank atau e-wallet apapun di atas, saldo otomatis masuk detik ini juga.
      </p>
    </div>
  );
}
