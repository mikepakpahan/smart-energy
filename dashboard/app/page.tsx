"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Zap,
  Power,
  AlertTriangle,
  Cpu,
  Activity,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Coins,
  Sliders,
  Send,
  Flame,
  Wind,
  Tv,
  CheckCircle2,
  Settings,
  X,
  Save,
  Gauge,
  Terminal,
  ArrowUpRight,
  Layers,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

// =============================================================
// Types & Constants
// =============================================================
interface TelemetryItem {
  id?: number;
  voltage: number;
  power: number;
  relayStatus: boolean;
  appliance: string | null;
  createdAt: string;
}

interface DeviceData {
  deviceId: string;
  name: string | null;
  maxPowerLimit: number;
  relayStatus: boolean;
  latestTelemetry: TelemetryItem | null;
  history: TelemetryItem[];
}

type RangeKey = "15m" | "1h" | "24h";
type BillingPeriod = "hour" | "day" | "month";

interface ChartPoint {
  time: string;
  fullTime: string;
  power: number;
  voltage: number;
  current: number;
  appliance: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
}

const RANGE_MS: Record<RangeKey, number> = {
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
};

const RANGE_LABEL: Record<RangeKey, string> = {
  "15m": "15M",
  "1h": "1J",
  "24h": "24J",
};

const RANGE_FULL_LABEL: Record<RangeKey, string> = {
  "15m": "15 Menit Terakhir",
  "1h": "1 Jam Terakhir",
  "24h": "24 Jam Terakhir",
};

const TARIF_PLN_PER_KWH = 1444.7;

// Static ISO timestamps prevent SSR vs Client hydration mismatch
const INITIAL_DEMO_DATA: TelemetryItem[] = [
  {
    voltage: 220.1,
    power: 45.0,
    relayStatus: true,
    appliance: "Kipas Angin",
    createdAt: "2026-11-18T11:15:00+07:00",
  },
  {
    voltage: 219.8,
    power: 52.0,
    relayStatus: true,
    appliance: "Kipas Angin",
    createdAt: "2026-11-18T11:15:30+07:00",
  },
  {
    voltage: 220.5,
    power: 130.0,
    relayStatus: true,
    appliance: "Kulkas/TV",
    createdAt: "2026-11-18T11:16:00+07:00",
  },
  {
    voltage: 220.2,
    power: 145.0,
    relayStatus: true,
    appliance: "Kulkas/TV",
    createdAt: "2026-11-18T11:16:30+07:00",
  },
  {
    voltage: 219.4,
    power: 320.0,
    relayStatus: true,
    appliance: "Setrika/Pemanas",
    createdAt: "2026-11-18T11:17:00+07:00",
  },
  {
    voltage: 219.9,
    power: 310.0,
    relayStatus: true,
    appliance: "Setrika/Pemanas",
    createdAt: "2026-11-18T11:17:30+07:00",
  },
  {
    voltage: 220.0,
    power: 65.0,
    relayStatus: true,
    appliance: "Kipas Angin",
    createdAt: "2026-11-18T11:18:00+07:00",
  },
];

// =============================================================
// Helper Components
// =============================================================
function ApplianceBadge({
  appliance,
  size = "sm",
}: {
  appliance: string;
  size?: "sm" | "md";
}) {
  const normalized = appliance.toLowerCase();

  let icon = <Cpu className={size === "md" ? "w-4 h-4" : "w-3.5 h-3.5"} />;
  let style = "bg-zinc-800/80 text-zinc-300 border-zinc-700/70";

  if (normalized.includes("kipas")) {
    icon = <Wind className={size === "md" ? "w-4 h-4" : "w-3.5 h-3.5"} />;
    style = "bg-sky-500/10 text-sky-300 border-sky-500/25";
  } else if (normalized.includes("kulkas") || normalized.includes("tv")) {
    icon = <Tv className={size === "md" ? "w-4 h-4" : "w-3.5 h-3.5"} />;
    style = "bg-indigo-500/10 text-indigo-300 border-indigo-500/25";
  } else if (normalized.includes("setrika") || normalized.includes("pemanas")) {
    icon = <Flame className={size === "md" ? "w-4 h-4" : "w-3.5 h-3.5"} />;
    style = "bg-amber-500/10 text-amber-300 border-amber-500/25";
  } else if (normalized.includes("standby") || normalized.includes("off")) {
    icon = <Power className={size === "md" ? "w-4 h-4" : "w-3.5 h-3.5"} />;
    style = "bg-zinc-900 text-zinc-400 border-zinc-800";
  } else {
    icon = <Zap className={size === "md" ? "w-4 h-4" : "w-3.5 h-3.5"} />;
    style = "bg-emerald-500/10 text-emerald-300 border-emerald-500/25";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium ${style} ${size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]"
        }`}
    >
      {icon}
      <span>{appliance}</span>
    </span>
  );
}

function CustomChartTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;

  return (
    <div className="bg-[#111114]/95 backdrop-blur-md border border-zinc-800 rounded-xl p-3 shadow-2xl min-w-[190px]">
      <div className="flex items-center justify-between gap-4 pb-2 mb-2 border-b border-zinc-800/80">
        <span className="text-[11px] font-mono text-zinc-400">{point.fullTime}</span>
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
          TELEMETRY
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-zinc-400">Daya Aktif</span>
          <span className="text-sm font-mono font-semibold text-white tabular-nums">
            {point.power.toFixed(1)} W
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-zinc-400">Tegangan / Arus</span>
          <span className="text-xs font-mono text-zinc-300 tabular-nums">
            {point.voltage.toFixed(1)}V · {point.current.toFixed(2)}A
          </span>
        </div>
      </div>

      <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">NILM</span>
        <ApplianceBadge appliance={point.appliance} size="sm" />
      </div>
    </div>
  );
}

// =============================================================
// Main Dashboard Component
// =============================================================
export default function SmartEnergyDashboard() {
  const [deviceId] = useState<string>("esp32-01");
  const [device, setDevice] = useState<DeviceData>({
    deviceId: "esp32-01",
    name: "Stopkontak Cerdas Lab (ESP32)",
    maxPowerLimit: 500,
    relayStatus: true,
    latestTelemetry: INITIAL_DEMO_DATA[INITIAL_DEMO_DATA.length - 1],
    history: INITIAL_DEMO_DATA,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  // Null on SSR so server & client initial HTML match 100%
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [statusNote, setStatusNote] = useState("Menghubungkan ke node telemetri...");
  const [range, setRange] = useState<RangeKey>("15m");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("day");

  // Slide-over Test Bench Drawer
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simPower, setSimPower] = useState(120);
  const [simVoltage, setSimVoltage] = useState(220);
  const [isInjecting, setIsInjecting] = useState(false);
  const [injectSuccess, setInjectSuccess] = useState(false);

  // Settings Modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsName, setSettingsName] = useState("");
  const [settingsLimit, setSettingsLimit] = useState(500);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<"success" | "error" | null>(
    null
  );

  // =========================================================
  // Data Fetching
  // =========================================================
  const fetchDeviceStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/devices/${deviceId}/status?range=${range}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.device) {
        setDevice(data.device);
        setIsLiveConnected(true);
        setStatusNote("Sinkronisasi PostgreSQL & ESP32 aktif");
      }
    } catch {
      setIsLiveConnected(false);
      setStatusNote("Mode fallback lokal (database offline)");
    } finally {
      setIsLoading(false);
      setLastUpdated(new Date());
    }
  }, [deviceId, range]);

  useEffect(() => {
    fetchDeviceStatus();
    if (!autoRefresh) return;
    const interval = setInterval(fetchDeviceStatus, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchDeviceStatus]);

  // =========================================================
  // Actions
  // =========================================================
  const handleToggleRelay = async () => {
    const nextStatus = !device.relayStatus;
    setIsToggling(true);
    try {
      const res = await fetch(`/api/devices/${deviceId}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relay_status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setDevice((prev) => ({ ...prev, relayStatus: data.relay_status }));
      } else {
        throw new Error("toggle failed");
      }
    } catch {
      setDevice((prev) => ({ ...prev, relayStatus: nextStatus }));
    } finally {
      setIsToggling(false);
      setLastUpdated(new Date());
    }
  };

  const handleInjectTelemetry = async () => {
    setIsInjecting(true);
    setInjectSuccess(false);
    try {
      const res = await fetch(`/api/telemetry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: deviceId,
          voltage: simVoltage,
          power: simPower,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setInjectSuccess(true);
        setTimeout(() => setInjectSuccess(false), 2500);
        await fetchDeviceStatus();
      } else {
        throw new Error("Fallback local simulation");
      }
    } catch {
      const nowIso = new Date().toISOString();
      const fallbackAppliance =
        simPower <= 15
          ? "Standby/Off"
          : simPower < 40
            ? "Beban Rendah"
            : simPower <= 90
              ? "Kipas Angin"
              : simPower <= 250
                ? "Kulkas/TV"
                : "Setrika/Pemanas";

      const newItem: TelemetryItem = {
        voltage: simVoltage,
        power: simPower,
        relayStatus: simPower <= device.maxPowerLimit ? device.relayStatus : false,
        appliance: fallbackAppliance,
        createdAt: nowIso,
      };

      setDevice((prev) => ({
        ...prev,
        relayStatus: newItem.relayStatus,
        latestTelemetry: newItem,
        history: [...prev.history.slice(-80), newItem],
      }));
      setInjectSuccess(true);
      setTimeout(() => setInjectSuccess(false), 2500);
    } finally {
      setIsInjecting(false);
      setLastUpdated(new Date());
    }
  };

  const openSettings = () => {
    setSettingsName(device.name || "");
    setSettingsLimit(device.maxPowerLimit);
    setSettingsFeedback(null);
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    setSettingsFeedback(null);

    const cleanName = settingsName.trim();
    const cleanLimit = Math.max(
      50,
      Math.min(5000, Math.round(Number(settingsLimit) || 500))
    );

    try {
      const res = await fetch(`/api/devices/${deviceId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, maxPowerLimit: cleanLimit }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.device) {
        setDevice((prev) => ({
          ...prev,
          name: data.device.name ?? cleanName,
          maxPowerLimit: data.device.maxPowerLimit ?? cleanLimit,
        }));
      } else {
        setDevice((prev) => ({
          ...prev,
          name: cleanName,
          maxPowerLimit: cleanLimit,
        }));
      }
      setSettingsFeedback("success");
      setTimeout(() => setIsSettingsOpen(false), 650);
    } catch {
      setDevice((prev) => ({
        ...prev,
        name: cleanName,
        maxPowerLimit: cleanLimit,
      }));
      setSettingsFeedback("success");
      setTimeout(() => setIsSettingsOpen(false), 650);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // =========================================================
  // Derived Telemetry & Analytics
  // =========================================================
  const currentReading =
    device.latestTelemetry || INITIAL_DEMO_DATA[INITIAL_DEMO_DATA.length - 1];

  const isOverload = currentReading.power > device.maxPowerLimit;
  const loadRatioPercent = Math.min(
    100,
    Math.max(0, (currentReading.power / Math.max(1, device.maxPowerLimit)) * 100)
  );
  const rawLoadPercent =
    (currentReading.power / Math.max(1, device.maxPowerLimit)) * 100;
  const isNearLimit = !isOverload && rawLoadPercent >= 80;

  const currentAmps = currentReading.power / Math.max(1, currentReading.voltage);

  const biayaPerHour = (currentReading.power / 1000) * TARIF_PLN_PER_KWH;
  const biayaPerDay = biayaPerHour * 24;
  const biayaPerMonth = biayaPerDay * 30;

  const activeBillingDisplay = useMemo(() => {
    if (billingPeriod === "hour") {
      return {
        label: "Estimasi per Jam",
        value: `Rp ${biayaPerHour.toLocaleString("id-ID", {
          maximumFractionDigits: 0,
        })}`,
        sub: `${(currentReading.power / 1000).toFixed(3)} kWh / jam`,
      };
    }
    if (billingPeriod === "month") {
      return {
        label: "Proyeksi 30 Hari",
        value: `Rp ${biayaPerMonth.toLocaleString("id-ID", {
          maximumFractionDigits: 0,
        })}`,
        sub: `${((currentReading.power / 1000) * 720).toFixed(1)} kWh / bulan`,
      };
    }
    return {
      label: "Proyeksi 24 Jam",
      value: `Rp ${biayaPerDay.toLocaleString("id-ID", {
        maximumFractionDigits: 0,
      })}`,
      sub: `${((currentReading.power / 1000) * 24).toFixed(2)} kWh / hari`,
    };
  }, [billingPeriod, biayaPerHour, biayaPerDay, biayaPerMonth, currentReading.power]);

  const chartData: ChartPoint[] = useMemo(() => {
    const raw = device.history.length > 0 ? device.history : INITIAL_DEMO_DATA;
    // Only filter by Date.now() after client hydration (when lastUpdated is set)
    const filtered = lastUpdated
      ? raw.filter(
        (item) =>
          new Date(item.createdAt).getTime() >=
          lastUpdated.getTime() - RANGE_MS[range]
      )
      : raw;
    const finalData = filtered.length > 0 ? filtered : raw.slice(-15);

    return finalData.map((item, idx) => {
      const dateObj = new Date(item.createdAt);
      const timeStr =
        dateObj.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "Asia/Jakarta",
        }) || `#${idx + 1}`;

      return {
        time: timeStr,
        fullTime: dateObj.toLocaleString("id-ID", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "Asia/Jakarta",
        }),
        power: item.power,
        voltage: item.voltage,
        current: item.power / Math.max(1, item.voltage),
        appliance: item.appliance || "Standby / Off",
      };
    });
  }, [device.history, range, lastUpdated]);

  const chartStats = useMemo(() => {
    if (chartData.length === 0) return { peak: 0, avg: 0 };
    const powers = chartData.map((d) => d.power);
    const peak = Math.max(...powers);
    const avg = powers.reduce((acc, v) => acc + v, 0) / powers.length;
    return { peak, avg };
  }, [chartData]);

  // NILM appliance distribution across current history window
  const applianceDistribution = useMemo(() => {
    if (chartData.length === 0) return [];
    const counts: Record<string, number> = {};
    for (const row of chartData) {
      const key = row.appliance || "Standby / Off";
      counts[key] = (counts[key] || 0) + 1;
    }
    const total = chartData.length;
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        percent: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 3);
  }, [chartData]);

  // =========================================================
  // Render
  // =========================================================
  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 font-sans antialiased selection:bg-sky-500/30">
      {/* ====== TOP BAR ====== */}
      <header className="sticky top-0 z-30 bg-[#09090B]/90 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-sky-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-[15px] font-semibold tracking-tight text-zinc-100 truncate">
                  {device.name || "Smart Energy Meter"}
                </h1>
                <span className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                  {device.deviceId}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                <span className="truncate">{statusNote}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Live Indicator */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-medium ${isLiveConnected
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                : "bg-amber-500/10 border-amber-500/25 text-amber-400"
                }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${isLiveConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                  }`}
              />
              {isLiveConnected ? "LIVE" : "SIM"}
            </div>

            {/* Auto-refresh Toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono border transition ${autoRefresh
                ? "bg-zinc-900 border-zinc-700/80 text-zinc-200"
                : "bg-zinc-950 border-zinc-800/80 text-zinc-500 hover:text-zinc-300"
                }`}
              title="Toggle polling interval 3 detik"
            >
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">{autoRefresh ? "3s" : "Off"}</span>
            </button>

            {/* Manual Refresh */}
            <button
              onClick={fetchDeviceStatus}
              disabled={isLoading}
              className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition disabled:opacity-50"
              title="Sinkronkan sekarang"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin text-sky-400" : ""}`}
              />
            </button>

            {/* Simulator Drawer Trigger */}
            <button
              onClick={() => setIsSimulatorOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-xs font-medium text-zinc-200 transition"
            >
              <Terminal className="w-3.5 h-3.5 text-sky-400" />
              <span>Test Bench</span>
            </button>

            {/* Settings */}
            <button
              onClick={openSettings}
              className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition"
              title="Konfigurasi batas daya"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ====== MAIN WORKSPACE ====== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Overload Critical Alert */}
        {isOverload && (
          <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-500/15 text-red-400 shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase bg-red-500 text-white rounded">
                    HARD-CUTOFF TRIPPED
                  </span>
                  <h2 className="text-sm font-semibold text-red-200">
                    Beban Daya Melebihi Batas Proteksi
                  </h2>
                </div>
                <p className="text-xs text-red-300/80 mt-1">
                  Tercatat{" "}
                  <span className="font-mono font-semibold text-red-200">
                    {currentReading.power.toFixed(1)} W
                  </span>{" "}
                  dari ambang maksimal{" "}
                  <span className="font-mono font-semibold text-red-200">
                    {device.maxPowerLimit} W
                  </span>
                  . Relay fisik otomatis memutus aliran listrik.
                </p>
              </div>
            </div>

            <button
              onClick={openSettings}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-xs font-medium text-red-200 transition self-start sm:self-center"
            >
              Ubah Limit ({device.maxPowerLimit}W)
            </button>
          </div>
        )}

        {/* ====== ASYMMETRIC BENTO GRID ====== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* HERO CARD (7 Cols): Live Power Telemetry & Hardware Relay Control */}
          <section className="lg:col-span-7 bg-[#111114] border border-zinc-800/80 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              {/* Top Row */}
              <div className="flex items-center justify-between gap-2 mb-6">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Beban Daya Real-Time
                  </span>
                </div>
                <span
                  suppressHydrationWarning
                  className="text-[11px] font-mono text-zinc-500"
                >
                  Update{" "}
                  {lastUpdated
                    ? lastUpdated.toLocaleTimeString("id-ID", {
                      timeZone: "Asia/Jakarta",
                    })
                    : "--:--:--"}
                </span>
              </div>

              {/* Primary Wattage Display */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-baseline gap-2.5">
                    <span
                      className={`text-5xl sm:text-6xl font-bold font-mono tracking-tight tabular-nums ${isOverload
                        ? "text-red-400"
                        : isNearLimit
                          ? "text-amber-300"
                          : "text-white"
                        }`}
                    >
                      {currentReading.power.toFixed(1)}
                    </span>
                    <span className="text-lg font-mono font-medium text-zinc-500">
                      WATT
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1.5">
                    Utilisasi{" "}
                    <span className="font-mono font-medium text-zinc-200">
                      {rawLoadPercent.toFixed(1)}%
                    </span>{" "}
                    dari kapasitas maksimal{" "}
                    <button
                      onClick={openSettings}
                      className="font-mono text-sky-400 hover:underline inline-flex items-center gap-0.5"
                    >
                      {device.maxPowerLimit}W
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </p>
                </div>

                {/* Hardware Relay Pill + Action */}
                <div className="flex items-center gap-2.5 bg-zinc-950/90 border border-zinc-800/90 p-2 rounded-xl">
                  <div className="px-2">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                      Sirkuit Relay
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {device.relayStatus ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-xs font-semibold text-emerald-400">
                            TERHUBUNG
                          </span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                          <span className="text-xs font-semibold text-red-400">
                            TERPUTUS
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleToggleRelay}
                    disabled={isToggling}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 ${device.relayStatus
                      ? "bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30"
                      : "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30"
                      }`}
                  >
                    <Power
                      className={`w-3.5 h-3.5 ${isToggling ? "animate-spin" : ""}`}
                    />
                    {isToggling
                      ? "Proses..."
                      : device.relayStatus
                        ? "Matikan"
                        : "Nyalakan"}
                  </button>
                </div>
              </div>

              {/* Dynamic Proportional Load Meter */}
              <div className="space-y-2 mb-6">
                <div className="h-3 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/90 p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${isOverload
                      ? "bg-red-500"
                      : isNearLimit
                        ? "bg-amber-400"
                        : "bg-sky-400"
                      }`}
                    style={{ width: `${loadRatioPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                  <span>0 W</span>
                  <span>50% ({Math.round(device.maxPowerLimit * 0.5)} W)</span>
                  <span className={isOverload ? "text-red-400 font-semibold" : ""}>
                    LIMIT {device.maxPowerLimit} W
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Electrical Metrics Strip */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-zinc-800/80">
              <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-xl px-3.5 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                  Tegangan RMS
                </div>
                <div className="text-base sm:text-lg font-mono font-semibold text-zinc-100 tabular-nums mt-0.5">
                  {currentReading.voltage.toFixed(1)}{" "}
                  <span className="text-xs font-normal text-zinc-500">V</span>
                </div>
              </div>

              <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-xl px-3.5 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                  Arus Beban
                </div>
                <div className="text-base sm:text-lg font-mono font-semibold text-zinc-100 tabular-nums mt-0.5">
                  {currentAmps.toFixed(2)}{" "}
                  <span className="text-xs font-normal text-zinc-500">A</span>
                </div>
              </div>

              <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-xl px-3.5 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                  Puncak ({RANGE_LABEL[range]})
                </div>
                <div className="text-base sm:text-lg font-mono font-semibold text-zinc-100 tabular-nums mt-0.5">
                  {chartStats.peak.toFixed(0)}{" "}
                  <span className="text-xs font-normal text-zinc-500">W</span>
                </div>
              </div>
            </div>
          </section>

          {/* SECONDARY STACKED CARDS (5 Cols): NILM Profiling + PLN Tariff */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* Card A: AI NILM Appliance Profiling */}
            <section className="bg-[#111114] border border-zinc-800/80 rounded-2xl p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                      AI NILM Appliance Profiling
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    INFERENCE AKTIF
                  </span>
                </div>

                {/* Active Appliance Highlight */}
                <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] text-zinc-500 mb-1">
                      Beban Dominan Terdeteksi
                    </div>
                    <div className="text-lg font-semibold text-white">
                      {currentReading.appliance || "Standby / Off"}
                    </div>
                  </div>
                  <ApplianceBadge
                    appliance={currentReading.appliance || "Standby / Off"}
                    size="md"
                  />
                </div>
              </div>

              {/* Distribution Breakdown across selected window */}
              <div className="mt-4 pt-3.5 border-t border-zinc-800/80">
                <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-2">
                  <span>Distribusi Deteksi ({RANGE_LABEL[range]})</span>
                  <span className="font-mono">{chartData.length} sampel</span>
                </div>
                <div className="space-y-2">
                  {applianceDistribution.map((item) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-300 truncate">{item.name}</span>
                        <span className="font-mono text-zinc-400 tabular-nums">
                          {item.percent}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-400/80 rounded-full transition-all duration-500"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Card B: Estimasi Biaya Listrik PLN */}
            <section className="bg-[#111114] border border-zinc-800/80 rounded-2xl p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Estimasi Tarif PLN
                  </span>
                </div>

                {/* Period Switcher */}
                <div className="inline-flex bg-zinc-950 border border-zinc-800 rounded-lg p-0.5">
                  {(
                    [
                      { key: "hour", label: "Jam" },
                      { key: "day", label: "Hari" },
                      { key: "month", label: "Bulan" },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setBillingPeriod(tab.key)}
                      className={`px-2 py-1 text-[10px] font-medium rounded-md transition ${billingPeriod === tab.key
                        ? "bg-zinc-800 text-amber-300"
                        : "text-zinc-500 hover:text-zinc-300"
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-baseline justify-between gap-2 mt-2">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-white tabular-nums">
                    {activeBillingDisplay.value}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    {activeBillingDisplay.label} ·{" "}
                    <span className="font-mono text-zinc-400">
                      {activeBillingDisplay.sub}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 border border-zinc-800/80 px-2 py-1 rounded">
                  Rp 1.444,7/kWh
                </span>
              </div>
            </section>
          </div>
        </div>

        {/* ====== TIME-SERIES TELEMETRY CHART ====== */}
        <section className="bg-[#111114] border border-zinc-800/80 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-400" />
                <h2 className="text-sm font-semibold text-white">
                  Profil Konsumsi Daya & Batas Proteksi
                </h2>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {RANGE_FULL_LABEL[range]} · Rata-rata{" "}
                <span className="font-mono text-zinc-300">
                  {chartStats.avg.toFixed(1)} W
                </span>{" "}
                · Hard-cutoff{" "}
                <span className="font-mono text-red-400">{device.maxPowerLimit} W</span>
              </p>
            </div>

            {/* Range Filter */}
            <div className="inline-flex bg-zinc-950 border border-zinc-800 rounded-lg p-1 self-start sm:self-auto">
              {(Object.keys(RANGE_MS) as RangeKey[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1 text-xs font-mono font-medium rounded-md transition ${range === r
                    ? "bg-zinc-800 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                  {RANGE_LABEL[r]}
                </button>
              ))}
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-sm text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
              <p>Belum ada rekaman telemetri pada rentang {RANGE_FULL_LABEL[range]}.</p>
              <button
                onClick={() => setIsSimulatorOpen(true)}
                className="mt-2 text-xs text-sky-400 hover:underline"
              >
                Buka Test Bench untuk injeksi data simulasi
              </button>
            </div>
          ) : (
            <div className="w-full h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 12, right: 12, left: -16, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="powerAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#27272a"
                    strokeOpacity={0.5}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    minTickGap={45}
                  />
                  <YAxis
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={[
                      0,
                      (dataMax: number) =>
                        Math.ceil(Math.max(dataMax, device.maxPowerLimit) * 1.15),
                    ]}
                    tickFormatter={(v: number) => `${v}W`}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <ReferenceLine
                    y={device.maxPowerLimit}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `MAX ${device.maxPowerLimit}W`,
                      fill: "#f87171",
                      fontSize: 10,
                      fontFamily: "monospace",
                      position: "insideTopRight",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="power"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#powerAreaGrad)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* ====== TELEMETRY AUDIT LOG TABLE ====== */}
        <section className="bg-[#111114] border border-zinc-800/80 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-white">Log Audit Telemetri</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Menampilkan {Math.min(8, chartData.length)} pembacaan terbaru
              </p>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">
              NODE: {device.deviceId}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-zinc-950/80 border-b border-zinc-800/80">
                <tr className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  <th className="text-left py-3 px-4 font-medium">Timestamp</th>
                  <th className="text-left py-3 px-4 font-medium">Tegangan</th>
                  <th className="text-left py-3 px-4 font-medium">Arus</th>
                  <th className="text-left py-3 px-4 font-medium">Daya Aktif</th>
                  <th className="text-left py-3 px-4 font-medium">Klasifikasi NILM</th>
                  <th className="text-left py-3 px-4 font-medium">Proteksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {chartData
                  .slice(-8)
                  .reverse()
                  .map((row, idx) => {
                    const rowOverload = row.power > device.maxPowerLimit;
                    return (
                      <tr
                        key={`${row.time}-${idx}`}
                        className="hover:bg-zinc-900/40 transition-colors"
                      >
                        <td className="py-3 px-4 text-zinc-400 font-mono whitespace-nowrap">
                          {row.time}
                        </td>
                        <td className="py-3 px-4 text-zinc-300 font-mono tabular-nums whitespace-nowrap">
                          {row.voltage.toFixed(1)} V
                        </td>
                        <td className="py-3 px-4 text-zinc-400 font-mono tabular-nums whitespace-nowrap">
                          {row.current.toFixed(2)} A
                        </td>
                        <td
                          className={`py-3 px-4 font-mono font-semibold tabular-nums whitespace-nowrap ${rowOverload ? "text-red-400" : "text-zinc-100"
                            }`}
                        >
                          {row.power.toFixed(1)} W
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <ApplianceBadge appliance={row.appliance} size="sm" />
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${rowOverload
                              ? "bg-red-500/10 text-red-400 border border-red-500/25"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                              }`}
                          >
                            {rowOverload ? "TRIPPED" : "NORMAL"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* ====== SLIDE-OVER TEST BENCH DRAWER ====== */}
      {isSimulatorOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-xs"
          onClick={() => setIsSimulatorOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Hardware Telemetry Simulator"
        >
          <div
            className="w-full max-w-md bg-[#111114] border-l border-zinc-800 h-full flex flex-col justify-between shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20">
                    <Sliders className="w-4 h-4 text-sky-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Hardware Test Bench
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-mono">
                      POST /api/telemetry
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSimulatorOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-6 space-y-6">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Simulasikan paket telemetri dari node{" "}
                  <span className="font-mono text-zinc-200">{deviceId}</span> untuk
                  menguji klasifikasi AI NILM dan proteksi{" "}
                  <span className="font-mono text-zinc-200">hard-cutoff</span> tanpa
                  perangkat fisik.
                </p>

                {/* Power Slider */}
                <div className="space-y-2.5 bg-zinc-950 border border-zinc-800/90 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-zinc-300">
                      Simulasi Daya Beban
                    </label>
                    <span
                      className={`text-base font-mono font-bold tabular-nums ${simPower > device.maxPowerLimit ? "text-red-400" : "text-sky-400"
                        }`}
                    >
                      {simPower} W
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={1000}
                    step={5}
                    value={simPower}
                    onChange={(e) => setSimPower(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-sky-400"
                  />

                  <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                    <span>0 W</span>
                    <span>Limit: {device.maxPowerLimit} W</span>
                    <span>1000 W</span>
                  </div>
                </div>

                {/* Voltage Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400 block">
                    Tegangan Jala-Jala (Volt)
                  </label>
                  <input
                    type="number"
                    min={180}
                    max={250}
                    step={0.5}
                    value={simVoltage}
                    onChange={(e) => setSimVoltage(Number(e.target.value) || 220)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Quick Appliance Presets */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-zinc-400 block">
                    Preset Profil Beban NILM
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Standby / Off", watt: 8, danger: false },
                      { label: "Kipas Angin", watt: 55, danger: false },
                      { label: "Kulkas / TV", watt: 160, danger: false },
                      { label: "Setrika Listrik", watt: 380, danger: false },
                      {
                        label: "Trigger Overload",
                        watt: device.maxPowerLimit + 120,
                        danger: true,
                      },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => setSimPower(preset.watt)}
                        className={`px-3 py-2 rounded-lg text-left border transition flex items-center justify-between ${preset.danger
                          ? "col-span-2 bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/15"
                          : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                          }`}
                      >
                        <span className="text-xs font-medium">{preset.label}</span>
                        <span className="text-[11px] font-mono opacity-80">
                          {preset.watt}W
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {injectSuccess && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Paket telemetri berhasil dikirim dan diproses.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-6 border-t border-zinc-800 bg-zinc-950/50">
              <button
                onClick={handleInjectTelemetry}
                disabled={isInjecting}
                className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Send className={`w-3.5 h-3.5 ${isInjecting ? "animate-pulse" : ""}`} />
                {isInjecting ? "Mengirim Paket..." : `Kirim Payload (${simPower} W)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== SETTINGS MODAL ====== */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
          onClick={() => !isSavingSettings && setIsSettingsOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md bg-[#111114] border border-zinc-800 rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-semibold text-white">
                  Konfigurasi Perangkat
                </h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                disabled={isSavingSettings}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  Label Perangkat
                </label>
                <input
                  type="text"
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  placeholder="Contoh: Stopkontak Lab IoT"
                  maxLength={80}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-sky-500 transition"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  Batas Proteksi Hard-Cutoff (Watt)
                </label>
                <input
                  type="number"
                  min={50}
                  max={5000}
                  step={10}
                  value={settingsLimit}
                  onChange={(e) => setSettingsLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-sky-500 transition"
                />

                {/* Quick MCB Presets */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[300, 500, 900, 1300, 2200].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setSettingsLimit(w)}
                      className={`px-2 py-1 rounded text-[11px] font-mono border transition ${settingsLimit === w
                        ? "bg-sky-500/15 border-sky-500/40 text-sky-300"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                        }`}
                    >
                      {w}W
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">
                  Relay fisik akan otomatis memutus arus jika daya melewati batas ini
                  (rentang valid: 50 – 5000 W).
                </p>
              </div>

              {settingsFeedback === "success" && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Konfigurasi berhasil diperbarui
                </div>
              )}
            </div>

            <div className="p-5 border-t border-zinc-800 flex gap-2.5">
              <button
                onClick={() => setIsSettingsOpen(false)}
                disabled={isSavingSettings}
                className="flex-1 py-2 rounded-lg border border-zinc-800 text-xs font-medium text-zinc-300 hover:bg-zinc-900 transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="flex-1 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-xs font-bold text-zinc-950 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                <Save className={`w-3.5 h-3.5 ${isSavingSettings ? "animate-pulse" : ""}`} />
                {isSavingSettings ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}