"use client";
import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { GoogleLogin } from '@react-oauth/google';
import { API_URL } from "@/lib/api";
import { useApp } from "@/lib/store";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { setUser } = useApp();

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: credentialResponse.credential }),
        credentials: "include"
      });
      const data = await res.json();
      if (res.ok && data.status) {
        setUser(data.user);
        router.push("/dashboard");
      } else {
        setError(data.message || "Gagal masuk dengan Google.");
      }
    } catch (err) {
      setError("Kesalahan jaringan saat menghubungi server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (res.ok && data.status) {
        setSuccess("Registrasi berhasil! Akun Anda sedang menunggu persetujuan admin.");
        setTimeout(() => router.push("/login"), 3000);
      } else {
        setError(data.message || "Gagal mendaftar");
      }
    } catch (err: any) {
      setError("Terjadi kesalahan sistem");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-canvas">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-primary">Daftar Akun</h2>
          <p className="mt-2 text-ink-muted">Bergabung dengan Ry-ITSolutions</p>
        </div>
        
        <Card glass className="p-8">
          <form className="space-y-6" onSubmit={handleRegister}>
            {error && <div className="p-3 bg-red-500/10 text-red-500 rounded-xl text-sm text-center">{error}</div>}
            {success && <div className="p-3 bg-green-500/10 text-green-700 rounded-xl text-sm text-center">{success}</div>}
            
            <Input label="Nama Lengkap" placeholder="Budi Santoso" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Email" placeholder="name@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Password" placeholder="••••••••" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            
            <Button className="w-full" type="submit" isLoading={isLoading}>Daftar</Button>
            
            <div className="relative flex items-center justify-center pt-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-hairline"></div></div>
              <div className="relative bg-canvas px-4 text-xs font-semibold text-ink-muted uppercase tracking-widest">Atau</div>
            </div>

            <div className="flex justify-center w-full">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Login Google digagalkan/dibatalkan.')}
                theme="outline"
                size="large"
                shape="pill"
                text="signup_with"
                width="100%"
              />
            </div>

            <p className="text-center text-sm text-ink-muted pt-2">
              Sudah punya akun? <a href="/login" className="font-medium text-primary hover:text-primary-focus">Masuk di sini</a>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
