export type ReviewRole = "Pembeli Terverifikasi" | "Reseller VIP" | "Konter Mitra";

export interface ReviewUser {
  userRole?: string;
  userTotalOrders?: number;
}

export function getReviewRole(user: ReviewUser): ReviewRole {
  const role = user.userRole?.toLowerCase() || "";
  if (role.includes("konter") || role.includes("mitra")) return "Konter Mitra";
  if ((user.userTotalOrders || 0) >= 10) return "Reseller VIP";
  return "Pembeli Terverifikasi";
}

export function getReviewRoleClass(role: ReviewRole) {
  if (role === "Konter Mitra") return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (role === "Reseller VIP") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}
