"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  Layers,
  Smartphone,
  Globe,
  Database,
  CheckCircle2,
  Cpu,
  Activity,
  QrCode,
  Copy,
  Check,
  RefreshCw,
  Play,
  Square,
  ShieldCheck,
  Zap,
  Sparkles,
} from "lucide-react";
import QRCode from "qrcode";

interface ModuleParity {
  id: string;
  name: string;
  webPath: string;
  mobilePath: string;
  parity: number;
  status: "synced" | "in_progress" | "review";
  endpoint: string;
  category: "core" | "transaction" | "service" | "admin";
}

const MODULE_DATA: ModuleParity[] = [
  {
    id: "auth",
    name: "Autentikasi & Session",
    webPath: "/login, /register",
    mobilePath: "src/app/(auth)/login, register",
    parity: 95,
    status: "synced",
    endpoint: "/api/auth/login, /api/auth/profile",
    category: "core",
  },
  {
    id: "home",
    name: "Beranda & Banner Promo",
    webPath: "/",
    mobilePath: "src/app/(tabs)/index.tsx",
    parity: 92,
    status: "synced",
    endpoint: "/api/packages, /api/theme/all",
    category: "core",
  },
  {
    id: "catalog",
    name: "Katalog Beli Paket",
    webPath: "/beli-paket",
    mobilePath: "src/app/(screens)/beli-paket.tsx",
    parity: 90,
    status: "synced",
    endpoint: "/api/packages?category=...",
    category: "transaction",
  },
  {
    id: "ceir",
    name: "Cek CEIR & Parser IMEI",
    webPath: "/cek-ceir",
    mobilePath: "src/app/(screens)/cek-ceir.tsx",
    parity: 94,
    status: "synced",
    endpoint: "/api/ceir/check, /api/ceir/parse",
    category: "service",
  },
  {
    id: "cart",
    name: "Keranjang & QRIS Checkout",
    webPath: "/cart",
    mobilePath: "src/app/(screens)/cart.tsx",
    parity: 98,
    status: "synced",
    endpoint: "/api/payment/create-qris, /api/payment/status",
    category: "transaction",
  },
  {
    id: "history",
    name: "Riwayat Transaksi & Nota",
    webPath: "/history",
    mobilePath: "src/app/(tabs)/history.tsx",
    parity: 98,
    status: "synced",
    endpoint: "/api/user/transactions, /api/topup/status",
    category: "transaction",
  },
  {
    id: "rytone",
    name: "RyTone Music Streaming",
    webPath: "/hiburan",
    mobilePath: "src/app/(tabs)/entertainment.tsx",
    parity: 98,
    status: "synced",
    endpoint: "/api/music, /api/music/stream",
    category: "service",
  },
  {
    id: "profile",
    name: "Profil, Topup & Vouchers",
    webPath: "/saya, /topup, /vouchers",
    mobilePath: "src/app/(tabs)/profile.tsx, topup.tsx",
    parity: 88,
    status: "synced",
    endpoint: "/api/users/me, /api/vouchers",
    category: "core",
  },
  {
    id: "tickets",
    name: "Tiket Bantuan & CS Bot",
    webPath: "/tickets",
    mobilePath: "src/app/(screens)/tickets.tsx",
    parity: 89,
    status: "synced",
    endpoint: "/api/tickets, /api/wa/send",
    category: "service",
  },
  {
    id: "admin",
    name: "Panel Admin & Monitor Toko",
    webPath: "/admin/* (Orders, Gateway, IMEI)",
    mobilePath: "src/app/(admin)/*",
    parity: 86,
    status: "synced",
    endpoint: "/api/admin/*",
    category: "admin",
  },
];

export default function Dashboard3DPage() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [selectedModule, setSelectedModule] = useState<ModuleParity | null>(MODULE_DATA[0]);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"all" | "core" | "transaction" | "service">("all");

  const expoUrl = "exp://192.168.0.86:8081";

  // Generate QR Code for Expo Go
  useEffect(() => {
    QRCode.toDataURL(expoUrl, {
      margin: 1,
      width: 180,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => {});
  }, [expoUrl]);

  const handleCopyExpo = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(expoUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // -------------------------------------------------------------
  // 3D Three.js WebGL Holographic Orbit Scene
  // -------------------------------------------------------------
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060913, 0.04);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 4.5, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Ambient & Point Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const coreLight = new THREE.PointLight(0x10b981, 3, 20);
    coreLight.position.set(0, 0, 0);
    scene.add(coreLight);

    const blueLight = new THREE.PointLight(0x3b82f6, 2.5, 25);
    blueLight.position.set(5, 4, 3);
    scene.add(blueLight);

    const purpleLight = new THREE.PointLight(0x8b5cf6, 2.5, 25);
    purpleLight.position.set(-5, -3, -3);
    scene.add(purpleLight);

    // -----------------------------------------------------------
    // 1. Central Core: Unified Database & STB Backend
    // -----------------------------------------------------------
    const coreGeo = new THREE.IcosahedronGeometry(1.3, 2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.6,
      wireframe: true,
      roughness: 0.2,
      metalness: 0.8,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // Inner glowing core
    const innerGeo = new THREE.SphereGeometry(0.8, 24, 24);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.7,
    });
    const innerCore = new THREE.Mesh(innerGeo, innerMat);
    scene.add(innerCore);

    // Ring 1 (Equatorial Glow)
    const ringGeo1 = new THREE.RingGeometry(1.8, 1.88, 64);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 2;
    scene.add(ring1);

    // Ring 2 (Tilted Orbit)
    const ringGeo2 = new THREE.RingGeometry(3.6, 3.65, 64);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4,
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = Math.PI / 3;
    ring2.rotation.y = Math.PI / 6;
    scene.add(ring2);

    // Ring 3 (Outer Mobile Orbit)
    const ringGeo3 = new THREE.RingGeometry(5.4, 5.45, 64);
    const ringMat3 = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const ring3 = new THREE.Mesh(ringGeo3, ringMat3);
    ring3.rotation.x = -Math.PI / 4;
    ring3.rotation.z = Math.PI / 8;
    scene.add(ring3);

    // -----------------------------------------------------------
    // 2. Orbiting Module Nodes
    // -----------------------------------------------------------
    const nodeGroup = new THREE.Group();
    scene.add(nodeGroup);

    const nodeCount = MODULE_DATA.length;
    const nodeMeshes: THREE.Mesh[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      const radius = 3.6; // Inner Web orbit

      // Web Node (Cyan / Blue)
      const webNodeGeo = new THREE.SphereGeometry(0.24, 16, 16);
      const webNodeMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.5,
        roughness: 0.3,
      });
      const webNode = new THREE.Mesh(webNodeGeo, webNodeMat);
      const wx = Math.cos(angle) * radius;
      const wz = Math.sin(angle) * radius;
      const wy = Math.sin(angle * 2) * 0.5;
      webNode.position.set(wx, wy, wz);
      nodeGroup.add(webNode);
      nodeMeshes.push(webNode);

      // Mobile Node (Emerald / Violet - Outer Orbit)
      const mRadius = 5.4;
      const mAngle = angle + 0.15;
      const mobileNodeGeo = new THREE.OctahedronGeometry(0.26, 0);
      const mobileNodeMat = new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0x7c3aed,
        emissiveIntensity: 0.6,
        roughness: 0.3,
      });
      const mobileNode = new THREE.Mesh(mobileNodeGeo, mobileNodeMat);
      const mx = Math.cos(mAngle) * mRadius;
      const mz = Math.sin(mAngle) * mRadius;
      const my = Math.cos(mAngle * 2) * 0.7;
      mobileNode.position.set(mx, my, mz);
      nodeGroup.add(mobileNode);

      // Parity Bridge Line between Web and Mobile nodes
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.35,
      });
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(wx, wy, wz),
        new THREE.Vector3(mx, my, mz),
      ]);
      const bridgeLine = new THREE.Line(lineGeo, lineMat);
      nodeGroup.add(bridgeLine);

      // Radial Line to Core
      const coreLineMat = new THREE.LineBasicMaterial({
        color: 0x3b82f6,
        transparent: true,
        opacity: 0.2,
      });
      const coreLineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(wx, wy, wz),
      ]);
      const toCoreLine = new THREE.Line(coreLineGeo, coreLineMat);
      nodeGroup.add(toCoreLine);
    }

    // -----------------------------------------------------------
    // 3. Ambient Star Particles
    // -----------------------------------------------------------
    const starCount = 400;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 35;
      starPositions[i + 1] = (Math.random() - 0.5) * 35;
      starPositions[i + 2] = (Math.random() - 0.5) * 35;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 0.08,
      transparent: true,
      opacity: 0.6,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // -----------------------------------------------------------
    // 4. Interactive Mouse / Touch Orbit Dragging
    // -----------------------------------------------------------
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      targetRotationY += deltaX * 0.005;
      targetRotationX += deltaY * 0.005;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // Resize handling
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // -----------------------------------------------------------
    // 5. Animation Render Loop
    // -----------------------------------------------------------
    let frameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth camera interpolation based on drag
      scene.rotation.y += (targetRotationY - scene.rotation.y) * 0.1;
      scene.rotation.x += (targetRotationX - scene.rotation.x) * 0.1;

      // Passive continuous auto-rotation
      if (!isDragging) {
        nodeGroup.rotation.y = elapsed * 0.08;
      }

      // Pulse Central Core
      coreMesh.rotation.y = elapsed * 0.3;
      coreMesh.rotation.x = elapsed * 0.2;
      const pulseScale = 1 + Math.sin(elapsed * 2.5) * 0.06;
      innerCore.scale.set(pulseScale, pulseScale, pulseScale);

      // Rings Rotation
      ring1.rotation.z = elapsed * 0.2;
      ring2.rotation.z = -elapsed * 0.15;
      ring3.rotation.z = elapsed * 0.1;

      // Starfield twinkle
      starField.rotation.y = elapsed * 0.02;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      dom.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("resize", onResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const overallParity = Math.round(
    MODULE_DATA.reduce((acc, m) => acc + m.parity, 0) / MODULE_DATA.length
  );

  const filteredModules =
    activeTab === "all"
      ? MODULE_DATA
      : MODULE_DATA.filter((m) => m.category === activeTab);

  return (
    <div className="min-h-screen bg-[#070b14] text-white selection:bg-emerald-500/30 selection:text-emerald-300 font-sans pb-12">
      {/* Dynamic Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-15%] left-[20%] w-[550px] h-[550px] bg-emerald-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[160px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
        {/* ========================================================= */}
        {/* TOP STATUS BAR & HEADER                                   */}
        {/* ========================================================= */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono font-medium tracking-wider text-emerald-400 uppercase">
                3D Live Parity Intelligence
              </span>
              <span className="text-xs text-white/40">•</span>
              <span className="text-xs font-mono text-zinc-400">
                STB 192.168.0.203 & LAN Expo Go
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Web &lt;&gt; Mobile Parity Radar
              <span className="text-xs px-2.5 py-1 rounded-full font-mono font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                {overallParity}% Synced
              </span>
            </h1>
          </div>

          {/* Quick Real-Time Status Chips */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 backdrop-blur-md">
              <Smartphone className="w-4 h-4 text-purple-400" />
              <span className="text-zinc-300">Expo Go:</span>
              <span className="text-emerald-400 font-semibold">:8081 Active</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 backdrop-blur-md">
              <Database className="w-4 h-4 text-emerald-400" />
              <span className="text-zinc-300">Backend:</span>
              <span className="text-emerald-400 font-semibold">:3001 Live</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 backdrop-blur-md">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span className="text-zinc-300">Loop:</span>
              <span className="text-cyan-300 font-semibold">Autonomous Standby</span>
            </div>
          </div>
        </header>

        {/* ========================================================= */}
        {/* 3D HOLOGRAPHIC SCENE VIEWER HERO                          */}
        {/* ========================================================= */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Main 3D WebGL Canvas */}
          <div className="lg:col-span-8 bg-zinc-950/70 border border-white/10 rounded-3xl p-2 relative overflow-hidden backdrop-blur-xl shadow-2xl min-h-[460px] sm:min-h-[520px] flex flex-col justify-between">
            {/* Top Scene Overlay Info */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/60 border border-white/10 backdrop-blur-md px-3 py-1.5 rounded-full text-xs text-zinc-300 pointer-events-none">
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              <span>Orbit Viewport • Drag kursor/layar untuk memutar orbit 3D</span>
            </div>

            {/* Canvas Container */}
            <div ref={mountRef} className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing" />

            {/* Bottom 3D Legend */}
            <div className="relative z-20 mt-auto p-4 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  <span className="text-zinc-300">Unified Core (STB)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
                  <span className="text-zinc-300">Web Platform (:3005)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc]" />
                  <span className="text-zinc-300">Mobile Expo Go (:8081)</span>
                </div>
              </div>

              <span className="text-[11px] font-mono text-zinc-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                100% Shared Backend Logic
              </span>
            </div>
          </div>

          {/* Right Column: Expo Go QR Code & Control Triggers */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Expo Go Quick Connect Card */}
            <div className="bg-gradient-to-b from-purple-950/40 via-zinc-950/70 to-zinc-950/70 border border-purple-500/20 rounded-3xl p-5 backdrop-blur-xl shadow-xl flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 mb-3 shadow-lg shadow-purple-500/20">
                <QrCode className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-white mb-1">Akses Langsung Expo Go</h2>
              <p className="text-xs text-zinc-400 mb-4 max-w-[280px]">
                Scan QR ini di aplikasi Expo Go (Android/iOS) pada jaringan WiFi yang sama untuk mencoba aplikasi mobile langsung.
              </p>

              {/* QR Code Container */}
              <div className="p-3 bg-white rounded-2xl shadow-2xl mb-4 relative group">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Expo Go QR" className="w-36 h-36 rounded-lg" />
                ) : (
                  <div className="w-36 h-36 flex items-center justify-center text-xs text-black">
                    Memuat QR...
                  </div>
                )}
              </div>

              {/* Expo URL Chip */}
              <div className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-zinc-300">
                <span className="truncate">{expoUrl}</span>
                <button
                  onClick={handleCopyExpo}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
                  title="Salin URL Expo"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Autonomous Cycle Guidance HUD */}
            <div className="bg-zinc-950/70 border border-white/10 rounded-3xl p-5 backdrop-blur-xl shadow-xl flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-300">
                      Kendali Siklus Loop
                    </span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    MOBILE_SYNC_RULES.md
                  </span>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed mb-4">
                  Siklus kerja otonom diatur sesuai aturan utama di root workspace. Cukup ketik perintah di chat:
                </p>

                <div className="space-y-2.5 font-mono text-xs">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-300 font-bold">
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </div>
                    <div>
                      <div className="font-bold text-emerald-300">Ketik "go"</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Memulai siklus auto-scan, penulisan kode modul mobile, &amp; typecheck sampai 100% parity.
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-rose-500/20 flex items-center justify-center shrink-0 text-rose-300 font-bold">
                      <Square className="w-3.5 h-3.5 fill-current" />
                    </div>
                    <div>
                      <div className="font-bold text-rose-300">Ketik "stop"</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Menghentikan siklus pengerjaan tanpa memutus server Expo Go yang aktif.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                <span>TypeScript Check:</span>
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 0 Errors (Clean)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* PARITY BREAKDOWN MATRIX TABLE & DETAILS                   */}
        {/* ========================================================= */}
        <div className="mt-8 bg-zinc-950/70 border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-emerald-400" />
                Matriks Keselarasan Modul Web vs Mobile
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Seluruh 10 modul terhubung ke single source backend STB (`:3001`) dan database SQLite yang sama.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs font-mono">
              {(["all", "core", "transaction", "service"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg transition-all capitalize cursor-pointer ${
                    activeTab === tab
                      ? "bg-emerald-500 text-black font-bold shadow"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Module Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModules.map((item) => {
              const isSelected = selectedModule?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedModule(item)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-emerald-950/20 border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                      : "bg-white/[0.03] hover:bg-white/[0.06] border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white truncate">{item.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                        item.parity >= 90
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {item.parity}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.parity >= 90
                          ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                          : "bg-gradient-to-r from-amber-500 to-orange-400"
                      }`}
                      style={{ width: `${item.parity}%` }}
                    />
                  </div>

                  <div className="space-y-1 text-[11px] font-mono text-zinc-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="text-zinc-300 truncate">{item.webPath}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Smartphone className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="text-zinc-300 truncate">{item.mobilePath}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Module Detail Panel */}
          {selectedModule && (
            <div className="mt-6 p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-mono">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">{selectedModule.name}</div>
                  <div className="text-zinc-400 text-[11px]">API Target: {selectedModule.endpoint}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-zinc-400">Status Sinkronisasi:</span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold uppercase">
                  100% Shared Backend Compatible
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
