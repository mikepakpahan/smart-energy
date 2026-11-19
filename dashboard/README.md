# ⚡ Smart Energy Dashboard (Frontend & Backend App)

Aplikasi Web Dashboard berbasis **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, dan **MySQL 8.0**.

> 💡 **Dokumentasi Lengkap:** Untuk panduan lengkap sistem, arsitektur database, dokumentasi REST API, dan setup Docker stack, silakan baca [README.md utama di root direktori](../README.md).

---

## 🚀 Menjalankan Dashboard Secara Lokal (Standalone)

### 1. Prasyarat
- Node.js v20+ terpasang
- MySQL Server 8.0 berjalan lokal

### 2. Konfigurasi Lingkungan (.env)
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Pastikan `DB_USER` dan `DB_PASSWORD` sesuai dengan akun MySQL Anda.

### 3. Eksekusi
```bash
# Install dependensi
npm install

# Jalankan server pengembangan
npm run dev

# Atau build untuk mode produksi
npm run build
npm run start
```
Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## 🐳 Menjalankan dengan Docker

Untuk menjalankan seluruh stack (Dashboard + MySQL) secara terisolasi tanpa instalasi Node.js lokal, jalankan perintah berikut dari folder root repositori:

```bash
docker compose up -d
```
