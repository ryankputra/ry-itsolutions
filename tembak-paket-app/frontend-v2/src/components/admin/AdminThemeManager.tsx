'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { API_URL } from '@/lib/api';
import { useDynamicTheme, ThemeData } from '@/lib/themeContext';
import Swal from 'sweetalert2';

interface ThemeSchedule {
  id: number;
  theme_id: string;
  event_name: string;
  calendar_type: 'SOLAR_FIXED' | 'LUNAR_LOOKUP';
  solar_month?: number | null;
  solar_day?: number | null;
  lunar_event_key?: string | null;
  buffer_days_before: number;
  buffer_days_after: number;
  priority_score: number;
  is_enabled: number;
}

interface LunarLookup {
  id: number;
  event_key: string;
  year: number;
  gregorian_start_date: string;
  gregorian_end_date: string;
  description: string;
}

interface AdminOverviewData {
  activeTheme: ThemeData;
  settings: {
    autoScheduleEnabled: boolean;
    manualOverrideThemeId: string | null;
    updatedAt: string | null;
  };
  themes: ThemeData[];
  schedules: ThemeSchedule[];
  lookups: LunarLookup[];
}

export function AdminThemeManager() {
  const { refreshTheme, previewTheme } = useDynamicTheme();
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
  const [scheduleBuffers, setScheduleBuffers] = useState<{ [id: number]: { before: number; after: number } }>({});

  const loadOverview = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/theme/admin/overview`, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error('Gagal memuat data tema');
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        const buffers: { [id: number]: { before: number; after: number } } = {};
        json.data.schedules.forEach((s: ThemeSchedule) => {
          buffers[s.id] = {
            before: s.buffer_days_before,
            after: s.buffer_days_after
          };
        });
        setScheduleBuffers(buffers);
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Memuat Tema',
        text: err.message || 'Terjadi kesalahan saat memuat konfigurasi tema'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const handleToggleAutoSchedule = async (newAutoState: boolean) => {
    try {
      setSaving(true);
      const payload = {
        autoScheduleEnabled: newAutoState,
        manualOverrideThemeId: newAutoState ? null : (data?.settings.manualOverrideThemeId || 'default-obsidian')
      };

      const res = await fetch(`${API_URL}/theme/admin/settings`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Gagal menyimpan pengaturan');

      await refreshTheme();
      previewTheme(null);
      await loadOverview();

      Swal.fire({
        icon: 'success',
        title: 'Pengaturan Disimpan',
        text: newAutoState
          ? 'Penjadwalan otomatis berbasis kalender momentum telah AKTIF.'
          : 'Penjadwalan otomatis NONAKTIF. Sistem beralih ke mode manual override.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: err.message || 'Terjadi kesalahan'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApplyThemeManual = async (themeId: string) => {
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/theme/admin/settings`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autoScheduleEnabled: false,
          manualOverrideThemeId: themeId
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Gagal mengunci tema');

      await refreshTheme();
      previewTheme(null);
      await loadOverview();

      Swal.fire({
        icon: 'success',
        title: 'Tema Diterapkan',
        text: `Tema "${json.data?.activeTheme?.name || themeId}" berhasil dikunci dan diterapkan ke seluruh halaman website.`,
        timer: 2200,
        showConfirmButton: false
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menerapkan Tema',
        text: err.message || 'Terjadi kesalahan'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBuffer = async (scheduleId: number) => {
    const buffer = scheduleBuffers[scheduleId];
    if (!buffer) return;

    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/theme/admin/schedule/${scheduleId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bufferDaysBefore: buffer.before,
          bufferDaysAfter: buffer.after
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Gagal memperbarui jadwal');

      await refreshTheme();
      await loadOverview();
      setEditingScheduleId(null);

      Swal.fire({
        icon: 'success',
        title: 'Jadwal Diperbarui',
        text: 'Ambang batas hari aktif (H-X s.d H+X) berhasil disimpan.',
        timer: 1800,
        showConfirmButton: false
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: err.message || 'Terjadi kesalahan saat menyimpan jadwal'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-ink-muted">Memuat engine tema dan kalender momentum...</p>
      </div>
    );
  }

  const activeTheme = data?.activeTheme;
  const isAutoSchedule = data?.settings.autoScheduleEnabled ?? true;

  return (
    <div className="space-y-6">
      {/* 1. Header & Live Status Card */}
      <Card glass className="p-5 sm:p-6 border border-hairline relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary rounded-full border border-primary/20">
                Dynamic Theme Engine
              </span>
              <span
                className={`flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                  isAutoSchedule
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isAutoSchedule ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                ></span>
                {isAutoSchedule ? 'Mode Otomatis (Auto-Schedule ON)' : 'Manual Override Aktif'}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-ink">
              {activeTheme?.name || 'Apple Obsidian'}
            </h2>
            <p className="text-xs text-ink-muted max-w-2xl leading-relaxed">
              {activeTheme?.description || 'Desain bawaan sistem.'}
            </p>

            {activeTheme?.meta?.event_name && (
              <div className="pt-1 flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Momentum Kalender Aktif: {activeTheme.meta.event_name}
              </div>
            )}
          </div>

          {/* Color Swatch & Master Switch */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0 bg-parchment/60 dark:bg-white/5 p-4 rounded-2xl border border-hairline">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Palet Aktif</p>
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-xl border border-black/10 shadow-xs"
                  style={{ backgroundColor: activeTheme?.tokens['--theme-primary'] || '#0071E3' }}
                  title="Primary Color"
                />
                <div
                  className="w-7 h-7 rounded-xl border border-black/10 shadow-xs"
                  style={{ backgroundColor: activeTheme?.tokens['--theme-accent'] || '#34C759' }}
                  title="Accent Color"
                />
                <div
                  className="w-7 h-7 rounded-xl border border-black/10 shadow-xs"
                  style={{ backgroundColor: activeTheme?.tokens['--theme-header-bg'] || '#1D1D1F' }}
                  title="Header / Obsidian Card"
                />
              </div>
            </div>

            <div className="h-8 w-px bg-hairline hidden sm:block"></div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Auto-Schedule</p>
              <Button
                size="sm"
                variant={isAutoSchedule ? 'primary' : 'outline'}
                disabled={saving}
                onClick={() => handleToggleAutoSchedule(!isAutoSchedule)}
                className="text-xs font-bold"
              >
                {isAutoSchedule ? 'Otomatis: ON' : 'Otomatis: OFF'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. One-Click Apply Preset Themes */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h3 className="text-base font-bold text-ink">Preset Tema Momentum Indonesia</h3>
            <p className="text-xs text-ink-muted">
              Pilih tema di bawah untuk menerapkan dan mengunci tampilan secara manual (One-Click Apply).
            </p>
          </div>

          {!isAutoSchedule && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleToggleAutoSchedule(true)}
              className="text-xs font-bold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
            >
              Kembalikan ke Auto-Schedule
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {data?.themes.map((t) => {
            const isCurrentlyActive = activeTheme?.id === t.id;
            const primaryCol = t.tokens['--theme-primary'] || '#0071E3';
            const accentCol = t.tokens['--theme-accent'] || '#34C759';
            const headerCol = t.tokens['--theme-header-bg'] || '#1D1D1F';

            return (
              <div
                key={t.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 bg-canvas ${
                  isCurrentlyActive
                    ? 'border-primary ring-2 ring-primary/30 shadow-md'
                    : 'border-hairline hover:border-primary/40 shadow-xs'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-parchment border border-hairline text-ink-muted">
                      {t.category}
                    </span>
                    {isCurrentlyActive && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-primary text-white">
                        Aktif Sekarang
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-ink">{t.name}</h4>
                    <p className="text-[11px] text-ink-muted line-clamp-2 mt-0.5">
                      {t.description}
                    </p>
                  </div>

                  {/* Swatch color row */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <div
                      className="w-5 h-5 rounded-lg border border-black/10 shadow-2xs"
                      style={{ backgroundColor: primaryCol }}
                      title="Primary"
                    />
                    <div
                      className="w-5 h-5 rounded-lg border border-black/10 shadow-2xs"
                      style={{ backgroundColor: accentCol }}
                      title="Accent"
                    />
                    <div
                      className="w-5 h-5 rounded-lg border border-black/10 shadow-2xs"
                      style={{ backgroundColor: headerCol }}
                      title="Card Header"
                    />
                    <span className="text-[10px] text-ink-muted font-mono ml-1">
                      {primaryCol}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-hairline">
                  <Button
                    size="sm"
                    variant={isCurrentlyActive ? 'outline' : 'primary'}
                    disabled={saving || isCurrentlyActive}
                    onClick={() => handleApplyThemeManual(t.id)}
                    className="flex-1 text-xs font-bold"
                  >
                    {isCurrentlyActive ? 'Sedang Digunakan' : 'Kunci Tema Ini'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => previewTheme(t)}
                    className="text-xs text-ink-muted hover:text-ink px-2.5"
                    title="Coba pratinjau tema di browser Anda"
                  >
                    Pratinjau
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Momentum Schedule & Buffer Window Rules */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-bold text-ink">Jadwal Kalender & Aturan Buffer (H-X s.d H+X)</h3>
          <p className="text-xs text-ink-muted">
            Tentukan berapa hari sebelum (H-) dan sesudah (H+) hari perayaan tema momentum akan aktif otomatis.
          </p>
        </div>

        <div className="border border-hairline rounded-2xl overflow-hidden bg-canvas">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-parchment/60 dark:bg-white/5 border-b border-hairline text-ink-muted uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">Momentum & Hari Besar</th>
                  <th className="p-3.5">Jenis Kalender</th>
                  <th className="p-3.5 text-center">Buffer Mulai (H-X)</th>
                  <th className="p-3.5 text-center">Buffer Berakhir (H+X)</th>
                  <th className="p-3.5 text-center">Prioritas</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {data?.schedules.map((s) => {
                  const isEditing = editingScheduleId === s.id;
                  const currentBuffer = scheduleBuffers[s.id] || {
                    before: s.buffer_days_before,
                    after: s.buffer_days_after
                  };

                  return (
                    <tr key={s.id} className="hover:bg-parchment/40 dark:hover:bg-white/5 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-ink">{s.event_name}</div>
                        <div className="text-[10px] text-ink-muted font-mono">ID Tema: {s.theme_id}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-white/10 text-ink">
                          {s.calendar_type === 'SOLAR_FIXED'
                            ? `Masehi (${String(s.solar_day).padStart(2, '0')}/${String(s.solar_month).padStart(2, '0')})`
                            : `Dinamis Lunar (${s.lunar_event_key})`}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-1">
                            <span className="text-ink-muted font-bold">H-</span>
                            <input
                              type="number"
                              min="0"
                              max="30"
                              value={currentBuffer.before}
                              onChange={(e) =>
                                setScheduleBuffers((prev) => ({
                                  ...prev,
                                  [s.id]: {
                                    ...currentBuffer,
                                    before: parseInt(e.target.value, 10) || 0
                                  }
                                }))
                              }
                              className="w-14 p-1 text-center font-bold border border-hairline rounded-lg bg-canvas text-ink"
                            />
                            <span className="text-ink-muted text-[10px]">hari</span>
                          </div>
                        ) : (
                          <span className="font-bold text-ink">H-{s.buffer_days_before} hari</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-1">
                            <span className="text-ink-muted font-bold">H+</span>
                            <input
                              type="number"
                              min="0"
                              max="30"
                              value={currentBuffer.after}
                              onChange={(e) =>
                                setScheduleBuffers((prev) => ({
                                  ...prev,
                                  [s.id]: {
                                    ...currentBuffer,
                                    after: parseInt(e.target.value, 10) || 0
                                  }
                                }))
                              }
                              className="w-14 p-1 text-center font-bold border border-hairline rounded-lg bg-canvas text-ink"
                            />
                            <span className="text-ink-muted text-[10px]">hari</span>
                          </div>
                        ) : (
                          <span className="font-bold text-ink">H+{s.buffer_days_after} hari</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="font-mono font-bold text-ink-muted">{s.priority_score}</span>
                      </td>
                      <td className="p-3.5 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={saving}
                              onClick={() => handleSaveBuffer(s.id)}
                              className="text-[11px] py-1 px-2.5"
                            >
                              Simpan
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingScheduleId(null)}
                              className="text-[11px] py-1 px-2"
                            >
                              Batal
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingScheduleId(s.id)}
                            className="text-[11px] py-1 px-2.5"
                          >
                            Ubah Buffer
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
