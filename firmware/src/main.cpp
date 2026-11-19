#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "config.h"

// =============================================================================
// VARIABEL STATUS SISTEM
// =============================================================================
unsigned long lastSendTime = 0;
bool isRelayActive = true;
bool isLocalOverload = false;

// =============================================================================
// FUNGSI KONTROL RELAY & INDIKATOR LED
// =============================================================================
void setRelayState(bool state, const char* reason) {
  if (state == isRelayActive) return; // Tidak ada perubahan status

  isRelayActive = state;
  if (isRelayActive) {
    digitalWrite(PIN_RELAY, RELAY_STATE_ON);
    digitalWrite(PIN_LED_STATUS, HIGH);
    Serial.printf("\n[RELAY] 🔌 SAKLAR MENYALA (ON) - Alasan: %s\n", reason);
  } else {
    digitalWrite(PIN_RELAY, RELAY_STATE_OFF);
    digitalWrite(PIN_LED_STATUS, LOW);
    Serial.printf("\n[RELAY] ⚠️ SAKLAR DIPUTUS (OFF) - Alasan: %s\n", reason);
  }
}

// =============================================================================
// FUNGSI PENGHUBUNG WI-FI WOKWI
// =============================================================================
void connectWiFi() {
  Serial.print("[WIFI] Menghubungkan ke access point: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] ✅ Terhubung!");
    Serial.print("[WIFI] IP Address ESP32: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WIFI] ❌ Gagal terhubung ke Wi-Fi. Mode offline aktif.");
  }
}

// =============================================================================
// FUNGSI PENGIRIMAN TELEMETRI KE REST API DASHBOARD
// =============================================================================
void sendTelemetryData(float voltage, float power, float current) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Wi-Fi terputus. Mencoba rekoneksi...");
    WiFi.reconnect();
    return;
  }

  HTTPClient http;
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(3000); // 3 detik timeout

  // Buat payload JSON
  JsonDocument doc;
  doc["device_id"] = DEVICE_ID;
  doc["voltage"]   = voltage;
  doc["power"]     = isRelayActive ? power : 0.0f; // Jika relay mati, daya teralirkan = 0W
  doc["current"]   = isRelayActive ? current : 0.0f;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  Serial.println("--------------------------------------------------");
  Serial.printf("[HTTP POST] Mengirim ke %s\n", BACKEND_URL);
  Serial.printf("[PAYLOAD] %s\n", jsonPayload.c_str());

  int httpCode = http.POST(jsonPayload);

  if (httpCode > 0) {
    String responseString = http.getString();
    Serial.printf("[HTTP %d] Respon Diterima (%d bytes)\n", httpCode, responseString.length());

    if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
      JsonDocument resDoc;
      DeserializationError err = deserializeJson(resDoc, responseString);

      if (!err) {
        bool serverRelayStatus = resDoc["data"]["device"]["relay_status"] | true;
        const char* actionRequired = resDoc["data"]["action_required"] | "NONE";
        const char* detectedAppliance = resDoc["data"]["telemetry"]["detected_appliance"] | "Tidak Teridentifikasi";
        int confidence = resDoc["data"]["telemetry"]["confidence"] | 0;

        Serial.printf("[AI NILM] Perangkat Terdeteksi: %s (%d%%)\n", detectedAppliance, confidence);

        // Sinkronisasi status saklar dari Server / AI NILM
        if (strcmp(actionRequired, "RELAY_CUTOFF") == 0 || !serverRelayStatus) {
          setRelayState(false, "SERVER_AUTO_CUTOFF / USER_REMOTE_OFF");
        } else if (serverRelayStatus && !isLocalOverload) {
          setRelayState(true, "SERVER_CONFIRMED_ON");
        }
      }
    }
  } else {
    Serial.printf("[HTTP ERROR] Gagal mengirim data. Error code: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
  Serial.println("--------------------------------------------------");
}

// =============================================================================
// SETUP SISTEM
// =============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n==================================================");
  Serial.println("⚡ SMART ENERGY METER - WOKWI SIMULATOR FIRMWARE");
  Serial.println("==================================================");

  // Inisialisasi I/O
  pinMode(PIN_POTENTIOMETER, INPUT);
  pinMode(PIN_RELAY, OUTPUT);
  pinMode(PIN_LED_STATUS, OUTPUT);

  // Kondisi Awal: Relay ON (Listrik Mengalir), LED Menyala
  digitalWrite(PIN_RELAY, RELAY_STATE_ON);
  digitalWrite(PIN_LED_STATUS, HIGH);
  isRelayActive = true;

  // Sambungkan ke jaringan Wi-Fi Wokwi
  connectWiFi();

  Serial.println("[SISTEM] Firmware siap beroperasi.");
  Serial.println("Gunakan potensiometer di diagram Wokwi untuk mengubah beban daya (0 - 1000W).");
}

// =============================================================================
// MAIN LOOP
// =============================================================================
void loop() {
  // 1. Baca sensor potensiometer (ADC 12-bit: 0 - 4095)
  int rawADC = analogRead(PIN_POTENTIOMETER);

  // Petakan ADC ke rentang daya aktif 0 - 1000 Watt
  float measuredPower = (float)rawADC * (1000.0f / 4095.0f);
  measuredPower = round(measuredPower * 10.0f) / 10.0f; // 1 desimal

  // Simulasi variasi tegangan PLN (219.0V - 221.0V)
  float voltage = DEFAULT_VOLTAGE + ((float)(random(-10, 11)) / 10.0f);

  // Hitung kuat arus listrik (I = P / V)
  float current = (voltage > 0) ? (measuredPower / voltage) : 0.0f;

  // 2. Proteksi Fail-Safe Lokal (Edge Overload Protection)
  if (measuredPower > LOCAL_OVERLOAD_LIMIT) {
    if (!isLocalOverload) {
      isLocalOverload = true;
      setRelayState(false, "LOCAL_FAILSAFE_OVERLOAD (> 500W)");
    }
  } else {
    isLocalOverload = false;
  }

  // 3. Pengiriman Telemetri Terjadwal (Non-blocking setiap 2 detik)
  unsigned long now = millis();
  if (now - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = now;
    sendTelemetryData(voltage, measuredPower, current);
  }

  delay(50); // Mencegah watchdog timeout
}
