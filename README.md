# ⚡ Smart Energy Meter & AI Appliance Profiling (NILM)

Sistem pemantauan energi listrik pintar (*Smart Energy Meter*) berbasis IoT dan Web Dashboard responsif dengan kecerdasan buatan terintegrasi (**NILM - Non-Intrusive Load Monitoring**). Sistem ini dirancang untuk membaca konsumsi listrik secara *real-time*, mengestimasi biaya PLN (Rp), memutus arus otomatis saat beban berlebih (*Auto Cut-off Overload Protection*), serta mendeteksi jenis peralatan listrik yang sedang aktif berdasarkan tanda khas konsumsi dayanya (*power signature*).

---

## 📑 Daftar Isi

- [Fungsi & Fitur Utama](#-fungsi--fitur-utama)
- [Antarmuka Dashboard](#-antarmuka-dashboard)
- [Struktur Folder Proyek](#-struktur-folder-proyek)
- [Arsitektur Database (MySQL 8.0)](#-arsitektur-database-mysql-80)
- [Mekanisme Auto-Pruning (Pencegahan Pembengkakan Database)](#-mekanisme-auto-pruning)
- [Dokumentasi REST API](#-dokumentasi-rest-api)
- [Panduan Menjalankan Sistem](#-panduan-menjalankan-sistem)
  - [Metode 1: Menggunakan Docker Compose (Direkomendasikan)](#metode-1-menggunakan-docker-compose-satu-klik)
  - [Metode 2: Menjalankan Manual (Host OS)](#metode-2-menjalankan-secara-manual-host-os)
- [Integrasi Mikrokontroler (ESP32 / Firmware)](#-integrasi-mikrokontroler-esp32)

---

## 🎯 Fungsi & Fitur Utama

1. **Pemantauan Real-Time 2 Detik:**
   - Menampilkan tegangan listrik (Volt), daya aktif (Watt), dan arus listrik (Ampere).
   - Menghitung akumulasi pemakaian energi listrik (kWh) dan estimasi tagihan PLN secara otomatis (berdasarkan tarif Golongan R-1/TR Rp 1.444,70/kWh).
2. **AI NILM Appliance Identification Engine:**
   - Mengklasifikasikan perangkat listrik yang sedang menyala secara instan tanpa perlu memasang sensor terpisah di tiap colokan.
   - Mampu mendeteksi berbagai profil beban: *Standby/Charger*, *Lampu LED*, *Kipas Angin*, *Laptop/Komputer*, *Kulkas / Kompresor*, *Rice Cooker / Pemanas*, *Setrika*, hingga *Dispenser / Pemanas Air*.
3. **Proteksi Cerdas Beban Berlebih (*Auto Cut-Off Protection*):**
   - Batas daya aman dapat diatur secara dinamis (misal: 500W, 900W, 1300W).
   - Apabila daya terdeteksi melampaui batas aman, backend dan dashboard secara instan memicu status darurat (*Overload Trigger*) dan memutus relay stopkontak untuk mencegah korsleting atau kebakaran.
4. **Simulator Telemetri IoT Terintegrasi:**
   - Dashboard dilengkapi panel simulator untuk menguji skenario beban (Standby, Beban Sedang, Beban Tinggi, Lonjakan Overload) tanpa memerlukan perangkat fisik mikrokontroler.

---

## 🖥️ Antarmuka Dashboard

Dashboard dirancang dengan filosofi **minimalis, elegan, dan informatif**:
- **Tema Dual Mode (Light & Dark):** Mendukung peralihan tema terang dan gelap yang tersimpan persisten di `localStorage`.
- **Desain Mobile-First & Responsif:** Navigasi ringkas berbasis *Segmented Control* (`Ringkasan`, `Riwayat AI`, `Simulator`) di layar smartphone.
- **Saklar Stopkontak Khas Apple iOS:** Terpasang permanen pada kartu ringkasan status utama agar pengguna selalu memiliki kendali manual stopkontak kapan pun.
- **Overload Banner Komparatif:** Menampilkan perbandingan 3 metrik penting saat kondisi darurat: *Daya Terbaca*, *Batas Maksimal*, dan *Kelebihan Beban*.

---

## 📁 Struktur Folder Proyek

```plaintext
smart-energy/
├── .env.docker.example         # Template konfigurasi environment untuk Docker Compose
├── .gitignore                  # Aturan file Git (mengabaikan dependensi & rahasia .env)
├── docker-compose.yml          # Stack produksi: Next.js Standalone + MySQL 8.0
├── docker-compose.dev.yml      # Stack pengembangan: Live Hot-Reloading bind mount
├── README.md                   # Dokumentasi teknis proyek
│
├── dashboard/                  # Aplikasi Web Dashboard (Next.js 16 + Tailwind CSS v4)
│   ├── .dockerignore           # Pengecualian build context Docker
│   ├── Dockerfile              # Multi-stage Dockerfile (Produksi ~73 MB compressed)
│   ├── Dockerfile.dev          # Dockerfile mode development (Hot-reload)
│   ├── .env.example            # Template kredensial database lokal
│   ├── next.config.ts          # Konfigurasi Next.js (Standalone output & Turbopack)
│   ├── package.json            # Manifest dependensi project
│   │
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # Backend REST API Endpoints
│   │   │   ├── devices/        # Endpoint data perangkat & kontrol relay
│   │   │   └── telemetry/      # Endpoint data telemetri, simulasi, & auto-prune
│   │   ├── globals.css         # Styling Tailwind v4 & CSS variables (Dark/Light)
│   │   ├── layout.tsx          # Root Layout & metadata
│   │   └── page.tsx            # Halaman Dashboard Utama
│   │
│   ├── components/             # Komponen UI Modular
│   │   ├── ApplianceCard.tsx   # Kartu identifikasi perangkat aktif AI NILM
│   │   ├── EnergyMetrics.tsx   # Kartu metrik tegangan, daya, kWh, dan biaya PLN
│   │   ├── IOSSwitch.tsx       # Komponen toggle switch animasi gaya iOS
│   │   ├── OverloadBanner.tsx  # Banner peringatan bahaya overload komparatif
│   │   ├── RealtimeChart.tsx   # Grafik riwayat time-series konsumsi daya
│   │   ├── SimulatorWidget.tsx # Panel simulator pengujian IoT & status penyimpanan
│   │   └── ThemeToggle.tsx     # Tombol switch Light / Dark mode
│   │
│   ├── lib/                    # Logika Inti & Driver
│   │   ├── db.ts               # Database Connection Pool (MySQL2) & Auto-Pruner
│   │   └── nilm.ts             # Algoritma Kecerdasan Buatan Profiler Beban (NILM)
│   │
│   ├── prisma/
│   │   └── init_mysql.sql      # Skrip DDL skema database, indexing, & auto-pruning event
│   │
│   └── types/
│       └── energy.ts           # Definisi tipe TypeScript (Device, Telemetry, Stats)
│
├── firmware/                   # Firmware Mikrokontroler (ESP32 / PlatformIO / Arduino)
└── docs/                       # Dokumen Arsitektur & Analisis PRD
```

---

## 🗄️ Arsitektur Database (MySQL 8.0)

Database menggunakan relational engine **MySQL 8.0** dengan charset `utf8mb4` untuk menjamin konsistensi ACID dan kecepatan query time-series.

### 1. Tabel `devices` (Master Perangkat Stopkontak)
| Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | `INT AUTO_INCREMENT PRIMARY KEY` | ID unik stopkontak pintar |
| `name` | `VARCHAR(255) NOT NULL` | Nama penanda perangkat (e.g., "Stopkontak Utama") |
| `location` | `VARCHAR(255) NULL` | Lokasi penempatan (e.g., "Lab IoT") |
| `max_power_limit` | `INT NOT NULL DEFAULT 500` | Ambang batas aman daya (Watt) |
| `relay_status` | `BOOLEAN NOT NULL DEFAULT TRUE` | Status aliran listrik (1 = ON, 0 = OFF) |
| `created_at` | `DATETIME DEFAULT CURRENT_TIMESTAMP` | Waktu pendaftaran perangkat |
| `updated_at` | `DATETIME ON UPDATE CURRENT_TIMESTAMP`| Waktu update konfigurasi terakhir |

### 2. Tabel `telemetries` (Data Deret Waktu Konsumsi Listrik)
| Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | `BIGINT AUTO_INCREMENT PRIMARY KEY` | ID unik log telemetri |
| `device_id` | `INT NOT NULL` | Foreign Key mengarah ke `devices(id)` |
| `voltage` | `DECIMAL(6,2) NOT NULL` | Tegangan terbaca (Volt) |
| `power` | `DECIMAL(8,2) NOT NULL` | Konsumsi daya aktif (Watt) |
| `current` | `DECIMAL(6,3) NOT NULL` | Kuat arus listrik (Ampere) |
| `detected_appliance` | `VARCHAR(150) NULL` | Nama alat yang diidentifikasi oleh AI |
| `appliance_category` | `VARCHAR(100) NULL` | Kategori alat (Resistif, Induktif, Elektronik) |
| `confidence` | `INT DEFAULT 95` | Skor akurasi deteksi AI (0 - 100%) |
| `is_overload` | `BOOLEAN NOT NULL DEFAULT 0` | Flag penanda apakah saat itu terjadi overload |
| `recorded_at` | `DATETIME DEFAULT CURRENT_TIMESTAMP`| Waktu pengukuran data |

> **Indeks Performa:** Dibuat indeks gabungan `INDEX idx_device_recorded (device_id, recorded_at DESC)` agar pencarian grafik riwayat dan status terkini berjalan instan (< 5ms).

---

## 🧹 Mekanisme Auto-Pruning

Karena sistem menerima aliran data telemetri setiap **2 detik** (menghasilkan ~43.200 baris/hari), sistem menerapkan **3 Lapis Proteksi Penyimpanan** agar disk tidak membengkak:

1. **Layer 1 (MySQL Native Event Scheduler):**
   MySQL menjalankan *event background* setiap hari untuk memotong data mentah yang lebih tua dari batas retensi (default 7 hari):
   ```sql
   CREATE EVENT auto_prune_telemetries
   ON SCHEDULE EVERY 1 DAY
   DO DELETE FROM telemetries WHERE recorded_at < NOW() - INTERVAL 7 DAY;
   ```
2. **Layer 2 (Aplikasi Next.js Auto-Pruner):**
   Di dalam `dashboard/lib/db.ts`, terdapat mekanisme pembersihan periodik setiap 1 jam saat transaksi data berjalan, memastikan data lawas terpangkas secara teratur.
3. **Layer 3 (Manual Pruning via Dashboard):**
   Pada panel *Simulator Widget*, pengguna dapat melihat estimasi ukuran database, jumlah rekaman aktif, dan menekan tombol **"Pangkas Data > 7 Hari"** secara manual.

---

## 🔌 Dokumentasi REST API

Semua endpoint mengembalikan respon berformat JSON standar:

### 1. Data & Status Telemetri
- **`GET /api/devices/{id}/status?limit=30`**
  - Mengambil data telemetri terkini, 30 riwayat time-series terakhir, kalkulasi kWh & tagihan PLN, serta status relay.
  - *Response:*
    ```json
    {
      "success": true,
      "data": {
        "device": { "id": 1, "name": "Stopkontak Utama", "max_power_limit": 500, "relay_status": true },
        "latest_telemetry": { "voltage": 220.5, "power": 145.2, "current": 0.658, "detected_appliance": "Laptop / PC Workstation" },
        "stats": { "current_power": 145.2, "energy_kwh": 0.052, "cost_idr": 75 },
        "alert": { "is_overload": false, "message": null }
      }
    }
    ```

- **`POST /api/telemetry`**
  - Menerima kiriman data sensor dari mikrokontroler (ESP32) atau simulator.
  - *Payload:*
    ```json
    {
      "device_id": 1,
      "voltage": 220.0,
      "power": 350.5
    }
    ```
  - *Auto Cut-off:* Jika `power` > `max_power_limit`, API otomatis mematikan relay perangkat di database dan merespon `is_cutoff_triggered: true`.

### 2. Kontrol Perangkat
- **`POST /api/devices/{id}/toggle`**
  - Mengubah status saklar relay secara manual (ON/OFF).
  - *Payload:* `{"relay_status": false}`

- **`POST /api/devices/{id}/limit`**
  - Mengubah batas aman daya maksimal (Watt).
  - *Payload:* `{"max_power_limit": 900}`

### 3. Simulator & Pemeliharaan Database
- **`POST /api/telemetry/simulate`**
  - Mengirim data simulasi skenario (`preset: "standby" | "laptop" | "overload" | "step_up"`).
- **`GET /api/telemetry/prune`**
  - Mengambil statistik total baris, tanggal terlama/terbaru, dan estimasi ukuran memori tabel telemetri.
- **`POST /api/telemetry/prune`**
  - Memicu eksekusi pembersihan data lawas secara manual (`retention_days`: default 7).

---

## 🚀 Panduan Menjalankan Sistem

Anda dapat menjalankan sistem menggunakan dua metode di bawah ini:

### Metode 1: Menggunakan Docker Compose (Satu Klik)
*Metode ini paling direkomendasikan karena otomatis mengonfigurasi MySQL 8.0, Next.js, inisialisasi tabel, indeks, dan jadwal auto-pruner.*

#### A. Menjalankan Mode Produksi / Standalone (Optimal & Cepat)
1. Pastikan **Docker Desktop** sudah terpasang dan berjalan di komputer Anda.
2. Buka terminal di folder root (`smart-energy/`), lalu jalankan:
   ```powershell
   docker compose up -d
   ```
3. Buka browser dan akses:
   **`http://localhost:3000`**

#### B. Menjalankan Mode Development (Live Hot-Reloading)
Gunakan mode ini jika Anda dan tim sedang aktif mengubah kode UI atau backend:
```powershell
docker compose -f docker-compose.dev.yml up -d
```
*Setiap perubahan file di editor otomatis ter-update di browser tanpa perlu build ulang.*

#### C. Perintah Manajemen Docker
```powershell
# Memeriksa status kontainer
docker compose ps

# Melihat log aplikasi dashboard
docker compose logs -f smart-energy-dashboard

# Menghentikan kontainer (data MySQL tetap aman di volume)
docker compose down

# Menghentikan kontainer sekaligus mereset database bersih
docker compose down -v
```

---

### Metode 2: Menjalankan Secara Manual (Host OS)

Jika Anda ingin menjalankan langsung di sistem operasi tanpa Docker:

#### Prasyarat:
- **Node.js** v20.x atau lebih baru (`node -v`)
- **MySQL Server 8.0** aktif di komputer lokal (`127.0.0.1:3306`)

#### Langkah 1: Persiapan Database MySQL
1. Buka MySQL client (HeidiSQL, DBeaver, Workbench, atau Terminal MySQL).
2. Buka dan eksekusi seluruh isi file skrip SQL:
   [dashboard/prisma/init_mysql.sql](file:///d:/Mike/College/UNPAB/Semester%201/Sistem%20Mikrokontroler/smart-energy/dashboard/prisma/init_mysql.sql)
   *Skrip ini otomatis membuat database `smart_energy_db`, tabel `devices`, tabel `telemetries`, device default, dan MySQL Event Auto-Pruning.*

#### Langkah 2: Konfigurasi Environment Dashboard
1. Masuk ke direktori `dashboard/`:
   ```powershell
   cd dashboard
   ```
2. Salin file template `.env.example` menjadi `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```
3. Sesuaikan `DB_USER` dan `DB_PASSWORD` dengan kredensial MySQL lokal Anda (default: user `root`, password `1234`).

#### Langkah 3: Install Dependensi & Jalankan
```powershell
# 1. Install seluruh library yang dibutuhkan
npm install

# 2. Jalankan development server
npm run dev
```
Buka browser di **`http://localhost:3000`**.

---

## 📡 Integrasi Mikrokontroler (ESP32)

Mikrokontroler (ESP32) yang terhubung dengan sensor PZEM-004T dan modul Relay dapat mengirimkan telemetri ke server via HTTP POST JSON setiap 2 detik:

```cpp
// Contoh potongan logika pengiriman telemetri pada ESP32
#include <WiFi.h>
#include <HTTPClient.h>

const char* serverUrl = "http://IP_KOMPUTER_SERVER:3000/api/telemetry";

void sendTelemetry(float voltage, float power, float current) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    String jsonPayload = "{\"device_id\":1,\"voltage\":" + String(voltage, 2) + 
                         ",\"power\":" + String(power, 2) + 
                         ",\"current\":" + String(current, 3) + "}";

    int httpResponseCode = http.POST(jsonPayload);
    if (httpResponseCode > 0) {
      String response = http.getString();
      // Periksa apakah server memicu auto cut-off
      if (response.indexOf("\"is_cutoff_triggered\":true") >= 0) {
        digitalWrite(RELAY_PIN, LOW); // Putus relay fisik seketika
      }
    }
    http.end();
  }
}
```

---

## 👨‍💻 Kontribusi & Lisensi
Proyek ini dikembangkan untuk kebutuhan praktikum dan riset sistem mikrokontroler IoT terintegrasi kecerdasan buatan. Bebas dimodifikasi dan dikembangkan lebih lanjut.
