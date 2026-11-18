#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ==========================================
// Konfigurasi WiFi & Endpoint Backend
// ==========================================
// SSID untuk Wokwi Simulator adalah "Wokwi-GUEST" tanpa password
const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";

// URL Backend Next.js (Ganti dengan IP WSL2/Ngrok saat simulasi lokal)
// Contoh Ngrok: "https://xxxx.ngrok-free.app/api/telemetry"
// Contoh Lokal: "http://10.0.2.2:3000/api/telemetry" (Wokwi Gateway) atau IP Host
const char* API_URL = "http://localhost:3000/api/telemetry";
const char* DEVICE_ID = "esp32-01";

// ==========================================
// Konfigurasi Pin Hardware / Wokwi
// ==========================================
const int SIMULATOR_PIN = 34; // Potensiometer simulasi Daya (Watt)
const int RELAY_PIN = 26;     // Relay pemutus arus stopkontak (Active Low)
const int LED_PIN = 2;        // Indikator status aman (Bawaan ESP32)

// Timer Non-Blocking
unsigned long previousMillis = 0;
const long interval = 2000;   // Frekuensi baca & kirim telemetri (2 detik)

// Batas Keamanan Lokal (Hard-Cutoff)
const float MAX_POWER_WATT = 500.0;
const float SIMULATED_VOLTAGE = 220.0;
bool isCutoff = false;

void connectWiFi() {
  Serial.print("[WiFi] Menghubungkan ke ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Terhubung!");
    Serial.print("[WiFi] IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WiFi] Gagal terhubung (Akan tetap menjalankan proteksi lokal).");
  }
}

void setRelayState(bool turnOn) {
  if (turnOn) {
    // Relay module Active Low: LOW = Saklar Tertutup / Listrik Mengalir (ON)
    digitalWrite(RELAY_PIN, LOW);
    digitalWrite(LED_PIN, HIGH);
    isCutoff = false;
  } else {
    // HIGH = Saklar Terbuka / Listrik Terputus (OFF/Cut-off)
    digitalWrite(RELAY_PIN, HIGH);
    digitalWrite(LED_PIN, LOW);
    isCutoff = true;
  }
}

void sendTelemetry(float voltage, float power) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] WiFi belum terhubung, lewati pengiriman telemetri.");
    return;
  }

  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");

  // Siapkan Payload JSON sesuai schema Zod di Next.js
  JsonDocument doc;
  doc["device_id"] = DEVICE_ID;
  doc["voltage"] = voltage;
  doc["power"] = power;

  String requestBody;
  serializeJson(doc, requestBody);

  Serial.print("[HTTP] Mengirim telemetri: ");
  Serial.println(requestBody);

  int httpResponseCode = http.POST(requestBody);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("[HTTP] Response (%d): %s\n", httpResponseCode, response.c_str());

    // Parse respons dari server Next.js
    JsonDocument responseDoc;
    DeserializationError error = deserializeJson(responseDoc, response);

    if (!error && responseDoc.containsKey("relay_status")) {
      bool serverRelayStatus = responseDoc["relay_status"];
      
      // Jika server memerintahkan relay OFF (Remote Override dari Dashboard)
      if (!serverRelayStatus && !isCutoff) {
        Serial.println("🛑 [SERVER COMMAND] Remote Override: Memutus Relay via Dashboard!");
        setRelayState(false);
      } 
      // Jika server mengizinkan ON dan kondisi daya lokal aman
      else if (serverRelayStatus && isCutoff && power <= MAX_POWER_WATT) {
        Serial.println("🟢 [SERVER COMMAND] Relay diizinkan ON kembali.");
        setRelayState(true);
      }
    }
  } else {
    Serial.printf("[HTTP] Error kirim POST: %s\n", http.errorToString(httpResponseCode).c_str());
  }

  http.end();
}

void setup() {
  Serial.begin(115200);

  // Inisialisasi Pin
  pinMode(SIMULATOR_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);

  // Kondisi awal: Listrik Mengalir (ON)
  setRelayState(true);

  Serial.println("==========================================");
  Serial.println("Sistem Monitoring Energi & NILM Dimulai");
  Serial.println("Device ID : " + String(DEVICE_ID));
  Serial.println("Batas Aman: " + String(MAX_POWER_WATT) + " W");
  Serial.println("==========================================");

  // Sambungkan WiFi
  connectWiFi();
}

void loop() {
  unsigned long currentMillis = millis();

  // Task 1: Baca Sensor, Proteksi Lokal, dan Kirim Telemetri setiap 2 detik
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    // Baca sensor potensiometer (ADC ESP32 beresolusi 12-bit: 0 - 4095)
    int rawADC = analogRead(SIMULATOR_PIN);
    
    // Petakan nilai ADC ke rentang daya 0 - 1000 Watt
    float currentPower = map(rawADC, 0, 4095, 0, 1000);

    Serial.print("[SENSOR] Daya: ");
    Serial.print(currentPower);
    Serial.print(" W | Tegangan: ");
    Serial.print(SIMULATED_VOLTAGE);
    Serial.println(" V");

    // ==========================================================
    // HARD-CUTOFF LOKAL (Proteksi Mandiri tanpa menunggu server)
    // ==========================================================
    if (currentPower > MAX_POWER_WATT && !isCutoff) {
      Serial.println("⚠️ BAHAYA OVERLOAD: Daya melebihi batas aman! Melakukan Hard-Cutoff lokal...");
      setRelayState(false);
    }

    // Kirim data ke backend Next.js API (/api/telemetry)
    sendTelemetry(SIMULATED_VOLTAGE, currentPower);
  }
}
