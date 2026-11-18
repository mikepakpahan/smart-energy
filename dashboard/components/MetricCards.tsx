'use client';

import React from 'react';
import { Device, Telemetry, DeviceStats } from '@/types/energy';

interface MetricCardsProps {
  device: Device;
  latest: Telemetry | null;
  stats: DeviceStats;
  onToggleRelay: () => void;
  isToggling: boolean;
}

export default function MetricCards({
  device,
  latest,
  stats,
  onToggleRelay,
  isToggling,
}: MetricCardsProps) {
  const power = latest ? latest.power : 0;
  const voltage = latest ? latest.voltage : 220;
  const current = latest ? latest.current : 0;
  const maxLimit = device.max_power_limit || 500;
  const powerPercentage = Math.min(100, Math.round((power / maxLimit) * 100));

  const isRelayOn = device.relay_status;
  const isOverload = power > maxLimit;

  // Visual color for power load
  const getPowerColor = () => {
    if (isOverload) return 'text-red-400';
    if (powerPercentage > 75) return 'text-amber-400';
    if (powerPercentage > 40) return 'text-cyan-400';
    return 'text-emerald-400';
  };

  const getProgressColor = () => {
    if (isOverload) return 'bg-red-500';
    if (powerPercentage > 75) return 'bg-amber-500';
    if (powerPercentage > 40) return 'bg-cyan-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* CARD 1: Daya Aktif (Watt) */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm transition-all hover:border-zinc-700">
        <div className="flex items-center justify-between text-zinc-400">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Daya Aktif (Real-Time)
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className={`text-3xl font-extrabold tracking-tight font-mono ${getPowerColor()}`}>
            {power.toFixed(1)}
          </span>
          <span className="text-sm font-semibold text-zinc-400">Watt</span>
        </div>

        {/* Load Bar Gauge */}
        <div className="mt-3">
          <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
            <span>Beban: {powerPercentage}%</span>
            <span>Batas: {maxLimit} W</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full transition-all duration-500 rounded-full ${getProgressColor()}`}
              style={{ width: `${powerPercentage}%` }}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/80">
          <span>Puncak Hari Ini: <strong className="text-zinc-300 font-mono">{stats.peak_power_today} W</strong></span>
          <span>Rata-rata: <strong className="text-zinc-300 font-mono">{stats.avg_power_today} W</strong></span>
        </div>
      </div>

      {/* CARD 2: Tegangan (V) & Arus (A) */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm transition-all hover:border-zinc-700">
        <div className="flex items-center justify-between text-zinc-400">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Tegangan & Arus
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <span className="text-[11px] text-zinc-400">Tegangan (V)</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-bold font-mono text-zinc-100">
                {voltage.toFixed(1)}
              </span>
              <span className="text-xs text-zinc-400">V</span>
            </div>
            <span className="inline-block mt-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              Normal 220V
            </span>
          </div>

          <div>
            <span className="text-[11px] text-zinc-400">Arus (Ampere)</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-bold font-mono text-cyan-300">
                {current.toFixed(2)}
              </span>
              <span className="text-xs text-zinc-400">A</span>
            </div>
            <span className="inline-block mt-1 text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
              I = P / V
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/80">
          <span>Frekuensi: <strong className="text-zinc-300 font-mono">50.0 Hz</strong></span>
          <span>Power Factor: <strong className="text-zinc-300 font-mono">~0.95</strong></span>
        </div>
      </div>

      {/* CARD 3: NILM AI Appliance Profiling (PRD B-04) */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm transition-all hover:border-zinc-700">
        <div className="flex items-center justify-between text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">
              AI NILM Profiling
            </span>
            <span className="rounded bg-cyan-500/20 px-1.5 py-0.2 text-[10px] font-bold text-cyan-300 border border-cyan-500/30">
              ACTIVE
            </span>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <div className="mt-2.5">
          <div className="text-xs text-zinc-400">Alat Terdeteksi:</div>
          <div className="text-base font-bold text-white tracking-tight mt-0.5 truncate" title={latest?.detected_appliance || 'Standby'}>
            {latest?.detected_appliance || 'Standby / Idle'}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
              {latest?.appliance_category || 'Deteksi Standar'}
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">
              Keyakinan: {latest?.confidence || 92}%
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/80">
          <span>Engine: <strong className="text-cyan-400">Next.js Rule AI</strong></span>
          <span>Analisis: <strong className="text-zinc-300">Delta P</strong></span>
        </div>
      </div>

      {/* CARD 4: Remote Relay Hardware Switch (PRD F-03 & B-03) */}
      <div className={`relative overflow-hidden rounded-2xl border p-5 backdrop-blur-sm transition-all ${
        isRelayOn
          ? 'border-emerald-500/30 bg-emerald-950/20 shadow-lg shadow-emerald-950/20'
          : 'border-red-500/30 bg-red-950/20 shadow-lg shadow-red-950/20'
      }`}>
        <div className="flex items-center justify-between text-zinc-400">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Remote Saklar (Relay)
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
            isRelayOn
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-red-500/20 text-red-300 border border-red-500/30'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isRelayOn ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            {isRelayOn ? 'ON (ALIRAN AKTIF)' : 'OFF (TERPUTUS)'}
          </span>
        </div>

        <div className="mt-3">
          <p className="text-xs text-zinc-400">
            {isRelayOn
              ? 'Stopkontak aktif mengalirkan arus ke beban terhubung.'
              : 'Sirkuit listrik stopkontak dibuka/diputus oleh relay.'}
          </p>
        </div>

        <div className="mt-4">
          <button
            onClick={onToggleRelay}
            disabled={isToggling}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 ${
              isRelayOn
                ? 'bg-red-600 text-white hover:bg-red-500 shadow-red-600/30'
                : 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-emerald-500/30'
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 4.243a9 9 0 01-12.728 0m0 0l2.829-2.829m-2.829 2.829L3 21m2.828-12.536a5 5 0 017.072 0m0 0l2.829 2.829" />
            </svg>
            {isToggling ? 'Mengirim Perintah...' : isRelayOn ? 'Putus Arus (Override OFF)' : 'Alirkan Arus (ON)'}
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/80">
          <span>Proteksi: <strong className="text-zinc-300">Hard-Cutoff</strong></span>
          <span>Tipe Relay: <strong className="text-zinc-300">Active LOW</strong></span>
        </div>
      </div>
    </div>
  );
}
