"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Swal from "@/lib/sweetalert";
import { safeJson } from "@/lib/api";
import {
  Smartphone,
  Send,
  Search,
  RotateCw,
  Plus,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  User,
  Clock,
  Copy,
  Check,
  X,
  PhoneCall
} from "lucide-react";

interface Conversation {
  remoteJid: string;
  senderPhone: string;
  pushName: string;
  fromMe: number;
  messageType: string;
  body: string;
  timestamp: number;
  unreadCount: number;
}

interface Message {
  id: number;
  msg_id: string;
  remoteJid: string;
  senderPhone: string;
  pushName: string;
  fromMe: number;
  messageType: string;
  body: string;
  timestamp: number;
  isRead: number;
}

export default function AdminWhatsAppChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [activeJid, setActiveJid] = useState<string | null>(null);
  const [activePhone, setActivePhone] = useState<string | null>(null);
  const [activeName, setActiveName] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  const [replyInput, setReplyInput] = useState("");
  const [sending, setSending] = useState(false);
  
  const [waStatus, setWaStatus] = useState<string>("connecting");
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  
  // New chat modal
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState("");

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const userScrolledUpRef = useRef<boolean>(false);

  const handleChatScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    userScrolledUpRef.current = !isNearBottom;
  };

  // Scroll inner chat box to bottom ONLY if user hasn't scrolled up
  useEffect(() => {
    if (chatContainerRef.current && !userScrolledUpRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSelectConversation = (c: Conversation) => {
    userScrolledUpRef.current = false;
    setActiveJid(c.remoteJid);
    setActivePhone(c.senderPhone || c.remoteJid.replace("@s.whatsapp.net", ""));
    setActiveName(c.pushName || c.senderPhone || "Pelanggan");
    loadMessages(c.remoteJid);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyInput.trim() || sending) return;

    const targetPhone = activePhone || (activeJid ? activeJid.replace("@s.whatsapp.net", "") : "");
    if (!targetPhone) {
      Swal.fire({ title: "Perhatian", text: "Pilih obrolan atau masukkan nomor tujuan terlebih dahulu." });
      return;
    }

    const textToSend = replyInput.trim();
    setReplyInput("");
    setSending(true);

    // Optimistic UI update
    const tempMsg: Message = {
      id: Date.now(),
      msg_id: `TEMP_${Date.now()}`,
      remoteJid: activeJid || `${targetPhone}@s.whatsapp.net`,
      senderPhone: targetPhone,
      pushName: "Admin",
      fromMe: 1,
      messageType: "text",
      body: textToSend,
      timestamp: Date.now(),
      isRead: 1
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch("/api/admin/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetPhone, message: textToSend }),
      });
      const d = await safeJson(res);
      if (res.ok && d?.status) {
        if (activeJid) loadMessages(activeJid, true);
        loadConversations(true);
      } else {
        Swal.fire({ title: "Gagal Kirim", text: d?.message || "Gagal mengirim pesan ke WhatsApp." });
      }
    } catch (e: any) {
      Swal.fire({ title: "Error Jaringan", text: "Terjadi kesalahan saat menghubungi server." });
    } finally {
      setSending(false);
    }
  };

  const handleStartNewChat = () => {
    const clean = newChatPhone.replace(/\D/g, "");
    if (!clean || clean.length < 8) {
      Swal.fire({ title: "Nomor Tidak Valid", text: "Masukkan nomor WhatsApp yang valid (misal: 08123456789)." });
      return;
    }
    const formatted = clean.startsWith("0") ? "62" + clean.substring(1) : clean;
    const newJid = `${formatted}@s.whatsapp.net`;

    setActiveJid(newJid);
    setActivePhone(formatted);
    setActiveName(formatted);
    setMessages([]);
    setShowNewChatModal(false);
    setNewChatPhone("");
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchName = c.pushName && c.pushName.toLowerCase().includes(q);
    const matchPhone = c.senderPhone && c.senderPhone.includes(q);
    const matchBody = c.body && c.body.toLowerCase().includes(q);
    return matchName || matchPhone || matchBody;
  });

  const quickTemplates = [
    "Halo Kak, pesanan Anda sedang kami proses oleh tim teknisi. Mohon ditunggu ya.",
    "Halo Kak, pesanan Anda telah SUKSES dikerjakan! Sinyal sudah aktif normal.",
    "Mohon kirimkan foto bukti layar status sinyal / pengaturannya Kak.",
    "Terima kasih telah bertransaksi bersama Ry-ITSolutions!"
  ];

  return (
    <div className="space-y-4">
      {/* Header Info Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-hairline">
        <div>
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-600" />
            Live Chat WhatsApp Admin
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Baca, kirim pesan, dan balas chat pelanggan secara langsung melalui engine WhatsApp server STB.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Engine Status Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-canvas border border-hairline text-xs font-bold">
            <span className={`w-2.5 h-2.5 rounded-full ${waStatus === "open" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            <span className="text-ink">
              {waStatus === "open"
                ? `Aktif: +${connectedPhone || "6287767287284"}`
                : "Engine Menghubungkan..."}
            </span>
          </div>

          <Button size="sm" onClick={() => setShowNewChatModal(true)} className="gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-4 h-4" />
            Chat Baru
          </Button>

          <Button size="sm" variant="outline" onClick={() => { loadConversations(); if (activeJid) loadMessages(activeJid); }} className="gap-1.5 text-xs">
            <RotateCw className="w-3.5 h-3.5" />
            Segarkan
          </Button>
        </div>
      </div>

      {/* Main WhatsApp Web Style Split Layout */}
      <Card glass className="p-0 overflow-hidden border border-hairline flex flex-col md:flex-row h-[75vh] min-h-[580px]">
        {/* LEFT SIDEBAR: Conversation List */}
        <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-hairline flex flex-col bg-canvas shrink-0">
          {/* Sidebar Search Bar */}
          <div className="p-3 border-b border-hairline bg-parchment/40 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                placeholder="Cari percakapan atau nomor HP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-hairline bg-canvas text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          {/* Conversation List Body */}
          <div className="flex-1 overflow-y-auto divide-y divide-hairline">
            {loadingConversations ? (
              <div className="p-8 text-center text-xs text-ink-muted">
                <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                Memuat riwayat chat...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-muted">
                Belum ada obrolan WhatsApp terdaftar. Klik <b>"Chat Baru"</b> untuk mulai berkirim pesan.
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = activeJid === c.remoteJid;
                const phoneNum = c.senderPhone || c.remoteJid.replace("@s.whatsapp.net", "");
                const nameDisplay = c.pushName && c.pushName !== phoneNum ? c.pushName : `+${phoneNum}`;

                return (
                  <button
                    key={c.remoteJid}
                    type="button"
                    onClick={() => handleSelectConversation(c)}
                    className={`w-full p-3.5 text-left transition-colors flex items-start gap-3 hover:bg-parchment/60 cursor-pointer ${
                      isSelected ? "bg-emerald-500/10 border-l-4 border-l-emerald-600" : ""
                    }`}
                  >
                    {/* User Avatar Initials */}
                    <div className="w-10 h-10 rounded-full bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 font-black text-sm flex items-center justify-center shrink-0 border border-emerald-500/20">
                      {nameDisplay.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-bold text-xs text-ink truncate">{nameDisplay}</p>
                        <span className="text-[10px] text-ink-muted shrink-0">
                          {c.timestamp ? new Date(c.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-muted truncate">
                        {c.fromMe === 1 && <span className="text-emerald-600 font-bold mr-1">Anda:</span>}
                        {c.body || "[Pesan WA]"}
                      </p>
                    </div>

                    {c.unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold shrink-0">
                        {c.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Active Chat Window */}
        {activeJid || activePhone ? (
          <div className="flex-1 flex flex-col bg-[#F0F2F5] dark:bg-[#0B141A] min-w-0">
            {/* Active Chat Header */}
            <div className="p-3.5 bg-canvas border-b border-hairline flex items-center justify-between gap-3 shrink-0 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                  {(activeName || activePhone || "P").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-ink truncate">{activeName || `+${activePhone}`}</h3>
                  <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Terhubung via Engine WhatsApp Bot (+{connectedPhone || "6287767287284"})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 gap-1.5"
                  onClick={() => {
                    if (activePhone) {
                      navigator.clipboard.writeText(activePhone);
                      Swal.fire({ title: "Tersalin", text: `Nomor +${activePhone} telah disalin!`, timer: 1200, showConfirmButton: false });
                    }
                  }}
                >
                  <Copy className="w-3.5 h-3.5" />
                  Salin Nomor
                </Button>
              </div>
            </div>

            {/* Chat Body (Messages Bubbles) */}
            <div
              ref={chatContainerRef}
              onScroll={handleChatScroll}
              className="flex-1 overflow-y-auto p-4 space-y-3"
            >
              {loadingMessages ? (
                <div className="p-12 text-center text-xs text-ink-muted">
                  <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                  Memuat percakapan...
                </div>
              ) : messages.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500 bg-white/60 dark:bg-slate-900/60 rounded-2xl border border-hairline max-w-sm mx-auto my-8">
                  <MessageSquare className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-80" />
                  <p className="font-bold text-slate-700 dark:text-slate-200">Belum Ada Pesan</p>
                  <p className="text-[11px] mt-1 text-slate-500">Tulis pesan Anda di bawah untuk mulai berkirim WhatsApp dengan nomor ini.</p>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isAdminMsg = m.fromMe === 1;
                  return (
                    <div
                      key={m.id || idx}
                      className={`flex flex-col ${isAdminMsg ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] p-3 rounded-2xl shadow-xs text-xs leading-relaxed space-y-1 ${
                          isAdminMsg
                            ? "bg-[#D9FDD3] dark:bg-[#005C4B] text-slate-900 dark:text-slate-100 rounded-tr-none border border-emerald-200 dark:border-emerald-800"
                            : "bg-white dark:bg-[#202C33] text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        {!isAdminMsg && (
                          <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                            {m.pushName || `+${m.senderPhone}`}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>

                        <div className="flex items-center justify-end gap-1 text-[9px] opacity-70 pt-0.5">
                          <span>
                            {m.timestamp
                              ? new Date(m.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                              : ""}
                          </span>
                          {isAdminMsg && <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 inline" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Template Shortcuts */}
            <div className="px-3 py-2 bg-canvas border-t border-hairline flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
              <span className="font-bold text-ink-muted text-[10px] shrink-0 mr-1">Templat Cepat:</span>
              {quickTemplates.map((tmpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setReplyInput(tmpl)}
                  className="px-2.5 py-1 rounded-lg bg-parchment hover:bg-hairline text-ink font-semibold shrink-0 border border-hairline transition-colors text-left"
                >
                  {tmpl.substring(0, 24)}...
                </button>
              ))}
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 bg-canvas border-t border-hairline flex items-center gap-2 shrink-0">
              <input
                type="text"
                placeholder={`Tulis balasan pesan untuk +${activePhone}...`}
                value={replyInput}
                onChange={(e) => setReplyInput(e.target.value)}
                className="flex-1 h-11 px-4 rounded-xl border border-hairline bg-parchment/40 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />

              <Button
                type="submit"
                disabled={!replyInput.trim() || sending}
                isLoading={sending}
                className="h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shrink-0 shadow-xs"
              >
                <span>Kirim</span>
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#F0F2F5] dark:bg-[#0B141A] text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-600/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20 shadow-sm">
              <Smartphone className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-base text-ink">WhatsApp Admin Live Chat</h3>
              <p className="text-xs text-ink-muted mt-1 max-w-sm">
                Pilih obrolan dari daftar di sebelah kiri atau klik tombol <b>"Chat Baru"</b> untuk mengirim pesan ke nomor pelanggan.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <Card className="max-w-md w-full bg-canvas border border-hairline p-5 rounded-3xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-ink">Mulai Chat WhatsApp Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                className="w-7 h-7 rounded-full bg-parchment hover:bg-hairline flex items-center justify-center text-ink text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <Input
                label="Nomor WhatsApp Tujuan"
                placeholder="Contoh: 08123456789 atau 628123456789"
                value={newChatPhone}
                onChange={(e) => setNewChatPhone(e.target.value)}
                autoFocus
              />
              <p className="text-[11px] text-ink-muted">
                Pesan akan langsung terhubung melalui engine bot WhatsApp terpasang.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowNewChatModal(false)}>
                Batal
              </Button>
              <Button size="sm" onClick={handleStartNewChat} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                Buka Chat Window
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
