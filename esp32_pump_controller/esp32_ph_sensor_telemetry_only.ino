/*
 * ESP32 pH Sensor Telemetry Only for CropConnect
 *
 * Reads pH probe analog voltage from GPIO 34 and sends pH telemetry to
 * CropConnect over WiFi.
 *
 * Update:
 * - WIFI_SSID
 * - WIFI_PASSWORD
 * - DEVICE_ID to match your dashboard sensor setup
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

// ===== WIFI CONFIGURATION =====
const char* WIFI_SSID = "motorola edge 20 fusion_2684";
const char* WIFI_PASSWORD = "12345678";

// ===== CROPConnect API CONFIGURATION =====
const char* API_KEY = "dev-secret-key";
const char* DEVICE_ID = "sim-node-1";
const char* TELEMETRY_URL = "https://cropconnect01-production.up.railway.app/api/telemetry/ingest";

// ===== pH SENSOR CONFIGURATION =====
#define PH_PIN 34

// Send pH to dashboard every 8 seconds.
const unsigned long TELEMETRY_INTERVAL_MS = 8000;
const unsigned long WIFI_RECONNECT_INTERVAL_MS = 5000;

unsigned long lastTelemetryAt = 0;
unsigned long lastWiFiCheckAt = 0;

WiFiClientSecure secureClient;

float readVoltage() {
  int samples = 10;
  float sum = 0;

  for (int i = 0; i < samples; i++) {
    sum += analogRead(PH_PIN);
    delay(20);
  }

  float avg = sum / samples;
  return avg * (3.3 / 4095.0);
}

String phStatusFromVoltage(float voltage) {
  if (voltage > 1.80) {
    return "ACIDIC";
  }
  if (voltage < 1.70) {
    return "NEUTRAL";
  }
  return "BASIC";
}

float phValueFromVoltage(float voltage) {
  String status = phStatusFromVoltage(voltage);

  // These are dashboard-friendly representative pH values based on your status bands.
  // For precise pH, calibrate with pH 4, 7, and 10 buffer solutions.
  if (status == "ACIDIC") {
    return 5.8;
  }
  if (status == "NEUTRAL") {
    return 7.0;
  }
  return 8.0;
}

bool connectToWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }

  Serial.println();
  Serial.println("Connecting to WiFi: " + String(WIFI_SSID));

  WiFi.disconnect();
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startTime < 25000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi connected");
    Serial.println("ESP32 IP: " + WiFi.localIP().toString());
    return true;
  }

  Serial.println();
  Serial.println("WiFi connection failed");
  return false;
}

String buildTelemetryJson(float phValue, float voltage, String status) {
  String body = "{";
  body += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  body += "\"ph\":" + String(phValue, 2) + ",";
  body += "\"raw_payload\":{";
  body += "\"ph_voltage\":" + String(voltage, 3) + ",";
  body += "\"ph_status\":\"" + status + "\"";
  body += "}";
  body += "}";
  return body;
}

void postTelemetry(const String& payload) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, telemetry skipped");
    return;
  }

  HTTPClient http;
  http.begin(secureClient, TELEMETRY_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", API_KEY);

  Serial.println("Sending telemetry:");
  Serial.println(payload);

  int httpCode = http.POST(payload);
  if (httpCode > 0) {
    Serial.println("Telemetry POST HTTP " + String(httpCode));
    Serial.println("Response: " + http.getString());
  } else {
    Serial.println("Telemetry POST failed: " + http.errorToString(httpCode));
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("=== CropConnect pH Sensor Telemetry Only ===");

  pinMode(PH_PIN, INPUT);
  secureClient.setInsecure();

  connectToWiFi();

  lastTelemetryAt = millis() - TELEMETRY_INTERVAL_MS;
  lastWiFiCheckAt = millis() - WIFI_RECONNECT_INTERVAL_MS;
}

void loop() {
  unsigned long now = millis();

  if (now - lastWiFiCheckAt >= WIFI_RECONNECT_INTERVAL_MS) {
    lastWiFiCheckAt = now;
    if (WiFi.status() != WL_CONNECTED) {
      connectToWiFi();
    }
  }

  if (now - lastTelemetryAt >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryAt = now;

    float voltage = readVoltage();
    String status = phStatusFromVoltage(voltage);
    float phValue = phValueFromVoltage(voltage);

    Serial.print("Voltage: ");
    Serial.print(voltage, 3);
    Serial.print(" V | Status: ");
    Serial.print(status);
    Serial.print(" | Dashboard pH: ");
    Serial.println(phValue, 2);

    String payload = buildTelemetryJson(phValue, voltage, status);
    postTelemetry(payload);
  }

  delay(50);
}
