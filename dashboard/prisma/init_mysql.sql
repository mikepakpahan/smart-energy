-- Inisialisasi Database MySQL untuk Smart Energy Meter (NILM)
CREATE DATABASE IF NOT EXISTS smart_energy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_energy_db;

CREATE TABLE IF NOT EXISTS devices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NULL,
  max_power_limit INT NOT NULL DEFAULT 500,
  relay_status BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- Seed default device jika belum ada
INSERT INTO devices (id, name, location, max_power_limit, relay_status)
SELECT 1, 'Stopkontak Utama (Lab IoT)', 'Laboratorium Sistem Mikrokontroler', 500, 1
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE id = 1);

-- AUTO-PRUNING: MySQL Event Scheduler (Membersihkan data > 7 hari setiap hari)
SET GLOBAL event_scheduler = ON;

CREATE EVENT IF NOT EXISTS auto_prune_telemetries
ON SCHEDULE EVERY 1 DAY
COMMENT 'Pembersihan otomatis data telemetri yang lebih tua dari 7 hari'
DO
  DELETE FROM telemetries 
  WHERE recorded_at < NOW() - INTERVAL 7 DAY;
