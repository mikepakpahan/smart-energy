'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import OverloadBanner from '@/components/OverloadBanner';
import HeroOverviewCard from '@/components/HeroOverviewCard';
import QuickMetrics from '@/components/QuickMetrics';
import EnergyLineChart from '@/components/EnergyLineChart';
import NILMProfilerCard from '@/components/NILMProfilerCard';
import SimulatorWidget from '@/components/SimulatorWidget';
import { Device, DeviceStatusResponse } from '@/types/energy';

export default function DashboardPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'simulator'>('overview');
  const [selectedDeviceId, setSelectedDeviceId] = useState<number>(1);
  const [devices, setDevices] = useState<Device[]>([
    {
      id: 1,
      name: 'Stopkontak Utama (Lab IoT)',
      max_power_limit: 500,
      relay_status: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ]);
  const [statusData, setStatusData] = useState<DeviceStatusResponse | null>(null);
  const [limitPoints, setLimitPoints] = useState<number>(30);
  const [isPolling, setIsPolling] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isTogglingRelay, setIsTogglingRelay] = useState<boolean>(false);

  // Theme synchronization with html tag
  useEffect(() => {
    const savedTheme = localStorage.getItem('smart_energy_theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('smart_energy_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Fetch all devices
  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch('/api/devices');
      const json = await res.json();
      if (json.success && json.data) {
        setDevices(json.data);
      }
    } catch {}
  }, []);

  // Fetch device status and history
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/devices/${selectedDeviceId}/status?limit=${limitPoints}`);
      const json = await res.json();
      if (json.success && json.data) {
        setStatusData(json.data);
      }
    } catch {}
  }, [selectedDeviceId, limitPoints]);

  useEffect(() => {
    fetchDevices();
    fetchStatus();
  }, [fetchDevices, fetchStatus]);

  // Polling loop (setiap 2 detik sesuai PRD H-01)
  useEffect(() => {
    if (!isPolling) return;
    const interval = setInterval(() => {
      fetchStatus();
    }, 2000);
    return () => clearInterval(interval);
  }, [isPolling, fetchStatus]);

  // Auto-stream Simulation loop
  useEffect(() => {
    if (!isSimulating) return;

    const simInterval = setInterval(async () => {
      const basePower = 50;
      const noise = (Math.random() - 0.5) * 8;
      const power = Math.max(5, +(basePower + noise).toFixed(2));
      const voltage = +(220 + (Math.random() - 0.5) * 2).toFixed(2);

      try {
        await fetch('/api/telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_id: selectedDeviceId,
            voltage,
            power,
          }),
        });
        fetchStatus();
      } catch {}
    }, 2000);

    return () => clearInterval(simInterval);
  }, [isSimulating, selectedDeviceId, fetchStatus]);

  // Relay Toggle Handler
  const handleToggleRelay = async () => {
    if (!statusData) return;
    setIsTogglingRelay(true);
    try {
      const res = await fetch(`/api/devices/${selectedDeviceId}/toggle`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        await fetchStatus();
      }
    } catch (err: any) {
      alert(`Gagal mengubah relay: ${err.message}`);
    } finally {
      setIsTogglingRelay(false);
    }
  };

  // Custom Power to Simulator
  const handleSendCustomPower = async (power: number) => {
    try {
      await fetch('/api/telemetry/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: selectedDeviceId,
          custom_power: power,
        }),
      });
      await fetchStatus();
    } catch {}
  };

  // Send Preset to Simulator
  const handleSendPreset = async (preset: string) => {
    try {
      await fetch('/api/telemetry/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: selectedDeviceId,
          preset,
        }),
      });
      await fetchStatus();
    } catch {}
  };

  // Update Limit
  const handleUpdateLimit = async (limit: number) => {
    try {
      const res = await fetch(`/api/devices/${selectedDeviceId}/limit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_power_limit: limit }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchStatus();
      }
    } catch {}
  };

  // Reset Data
  const handleResetData = async () => {
    if (!confirm('Reset riwayat telemetri ke kondisi awal?')) return;
    try {
      await fetch('/api/telemetry/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: selectedDeviceId,
          action: 'reset',
        }),
      });
      await fetchStatus();
    } catch {}
  };

  const device = statusData?.device || devices[0];
  const latest = statusData?.latest_telemetry || null;
  const history = statusData?.history || [];
  const stats = statusData?.stats || {
    current_power: 0,
    current_voltage: 220,
    current_amperage: 0,
    peak_power_today: 0,
    avg_power_today: 0,
    energy_kwh: 0,
    cost_idr: 0,
    total_records: 0,
  };
  const isOverload = statusData?.alert?.is_overload || false;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      {/* Minimalist Top Navbar */}
      <Navbar
        device={device}
        devices={devices}
        onSelectDevice={(id) => setSelectedDeviceId(id)}
        activeTab={activeTab}
        onChangeTab={(tab) => setActiveTab(tab)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        isPolling={isPolling}
        isSimulating={isSimulating}
      />

      <main className="flex-1 mx-auto w-full max-w-5xl px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Overload Alert Banner (Muncul saat darurat overload atau relay OFF) */}
        <OverloadBanner
          isOverload={isOverload}
          power={latest ? latest.power : 0}
          maxLimit={device.max_power_limit}
          relayStatus={device.relay_status}
          onToggleRelay={handleToggleRelay}
          isToggling={isTogglingRelay}
        />

        {/* TAB 1: RINGKASAN */}
        {activeTab === 'overview' && (
          <div className="space-y-4 sm:space-y-6">
            {/* The Hero Card: Saklar iOS kini selalu hadir secara persisten di kanan atas */}
            <HeroOverviewCard
              device={device}
              latest={latest}
              onToggleRelay={handleToggleRelay}
              isToggling={isTogglingRelay}
            />

            <EnergyLineChart
              data={history}
              maxLimit={device.max_power_limit}
              limitPoints={limitPoints}
              onSelectLimit={(count) => setLimitPoints(count)}
              theme={theme}
            />

            <QuickMetrics
              voltage={latest ? latest.voltage : 220}
              current={latest ? latest.current : 0}
              stats={stats}
            />
          </div>
        )}

        {/* TAB 2: RIWAYAT & AI NILM */}
        {activeTab === 'history' && (
          <NILMProfilerCard
            telemetries={history}
            currentApplianceName={latest?.detected_appliance}
          />
        )}

        {/* TAB 3: SIMULATOR & DEV TOOLS */}
        {activeTab === 'simulator' && (
          <SimulatorWidget
            deviceId={device.id}
            currentLimit={device.max_power_limit}
            relayStatus={device.relay_status}
            onToggleRelay={handleToggleRelay}
            isSimulating={isSimulating}
            onToggleSimulation={() => setIsSimulating(!isSimulating)}
            onSendCustomPower={handleSendCustomPower}
            onSendPreset={handleSendPreset}
            onUpdateLimit={handleUpdateLimit}
            onResetData={handleResetData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/60 dark:border-zinc-800/60 py-5 text-center text-xs text-zinc-400 dark:text-zinc-500">
        <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-1.5">
          <span>Smart Energy Meter & AI NILM Profiler</span>
          <span>Sistem Mikrokontroler • UNPAB</span>
        </div>
      </footer>
    </div>
  );
}
