"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Swal from "@/lib/sweetalert";
import { Headphones, RotateCw, Send, CheckCircle2, Clock, XCircle, AlertCircle, MessageSquare } from "lucide-react";

export default function AdminTicketsPage() {
  const [adminTickets, setAdminTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [adminActiveTicket, setAdminActiveTicket] = useState<any | null>(null);
  const [adminTicketMessages, setAdminTicketMessages] = useState<any[]>([]);
  const [adminReply, setAdminReply] = useState("");
  const [ticketFilter, setTicketFilter] = useState<"all" | "open" | "closed">("all");
  const adminMessagesEndRef = useRef<HTMLDivElement>(null);

  const loadAdminTickets = async () => {
    setLoadingTickets(true);
    try {
      const res = await fetch("/api/admin/tickets", { credentials: "include" });
      const data = await res.json();
      if (data.status) setAdminTickets(data.data || []);
    } catch (e) {
      // ignore
    } finally {
      setLoadingTickets(false);
    }
  };

  const loadAdminTicketDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/tickets/${id}`, { credentials: "include" });
      const data = await res.json();
      if (data.status) {
        setAdminActiveTicket(data.data.ticket);
        setAdminTicketMessages(data.data.messages);
        setTimeout(() => adminMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    loadAdminTickets();
  }, []);

  const handleAdminReplyTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReply.trim() || !adminActiveTicket) return;

    try {
      const res = await fetch(`/api/tickets/${adminActiveTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: adminReply }),
      });
      const data = await res.json();
      if (data.status) {
        setAdminReply("");
        loadAdminTicketDetail(adminActiveTicket.id);
        loadAdminTickets();
      }
    } catch (e) {
      // ignore
    }
  };

  const handleAdminCloseTicket = async () => {
    if (!adminActiveTicket) return;
    const res = await Swal.fire({
      title: "Tutup Tiket?",
      text: "Apakah kendala pelanggan sudah selesai ditangani?",
      showCancelButton: true,
      confirmButtonText: "Ya, Tutup Tiket",
      cancelButtonText: "Batal",
      confirmButtonColor: "#059669",
    });
    if (!res.isConfirmed) return;

    try {
      const r = await fetch(`/api/admin/tickets/${adminActiveTicket.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "closed" }),
      });
      const data = await r.json();
      if (data.status) {
        Swal.fire({ title: "Selesai", text: "Tiket bantuan berhasil ditutup.", timer: 1500, showConfirmButton: false });
        setAdminActiveTicket(null);
        loadAdminTickets();
      }
    } catch (e) {
      // ignore
    }
  };

  const filteredAdminTickets = adminTickets.filter((t) => {
    if (ticketFilter === "open") return t.status === "open" || t.status === "replied";
    if (ticketFilter === "closed") return t.status === "closed";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-hairline">
        <div>
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <Headphones className="w-5 h-5 text-primary" />
            Pusat Bantuan & Tiket Pelanggan
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Dukungan pelanggan langsung, tanya kendala pesanan, dan thread percakapan CS.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={loadAdminTickets} className="gap-2 text-xs">
          <RotateCw className={`w-3.5 h-3.5 ${loadingTickets ? "animate-spin" : ""}`} />
          Segarkan Data
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tickets list */}
        <div className="lg:col-span-5 space-y-3">
          <Card glass className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-ink">Daftar Tiket Kendala</h3>
                <p className="text-[11px] text-ink-muted">Pilih tiket untuk membaca dan membalas pesan.</p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setTicketFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                  ticketFilter === "all"
                    ? "bg-primary text-white border-primary"
                    : "bg-canvas text-ink-muted border-hairline hover:border-primary/40"
                }`}
              >
                Semua ({adminTickets.length})
              </button>
              <button
                type="button"
                onClick={() => setTicketFilter("open")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                  ticketFilter === "open"
                    ? "bg-amber-500 text-white border-amber-500"
                    : "bg-canvas text-amber-600 border-hairline hover:border-amber-400"
                }`}
              >
                Terbuka ({adminTickets.filter((t) => t.status === "open" || t.status === "replied").length})
              </button>
              <button
                type="button"
                onClick={() => setTicketFilter("closed")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                  ticketFilter === "closed"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-canvas text-emerald-600 border-hairline hover:border-emerald-400"
                }`}
              >
                Ditutup ({adminTickets.filter((t) => t.status === "closed").length})
              </button>
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {loadingTickets && adminTickets.length === 0 ? (
                <div className="py-10 text-center text-xs text-ink-muted">
                  <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                  Memuat tiket bantuan...
                </div>
              ) : filteredAdminTickets.length === 0 ? (
                <div className="py-10 text-center border border-dashed rounded-xl text-ink-muted text-xs">
                  Tidak ada tiket bantuan pada filter ini.
                </div>
              ) : (
                filteredAdminTickets.map((t) => {
                  const isSelected = adminActiveTicket?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => loadAdminTicketDetail(t.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-primary/5 border-primary ring-1 ring-primary"
                          : "bg-canvas border-hairline hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-ink text-xs truncate">{t.subject}</span>
                        <span
                          className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase shrink-0 ${
                            t.status === "open"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                              : t.status === "replied"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-muted mt-1 truncate">
                        {t.user_name} ({t.user_email})
                      </p>
                      <p className="text-[10px] text-ink-muted mt-0.5">
                        {new Date(t.created_at).toLocaleString("id-ID")}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Chat Thread & Reply */}
        <div className="lg:col-span-7">
          {adminActiveTicket ? (
            <Card glass className="p-0 overflow-hidden flex flex-col h-[580px] border-primary/20">
              <div className="p-4 border-b border-hairline bg-canvas flex justify-between items-center gap-3">
                <div className="truncate">
                  <h3 className="font-bold text-sm text-ink truncate">{adminActiveTicket.subject}</h3>
                  <p className="text-xs text-ink-muted truncate">
                    Pelanggan: <span className="font-semibold text-primary">{adminActiveTicket.user_name}</span> ({adminActiveTicket.user_email})
                  </p>
                </div>
                <div className="flex gap-2 items-center shrink-0">
                  {adminActiveTicket.status !== "closed" && (
                    <Button variant="danger" size="sm" className="text-xs h-8 gap-1.5" onClick={handleAdminCloseTicket}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Tutup Tiket
                    </Button>
                  )}
                </div>
              </div>

              {/* Messages Thread */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-parchment/20">
                {adminTicketMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender_role === "admin" ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-ink-muted">
                        {msg.sender_role === "admin" ? "Admin Support" : msg.sender_name}
                      </span>
                      <span className="text-[9px] text-ink-muted">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div
                      className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                        msg.sender_role === "admin"
                          ? "bg-primary text-white rounded-tr-none shadow-xs"
                          : "bg-canvas border border-hairline text-ink rounded-tl-none shadow-xs"
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                ))}
                <div ref={adminMessagesEndRef} />
              </div>

              {/* Reply Box */}
              {adminActiveTicket.status !== "closed" ? (
                <form onSubmit={handleAdminReplyTicket} className="p-3 border-t border-hairline bg-canvas flex gap-2">
                  <input
                    type="text"
                    placeholder="Tulis balasan untuk pelanggan..."
                    value={adminReply}
                    onChange={(e) => setAdminReply(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-hairline bg-parchment text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <Button type="submit" size="sm" className="text-xs px-4 gap-1.5 font-bold">
                    <Send className="w-3.5 h-3.5" />
                    Kirim
                  </Button>
                </form>
              ) : (
                <div className="p-3 bg-muted/40 text-center text-xs text-ink-muted font-semibold border-t border-hairline">
                  Tiket ini telah ditutup. Percakapan diarsipkan.
                </div>
              )}
            </Card>
          ) : (
            <Card glass className="p-8 h-[580px] flex flex-col items-center justify-center text-center space-y-3 border-dashed">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-ink">Percakapan Tiket Belum Dipilih</h3>
              <p className="text-xs text-ink-muted max-w-sm leading-relaxed">
                Pilih salah satu tiket di sebelah kiri untuk membaca riwayat pesan pelanggan dan mengirim balasan secara langsung.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
