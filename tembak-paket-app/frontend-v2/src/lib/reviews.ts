export type ReviewRole = "Pembeli Terverifikasi";

export interface ReviewUser {
  userRole?: string;
  userTotalOrders?: number;
}

export function getReviewRole(_user?: ReviewUser): ReviewRole {
  return "Pembeli Terverifikasi";
}

export function getReviewRoleClass(_role?: ReviewRole) {
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}
