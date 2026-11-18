import mysql from 'mysql2/promise';
import { Device, Telemetry, DeviceStats } from '@/types/energy';
import { classifyAppliance } from './nilm';

// Tarif Dasar Listrik PLN Golongan R-1/TR (1300 VA - 2200 VA) per kWh (Rp)
const TARIF_PLN_PER_KWH = 1444.70;

// Batas retensi standar data telemetri (hari)
const DEFAULT_RETENTION_DAYS = Number(process.env.RETENTION_DAYS) || 7;

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME || 'smart_energy_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export interface StorageHealthInfo {
  total_records: number;
  retention_days: number;
  oldest_record: string | null;
  newest_record: string | null;
  estimated_size_kb: number;
  auto_prune_status: string;
}

class MySQLDatabase {
  private isSeeded: boolean = false;
  private lastPruneTimestamp: number = 0;
  // Interval eksekusi auto-pruning otomatis di layer aplikasi (setiap 1 jam)
  private pruneIntervalMs: number = 60 * 60 * 1000;

  private async ensureTables() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS devices (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          location VARCHAR(255) NULL,
          max_power_limit INT NOT NULL DEFAULT 500,
          relay_status BOOLEAN NOT NULL DEFAULT TRUE,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS telemetries (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          device_id INT NOT NULL,
          voltage DECIMAL(6,2) NOT NULL,
          power DECIMAL(8,2) NOT NULL,
          current DECIMAL(6,3) NOT NULL,
          detected_appliance VARCHAR(150) NULL,
          appliance_category VARCHAR(100) NULL,
          confidence INT NULL DEFAULT 95,
          is_overload BOOLEAN NOT NULL DEFAULT FALSE,
          recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_device_recorded (device_id, recorded_at DESC),
          CONSTRAINT fk_telemetries_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      const [rows]: any = await pool.query('SELECT id FROM devices WHERE id = 1');
      if (rows.length === 0) {
        await pool.query(`
          INSERT INTO devices (id, name, location, max_power_limit, relay_status)
          VALUES (1, 'Stopkontak Utama (Lab IoT)', 'Laboratorium Sistem Mikrokontroler', 500, 1)
        `);
      }
    } catch (err) {
      console.error('Gagal memastikan skema tabel MySQL:', err);
    }
  }

  private async ensureSeedData(deviceId: number = 1) {
    if (this.isSeeded) return;
    try {
      await this.ensureTables();
      const [countRows]: any = await pool.query(
        'SELECT COUNT(*) as total FROM telemetries WHERE device_id = ?',
        [deviceId]
      );
      if (countRows[0]?.total === 0) {
        await this.generateSeedTelemetries(deviceId);
      }
      this.isSeeded = true;
    } catch {}
  }

  private async generateSeedTelemetries(deviceId: number) {
    const now = Date.now();
    const intervalMs = 2000;
    const count = 30;
    let currentPower = 12.0;

    for (let i = count - 1; i >= 0; i--) {
      const timestamp = new Date(now - i * intervalMs);
      const mysqlDate = timestamp.toISOString().slice(0, 19).replace('T', ' ');

      if (i > 20) {
        currentPower = 10 + Math.random() * 4;
      } else if (i > 10) {
        currentPower = 48 + Math.random() * 6;
      } else {
        currentPower = 52 + Math.sin(i) * 5;
      }

      const voltage = +(220 + (Math.random() * 2 - 1)).toFixed(2);
      const power = +currentPower.toFixed(2);
      const current = +(power / voltage).toFixed(3);
      const classification = classifyAppliance(power, power - 1, true);

      await pool.query(
        `INSERT INTO telemetries (device_id, voltage, power, current, detected_appliance, appliance_category, confidence, is_overload, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          deviceId,
          voltage,
          power,
          current,
          classification.detected_appliance,
          classification.category,
          classification.confidence,
          power > 500 ? 1 : 0,
          mysqlDate,
        ]
      );
    }
  }

  public async getDevice(id: number): Promise<Device | null> {
    await this.ensureSeedData(id);
    const [rows]: any = await pool.query('SELECT * FROM devices WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      location: row.location || undefined,
      max_power_limit: row.max_power_limit,
      relay_status: Boolean(row.relay_status),
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
    };
  }

  public async getAllDevices(): Promise<Device[]> {
    await this.ensureSeedData(1);
    const [rows]: any = await pool.query('SELECT * FROM devices ORDER BY id ASC');
    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      location: row.location || undefined,
      max_power_limit: row.max_power_limit,
      relay_status: Boolean(row.relay_status),
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
    }));
  }

  public async updateRelay(deviceId: number, relayStatus: boolean): Promise<Device | null> {
    await pool.query('UPDATE devices SET relay_status = ?, updated_at = NOW() WHERE id = ?', [
      relayStatus ? 1 : 0,
      deviceId,
    ]);
    return this.getDevice(deviceId);
  }

  public async updateMaxLimit(deviceId: number, maxLimit: number): Promise<Device | null> {
    await pool.query('UPDATE devices SET max_power_limit = ?, updated_at = NOW() WHERE id = ?', [
      maxLimit,
      deviceId,
    ]);
    return this.getDevice(deviceId);
  }

  /**
   * Fungsi Auto-Pruning:
   * Menghapus rekaman telemetri yang lebih tua dari batas retensi (default: 7 hari).
   * Mencegah database membengkak seiring aliran data 2 detik terus berjalan.
   */
  public async pruneOldTelemetries(retentionDays: number = DEFAULT_RETENTION_DAYS): Promise<{
    deletedRows: number;
    retentionDays: number;
    timestamp: string;
  }> {
    const days = Math.max(1, retentionDays);
    const [result]: any = await pool.query(
      'DELETE FROM telemetries WHERE recorded_at < NOW() - INTERVAL ? DAY',
      [days]
    );

    const deletedRows = Number(result?.affectedRows || 0);
    this.lastPruneTimestamp = Date.now();

    return {
      deletedRows,
      retentionDays: days,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Mengambil status statistik ukuran dan kesehatan tabel telemetri
   */
  public async getStorageHealth(deviceId: number = 1): Promise<StorageHealthInfo> {
    await this.ensureSeedData(deviceId);
    const [rows]: any = await pool.query(`
      SELECT 
        COUNT(*) as total_records,
        MIN(recorded_at) as oldest_record,
        MAX(recorded_at) as newest_record
      FROM telemetries
    `);

    const total = Number(rows[0]?.total_records || 0);
    // Rata-rata 1 baris telemetri InnoDB + index adalah ~200 bytes
    const estimatedKb = Math.round((total * 200) / 1024);

    return {
      total_records: total,
      retention_days: DEFAULT_RETENTION_DAYS,
      oldest_record: rows[0]?.oldest_record ? new Date(rows[0].oldest_record).toISOString() : null,
      newest_record: rows[0]?.newest_record ? new Date(rows[0].newest_record).toISOString() : null,
      estimated_size_kb: estimatedKb,
      auto_prune_status: 'Aktif (Otomatis pangkas data > 7 hari)',
    };
  }

  public async addTelemetry(payload: {
    device_id: number;
    voltage: number;
    power: number;
    current?: number;
  }): Promise<{ telemetry: Telemetry; device: Device; is_cutoff_triggered: boolean }> {
    let device = await this.getDevice(payload.device_id);
    if (!device) {
      await pool.query(
        'INSERT INTO devices (id, name, max_power_limit, relay_status) VALUES (?, ?, ?, ?)',
        [payload.device_id, `Stopkontak Device #${payload.device_id}`, 500, 1]
      );
      device = (await this.getDevice(payload.device_id))!;
    }

    const voltage = +payload.voltage.toFixed(2);
    const power = device.relay_status ? +payload.power.toFixed(2) : 0;
    const current = payload.current !== undefined
      ? +payload.current.toFixed(3)
      : voltage > 0 ? +(power / voltage).toFixed(3) : 0;

    const recent = await this.getRecentTelemetries(payload.device_id, 1);
    const prevPower = recent.length > 0 ? recent[0].power : power;

    const classification = classifyAppliance(power, prevPower, device.relay_status);
    const isOverload = power > device.max_power_limit;
    let isCutoffTriggered = false;

    if (isOverload && device.relay_status) {
      await pool.query('UPDATE devices SET relay_status = 0, updated_at = NOW() WHERE id = ?', [
        payload.device_id,
      ]);
      device.relay_status = false;
      isCutoffTriggered = true;
    }

    const recordedAt = new Date();
    const mysqlDate = recordedAt.toISOString().slice(0, 19).replace('T', ' ');

    const [insertResult]: any = await pool.query(
      `INSERT INTO telemetries (device_id, voltage, power, current, detected_appliance, appliance_category, confidence, is_overload, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.device_id,
        voltage,
        power,
        current,
        classification.detected_appliance,
        classification.category,
        classification.confidence,
        isOverload ? 1 : 0,
        mysqlDate,
      ]
    );

    // Cek berkala: Jika sudah melewati interval pruning (1 jam), jalankan auto-pruning di background
    const now = Date.now();
    if (now - this.lastPruneTimestamp > this.pruneIntervalMs) {
      this.lastPruneTimestamp = now;
      this.pruneOldTelemetries().catch((err) =>
        console.error('Auto-pruning background task error:', err)
      );
    }

    const newTelemetry: Telemetry = {
      id: insertResult.insertId,
      device_id: payload.device_id,
      voltage,
      power,
      current,
      detected_appliance: classification.detected_appliance,
      appliance_category: classification.category,
      confidence: classification.confidence,
      is_overload: isOverload,
      recorded_at: recordedAt.toISOString(),
    };

    return {
      telemetry: newTelemetry,
      device,
      is_cutoff_triggered: isCutoffTriggered,
    };
  }

  public async getRecentTelemetries(deviceId: number, limit: number = 30): Promise<Telemetry[]> {
    await this.ensureSeedData(deviceId);
    const [rows]: any = await pool.query(
      `SELECT * FROM (
        SELECT * FROM telemetries WHERE device_id = ? ORDER BY id DESC LIMIT ?
      ) sub ORDER BY id ASC`,
      [deviceId, limit]
    );

    return rows.map((row: any) => ({
      id: row.id,
      device_id: row.device_id,
      voltage: Number(row.voltage),
      power: Number(row.power),
      current: Number(row.current),
      detected_appliance: row.detected_appliance,
      appliance_category: row.appliance_category,
      confidence: row.confidence,
      is_overload: Boolean(row.is_overload),
      recorded_at: new Date(row.recorded_at).toISOString(),
    }));
  }

  public async getStats(deviceId: number): Promise<DeviceStats> {
    const history = await this.getRecentTelemetries(deviceId, 60);
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
    const durationHours = (history.length * 2) / 3600;
    const energyKwh = +((avgPower * durationHours) / 1000).toFixed(4);
    const costIdr = Math.round(energyKwh * TARIF_PLN_PER_KWH);

    return {
      current_power: latest.power,
      current_voltage: latest.voltage,
      current_amperage: latest.current,
      peak_power_today: peakPower,
      avg_power_today: avgPower,
      energy_kwh: Math.max(0.0125, energyKwh),
      cost_idr: Math.max(18, costIdr),
      total_records: history.length,
    };
  }

  public async resetDemoData(deviceId: number = 1): Promise<void> {
    await pool.query('UPDATE devices SET relay_status = 1, max_power_limit = 500 WHERE id = ?', [
      deviceId,
    ]);
    await pool.query('DELETE FROM telemetries WHERE device_id = ?', [deviceId]);
    await this.generateSeedTelemetries(deviceId);
  }
}

declare global {
  var __mySqlDbInstance: MySQLDatabase | undefined;
}

export const db = global.__mySqlDbInstance || new MySQLDatabase();
if (process.env.NODE_ENV !== 'production') {
  global.__mySqlDbInstance = db;
}
