# 🔌 Panduan Simulasi Firmware ESP32 dengan Wokwi

Firmware ini menyimulasikan perangkat keras **Smart Energy Meter** menggunakan mikrokontroler **ESP32**, sensor daya potensiometer (0 - 1000W), modul saklar relay proteksi, dan lampu indikator LED status.

---

## 📋 Fitur Firmware
1. **Wi-Fi Wokwi Virtual:** Otomatis tersambung ke `Wokwi-GUEST`.
2. **Pengiriman Telemetri Berkala:** Mengirim data JSON (Tegangan ~220V, Daya Watt, Kuat Arus Ampere) via HTTP POST ke endpoint Dashboard `/api/telemetry` setiap **2 detik**.
3. **AI NILM Response Processing:** Menerima hasil klasifikasi perangkat listrik (Kulkas, Pompa Air, Komputer, Lampu, dll.) dari server Next.js dan mencetaknya di Serial Monitor.
4. **Proteksi Overload Ganda:**
   - **Edge Fail-Safe:** Jika potensiometer diputar melampaui 500W, relay lokal seketika memutus arus tanpa menunggu respon server.
   - **Cloud Cut-Off:** Menerima instruksi pemutusan arus otomatis dari backend dashboard.
5. **Sinkronisasi Saklar Dua Arah:** Status saklar stopkontak di Dashboard (iOS Switch) otomatis mengendalikan modul Relay fisik di Wokwi.

---

## 🛠️ Pinout Hardware (diagram.json)

| Komponen | Pin Komponen | Pin ESP32 | Keterangan |
| :--- | :--- | :--- | :--- |
| **Potensiometer** | `SIG` | `GPIO 34` (ADC1) | Pengatur beban simulasi (0 - 1000 Watt) |
| **Potensiometer** | `VCC` / `GND` | `3V3` / `GND` | Catu daya sensor analog |
| **Relay Module** | `IN` | `GPIO 26` | Kontrol saklar (Active LOW) |
| **Relay Module** | `VCC` / `GND` | `5V` / `GND` | Daya koil relay |
| **LED Indikator** | Anoda (`A`) | `GPIO 2` | Menyala saat stopkontak aktif (aman) |

---

## 🚀 Cara Menjalankan Simulasi Wokwi

Pastikan Dashboard Next.js sudah berjalan terlebih dahulu:
```powershell
# Jalankan dashboard & database di root folder
docker compose up -d
# Atau secara manual: cd dashboard && npm run dev
```

### Opsi 1: Menjalankan di VS Code (Paling Mudah)
1. Pasang ekstensi **Wokwi Simulator** di VS Code.
2. Buka file `firmware/diagram.json`.
3. Tekan tombol **Play (▶ Start Simulation)** di bagian atas editor diagram, atau tekan `F1` lalu ketik `Wokwi: Start Simulator`.
4. Buka tab **Serial Monitor** di bagian bawah untuk melihat proses handshake Wi-Fi dan kiriman data HTTP POST.

---

### Opsi 2: Menjalankan di Browser (Wokwi Web / wokwi.com)
Jika Anda menggunakan simulator di situs web [wokwi.com](https://wokwi.com):
1. Karena web browser Wokwi berada di cloud, buka terminal baru di laptop Anda untuk membuat tunnel gratis ke port 3000:
   ```powershell
   npx localtunnel --port 3000
   ```
2. Anda akan mendapatkan URL publik, misalnya:
   `https://lazy-tiger-42.loca.lt`
3. Salin URL tersebut dan buka [firmware/include/config.h](include/config.h), lalu ubah baris `BACKEND_URL`:
   ```cpp
   const char* const BACKEND_URL = "https://lazy-tiger-42.loca.lt/api/telemetry";
   ```
4. Compile ulang firmware dengan perintah:
   ```powershell
   & "C:\Users\Asus\.platformio\penv\Scripts\platformio.exe" run -d firmware
   ```
5. Unggah atau sinkronkan proyek ke Wokwi Web.

---

## 🧪 Skenario Pengujian

1. **Uji Beban Normal:**
   - Putar potensiometer sedikit ke kiri (~100W - 200W).
   - Di Serial Monitor akan muncul deteksi AI NILM (misal: *Komputer / PC Workstation*).
   - Di Dashboard, grafik naik dan lampu indikator hijau menyala.
2. **Uji Bahaya Overload:**
   - Putar potensiometer melebihi 500W (misal 650W).
   - Seketika relay di Wokwi berbunyi "klik" dan berubah posisi, LED indikator mati.
   - Di Dashboard, muncul **Overload Banner Merah** yang menunjukkan selisih beban darurat.
3. **Uji Saklar Jarak Jauh (Remote Control):**
   - Di Dashboard, matikan saklar stopkontak (iOS Switch).
   - Dalam 2 detik berikutnya, ESP32 menerima sinyal `relay_status: false` dari server dan mematikan relay secara otomatis.
