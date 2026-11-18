import fs from 'fs';
import path from 'path';
import { Device, Telemetry, DeviceStats } from '@/types/energy';
import { classifyAppliance } from './nilm';

const DATA_DIR = path.join(process.cwd(), '.data');
const STORE_FILE = path.join(DATA_DIR, 'energy-store.json');

// Tarif Dasar Listrik PLN Golongan R-1/TR (1300 VA - 2200 VA) per kWh (Rp)
const TARIF_PLN_PER_KWH = 1444.70;

interface StoreData {
  devices: Device[];
  telemetries: Telemetry[];
  nextTelemetryId: number;
}

// In-Memory cache fallback & persistence
class EnergyDatabase {
  private store: StoreData;
  private initialized: boolean = false;

  constructor() {
    this.store = this.loadInitialStore();
  }

  private ensureDataDir() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch {
      // Ignore if cannot write to disk, in-memory works fine
    }
  }

  private saveToDisk() {
    try {
      this.ensureDataDir();
      fs.writeFileSync(STORE_FILE, JSON.stringify(this.store, null, 2), 'utf-8');
    } catch {
      // In-memory will still function
    }
  }

  private generateSeedTelemetries(deviceId: number): Telemetry[] {
    const records: Telemetry[] = [];
    const now = Date.now();
    const intervalMs = 2000; // 2 detik per data sesuai PRD H-01
    const count = 30;

    // Pola simulasi beban: Standby -> Kipas Angin berputar -> Sedikit fluktuasi
    let currentPower = 12.0;

    for (let i = count - 1; i >= 0; i--) {
      const timestamp = new Date(now - i * intervalMs).toISOString();

      if (i > 20) {
        currentPower = 10 + Math.random() * 4; // Idle / Charger
      } else if (i > 10) {
        currentPower = 48 + Math.random() * 6; // Kipas Angin
      } else {
        currentPower = 52 + Math.sin(i) * 5; // Kipas Angin stabil
      }

      const voltage = +(220 + (Math.random() * 2 - 1)).toFixed(2);
      const power = +currentPower.toFixed(2);
      const current = +(power / voltage).toFixed(3);
      const classification = classifyAppliance(power, power - 1, true);

      records.push({
        id: count - i,
        device_id: deviceId,
        voltage,
        power,
        current,
        detected_appliance: classification.detected_appliance,
        appliance_category: classification.category,
        confidence: classification.confidence,
        is_overload: power > 500,
        recorded_at: timestamp,
      });
    }

    return records;
  }

  private loadInitialStore(): StoreData {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const fileContent = fs.readFileSync(STORE_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        if (parsed.devices && parsed.telemetries) {
          return parsed;
        }
      }
    } catch {
      // Fallback to fresh seed
    }

    const defaultDevice: Device = {
      id: 1,
      name: 'Stopkontak Utama (Lab IoT)',
      location: 'Laboratorium Sistem Mikrokontroler',
      max_power_limit: 500, // Batas aman 500 Watt
      relay_status: true,   // ON
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const initialTelemetries = this.generateSeedTelemetries(defaultDevice.id);

    const initialData: StoreData = {
      devices: [defaultDevice],
      telemetries: initialTelemetries,
      nextTelemetryId: initialTelemetries.length + 1,
    };

    try {
      this.ensureDataDir();
      fs.writeFileSync(STORE_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    } catch {}

    return initialData;
  }

  public getDevice(id: number): Device | null {
    return this.store.devices.find((d) => d.id === id) || null;
  }

  public getAllDevices(): Device[] {
    return this.store.devices;
  }

  public updateRelay(deviceId: number, relayStatus: boolean): Device | null {
    const device = this.getDevice(deviceId);
    if (!device) return null;

    device.relay_status = relayStatus;
    device.updated_at = new Date().toISOString();
    this.saveToDisk();
    return device;
  }

  public updateMaxLimit(deviceId: number, maxLimit: number): Device | null {
    const device = this.getDevice(deviceId);
    if (!device) return null;

    device.max_power_limit = maxLimit;
    device.updated_at = new Date().toISOString();
    this.saveToDisk();
    return device;
  }

  public addTelemetry(payload: {
    device_id: number;
    voltage: number;
    power: number;
    current?: number;
  }): { telemetry: Telemetry; device: Device; is_cutoff_triggered: boolean } {
    let device = this.getDevice(payload.device_id);
    if (!device) {
      // Auto-create default device if not exist
      device = {
        id: payload.device_id,
        name: `Stopkontak Device #${payload.device_id}`,
        max_power_limit: 500,
        relay_status: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.store.devices.push(device);
    }

    const voltage = +payload.voltage.toFixed(2);
    // Jika relay mati, daya yang mengalir ke stopkontak harus 0
    const power = device.relay_status ? +payload.power.toFixed(2) : 0;
    const current = payload.current !== undefined
      ? +payload.current.toFixed(3)
      : voltage > 0 ? +(power / voltage).toFixed(3) : 0;

    const recent = this.getRecentTelemetries(payload.device_id, 1);
    const prevPower = recent.length > 0 ? recent[0].power : power;

    const classification = classifyAppliance(power, prevPower, device.relay_status);
    const isOverload = power > device.max_power_limit;
    let isCutoffTriggered = false;

    // Hard-cutoff / Auto-protection: jika overload, saklar diputus otomatis
    if (isOverload && device.relay_status) {
      device.relay_status = false;
      device.updated_at = new Date().toISOString();
      isCutoffTriggered = true;
    }

    const newTelemetry: Telemetry = {
      id: this.store.nextTelemetryId++,
      device_id: payload.device_id,
      voltage,
      power,
      current,
      detected_appliance: classification.detected_appliance,
      appliance_category: classification.category,
      confidence: classification.confidence,
      is_overload: isOverload,
      recorded_at: new Date().toISOString(),
    };

    this.store.telemetries.push(newTelemetry);

    // Keep history manageable (last 300 records in storage)
    if (this.store.telemetries.length > 500) {
      this.store.telemetries = this.store.telemetries.slice(-300);
    }

    this.saveToDisk();

    return {
      telemetry: newTelemetry,
      device,
      is_cutoff_triggered: isCutoffTriggered,
    };
  }

  public getRecentTelemetries(deviceId: number, limit: number = 30): Telemetry[] {
    const list = this.store.telemetries.filter((t) => t.device_id === deviceId);
    return list.slice(-limit);
  }

  public getStats(deviceId: number): DeviceStats {
    const history = this.getRecentTelemetries(deviceId, 60);
    const latest = history[history.length - 1];

    if (!latest) {
      return {
        current_power: 0,
        current_voltage: 220,
        current_amperage: 0,
        peak_power_today: 0,
        avg_power_today: 0,
        energy_kwh: 0,
        cost_idr: 0,
        total_records: 0,
      };
    }

    let sumPower = 0;
    let peakPower = 0;

    history.forEach((t) => {
      sumPower += t.power;
      if (t.power > peakPower) peakPower = t.power;
    });

    const avgPower = +(sumPower / history.length).toFixed(2);
    
    // Perhitungan akumulasi energi: (avgPower * durasi estimasi jam) / 1000
    // Asumsi riwayat merepresentasikan 2 detik per poin data
    const durationHours = (history.length * 2) / 3600;
    const energyKwh = +((avgPower * durationHours) / 1000).toFixed(4);
    const costIdr = Math.round(energyKwh * TARIF_PLN_PER_KWH);

    return {
      current_power: latest.power,
      current_voltage: latest.voltage,
      current_amperage: latest.current,
      peak_power_today: peakPower,
      avg_power_today: avgPower,
      energy_kwh: Math.max(0.0125, energyKwh), // Minimal base nilai realistis demo
      cost_idr: Math.max(18, costIdr),
      total_records: history.length,
    };
  }

  public resetDemoData(deviceId: number = 1): void {
    const device = this.getDevice(deviceId);
    if (device) {
      device.relay_status = true;
      device.max_power_limit = 500;
    }
    this.store.telemetries = this.generateSeedTelemetries(deviceId);
    this.saveToDisk();
  }
}

// Global singleton instance for Next.js hot-reloads
declare global {
  var __energyDbInstance: EnergyDatabase | undefined;
}

export const db = global.__energyDbInstance || new EnergyDatabase();
if (process.env.NODE_ENV !== 'production') {
  global.__energyDbInstance = db;
}
