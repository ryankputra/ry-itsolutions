"use client";

import { useEffect, useState } from "react";
import { Wrench, ShieldAlert, Power, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function DeveloperBar() {
  const [isDev, setIsDev] = useState(false);
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const dev = localStorage.getItem("ryy_dev_mode") === "true";
    setIsDev(dev);
    
    // Check maintenance status
    fetch("/api/admin/maintenance-status", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data.status) {
          setMaintenanceActive(data.maintenanceMode);
        }
      })
      .catch(() => {});
  }, []);

  if (!isDev) return null;

  const toggleMaintenance = async () => {
    setLoading(true);
    try {
      const nextState = !maintenanceActive;
      const res = await fetch("/api/admin/maintenance-status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maintenanceMode: nextState }),
        credentials: "include"
      });
      const data = await res.json();
      if (data.status) {
        setMaintenanceActive(nextState);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const exitDev = () => {
    localStorage.removeItem("ryy_dev_mode");
    setIsDev(false);
    router.push("/");
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-slate-900/95 dark:bg-zinc-950/95 text-white border border-emerald-500/40 shadow-2xl rounded-2xl p-2.5 flex items-center gap-2.5 backdrop-blur-md text-xs">
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <span className="font-bold tracking-wider text-emerald-400 uppercase text-[10px] flex items-center gap-1">
          <Wrench className="w-3 h-3" /> Dev Mode
        </span>
      </div>

      <div className="h-3.5 w-[1px] bg-white/20" />

      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-slate-300">
          Maint: <strong className={maintenanceActive ? "text-amber-400" : "text-emerald-400"}>{maintenanceActive ? "ON" : "OFF"}</strong>
        </span>
        <button
          onClick={toggleMaintenance}
          disabled={loading}
          className={`px-2 py-0.5 rounded-md font-bold text-[9px] transition flex items-center gap-1 ${
            maintenanceActive ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-amber-600 hover:bg-amber-500 text-white"
          }`}
        >
          <Power className="w-2.5 h-2.5" />
          {maintenanceActive ? "Matikan" : "Nyalakan"}
        </button>
      </div>

      <div className="h-3.5 w-[1px] bg-white/20" />

      <button
        onClick={exitDev}
        className="text-[9px] font-semibold text-rose-400 hover:text-rose-300 underline"
      >
        Keluar
      </button>
    </div>
  );
}
