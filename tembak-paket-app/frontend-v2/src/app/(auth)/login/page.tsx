"use client";
import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { login as loginApi, API_URL } from "@/lib/api";
import { useApp } from "@/lib/store";
import { useRouter } from "next/navigation";
import { GoogleLogin } from '@react-oauth/google';
import { Logo } from "@/components/ui/Logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { setUser } = useApp();
  const router = useRouter();

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await loginApi(email, password);
      if (res.status && res.user) {
        setUser(res.user);
        router.push("/dashboard");
      } else {
        setError(res.message || "Gagal masuk");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan sistem");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-canvas">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4"><Logo size={48} /></div>
          <p className="mt-2 text-ink-muted">Masuk ke akun Anda</p>
        </div>
        
        <Card glass className="p-8">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 bg-red-500/10 text-red-500 rounded-xl text-sm text-center">
                {error}
              </div>
            )}
            <Input 
              label="Email" 
              placeholder="name@gmail.com" 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input 
              label="Password" 
              placeholder="••••••••" 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-ink/80">
                <input type="checkbox" className="rounded border-hairline text-primary" />
                Ingat saya
              </label>
              <a href="#" className="text-sm font-medium text-primary hover:text-primary-focus">Lupa password?</a>
            </div>
            
            <Button className="w-full" type="submit" isLoading={isLoading}>Masuk</Button>
            
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
                text="signin_with"
                width="100%"
              />
            </div>
            
            <p className="text-center text-sm text-ink-muted pt-2">
              Belum punya akun? <a href="/register" className="font-medium text-primary hover:text-primary-focus">Daftar sekarang</a>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
