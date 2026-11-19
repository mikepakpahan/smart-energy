#pragma once
#include <Arduino.h>

// =============================================================================
// KONFIGURASI PIN HARDWARE (WOKWI SIMULATOR & ESP32 DEV BOARD)
// =============================================================================
constexpr int PIN_POTENTIOMETER = 34; // ADC1_CH6: Simulasi sensor daya (Watt)
constexpr int PIN_RELAY         = 26; // Output kontrol saklar relay stopkontak
constexpr int PIN_LED_STATUS    = 2;  // LED indikator status daya aman (Onboard ESP32)

// =============================================================================
// KONFIGURASI RELAY POLARITY
// Modul relay Wokwi / umum adalah Active LOW (LOW = Relay ON/Tertutup, HIGH = OFF/Terbuka)
// =============================================================================
constexpr int RELAY_STATE_ON  = LOW;
constexpr int RELAY_STATE_OFF = HIGH;

// =============================================================================
// KONFIGURASI JARINGAN WI-FI
// Wokwi simulator menyediakan access point virtual bawaan: "Wokwi-GUEST" tanpa password
// =============================================================================
const char* const WIFI_SSID     = "Wokwi-GUEST";
const char* const WIFI_PASSWORD = "";

// =============================================================================
// KONFIGURASI BACKEND DASHBOARD REST API
// Pilih salah satu metode sesuai cara Anda menjalankan Wokwi:
//
// Opsi A (Wokwi VS Code Extension / LAN):
//   Gunakan IP lokal komputer host: "http://192.168.100.119:3000/api/telemetry"
//
// Opsi B (Wokwi Web Browser via Tunneling gratis, contoh: localtunnel / ngrok):
//   Jalankan di terminal laptop: `npx localtunnel --port 3000`
//   Lalu ganti URL di bawah dengan URL yang dihasilkan, contoh:
//   "https://smart-energy-lab.loca.lt/api/telemetry"
//
// Opsi C (Wokwi IoT Gateway):
//   "http://10.0.2.2:3000/api/telemetry"
// =============================================================================
const char* const BACKEND_URL = "http://192.168.100.119:3000/api/telemetry";

// =============================================================================
// PARAMETER SISTEM TELEMETRI & PROTEKSI FAIL-SAFE LOKAL (EDGE)
// =============================================================================
constexpr int DEVICE_ID               = 1;      // ID Perangkat Stopkontak di database
constexpr float DEFAULT_VOLTAGE       = 220.0f; // Asumsi tegangan nominal PLN (Volt)
constexpr float LOCAL_OVERLOAD_LIMIT  = 500.0f; // Batas proteksi fail-safe mikrokontroler (Watt)
constexpr unsigned long SEND_INTERVAL = 2000;   // Interval kirim telemetri (2000 ms = 2 detik)
