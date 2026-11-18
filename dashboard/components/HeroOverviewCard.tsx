'use client';

import React from 'react';
import { Device, Telemetry } from '@/types/energy';
import IOSSwitch from './IOSSwitch';

interface HeroOverviewCardProps {
  device: Device;
  latest: Telemetry | null;
  onToggleRelay: () => void;
  isToggling?: boolean;
}

export default function HeroOverviewCard({
  device,
  latest,
  onToggleRelay,
  isToggling = false,
}: HeroOverviewCardProps) {
  const power = latest ? latest.power : 0;
  const maxLimit = device.max_power_limit || 500;
  const isRelayOn = device.relay_status;
  const isOverload = power > maxLimit;
  const percentage = Math.min(100, Math.round((power / maxLimit) * 100));

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-5 sm:p-7 shadow-xs transition-colors duration-200">
      {/* Top Header Row: Label & Persistent iOS Switch */}
      <div className="flex items-center justify-between gap-4 pb-3.5 border-b border-zinc-100 dark:border-zinc-800/70">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Daya Listrik Terukur
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
              isOverload
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                : isRelayOn
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isOverload
                  ? 'bg-rose-500 animate-ping'
                  : isRelayOn
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-zinc-400'
              }`}
            />
            {isOverload
              ? 'Beban Berlebih (Overload)'
              : isRelayOn
              ? 'Normal & Mengalir'
              : 'Aliran Terputus (OFF)'}
          </span>
        </div>

        {/* Persistent iOS Switch Button (Selalu ada & mudah diakses) */}
        <div className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 block leading-tight">
              Saklar Stopkontak
            </span>
            <span
              className={`text-[10px] font-mono ${
                isRelayOn
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-zinc-400 dark:text-zinc-500'
              }`}
            >
              {isToggling ? 'Memproses...' : isRelayOn ? 'ON (Aktif)' : 'OFF (Mati)'}
            </span>
          </div>
          <IOSSwitch
            checked={isRelayOn}
            onChange={onToggleRelay}
            disabled={isToggling}
            ariaLabel="Saklar Utama Aliran Listrik Stopkontak"
          />
        </div>
      </div>

      {/* Main Metric & Gauge Section */}
      <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2.5">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 font-mono">
              {power.toFixed(1)}
            </span>
            <span className="text-base sm:text-lg font-medium text-zinc-500 dark:text-zinc-400">
              Watt
            </span>
          </div>

          {/* AI Appliance Identification */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-zinc-600 dark:text-zinc-300">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] shrink-0">
              🤖
            </span>
            <span className="truncate">
              AI NILM:{' '}
              <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                {latest?.detected_appliance || 'Standby / Idle'}
              </strong>
            </span>
            {latest?.confidence && (
              <span className="text-[11px] text-zinc-400 font-mono">
                ({latest.confidence}% keyakinan)
              </span>
            )}
          </div>
        </div>

        {/* Right: Clean Capacity & Limit Information */}
        <div className="sm:border-l sm:border-zinc-100 dark:sm:border-zinc-800/80 sm:pl-8 sm:w-64 space-y-2">
          <div className="flex justify-between items-baseline text-xs">
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">
              Kapasitas Aman
            </span>
            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
              {percentage}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isOverload
                  ? 'bg-rose-500'
                  : percentage > 70
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] text-zinc-400 dark:text-zinc-500 pt-0.5">
            <span>Batas: {maxLimit} W</span>
            <span>Sisa: {Math.max(0, maxLimit - power).toFixed(0)} W</span>
          </div>
        </div>
      </div>
    </div>
  );
}
