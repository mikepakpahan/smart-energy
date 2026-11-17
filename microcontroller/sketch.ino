#include <Arduino.h>

// Konfigurasi Pin
const int SIMULATOR_PIN = 34; // Potensiometer simulasi Daya (Watt)
const int RELAY_PIN = 26;     // Relay pemutus arus stopkontak
const int LED_PIN = 2;        // Indikator status aman (Bawaan ESP32)

// Variabel Timer (Non-Blocking) pengganti delay()
unsigned long previousMillis = 0;
const long interval = 2000; // Frekuensi baca sensor (setiap 2 detik)

// Konfigurasi Batas Keamanan
const float MAX_POWER_WATT = 500.0; // Batas pemutusan arus
bool isCutoff = false;

void setup() {
  Serial.begin(115200);
  
  // Inisialisasi Pin
  pinMode(SIMULATOR_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);

  // Kondisi awal: Listrik Mengalir 
  // (Relay Module biasanya Active Low, nilai LOW berarti saklar tertutup/ON)
  digitalWrite(RELAY_PIN, LOW); 
  digitalWrite(LED_PIN, HIGH);
  
  Serial.println("==================================");
  Serial.println("Sistem Monitoring Energi Dimulai");
  Serial.println("Batas Aman: " + String(MAX_POWER_WATT) + " W");
  Serial.println("==================================");
}

void loop() {
  unsigned long currentMillis = millis();

  // Task 1: Baca Sensor dan Proteksi (Eksekusi setiap 2 detik)
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    // Baca sensor potensiometer (ADC ESP32 beresolusi 12-bit: 0 - 4095)
    int rawADC = analogRead(SIMULATOR_PIN);
    
    // Petakan nilai ADC ke rentang daya 0 - 1000 Watt
    float currentPower = map(rawADC, 0, 4095, 0, 1000);

    Serial.print("[DATA] Daya Saat Ini: ");
    Serial.print(currentPower);
    Serial.println(" W");

    // Logika Pemutusan Arus Otomatis (Cut-off)
    if (currentPower > MAX_POWER_WATT && !isCutoff) {
      Serial.println("⚠️ BAHAYA: Beban Lebih! Memutus stopkontak...");
      digitalWrite(RELAY_PIN, HIGH); // Putus arus
      digitalWrite(LED_PIN, LOW);    // Matikan indikator
      isCutoff = true;
      
      // TODO: Disini tempat menaruh fungsi HTTP POST / MQTT Publish ke Laravel
      // kirimNotifikasiKeBackend("OVERLOAD", currentPower);
      
    } else if (currentPower <= MAX_POWER_WATT && isCutoff) {
      Serial.println("✅ Beban Normal. Mengalirkan listrik kembali...");
      digitalWrite(RELAY_PIN, LOW); // Alirkan arus
      digitalWrite(LED_PIN, HIGH);  // Nyalakan indikator
      isCutoff = false;
      
      // kirimNotifikasiKeBackend("NORMAL", currentPower);
    }
  }

  // Task 2: Tempat untuk listener MQTT atau request API
  // Berada di luar blok if(currentMillis...), sehingga dieksekusi jutaan kali 
  // per detik tanpa terblokir oleh proses baca sensor di atas.
}