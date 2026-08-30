import Swal from "@/lib/sweetalert";
import WriteReviewModal from "./WriteReviewModal";
import UserProfileModal from "./UserProfileModal";
import { playPopSound } from "@/lib/soundFx";

interface ProductReviewsSectionProps {
  productId?: string;
  title?: string;
}

export function ProductReviewsSection({
  productId = "unblock-imei",
  title = "Ulasan & Penilaian Pelanggan",
}: ProductReviewsSectionProps) {
  const [reviewsData, setReviewsData] = useState<any>({
    summary: { averageRating: 0, totalReviews: 0, ratingCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, withPhotosCount: 0 },
    reviews: [],
  });
  const [loading, setLoading] = useState(true);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<any>(null);

  const fetchReviews = () => {
    setLoading(true);
    fetch(`/api/reviews?productId=${productId}`, { credentials: "include" })
      .then((res) => safeJson(res))
      .then((data) => {
        if (data?.status && data?.summary) {
          setReviewsData(data);
        }
      })
      .catch(() => {})
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
          title: "Khusus Pembeli Terverifikasi 🛍️",
          text: "Ulasan hanya dapat ditulis oleh pengguna yang telah menyelesaikan transaksi sukses di Ry-ITSolutions. Silakan lakukan pemesanan terlebih dahulu!",
          icon: "info",
          confirmButtonText: "Siap, Mengerti 👍",
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
    try { playPopSound(); } catch {}
    try {
      await fetch(`/api/reviews/${id}/like`, { method: "POST", credentials: "include" });
      setReviewsData((prev: any) => ({
        ...prev,
        reviews: prev.reviews.map((r: any) => (r.id === id ? { ...r, likesCount: (r.likesCount || 0) + 1 } : r)),
      }));
    } catch (e) {}
  };

  const { summary, reviews } = reviewsData;
  const hasReviews = reviews && reviews.length > 0;

  return (
    <div className="bg-canvas rounded-3xl border border-hairline p-5 space-y-4 shadow-sm">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <div className="flex items-center gap-2">
          <span className="text-amber-500 font-bold text-lg">⭐</span>
          <div>
            <h3 className="font-extrabold text-sm text-ink">{title}</h3>
            <p className="text-[11px] text-ink-muted">
              {hasReviews ? `${summary.averageRating} dari 5.0 (${summary.totalReviews} ulasan)` : "Belum ada ulasan"}
            </p>
          </div>
        </div>
        <button
          onClick={handleWriteReviewClick}
          className="px-3.5 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-extrabold transition-colors shadow-xs flex items-center gap-1"
        >
          <span>+ Beri Ulasan (+500 Koin)</span>
        </button>
      </div>

      {/* Reviews Content */}
      {loading ? (
        <div className="py-6 text-center text-xs text-ink-muted">Memuat ulasan...</div>
      ) : !hasReviews ? (
        <div className="py-8 text-center space-y-2 bg-parchment/40 rounded-2xl border border-dashed border-hairline p-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-lg">
            ⭐
          </div>
          <h4 className="font-bold text-xs text-ink">Belum Ada Ulasan Pelanggan</h4>
          <p className="text-[11px] text-ink-muted max-w-xs mx-auto">
            Jadilah pembeli pertama yang memberikan ulasan dan klaim bonus +500 Koin Ry!
          </p>
        </div>
      ) : (
        <div className="space-y-4 divide-y divide-hairline">
          {reviews.map((r: any) => (
            <div key={r.id} className="pt-4 first:pt-0 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedProfileUser(r)}
                  className="flex items-center gap-2 text-left group focus:outline-none"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.id}`}
                    alt={r.userName}
                    className="w-8 h-8 rounded-full object-cover border border-hairline group-hover:ring-2 group-hover:ring-primary transition-all"
                  />
                  <div>
                    <span className="font-bold text-ink block group-hover:text-primary transition-colors flex items-center gap-1">
                      <span>{r.userName}</span>
                      <span className="text-[10px] text-blue-500 font-normal">🔍</span>
                    </span>
                    <div className="flex items-center gap-1 text-amber-400 text-[10px]">
                      {"★".repeat(r.rating || 5)}
                      <span className="text-emerald-700 font-bold ml-1">● Pembeli Terverifikasi</span>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => handleLike(r.id)}
                  className="text-[11px] text-ink-muted hover:text-rose-500 flex items-center gap-1 px-2.5 py-1 rounded-full bg-parchment font-semibold border border-hairline"
                >
                  <span>Membantu ({r.likesCount || 0})</span>
                  <span>👍</span>
                </button>
              </div>

              {/* Transaction & Variation Info Bar */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-ink-muted font-medium bg-parchment/60 p-2 rounded-xl border border-hairline/60">
                {r.variation && (
                  <span>📦 <b>Variasi:</b> {r.variation}</span>
                )}
                <span>📅 <b>Waktu Transaksi:</b> {r.transactionDate ? new Date(r.transactionDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " WIB" : "2 hari yang lalu"}</span>
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
          ))}
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
