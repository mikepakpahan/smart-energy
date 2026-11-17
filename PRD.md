# Product Requirements Document (PRD)
**Smart Energy Meter & AI Appliance Profiling (NILM)**

---

## 1. Pendahuluan

### Latar Belakang
Manajemen daya listrik di tingkat rumah tangga maupun laboratorium seringkali tidak terpantau secara mendetail. Pengguna hanya mengetahui total tagihan di akhir bulan tanpa rincian perangkat mana yang paling boros energi. Selain itu, sistem instalasi rentan terhadap risiko korsleting akibat beban berlebih (*overload*).

### Objektif
Membangun prototipe sistem *Internet of Things* (IoT) berbasis mikrokontroler dengan kapabilitas:
*   Membaca arus, tegangan, dan daya aktif secara *real-time*.
*   Memutus arus listrik otomatis secara perangkat keras (*Hard-Cutoff*) jika mendeteksi beban berlebih.
*   Mengirimkan data telemetri ke server untuk divisualisasikan pada *web dashboard*.
*   Mengklasifikasikan perangkat yang sedang aktif berdasarkan profil konsumsi daya (*Non-Intrusive Load Monitoring*/NILM) melalui AI Engine di sisi *Backend*.

---

## 2. Alur Kerja (*Workflow*) Integrasi Sistem

Pengembangan dilakukan secara bertahap untuk memastikan keandalan sistem sebelum masuk tahap produksi penuh:

1.  **Fase 1 (Simulasi Lokal):** *Firmware* berjalan di simulator Wokwi, membaca input potensiometer. Data dikirim menggunakan Ngrok ke *endpoint* REST API lokal (Next.js/PostgreSQL) yang berjalan di atas WSL2/Docker. Dashboard web dikembangkan bersamaan menggunakan data lokal.
2.  **Fase 2 (Transisi Hardware Fisik):** Merakit komponen PZEM-004T, Relay, dan ESP32. Kode C++ disalin ke PlatformIO dan diflash ke alat. ESP32 fisik mengirim data langsung ke jaringan lokal menuju server WSL2 untuk uji coba beban nyata.
3.  **Fase 3 (Tahap *Production*):** Pemindahan seluruh basis data dan *build* aplikasi Next.js ke Virtual Private Server (VPS). Konfigurasi ESP32 diperbarui untuk menembak *endpoint* produksi VPS. Sistem siap untuk uji coba akhir dan presentasi.

---

## 3. Pembagian Peran Tim (3 Orang)

| Role | Fokus Pekerjaan | Tech Stack |
| :--- | :--- | :--- |
| **Hardware & Firmware Engineer** | Merakit komponen fisik, menulis kode C++ *non-blocking* (millis), mengintegrasikan sensor, dan memastikan data terkirim via HTTP POST/MQTT. | C/C++, Wokwi, PlatformIO |
| **Backend & AI Engineer** | Merancang skema ERD PostgreSQL, membuat REST API, membangun logika deteksi NILM (AI) pada API server, serta mengelola Docker dan *deploy* ke VPS. | Next.js (API Routes), Prisma ORM, PostgreSQL, Docker |
| **Frontend Web Engineer** | Membangun UI/UX Web Dashboard, mengkonsumsi API Backend untuk merender grafik daya *real-time*, dan membuat antarmuka kontrol *remote relay*. | Next.js (React), Tailwind CSS |

---

## 4. Kebutuhan Sistem (*System Requirements*)

### A. Fitur Hardware & Firmware (ESP32)
*   **H-01:** Sistem mampu membaca data daya (Watt), tegangan (Volt), dan arus (Ampere) dari sensor (atau simulator) setiap 2 detik.
*   **H-02:** Sistem mengimplementasikan logika *Hard-Cutoff*; otomatis memutus *relay* jika daya melampaui batas maksimal tanpa harus menunggu balasan dari server.
*   **H-03:** Sistem membentuk *payload* JSON dan mengirimkannya ke *endpoint* API server (via Ngrok saat lokal, dan *public IP* saat di VPS).

### B. Fitur Backend API & AI (Next.js)
*   **B-01:** *Endpoint* `POST /api/telemetry` untuk menerima aliran data sensor dan memasukannya ke database PostgreSQL.
*   **B-02:** *Endpoint* `GET /api/devices/{id}/status` untuk mengambil riwayat data (*time-series*) dan status *relay* terkini untuk dashboard.
*   **B-03:** *Endpoint* `POST /api/devices/{id}/toggle` untuk menangkap instruksi *override* saklar *relay* dari pengguna (ON/OFF).
*   **B-04:** Implementasi logika NILM: Menganalisis lonjakan daya pada layer Backend Next.js (misal: beban konstan 50W dikenali sebagai "Kipas Angin").

### C. Fitur Web Dashboard
*   **F-01:** Render grafik garis (*Line Chart*) untuk histori konsumsi daya *real-time* secara interaktif.
*   **F-02:** Visualisasi *alert*/peringatan merah di antarmuka jika terdeteksi *overload* arus listrik.
*   **F-03:** Tombol interaktif untuk memutus arus listrik secara *remote* oleh pengguna (*Override Hardware*).

---

## 5. Skema Database Inti (PostgreSQL)

### Tabel: `devices`
| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | BIGINT | *Primary Key* |
| `name` | VARCHAR | Nama identitas alat (misal: "Stopkontak Utama") |
| `max_power_limit` | INTEGER | Batas daya aman (Watt) untuk proteksi *cutoff* |
| `relay_status` | BOOLEAN | Status terkini: *True* (ON) atau *False* (OFF) |

### Tabel: `telemetries` (Time-series Data)
| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | BIGINT | *Primary Key* |
| `device_id` | BIGINT | *Foreign Key* mengacu ke tabel `devices` |
| `voltage` | DECIMAL(5,2) | Tegangan listrik tercatat (V) |
| `power` | DECIMAL(8,2) | Daya aktif tercatat (W) |
| `detected_appliance` | VARCHAR | Hasil klasifikasi AI alat (Nullable) |
| `recorded_at` | TIMESTAMP | Waktu pencatatan data masuk ke server |