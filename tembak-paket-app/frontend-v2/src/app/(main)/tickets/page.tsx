"use client";
import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Swal from "sweetalert2";
import { useApp } from "@/lib/store";

export default function UserTicketsPage() {
  const { user } = useApp();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/tickets", { credentials: "include" });
      const data = await res.json();
      if (data.status) setTickets(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTicketDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/tickets/${id}`, { credentials: "include" });
      const data = await res.json();
      if (data.status) {
        setActiveTicket(data.data.ticket);
        setMessages(data.data.messages);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject || !newMessage) return Swal.fire("Error", "Semua kolom wajib diisi", "error");
    try {
      const res = await fetch("/api/user/tickets", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: newSubject, message: newMessage }),
      });
      const data = await res.json();
      if (data.status) {
        setShowCreate(false);
        setNewSubject("");
        setNewMessage("");
        loadTickets();
        Swal.fire("Berhasil", "Tiket berhasil dibuat", "success");
      } else {
        Swal.fire("Gagal", data.message, "error");
      }
    } catch (e) {
      Swal.fire("Error", "Kesalahan jaringan", "error");
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage) return;
    try {
      const res = await fetch(`/api/tickets/${activeTicket.id}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage }),
      });
      const data = await res.json();
      if (data.status) {
        setNewMessage("");
        loadTicketDetail(activeTicket.id);
        loadTickets(); // Refresh list to update status/time
      } else {
        Swal.fire("Gagal", data.message, "error");
      }
    } catch (e) {
      Swal.fire("Error", "Kesalahan jaringan", "error");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Pusat Bantuan 💬</h1>
          <p className="text-sm text-ink-muted">Tanyakan masalah atau kendala Anda di sini.</p>
        </div>
        {!activeTicket && !showCreate && (
          <Button onClick={() => setShowCreate(true)}>+ Buat Tiket Baru</Button>
        )}
      </div>

      {showCreate ? (
        <Card glass className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Buat Tiket Baru</h2>
            <button onClick={() => setShowCreate(false)} className="text-red-500 font-bold">&times; Batal</button>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <Input label="Subjek Masalah" placeholder="Contoh: Saldo belum masuk" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} required />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink/80">Pesan Detail</label>
              <textarea
                className="w-full h-32 rounded-xl border border-hairline bg-canvas px-4 py-3 text-sm focus:border-primary focus:ring-1 outline-none"
                placeholder="Ceritakan detail kendala Anda..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">Kirim Tiket</Button>
          </form>
        </Card>
      ) : activeTicket ? (
        <Card glass className="p-0 overflow-hidden flex flex-col h-[600px] border-primary/20">
          {/* Header */}
          <div className="p-4 border-b border-hairline bg-canvas/50 flex justify-between items-center">
            <div>
              <h2 className="font-bold text-lg">{activeTicket.subject}</h2>
              <p className="text-xs text-ink-muted">
                Status: <span className={`font-bold capitalize ${activeTicket.status === 'closed' ? 'text-red-500' : activeTicket.status === 'answered' ? 'text-green-500' : 'text-yellow-500'}`}>{activeTicket.status}</span>
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setActiveTicket(null)}>Kembali</Button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-parchment/30">
            {messages.map((m) => {
              const isMe = m.senderRole === "user";
              return (
                <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl ${isMe ? 'bg-primary text-white rounded-tr-sm' : 'bg-white border border-hairline text-ink rounded-tl-sm shadow-sm'}`}>
                    {!isMe && <p className="text-[10px] font-bold text-primary mb-1">Admin</p>}
                    <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                    <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-white/70' : 'text-ink-muted'}`}>
                      {new Date(m.createdAt).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-canvas border-t border-hairline">
            {activeTicket.status === 'closed' ? (
              <p className="text-center text-sm text-ink-muted font-medium py-2">Tiket ini sudah ditutup.</p>
            ) : (
              <form onSubmit={handleReply} className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 h-12 rounded-full border border-hairline bg-parchment px-5 text-sm focus:border-primary outline-none"
                  placeholder="Ketik balasan Anda..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <Button type="submit" className="rounded-full px-6 h-12 shrink-0">Kirim</Button>
              </form>
            )}
          </div>
        </Card>
      ) : (
        <Card glass className="p-6">
          {loading ? <p className="text-sm">Memuat tiket...</p> : tickets.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <div className="text-4xl">📭</div>
              <p className="text-ink-muted">Belum ada tiket bantuan yang Anda buat.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <div key={t.id} onClick={() => loadTicketDetail(t.id)} className="p-4 border border-hairline rounded-xl bg-canvas hover:border-primary/50 cursor-pointer transition-colors flex justify-between items-center group">
                  <div>
                    <h3 className="font-bold text-ink group-hover:text-primary transition-colors">{t.subject}</h3>
                    <p className="text-xs text-ink-muted mt-1">{new Date(t.createdAt).toLocaleString('id-ID')}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${t.status === 'closed' ? 'bg-red-100 text-red-600' : t.status === 'answered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
