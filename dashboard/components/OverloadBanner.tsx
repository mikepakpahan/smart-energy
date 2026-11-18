'use client';

import React from 'react';
import IOSSwitch from './IOSSwitch';

interface OverloadBannerProps {
  isOverload: boolean;
  power: number;
  maxLimit: number;
  relayStatus: boolean;
  onToggleRelay: () => void;
  isToggling?: boolean;
}

export default function OverloadBanner({
  isOverload,
  power,
  maxLimit,
  relayStatus,
  onToggleRelay,
  isToggling = false,
}: OverloadBannerProps) {
  // Hanya tampil jika ada kondisi darurat (overload) ATAU listrik sedang mati (relay OFF)
  if (!isOverload && relayStatus) return null;

  const excessPower = Math.max(0, power - maxLimit);

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 transition-all duration-300 shadow-xs ${
        isOverload
          ? 'border-rose-300 dark:border-rose-500/50 bg-rose-50/90 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100'
          : 'border-amber-300 dark:border-amber-500/40 bg-amber-50/80 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100'
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left Information Section */}
        <div className="space-y-3 flex-1">
          {/* Header Title */}
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold shadow-xs shrink-0 ${
                isOverload
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-amber-600 text-white'
              }`}
            >
              {isOverload ? '⚠️' : '⚡'}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold tracking-tight">
                {isOverload
                  ? 'Peringatan Beban Listrik Berlebih (Overload)'
                  : 'Sirkuit Stopkontak Dinonaktifkan (Relay OFF)'}
              </h3>
              <span className="text-[11px] font-medium opacity-80 block">
                {isOverload
                  ? 'Proteksi Hard-Cutoff Otomatis Aktif — Aliran Listrik Diputus'
                  : 'Arus Listrik Sedang Terputus. Stopkontak Tidak Mengalirkan Daya'}
              </span>
            </div>
          </div>

          {/* Overload Metrics Comparison (Hanya muncul saat beban berlebih) */}
          {isOverload && (
            <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-white/80 dark:bg-black/30 border border-rose-200 dark:border-rose-900/50 max-w-sm text-center">
              <div>
                <span className="text-[10px] uppercase font-semibold text-rose-800 dark:text-rose-300">
                  Terbaca
                </span>
                <div className="font-mono text-sm sm:text-base font-extrabold text-rose-600 dark:text-rose-400">
                  {power.toFixed(0)} W
                </div>
              </div>
              <div className="border-x border-rose-200/80 dark:border-rose-900/50">
                <span className="text-[10px] uppercase font-semibold text-zinc-500 dark:text-zinc-400">
                  Batas Aman
                </span>
                <div className="font-mono text-sm sm:text-base font-bold text-zinc-800 dark:text-zinc-200">
                  {maxLimit} W
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-rose-800 dark:text-rose-300">
                  Kelebihan
                </span>
                <div className="font-mono text-sm sm:text-base font-extrabold text-rose-600 dark:text-rose-400">
                  +{excessPower.toFixed(0)} W
                </div>
              </div>
            </div>
          )}

          {/* Guidance text */}
          <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 max-w-2xl">
            {isOverload ? (
              <>
                Sistem mendeteksi lonjakan daya melebihi kapasitas stopkontak. Arus listrik otomatis diputus demi mencegah korsleting atau kebakaran. <strong>Cabut perangkat berdaya tinggi</strong>, lalu geser saklar kembali ke posisi <strong>ON</strong>.
              </>
            ) : (
              <>
                Aliran listrik ke stopkontak sedang diputus. Anda dapat menyalakan kembali stopkontak kapan saja dengan menggeser saklar di samping atau pada kartu utama di bawah.
              </>
            )}
          </p>
        </div>

        {/* Right: Quick iOS Toggle Switch (Synced with Hero Card) */}
        <div className="border-t lg:border-t-0 lg:border-l border-zinc-200/80 dark:border-zinc-800/80 pt-3 lg:pt-0 lg:pl-6 flex flex-row lg:flex-col items-center justify-between lg:justify-center gap-3 shrink-0">
          <div className="text-left lg:text-center">
            <span className="text-xs font-bold uppercase tracking-wider block text-zinc-900 dark:text-zinc-100">
              Pulihkan Aliran
            </span>
            <span
              className={`text-[11px] font-semibold block mt-0.5 ${
                relayStatus
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {isToggling
                ? 'Memproses...'
                : relayStatus
                ? '● Aliran Aktif (ON)'
                : '○ Arus Mati (OFF)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <IOSSwitch
              checked={relayStatus}
              onChange={onToggleRelay}
              disabled={isToggling}
              ariaLabel="Saklar iOS Pemulihan Aliran Listrik"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
