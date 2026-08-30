"use client";
import React, { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import { useRouter } from "next/navigation";
import Swal from "@/lib/sweetalert";
import { safeJson } from "@/lib/api";
import WriteReviewModal from "./WriteReviewModal";
import InstantQrisPaymentModal from "./InstantQrisPaymentModal";
import { playPopSound } from "@/lib/soundFx";

export interface VariationOption {
  id: string;
  name: string;
  price: number;
  image?: string;
  badge?: string;
}

export interface ProductDetailViewProps {
  id?: string;
  title: string;
  subtitle?: string;
  originalPrice?: number;
  price: number;
  salesCount?: string;
  heroImages?: string[];
  variations?: VariationOption[];
  specifications?: { key: string; value: string }[];
  description?: string[];
  serviceType?: string;
  onCheckoutSubmit?: (selectedVar: VariationOption) => void;
}

export function ProductDetailView({
  id = "unblock-imei",
  title = "Unblock IMEI Inter Buka Sinyal All Operator (Garansi Masa Aktif Sinyal Max 3 Bulan)",
  subtitle = "Proses Kilat 1-24 Jam • 100% Bergaransi Resmi Ry-ITSolutions",
  originalPrice = 170000,
  price = 150000,
  salesCount = "10RB+ Terjual",
  heroImages = [
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800&h=600&fit=crop",
  ],
  variations = [
    { id: "v1", name: "GARANSI 3 BULAN (MASA AKTIF SINYAL)", price: 150000, badge: "TERLARIS" },
    { id: "v2", name: "GARANSI 2 BULAN (MASA AKTIF SINYAL)", price: 110000, badge: "REKOMENDASI" },
    { id: "v3", name: "GARANSI 1 BULAN (MASA AKTIF SINYAL)", price: 75000, badge: "EKONOMIS" },
  ],
  specifications = [
    { key: "Stok", value: "838 Tersedia" },
    { key: "Merek / Server", value: "Official Ry-ITSolutions" },
    { key: "Masa Garansi", value: "Masa Aktif Sinyal (Max 3 Bulan - Refund 100%)" },
    { key: "Kompatibilitas", value: "All iPhone & Android Inter (Global / US / JP)" },
    { key: "Estimasi Waktu", value: "1 - 24 Jam Kerja (Auto-Processing)" },
  ],
  description = [
    "Pembelian di atas senilai Rp 100.000 mendapatkan gratis voucher diskon koin Ry.",
    "Buka sinyal IMEI permanen bergaransi resmi untuk semua tipe iPhone & Android Inter.",
    "Proses otomatis terpantau sistem 24 jam dengan opsi pembayaran QRIS Instant tanpa top up.",
    "Tanyakan stok / bantuan CS WhatsApp jika butuh pemrosesan reseller grosir.",
    "Pastikan nomor IMEI target diisi dengan benar (15 digit angka).",
  ],
  serviceType = "imei",
  onCheckoutSubmit,
}: ProductDetailViewProps) {
  const { cart, addToCart } = useApp();
  const router = useRouter();

  // State active variation & media
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedVarId, setSelectedVarId] = useState(variations[0]?.id || "v1");
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Variations modal state (Shopee style drawer)
  const [showVariationDrawer, setShowVariationDrawer] = useState(false);
  const [drawerAction, setDrawerAction] = useState<"cart" | "buy">("buy");

  // Reviews state
  const [reviewsData, setReviewsData] = useState<any>({
    summary: { averageRating: 4.9, totalReviews: 1420, ratingCounts: { 5: 1350, 4: 55, 3: 10, 2: 3, 1: 2 }, withPhotosCount: 845 },
    reviews: [],
  });
  const [reviewFilter, setReviewFilter] = useState<"all" | "photos" | "5star">("all");
  const [searchReview, setSearchReview] = useState("");

  // Write review modal state
  const [showWriteReviewModal, setShowWriteReviewModal] = useState(false);

  // Instant QRIS modal state
  const [showInstantQris, setShowInstantQris] = useState(false);

  // Fetch product reviews from backend
  const fetchReviews = () => {
    fetch(`/api/reviews?productId=${id}`, { credentials: "include" })
      .then((res) => safeJson(res))
      .then((data) => {
        if (data?.status && data?.summary) {
          setReviewsData(data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchReviews();
  }, [id]);

  const selectedVar = variations.find((v) => v.id === selectedVarId) || variations[0];
  const currentPrice = selectedVar ? selectedVar.price : price;

  const handleLikeReview = async (reviewId: string) => {
    try { playPopSound(); } catch {}
    try {
      await fetch(`/api/reviews/${reviewId}/like`, { method: "POST", credentials: "include" });
      setReviewsData((prev: any) => ({
        ...prev,
        reviews: prev.reviews.map((r: any) => (r.id === reviewId ? { ...r, likesCount: (r.likesCount || 0) + 1 } : r)),
      }));
    } catch (e) {}
  };

  const handleAddToCartClick = () => {
    try { playPopSound(); } catch {}
    addToCart({
      id: `${id}-${selectedVar.id}-${Date.now()}`,
      serviceType: serviceType as any,
      duration: selectedVar.name,
      price: selectedVar.price,
      quantity: 1,
    });
    Swal.fire({
      title: "Berhasil Masuk Keranjang!",
      text: `${selectedVar.name} telah ditambahkan ke keranjang belanja.`,
      icon: "success",
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 2000,
    });
    setShowVariationDrawer(false);
  };

  const handleBuyNowClick = () => {
    try { playPopSound(); } catch {}
    if (onCheckoutSubmit) {
      onCheckoutSubmit(selectedVar);
    } else {
      router.push(`/unblock-imei`);
    }
  };

  // Filter reviews
  const filteredReviews = (reviewsData.reviews || []).filter((r: any) => {
    if (reviewFilter === "photos" && (!r.images || r.images.length === 0)) return false;
    if (reviewFilter === "5star" && r.rating !== 5) return false;
    if (searchReview.trim()) {
      const q = searchReview.toLowerCase();
      return r.comment.toLowerCase().includes(q) || r.userName.toLowerCase().includes(q) || r.variation?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 select-none">
      {/* Top Header Navigation Bar (Shopee Style) */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 py-2.5 flex items-center justify-between gap-3 shadow-xs">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        {/* Search Bar Input */}
        <div className="flex-1 relative">
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Cari layanan di Ry-ITSolutions..."
            value={searchReview}
            onChange={(e) => setSearchReview(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-primary border border-transparent"
          />
        </div>

        {/* Right Icons */}
        <div className="flex items-center gap-2">
          {/* Share button */}
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title, url: window.location.href });
              } else {
                navigator.clipboard.writeText(window.location.href);
                Swal.fire({ title: "Link Disalin!", icon: "success", toast: true, position: "top-end", showConfirmButton: false, timer: 1500 });
              }
            }}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200"
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
          </button>

          {/* Cart Icon with badge */}
          <button
            onClick={() => router.push("/cart")}
            className="relative w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center animate-bounce">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-3xl mx-auto space-y-3 sm:py-3">
        
        {/* 1. Hero Image Gallery Carousel & Variation Thumbnails (Screenshot 1) */}
        <div className="bg-white dark:bg-slate-900 sm:rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          <div className="relative w-full aspect-4/3 sm:aspect-16/9 bg-slate-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImages[activeImageIdx] || heroImages[0]}
              alt={title}
              className="w-full h-full object-cover transition-all duration-300"
            />
            {/* Video Badge Overlay */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-slate-950/80 text-white text-[10px] font-bold backdrop-blur-md border border-white/20 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Video &bull; Live Preview</span>
              </span>
              <span className="px-2 py-1 rounded-full bg-slate-950/80 text-white text-[10px] font-mono font-bold backdrop-blur-md">
                {activeImageIdx + 1}/{heroImages.length}
              </span>
            </div>
          </div>

          {/* Variations Thumbnail Strip */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800">
            <p className="text-[11px] font-bold text-slate-500 mb-2">{variations.length} Variasi Tersedia:</p>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {heroImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIdx(idx)}
                  className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                    activeImageIdx === idx ? "border-rose-500 scale-105 shadow-md" : "border-slate-200 dark:border-slate-700 opacity-70"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Price Header, Sales Count, Title & Garansi Harga Terbaik (Screenshot 1) */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 sm:rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-rose-500">Rp</span>
              <span className="text-2xl sm:text-3xl font-black text-rose-600 drop-shadow-xs">
                {currentPrice.toLocaleString("id-ID")}
              </span>
              {originalPrice > currentPrice && (
                <span className="text-xs text-slate-400 line-through">
                  Rp {originalPrice.toLocaleString("id-ID")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>{salesCount}</span>
              <button
                onClick={() => setIsWishlisted(!isWishlisted)}
                className={`p-1.5 rounded-full transition-colors ${isWishlisted ? "text-rose-500 bg-rose-50" : "text-slate-400 hover:text-rose-500"}`}
              >
                <svg className="w-5 h-5" fill={isWishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Promo Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-rose-500 text-white font-bold text-[10px] uppercase tracking-wider shadow-xs flex items-center gap-1">
              <span>👍</span> Garansi Harga Terbaik
            </span>
            <span className="px-2.5 py-1 rounded-md bg-blue-600 text-white font-bold text-[10px] uppercase tracking-wider shadow-xs">
              ⚡ Processed by AI-Robot
            </span>
          </div>

          {/* Star Title */}
          <div className="flex items-start gap-2">
            <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-black text-[10px] uppercase shrink-0 mt-0.5">
              Star
            </span>
            <h1 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
              {title}
            </h1>
          </div>
        </div>

        {/* 3. Guarantees & Shipping Info (Screenshot 1) */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-3 text-xs">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold text-sm">🚚 1-24 Jam</span>
              <span>Dapatkan Voucher s/d Rp10.000 jika pesanan terlambat.</span>
            </div>
            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>

          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="text-blue-500">🛡️</span>
              <span>Bebas Pengembalian &bull; Garansi 100% Refund &bull; Proteksi Sinyal</span>
            </div>
            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>

          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="text-amber-500">💳</span>
              <span>SPayLater / QRIS Instant 24 Jam / Potong Saldo Ry</span>
            </div>
            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </div>

        {/* 4. Product Reviews / Rating Section (Screenshot 2) */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 sm:rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
          {/* Rating Summary Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-slate-900 dark:text-white">
                {reviewsData.summary.averageRating}
              </span>
              <span className="text-amber-400 text-lg">★</span>
              <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                Penilaian Produk ({reviewsData.summary.totalReviews.toLocaleString("id-ID")})
              </span>
            </div>
            <button
              onClick={() => setShowWriteReviewModal(true)}
              className="px-3 py-1 rounded-full bg-amber-500 text-amber-950 text-[11px] font-black hover:bg-amber-400 transition-colors flex items-center gap-1 shadow-xs"
            >
              <span>+ Beri Ulasan</span>
            </button>
          </div>

          {/* AI Rating Highlights Box (Screenshot 2) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
              <span>Rangkuman Penilaian ✨</span>
              <span className="text-slate-400 text-[10px]">ℹ️</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300 font-medium">
              <li>Kecocokan: 100% Pas sinyal 4G/5G All Operator terbukti aktif lancar jaya.</li>
              <li>Layanan: Respon kilat, garansi resmi terpampang &amp; nota dikirim via WhatsApp.</li>
            </ul>
          </div>

          {/* Customer Reviews Photo Gallery Strip (Screenshot 2) */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold text-slate-500">Foto &amp; Video dari Pembeli ({reviewsData.summary.withPhotosCount}):</p>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {filteredReviews.flatMap((r: any) => r.images || []).slice(0, 10).map((imgUrl: string, idx: number) => (
                <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgUrl} alt="Review attachment" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Review Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              onClick={() => setReviewFilter("all")}
              className={`px-3 py-1 rounded-full font-bold transition-colors ${reviewFilter === "all" ? "bg-rose-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"}`}
            >
              Semua ({reviewsData.summary.totalReviews})
            </button>
            <button
              onClick={() => setReviewFilter("photos")}
              className={`px-3 py-1 rounded-full font-bold transition-colors ${reviewFilter === "photos" ? "bg-rose-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"}`}
            >
              Dengan Foto &amp; Video ({reviewsData.summary.withPhotosCount})
            </button>
            <button
              onClick={() => setReviewFilter("5star")}
              className={`px-3 py-1 rounded-full font-bold transition-colors ${reviewFilter === "5star" ? "bg-rose-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"}`}
            >
              5 Bintang ({reviewsData.summary.ratingCounts[5]})
            </button>
          </div>

          {/* Verified Customer Reviews List */}
          <div className="space-y-4 pt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {filteredReviews.map((rev: any) => (
              <div key={rev.id} className="pt-4 first:pt-0 space-y-2 text-xs">
                {/* User avatar & name */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={rev.userAvatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + rev.id}
                      alt={rev.userName}
                      className="w-7 h-7 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {rev.userName}
                      </span>
                      <div className="flex items-center gap-1 text-amber-400 text-[10px]">
                        {"★".repeat(rev.rating)}
                        <span className="text-emerald-600 font-bold ml-1">● Pembeli Terverifikasi</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleLikeReview(rev.id)}
                    className="text-[11px] text-slate-500 hover:text-rose-500 flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold"
                  >
                    <span>Membantu ({rev.likesCount || 0})</span>
                    <span>👍</span>
                  </button>
                </div>

                {/* Purchased variation badge */}
                <p className="text-[10px] text-slate-400 font-medium">
                  Variasi: {rev.variation || "GARANSI 1 TAHUN, ALL OPERATOR"}
                </p>

                {/* Review comment text */}
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                  {rev.comment}
                </p>

                {/* Review Photos grid */}
                {rev.images && rev.images.length > 0 && (
                  <div className="flex gap-2 pt-1">
                    {rev.images.map((img: string, i: number) => (
                      <div key={i} className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt="Bukti review" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 5. Specifications & Detailed Summary (Screenshot 3) */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 sm:rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Spesifikasi Layanan</h3>

          <div className="space-y-2 text-xs">
            {specifications.map((s, idx) => (
              <div key={idx} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                <span className="font-medium text-slate-400">{s.key}</span>
                <span className="font-bold text-slate-900 dark:text-white text-right">{s.value}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 space-y-2 text-xs">
            <h4 className="font-bold text-slate-900 dark:text-white">Rangkuman Deskripsi ✨</h4>
            <ul className="space-y-1 text-slate-600 dark:text-slate-300 leading-relaxed list-disc pl-4">
              {description.map((d, idx) => (
                <li key={idx}>{d}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 6. Sticky Bottom Action Bar (Matching Bottom of Screenshots 1, 2, 3, 4) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 p-2.5 sm:px-8 shadow-2xl safe-area-pb">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          {/* Chat CS WA Button */}
          <a
            href="https://wa.me/6288706611370"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center w-16 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 font-bold text-[10px] shrink-0 border border-emerald-500/20 transition-all"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
            </svg>
            <span>Chat CS</span>
          </a>

          {/* Add to Cart Button */}
          <button
            onClick={() => {
              setDrawerAction("cart");
              setShowVariationDrawer(true);
            }}
            className="flex-1 h-11 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-md transition-transform flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            <span>+ Keranjang</span>
          </button>

          {/* Buy Now Button */}
          <button
            onClick={() => {
              setDrawerAction("buy");
              setShowVariationDrawer(true);
            }}
            className="flex-1 h-11 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs shadow-lg transition-transform flex items-center justify-center gap-1"
          >
            <span>Beli Sekarang</span>
          </button>
        </div>
      </div>

      {/* 7. Variation Selection Modal Drawer (Screenshot 4) */}
      {showVariationDrawer && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 p-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Top Close */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroImages[activeImageIdx] || heroImages[0]}
                  alt="Selected"
                  className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                />
                <div>
                  <p className="text-lg font-black text-rose-600">
                    Rp {selectedVar.price.toLocaleString("id-ID")}
                  </p>
                  <p className="text-[10px] text-emerald-600 font-bold bg-emerald-100 px-2 py-0.5 rounded-full inline-block">
                    Stok: 838 Tersedia
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowVariationDrawer(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Variations Pills Grid (Screenshot 4) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900 dark:text-white block">Pilih Durasi Garansi &amp; Layanan</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {variations.map((v) => {
                  const isSelected = selectedVarId === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVarId(v.id)}
                      className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? "border-rose-500 bg-rose-500/10 text-rose-600 ring-2 ring-rose-500/20 font-bold"
                          : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-rose-500/40"
                      }`}
                    >
                      <div>
                        <p className="text-xs font-black">{v.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Rp {v.price.toLocaleString("id-ID")}</p>
                      </div>
                      {v.badge && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-bold text-[9px] uppercase">
                          {v.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Confirm Drawer Action Button */}
            <button
              onClick={drawerAction === "cart" ? handleAddToCartClick : handleBuyNowClick}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-black text-sm shadow-lg transition-transform"
            >
              {drawerAction === "cart" ? "+ Masukkan Ke Keranjang" : `Beli Sekarang • Rp ${selectedVar.price.toLocaleString("id-ID")}`}
            </button>
          </div>
        </div>
      )}

      {/* Write Review Modal */}
      <WriteReviewModal
        isOpen={showWriteReviewModal}
        onClose={() => setShowWriteReviewModal(false)}
        productId={id}
        variation={selectedVar.name}
        onReviewSubmitted={fetchReviews}
      />

      {/* Instant QRIS Modal */}
      <InstantQrisPaymentModal
        isOpen={showInstantQris}
        onClose={() => setShowInstantQris(false)}
        amount={selectedVar.price}
        orderTitle={`Pembayaran Direct ${title}`}
        onSuccess={handleBuyNowClick}
      />
    </div>
  );
}

export default ProductDetailView;
