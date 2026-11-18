export interface Device {
  id: number;
  name: string;
  location?: string;
  max_power_limit: number; // Watt
  relay_status: boolean;   // true = ON, false = OFF
  created_at: string;
  updated_at: string;
}

export interface Telemetry {
  id: number;
  device_id: number;
  voltage: number;         // Volt (e.g. 220.5)
  power: number;           // Watt (e.g. 48.2)
  current: number;         // Ampere (e.g. 0.22)
  detected_appliance: string; // Klasifikasi AI NILM
  appliance_category?: string;
  confidence?: number;     // 0 - 100%
  is_overload: boolean;    // true jika power > max_power_limit
  recorded_at: string;     // ISO Timestamp
}

export interface ApplianceProfile {
  id: string;
  name: string;
  category: string;
  minWatt: number;
  maxWatt: number;
  typicalWatt: number;
  loadType: 'Resistif' | 'Induktif' | 'Elektronik / Switching' | 'Campuran';
  description: string;
}

export interface DeviceStats {
  current_power: number;
  current_voltage: number;
  current_amperage: number;
  peak_power_today: number;
  avg_power_today: number;
  energy_kwh: number;
  cost_idr: number;
  total_records: number;
}

export interface DeviceStatusResponse {
  device: Device;
  latest_telemetry: Telemetry | null;
  history: Telemetry[];
  stats: DeviceStats;
  alert: {
    is_overload: boolean;
    message: string | null;
    timestamp?: string;
  };
}
