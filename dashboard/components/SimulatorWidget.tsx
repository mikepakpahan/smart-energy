'use client';

import React, { useState, useEffect } from 'react';
import IOSSwitch from './IOSSwitch';

interface SimulatorWidgetProps {
  deviceId: number;
  currentLimit: number;
  relayStatus: boolean;
  onToggleRelay: () => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  onSendCustomPower: (power: number) => Promise<void>;
  onSendPreset: (preset: string) => Promise<void>;
  onUpdateLimit: (limit: number) => Promise<void>;
  onResetData: () => Promise<void>;
}

export default function SimulatorWidget({
  deviceId,
  currentLimit,
  relayStatus,
  onToggleRelay,
  isSimulating,
  onToggleSimulation,
  onSendCustomPower,
  onSendPreset,
  onUpdateLimit,
  onResetData,
}: SimulatorWidgetProps) {
  const [sliderWatt, setSliderWatt] = useState<number>(50);
  const [inputLimit, setInputLimit] = useState<number>(currentLimit);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Storage & Pruning state
  const [storageInfo, setStorageInfo] = useState<{
    total_records: number;
    retention_days: number;
    estimated_size_kb: number;
    auto_prune_status: string;
  } | null>(null);
  const [isPruning, setIsPruning] = useState(false);

  const fetchStorageHealth = async () => {
    try {
      const res = await fetch('/api/telemetry/prune');
      const json = await res.json();
      if (json.success && json.data) {
        setStorageInfo(json.data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchStorageHealth();
  }, []);

  const handleManualPrune = async () => {
    setIsPruning(true);
    try {
      const res = await fetch('/api/telemetry/prune', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setStatusMessage(json.message);
        if (json.data?.storage_health) {
          setStorageInfo(json.data.storage_health);
        }
        setTimeout(() => setStatusMessage(null), 3500);
      }
    } catch (err: any) {
      alert(`Gagal menjalankan pruning: ${err.message}`);
    } finally {
      setIsPruning(false);
    }
  };

  const presets = [
    { id: 'standby', label: 'Standby', watt: '1 W' },
    { id: 'charger', label: 'Charger HP', watt: '12 W' },
    { id: 'fan', label: 'Kipas Angin', watt: '50 W' },
    { id: 'tv', label: 'Smart TV', watt: '130 W' },
    { id: 'fridge', label: 'Kulkas', watt: '260 W' },
    { id: 'cooker', label: 'Rice Cooker', watt: '420 W' },
    { id: 'overload', label: 'Setrika (Overload)', watt: '650 W', isDanger: true },
  ];

  const handleSendSlider = async () => {
    setIsSending(true);
    await onSendCustomPower(sliderWatt);
    setIsSending(false);
    setStatusMessage(`Terkirim: ${sliderWatt} W.`);
    fetchStorageHealth();
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handlePresetClick = async (presetId: string, wattStr: string) => {
    setIsSending(true);
    await onSendPreset(presetId);
    setIsSending(false);
    setStatusMessage(`Preset ${wattStr} terkirim.`);
    fetchStorageHealth();
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleSaveLimit = async () => {
    if (inputLimit > 0) {
      await onUpdateLimit(inputLimit);
      setStatusMessage(`Batas proteksi diubah ke ${inputLimit} W.`);
      setTimeout(() => setStatusMessage(null), 2500);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Main Simulator Card */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 sm:p-6 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Virtual Sensor & Uji Coba Beban
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Uji respon AI NILM dan alarm overload langsung tanpa mikrokontroler fisik
            </p>
          </div>

          {/* Auto-Stream Toggle Button */}
          <button
            onClick={onToggleSimulation}
            className={`flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-semibold transition-all shadow-xs active:scale-98 ${
              isSimulating
                ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-zinc-950'
                : 'border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isSimulating ? 'bg-white dark:bg-zinc-950 animate-ping' : 'bg-zinc-400'
              }`}
            />
            {isSimulating ? 'Auto-Stream Aktif (2s)' : 'Mulai Kirim Otomatis (Tiap 2s)'}
          </button>
        </div>

        {statusMessage && (
          <div className="mb-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-300">
            {statusMessage}
          </div>
        )}

        {/* Preset Buttons Grid */}
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-2">
            Pilih Skenario Alat:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePresetClick(p.id, p.watt)}
                disabled={isSending}
                className={`rounded-xl p-2.5 sm:px-3 sm:py-2 text-xs font-medium transition-all border active:scale-95 disabled:opacity-50 text-left sm:text-center ${
                  p.isDanger
                    ? 'border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 hover:border-rose-300 col-span-2 sm:col-span-1'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="truncate font-semibold">{p.label}</div>
                <div className="mt-0.5 font-mono text-[11px] opacity-70 font-normal">
                  {p.watt}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Manual Slider */}
        <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Slider Daya Manual:
            </label>
            <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
              {sliderWatt} Watt
            </span>
          </div>
          <div className="py-2">
            <input
              type="range"
              min="0"
              max="800"
              step="5"
              value={sliderWatt}
              onChange={(e) => setSliderWatt(Number(e.target.value))}
              className="w-full accent-emerald-500 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg cursor-pointer"
            />
          </div>
          <div className="flex justify-between text-[10px] text-zinc-400 font-mono mt-0.5">
            <span>0W</span>
            <span>250W</span>
            <span className="text-rose-500 font-bold">500W (Batas)</span>
            <span>800W</span>
          </div>

          <div className="mt-3">
            <button
              onClick={handleSendSlider}
              disabled={isSending}
              className="w-full sm:w-auto rounded-xl bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-xs font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 disabled:opacity-50 transition-all shadow-xs"
            >
              Kirim Nilai Slider ke Server
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Settings & Auto-Pruning Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Batas Proteksi */}
        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 sm:p-5 shadow-xs transition-colors flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Batas Proteksi Overload
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Batas aman: <strong className="font-mono">{currentLimit} Watt</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <input
              type="number"
              value={inputLimit}
              onChange={(e) => setInputLimit(Number(e.target.value))}
              min="50"
              max="2000"
              className="w-24 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent px-2.5 py-1.5 text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100 outline-none"
            />
            <button
              onClick={handleSaveLimit}
              className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Simpan
            </button>
            <button
              onClick={onResetData}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 ml-auto underline"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Manual Relay Switch Test (iOS Switch) */}
        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 sm:p-5 shadow-xs transition-colors flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Manual Relay Override
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Status:{' '}
              {relayStatus ? (
                <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  ON (Mengalir)
                </strong>
              ) : (
                <strong className="text-rose-600 dark:text-rose-400 font-semibold">
                  OFF (Terputus)
                </strong>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <IOSSwitch
              checked={relayStatus}
              onChange={onToggleRelay}
              ariaLabel="Manual Relay Override iOS Switch"
            />
          </div>
        </div>

        {/* Kebijakan Penyimpanan & Auto-Pruning */}
        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 sm:p-5 shadow-xs transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Penyimpanan & Auto-Pruning
              </h4>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Auto-Pruning Aktif" />
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Total Baris: <strong className="font-mono text-zinc-800 dark:text-zinc-200">{storageInfo?.total_records ?? '...'}</strong> ({storageInfo?.estimated_size_kb ?? 0} KB)
            </p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              Retensi: Otomatis pangkas data &gt; {storageInfo?.retention_days ?? 7} hari
            </p>
          </div>

          <div className="mt-3">
            <button
              onClick={handleManualPrune}
              disabled={isPruning}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 py-1.5 px-3 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 active:scale-95 disabled:opacity-50 transition-all"
            >
              {isPruning ? 'Memangkas Data...' : 'Pangkas Data Usang Sekarang'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
