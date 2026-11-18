'use client';

import React from 'react';
import { Device } from '@/types/energy';

interface NavbarProps {
  device: Device | null;
  devices: Device[];
  onSelectDevice: (id: number) => void;
  activeTab: 'overview' | 'history' | 'simulator';
  onChangeTab: (tab: 'overview' | 'history' | 'simulator') => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  isPolling: boolean;
  isSimulating: boolean;
}

export default function Navbar({
  device,
  devices,
  onSelectDevice,
  activeTab,
  onChangeTab,
  theme,
  onToggleTheme,
  isPolling,
  isSimulating,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto max-w-5xl px-4 py-2.5 sm:py-3 sm:px-6">
        {/* Top Row: Brand & Actions */}
        <div className="flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold text-xs shadow-xs shrink-0">
              ⚡
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                SmartEnergy
              </span>
              <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                NILM
              </span>
            </div>
          </div>

          {/* Desktop Tab Navigation (Hidden on Mobile, shown on sm+) */}
          <nav className="hidden sm:flex items-center rounded-lg bg-zinc-100 dark:bg-zinc-900 p-1 border border-zinc-200/60 dark:border-zinc-800">
            <button
              onClick={() => onChangeTab('overview')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'overview'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              Ringkasan
            </button>
            <button
              onClick={() => onChangeTab('history')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              Riwayat AI
            </button>
            <button
              onClick={() => onChangeTab('simulator')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'simulator'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <span>Simulator</span>
              {isSimulating && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>
          </nav>

          {/* Right Controls: Device Selector & Theme Switcher */}
          <div className="flex items-center gap-2">
            {devices.length > 1 && (
              <select
                value={device?.id || 1}
                onChange={(e) => onSelectDevice(Number(e.target.value))}
                aria-label="Pilih Stopkontak"
                className="hidden md:block rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 outline-none"
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              aria-label="Ubah Tema"
              title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all"
            >
              {theme === 'dark' ? (
                <svg className="h-4 w-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Tab Navigation Row (Visible only on < sm screens) */}
        <div className="mt-2.5 sm:hidden">
          <nav className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1 border border-zinc-200/60 dark:border-zinc-800 text-center">
            <button
              onClick={() => onChangeTab('overview')}
              className={`py-2 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'overview'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              Ringkasan
            </button>
            <button
              onClick={() => onChangeTab('history')}
              className={`py-2 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              Riwayat AI
            </button>
            <button
              onClick={() => onChangeTab('simulator')}
              className={`py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${
                activeTab === 'simulator'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              <span>Simulator</span>
              {isSimulating && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
