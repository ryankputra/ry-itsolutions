"use client";

import React from "react";
import { Search } from "lucide-react";

interface OrderFilterBarProps {
  searchOrder: string;
  setSearchOrder: (val: string) => void;
  orderStatusFilter: string;
  setOrderStatusFilter: (val: string) => void;
  hideSuccess: boolean;
  setHideSuccess: (val: boolean) => void;
  hideFailed: boolean;
  setHideFailed: (val: boolean) => void;
}

export function OrderFilterBar({
  searchOrder,
  setSearchOrder,
  orderStatusFilter,
  setOrderStatusFilter,
  hideSuccess,
  setHideSuccess,
  hideFailed,
  setHideFailed,
}: OrderFilterBarProps) {
  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
      <div className="flex-1 relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          placeholder="Cari berdasarkan IMEI, Order ID, nama pelanggan, atau nomor HP..."
          value={searchOrder}
          onChange={(e) => setSearchOrder(e.target.value)}
          className="w-full h-10 pl-9 pr-4 rounded-xl border border-hairline bg-canvas text-xs focus:outline-none focus:ring-1 focus:ring-primary font-medium"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={orderStatusFilter}
          onChange={(e) => setOrderStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-hairline bg-canvas text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>

        <label className="flex items-center gap-1.5 text-xs text-ink font-semibold cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideSuccess}
            onChange={(e) => setHideSuccess(e.target.checked)}
            className="w-4 h-4 rounded text-primary"
          />
          <span>Sembunyikan Sukses</span>
        </label>

        <label className="flex items-center gap-1.5 text-xs text-ink font-semibold cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideFailed}
            onChange={(e) => setHideFailed(e.target.checked)}
            className="w-4 h-4 rounded text-primary"
          />
          <span>Sembunyikan Gagal</span>
        </label>
      </div>
    </div>
  );
}
