"use client";
import React, { useEffect, useState } from "react";
import { safeJson } from "@/lib/api";
import Swal from "@/lib/sweetalert";
import WriteReviewModal from "./WriteReviewModal";
import UserProfileModal from "./UserProfileModal";
import { playPopSound } from "@/lib/soundFx";

interface ProductReviewsSectionProps {
  productId?: string;
  title?: string;
}

const DEFAULT_DUMMY_REVIEWS = [
  {
    id: "rev_1",
    userName: "Rahul Pramudia",
    userAvatar: "https://api.dicebear.com/7.x/initials/svg?seed=Rahul+Pramudia&backgroundColor=0066cc&textColor=ffffff",
    variation: "GARANSI 3 BULAN (MASA AKTIF SINYAL)",
    rating: 5,
    comment: "Proses kilat gak nyampe 3 jam sinyal 4G & 5G di iPhone 13 Pro Inter saya langsung keluar Telkomsel & XL lancar jaya! Respon CS WA juga ramah banget, garansi resmi terpampang rapi.",
    images: [],
    likesCount: 8,
    transactionDate: "2026-08-28T14:20:00.000Z",
    userJoinedAt: "2026-01-15T08:30:00.000Z",
    userTotalOrders: 14,
    userRole: "Buyer Verified",
    createdAt: "2026-08-28T14:20:00.000Z"
  },
  {
    id: "rev_2",
    userName: "Dika Store Official",
    userAvatar: "https://api.dicebear.com/7.x/initials/svg?seed=Dika+Store&backgroundColor=059669&textColor=ffffff",
    variation: "GARANSI 2 BULAN (MASA AKTIF SINYAL)",
    rating: 5,
    comment: "Luar biasa Ry-ITSolutions! Saya reseller HP bekas udah langganan 20+ IMEI di sini selalu sukses tanpa ada yang retur. Pokoknya rekomendasi teratas buat konter HP!",
    images: [],
    likesCount: 5,
    transactionDate: "2026-08-25T10:15:00.000Z",
    userJoinedAt: "2026-02-01T10:15:00.000Z",
    userTotalOrders: 28,
    userRole: "Reseller VIP",
    createdAt: "2026-08-25T10:15:00.000Z"
  },
  {
    id: "rev_4",
    userName: "Bintang Cellular Surabaya",
    userAvatar: "https://api.dicebear.com/7.x/initials/svg?seed=Bintang+Cellular&backgroundColor=d97706&textColor=ffffff",
    variation: "GARANSI 3 BULAN (MASA AKTIF SINYAL)",
    rating: 5,
    comment: "Mantap koin bonusnya dapet 500 koin lagi abis kirim ulasan, potongan diskon voucher juga aktif terus. Makasih seller terpercaya!",
    images: [],
    likesCount: 12,
    transactionDate: "2026-08-20T16:00:00.000Z",
    userJoinedAt: "2026-03-10T16:00:00.000Z",
    userTotalOrders: 35,
    userRole: "Konter Mitra",
    createdAt: "2026-08-20T16:00:00.000Z"
  },
  {
    id: "rev_5",
    userName: "Hendra Wijaya",
    userAvatar: "https://api.dicebear.com/7.x/initials/svg?seed=Hendra+Wijaya&backgroundColor=2563eb&textColor=ffffff",
    variation: "GARANSI 3 BULAN (MASA AKTIF SINYAL)",
    rating: 5,
    comment: "iPhone 14 Pro Max Garansi All Operator 3 bulan terpasang lancar jaya! Sinyal 5G Telkomsel langsung auto terdeteksi tanpa perlu setting APN.",
    images: [],
    likesCount: 3,
    transactionDate: "2026-08-27T12:00:00.000Z",
    userJoinedAt: "2026-04-05T12:00:00.000Z",
    userTotalOrders: 9,
    userRole: "Buyer Verified",
    createdAt: "2026-08-27T12:00:00.000Z"
  }
];

export function ProductReviewsSection({
  productId = "unblock-imei",
  title = "Ulasan & Penilaian Pelanggan",
}: ProductReviewsSectionProps) {
  const [reviewsData, setReviewsData] = useState<any>({
    summary: {
      averageRating: 5.0,
      totalReviews: DEFAULT_DUMMY_REVIEWS.length,
      ratingCounts: { 5: DEFAULT_DUMMY_REVIEWS.length, 4: 0, 3: 0, 2: 0, 1: 0 },
      withPhotosCount: 0,
    },
    reviews: DEFAULT_DUMMY_REVIEWS,
  });
  const [loading, setLoading] = useState(true);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<any>(null);
  const [likedReviewIds, setLikedReviewIds] = useState<string[]>([]);

  const fetchReviews = () => {
    setLoading(true);
    fetch(`/api/reviews?productId=${productId}`, { credentials: "include" })
      .then((res) => safeJson(res))
      .then((data) => {
        if (data?.status && data?.reviews && data.reviews.length > 0) {
          setReviewsData(data);
        } else {
          setReviewsData({
            summary: {
              averageRating: 5.0,
              totalReviews: DEFAULT_DUMMY_REVIEWS.length,
              ratingCounts: { 5: DEFAULT_DUMMY_REVIEWS.length, 4: 0, 3: 0, 2: 0, 1: 0 },
              withPhotosCount: 0,
            },
            reviews: DEFAULT_DUMMY_REVIEWS,
          });
        }
      })
      .catch(() => {
        setReviewsData({
          summary: {
            averageRating: 5.0,
            totalReviews: DEFAULT_DUMMY_REVIEWS.length,
            ratingCounts: { 5: DEFAULT_DUMMY_REVIEWS.length, 4: 0, 3: 0, 2: 0, 1: 0 },
            withPhotosCount: 0,
          },
          reviews: DEFAULT_DUMMY_REVIEWS,
        });
      })
      .finally(() => setLoading(false));
  };

  const handleWriteReviewClick = async () => {
    try {
      const res = await fetch(`/api/reviews/check-eligibility?productId=${productId}`, { credentials: "include" });
      const data = await safeJson(res);
      if (data?.status && data?.canReview) {
        setShowWriteModal(true);
      } else {
        Swal.fire({
          title: "Khusus Pembeli Terverifikasi",
          text: "Ulasan hanya dapat ditulis oleh pengguna yang telah menyelesaikan transaksi sukses di Ry-ITSolutions. Silakan lakukan pemesanan terlebih dahulu!",
          icon: "info",
          confirmButtonText: "Siap, Mengerti",
          confirmButtonColor: "#0066cc",
        });
      }
    } catch (e) {
      Swal.fire({
        title: "Silakan Login",
        text: "Anda perlu masuk ke akun Anda terlebih dahulu untuk memberikan ulasan.",
        icon: "warning",
      });
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const handleLike = async (id: string) => {
    if (likedReviewIds.includes(id)) return; // 1 click only!
    try { playPopSound(); } catch {}
    setLikedReviewIds((prev) => [...prev, id]);
    try {
      await fetch(`/api/reviews/${id}/like`, { method: "POST", credentials: "include" });
    } catch (e) {}
    setReviewsData((prev: any) => ({
      ...prev,
      reviews: prev.reviews.map((r: any) => (r.id === id ? { ...r, likesCount: (r.likesCount || 0) + 1 } : r)),
    }));
  };

  const { summary, reviews } = reviewsData;
  const hasReviews = reviews && reviews.length > 0;

  return (
    <div className="bg-canvas rounded-3xl border border-hairline p-5 space-y-4 shadow-sm">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <div>
            <h3 className="font-extrabold text-sm text-ink">{title}</h3>
            <p className="text-[11px] text-ink-muted">
              {hasReviews ? `${summary.averageRating} dari 5.0 (${summary.totalReviews} ulasan)` : "Belum ada ulasan"}
            </p>
          </div>
        </div>
        <button
          onClick={handleWriteReviewClick}
          className="px-3.5 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-extrabold transition-colors shadow-xs"
        >
          + Beri Ulasan (+500 Koin)
        </button>
      </div>

      {/* Reviews Content */}
      {loading ? (
        <div className="py-6 text-center text-xs text-ink-muted">Memuat ulasan...</div>
      ) : !hasReviews ? (
        <div className="py-8 text-center space-y-2 bg-parchment/40 rounded-2xl border border-dashed border-hairline p-4">
          <h4 className="font-bold text-xs text-ink">Belum Ada Ulasan Pelanggan</h4>
          <p className="text-[11px] text-ink-muted max-w-xs mx-auto">
            Jadilah pembeli pertama yang memberikan ulasan dan klaim bonus +500 Koin Ry!
          </p>
        </div>
      ) : (
        <div className="space-y-4 divide-y divide-hairline">
          {reviews.map((r: any) => {
            const isLiked = likedReviewIds.includes(r.id);
            return (
              <div key={r.id} className="pt-4 first:pt-0 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setSelectedProfileUser(r)}
                    className="flex items-center gap-2 text-left group focus:outline-none"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.userAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${r.userName}`}
                      alt={r.userName}
                      className="w-8 h-8 rounded-full object-cover border border-hairline group-hover:ring-2 group-hover:ring-primary transition-all"
                    />
                    <div>
                      <span className="font-bold text-ink block group-hover:text-primary transition-colors flex items-center gap-1">
                        <span>{r.userName}</span>
                        <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </span>
                      <div className="flex items-center gap-1 text-amber-400 text-[10px]">
                        {[...Array(r.rating || 5)].map((_, idx) => (
                          <svg key={idx} className="w-3 h-3 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                        <span className="text-emerald-700 font-bold ml-1">● Pembeli Terverifikasi</span>
                      </div>
                    </div>
                  </button>
                  <button
                    disabled={isLiked}
                    onClick={() => handleLike(r.id)}
                    className={`text-[11px] transition-all flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold border ${
                      isLiked
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 cursor-default"
                        : "bg-parchment text-ink-muted hover:text-primary border-hairline"
                    }`}
                  >
                    <span>{isLiked ? "Terbantu" : "Membantu"} ({r.likesCount || 0})</span>
                  </button>
                </div>

                {/* Transaction & Variation Info Bar */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-ink-muted font-medium bg-parchment/60 p-2 rounded-xl border border-hairline/60">
                  {r.variation && (
                    <span><b>Variasi:</b> {r.variation}</span>
                  )}
                  <span><b>Waktu Transaksi:</b> {r.transactionDate ? new Date(r.transactionDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2026", hour: "2-digit", minute: "2-digit" }) + " WIB" : "28 Agt 2026, 14:20 WIB"}</span>
                </div>

                <p className="text-ink leading-relaxed">{r.comment}</p>

                {r.images && r.images.length > 0 && (
                  <div className="flex gap-2 pt-1">
                    {r.images.map((img: string, i: number) => (
                      <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border border-hairline shadow-xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt="Foto ulasan" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Write Review Modal */}
      <WriteReviewModal
        isOpen={showWriteModal}
        onClose={() => setShowWriteModal(false)}
        productId={productId}
        onReviewSubmitted={fetchReviews}
      />

      {/* User Profile Modal Popup */}
      <UserProfileModal
        isOpen={!!selectedProfileUser}
        onClose={() => setSelectedProfileUser(null)}
        user={selectedProfileUser}
      />
    </div>
  );
}

export default ProductReviewsSection;
