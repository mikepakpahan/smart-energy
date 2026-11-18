'use client';

import React from 'react';
import { DeviceStats } from '@/types/energy';

interface QuickMetricsProps {
  voltage: number;
  current: number;
  stats: DeviceStats;
}

export default function QuickMetrics({
  voltage,
  current,
  stats,
}: QuickMetricsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      {/* 1. Tegangan */}
      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 shadow-xs transition-colors">
        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
          Tegangan (Volt)
        </span>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {voltage.toFixed(1)}
          </span>
          <span className="text-xs text-zinc-400 font-medium">V</span>
        </div>
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 block">
          Standar PLN: 220 V ± 5%
        </span>
      </div>

      {/* 2. Arus Listrik */}
      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 shadow-xs transition-colors">
        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
          Arus Listrik (Ampere)
        </span>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {current.toFixed(2)}
          </span>
          <span className="text-xs text-zinc-400 font-medium">A</span>
        </div>
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 block">
          Dihitung: I = P / V
        </span>
      </div>

      {/* 3. Akumulasi Biaya Listrik */}
      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 shadow-xs transition-colors">
        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
          Estimasi Biaya Listrik
        </span>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            Rp {stats.cost_idr.toLocaleString('id-ID')}
          </span>
        </div>
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 block">
          Konsumsi: {stats.energy_kwh.toFixed(3)} kWh (Rp 1.444/kWh)
        </span>
      </div>
    </div>
  );
}
