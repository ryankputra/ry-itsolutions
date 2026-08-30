"use client";
import React, { use } from "react";
import ProductDetailView from "@/components/ui/ProductDetailView";
import { useRouter } from "next/navigation";

export default function DynamicProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  let title = "Unblock IMEI Inter Buka Sinyal All Operator (Garansi Masa Aktif Sinyal Max 3 Bulan)";
  let serviceType = "imei";
  let price = 150000;
  let variations = [
    { id: "v1", name: "GARANSI 3 BULAN (MASA AKTIF SINYAL)", price: 150000, badge: "TERLARIS" },
    { id: "v2", name: "GARANSI 2 BULAN (MASA AKTIF SINYAL)", price: 110000, badge: "REKOMENDASI" },
    { id: "v3", name: "GARANSI 1 BULAN (MASA AKTIF SINYAL)", price: 75000, badge: "EKONOMIS" },
  ];

  if (id === "cek-ceir") {
    title = "Layanan Cek Status CEIR Kemenperin / Bea Cukai Official Report PDF";
    serviceType = "ceir";
    price = 50000;
    variations = [
      { id: "ceir_1", name: "CEK STATUS REGISTRY BEACUKAI", price: 50000, badge: "INSTAN" },
      { id: "ceir_2", name: "CEK STATUS HISTORY LENGKAP", price: 75000, badge: "LENGKAP" },
    ];
  } else if (id.startsWith("paket-")) {
    title = `Beli Paket Data ${id.replace("paket-", "").toUpperCase()} Super Speed Infinite 24 Jam`;
    serviceType = "reguler";
    price = 25000;
    variations = [
      { id: "p1", name: "PAKET FLEX 15GB + UNLIMITED", price: 25000, badge: "PROMO" },
      { id: "p2", name: "PAKET COMBO XTRA 35GB", price: 45000, badge: "BIG SALE" },
      { id: "p3", name: "PAKET UNLIMITED TURBO 100GB", price: 85000, badge: "ULTRA" },
    ];
  }

  const handleCheckout = () => {
    if (serviceType === "ceir" || id === "cek-ceir") {
      router.push("/cek-ceir");
    } else if (serviceType === "imei" || id === "unblock-imei") {
      router.push("/unblock-imei");
    } else {
      router.push("/beli-paket");
    }
  };

  return (
    <ProductDetailView
      id={id}
      title={title}
      price={price}
      serviceType={serviceType}
      variations={variations}
      onCheckoutSubmit={handleCheckout}
    />
  );
}
