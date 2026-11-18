'use client';

import React from 'react';
import { Telemetry } from '@/types/energy';
import { APPLIANCE_PROFILES } from '@/lib/nilm';

interface NILMProfilerCardProps {
  telemetries: Telemetry[];
  currentApplianceName?: string;
}

export default function NILMProfilerCard({
  telemetries,
  currentApplianceName,
}: NILMProfilerCardProps) {
  const recentLogs = telemetries.slice(-8).reverse();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* SECTION 1: Registered Profiles */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 sm:p-6 shadow-xs transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Tanda Tangan Beban AI NILM
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Klasifikasi beban otomatis berdasarkan rentang daya aktif
            </p>
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
            {APPLIANCE_PROFILES.length} Profil
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
          {APPLIANCE_PROFILES.map((profile) => {
            const isCurrentlyActive = currentApplianceName === profile.name;
            return (
              <div
                key={profile.id}
                className={`rounded-xl border p-3.5 transition-all ${
                  isCurrentlyActive
                    ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : 'border-zinc-200/70 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {profile.name}
                  </span>
                  <span className="font-mono text-[11px] font-medium text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 whitespace-nowrap">
                    {profile.minWatt}–{profile.maxWatt} W
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {profile.category} • {profile.loadType}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Stream Activity Table */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 sm:p-6 shadow-xs transition-colors">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Log Telemetri Masuk
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              8 pembacaan data terakhir dari sensor
            </p>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            2s/data
          </span>
        </div>

        {/* Scrollable table container */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full text-left text-xs min-w-[480px]">
            <thead className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="pb-2">Waktu</th>
                <th className="pb-2">Daya</th>
                <th className="pb-2">Tegangan</th>
                <th className="pb-2">Arus</th>
                <th className="pb-2">Alat Terdeteksi</th>
                <th className="pb-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-mono text-zinc-700 dark:text-zinc-300">
              {recentLogs.map((log) => {
                const time = new Date(log.recorded_at).toLocaleTimeString('id-ID', {
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });
                return (
                  <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="py-2.5 text-zinc-500">{time}</td>
                    <td className="py-2.5 font-bold text-zinc-900 dark:text-zinc-100">{log.power.toFixed(1)} W</td>
                    <td className="py-2.5 text-zinc-500">{log.voltage.toFixed(1)} V</td>
                    <td className="py-2.5 text-zinc-700 dark:text-zinc-300">{log.current.toFixed(2)} A</td>
                    <td className="py-2.5 font-sans font-medium text-zinc-800 dark:text-zinc-200">
                      {log.detected_appliance}
                    </td>
                    <td className="py-2.5 text-right font-sans">
                      {log.is_overload ? (
                        <span className="rounded-full bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 px-2 py-0.5 text-[10px] font-medium border border-rose-200 dark:border-rose-500/20">
                          Overload
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-medium border border-emerald-200 dark:border-emerald-500/20">
                          Aman
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-2 text-right text-[10px] text-zinc-400 sm:hidden">
          ← Geser untuk melihat tabel →
        </div>
      </div>
    </div>
  );
}
