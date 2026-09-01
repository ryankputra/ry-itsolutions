"use client";

import React, { useEffect, useState } from "react";
import { safeJson } from "@/lib/api";
import { getReviewRole, getReviewRoleClass } from "@/lib/reviews";
import Swal from "@/lib/sweetalert";
import { playPopSound } from "@/lib/soundFx";
import UserProfileModal from "./UserProfileModal";
import WriteReviewModal from "./WriteReviewModal";

interface ProductReviewsSectionProps {
  productId?: string;
  title?: string;
}

interface Review {
  id: string;
  userName: string;
  userAvatar?: string;
  variation?: string;
  rating: number;
  comment: string;
  images: string[];
  likesCount: number;
  transactionDate?: string;
  userJoinedAt?: string;
  userTotalOrders?: number;
  userRole?: string;
}

interface ReviewsData {
  summary: { averageRating: number; totalReviews: number };
  reviews: Review[];
}

const EMPTY_REVIEWS: ReviewsData = {
  summary: { averageRating: 0, totalReviews: 0 },
  reviews: [],
};

function VerifiedIcon() {
  return <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 1.5a3.1 3.1 0 0 0 2.25.96 3.1 3.1 0 0 1 2.93 2.93A3.1 3.1 0 0 0 16.14 7.7a3.1 3.1 0 0 1 0 4.6 3.1 3.1 0 0 0-.96 2.25 3.1 3.1 0 0 1-2.93 2.93 3.1 3.1 0 0 0-2.25.96 3.1 3.1 0 0 1-4.6 0 3.1 3.1 0 0 0-2.25-.96 3.1 3.1 0 0 1-2.93-2.93 3.1 3.1 0 0 0-.96-2.25 3.1 3.1 0 0 1 0-4.6 3.1 3.1 0 0 0 .96-2.25A3.1 3.1 0 0 1 3.15 2.46 3.1 3.1 0 0 0 5.4 1.5a3.1 3.1 0 0 1 4.6 0Zm2.7 5.54a.9.9 0 0 0-1.27 0L8.75 9.72 7.57 8.54A.9.9 0 1 0 6.3 9.81l1.82 1.82a.9.9 0 0 0 1.27 0l3.3-3.3a.9.9 0 0 0 0-1.29Z" clipRule="evenodd" /></svg>;
}

function StarRating({ rating = 0 }: { rating?: number }) {
  const safeRating = Number(rating || 0);
  return <div className="flex items-center gap-0.5 text-amber-400" aria-label={`Rating ${safeRating} dari 5`}>
    {Array.from({ length: 5 }, (_, index) => <svg key={index} className={`h-3 w-3 ${index < Math.ceil(safeRating) ? "fill-current" : "fill-none"}`} viewBox="0 0 20 20" stroke="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292Z" /></svg>)}
    <span className="ml-1 font-bold text-ink-muted">{safeRating.toFixed(1)}</span>
  </div>;
}

export function ProductReviewsSection({ productId = "unblock-imei", title = "Ulasan & Penilaian Pelanggan" }: ProductReviewsSectionProps) {
  const [reviewsData, setReviewsData] = useState<ReviewsData>(EMPTY_REVIEWS);
  const [loading, setLoading] = useState(true);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<Review | null>(null);
  const [likedReviewIds, setLikedReviewIds] = useState<string[]>([]);

  const fetchReviews = () => {
    setLoading(true);
    fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`, { credentials: "include" })
      .then(safeJson)
      .then((data) => {
        if (data?.status && Array.isArray(data.reviews)) {
          setReviewsData({
            summary: data.summary || { averageRating: 0, totalReviews: data.reviews.length },
            reviews: data.reviews
          });
        } else {
          setReviewsData(EMPTY_REVIEWS);
        }
      })
      .catch(() => setReviewsData(EMPTY_REVIEWS))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    try {
      const savedIds = JSON.parse(localStorage.getItem("liked_reviews_ids") || "[]");
      if (Array.isArray(savedIds)) setLikedReviewIds(savedIds.filter((id): id is string => typeof id === "string"));
    } catch {}
  }, []);

  useEffect(() => { fetchReviews(); }, [productId]);

  const handleWriteReviewClick = async () => {
    try {
      const data = await safeJson(await fetch(`/api/reviews/check-eligibility?productId=${encodeURIComponent(productId)}`, { credentials: "include" }));
      if (data?.status && data.canReview) return setShowWriteModal(true);
    } catch {}
    Swal.fire({ title: "Khusus Pembeli Terverifikasi", text: "Ulasan hanya dapat ditulis setelah transaksi sukses di Ry-ITSolutions.", icon: "info", confirmButtonText: "Mengerti", confirmButtonColor: "#0066cc" });
  };

  const handleLike = async (id: string) => {
    if (likedReviewIds.includes(id)) return;
    const nextIds = [...likedReviewIds, id];
    setLikedReviewIds(nextIds);
    try { localStorage.setItem("liked_reviews_ids", JSON.stringify(nextIds)); } catch {}
    setReviewsData((current) => ({
      ...current,
      reviews: (current?.reviews || []).map((review) =>
        review.id === id ? { ...review, likesCount: (review.likesCount || 0) + 1 } : review
      )
    }));
    try { playPopSound(); await fetch(`/api/reviews/${id}/like`, { method: "POST", credentials: "include" }); } catch {}
  };

  const summary = reviewsData?.summary || { averageRating: 0, totalReviews: 0 };
  const reviews = Array.isArray(reviewsData?.reviews) ? reviewsData.reviews : [];

  return <section className="space-y-4 rounded-3xl border border-hairline bg-canvas p-5 shadow-sm">
    <div className="flex items-center justify-between border-b border-hairline pb-3">
      <div>
        <h3 className="text-sm font-extrabold text-ink">{title}</h3>
        <p className="text-[11px] text-ink-muted">
          {reviews.length
            ? `${(Number(summary?.averageRating) || 0).toFixed(1)} dari 5.0 (${summary?.totalReviews || reviews.length} ulasan)`
            : "Belum ada ulasan"}
        </p>
      </div>
      <button onClick={handleWriteReviewClick} className="rounded-full bg-amber-500 px-3.5 py-1.5 text-xs font-extrabold text-amber-950 shadow-xs transition-colors hover:bg-amber-400">Beri Ulasan (+500 Koin)</button>
    </div>
    {loading ? <div className="py-6 text-center text-xs text-ink-muted">Memuat ulasan...</div> : !reviews.length ? <div className="rounded-2xl border border-dashed border-hairline bg-parchment/40 p-4 py-8 text-center"><h4 className="text-xs font-bold text-ink">Belum Ada Ulasan Pelanggan</h4></div> : <div className="divide-y divide-hairline">
      {reviews.map((review) => {
        const role = getReviewRole(review);
        const liked = likedReviewIds.includes(review.id);
        return <article key={review.id} className="space-y-2 py-4 first:pt-0 last:pb-0 text-xs">
          <div className="flex items-start justify-between gap-3">
            <button type="button" onClick={() => setSelectedProfileUser(review)} className="flex min-w-0 items-center gap-2 text-left">
              {/* eslint-disable-next-line @next/next/no-img-element */}<img src={review.userAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(review.userName)}`} alt="" className="h-8 w-8 shrink-0 rounded-full border border-hairline" />
              <span className="min-w-0"><span className="flex items-center gap-1 font-bold text-ink"><span className="truncate">{review.userName}</span><VerifiedIcon /></span><span className="mt-0.5 flex flex-wrap items-center gap-1"><StarRating rating={review.rating} /><span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${getReviewRoleClass(role)}`}>{role}</span></span></span>
            </button>
            <button disabled={liked} onClick={() => handleLike(review.id)} className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${liked ? "cursor-default border-emerald-300 bg-emerald-50 text-emerald-700" : "border-hairline bg-parchment text-ink-muted hover:text-primary"}`}>{liked ? "Terbantu" : "Membantu"} ({review.likesCount})</button>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 rounded-xl border border-hairline/60 bg-parchment/60 p-2 text-[10px] font-medium text-ink-muted"><span><b>Variasi:</b> {review.variation}</span>{review.transactionDate && <span><b>Transaksi:</b> {new Date(review.transactionDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>}</div>
          <p className="leading-relaxed text-ink">{review.comment}</p>
          {review.images.length ? <div className="flex gap-2">{review.images.map((image, index) => <div key={image} className="h-16 w-16 overflow-hidden rounded-xl border border-hairline">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={image} alt={`Bukti ulasan ${index + 1}`} className="h-full w-full object-cover" /></div>)}</div> : <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">Bukti Sinyal Aktif Terverifikasi System</span>}
        </article>;
      })}
    </div>}
    <WriteReviewModal isOpen={showWriteModal} onClose={() => setShowWriteModal(false)} productId={productId} onReviewSubmitted={fetchReviews} />
    <UserProfileModal isOpen={Boolean(selectedProfileUser)} onClose={() => setSelectedProfileUser(null)} user={selectedProfileUser || undefined} />
  </section>;
}

export default ProductReviewsSection;
