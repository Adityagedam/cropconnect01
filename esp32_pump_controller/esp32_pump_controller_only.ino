#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

// ===== CONFIGURATION =====
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_KEY = "dev-secret-key"; // Must match backend ESP32_API_KEY
const char* DEVICE_ID = "pump-node-1";  // Unique device_id for the pump controller

const char* COMMAND_URL = "https://cropconnect01-production.up.railway.app/api/pump/command";
const char* STATUS_URL = "https://cropconnect01-production.up.railway.app/api/pump/status";

const int RELAY_PIN = 2; // Set relay pin for pump control
const unsigned long COMMAND_POLL_INTERVAL_MS = 3000;
const unsigned long STATUS_REPORT_INTERVAL_MS = 10000;
const unsigned long WIFI_RECONNECT_INTERVAL_MS = 5000;

WiFiClientSecure secureClient;
unsigned long lastCommandPollAt = 0;
unsigned long lastStatusReportAt = 0;
unsigned long lastWiFiAt = 0;
int activeRelayState = LOW;

bool connectToWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }

  Serial.print("Connecting to WiFi");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long start = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected");
    Serial.println("IP: " + WiFi.localIP().toString());
    return true;
  }

  Serial.println("\nWiFi connection failed");
  return false;
}

bool isPumpOn() {
  return digitalRead(RELAY_PIN) == HIGH;
}

void setPumpState(bool on) {
  digitalWrite(RELAY_PIN, on ? HIGH : LOW);
  activeRelayState = on ? HIGH : LOW;
  Serial.println(String("Pump is now ") + (on ? "ON" : "OFF"));
}

void sendStatusReport() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("No WiFi, status report skipped");
    return;
  }

  HTTPClient http;
  http.begin(secureClient, STATUS_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", API_KEY);

  String payload = "{";
  payload += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  payload += "\"relay_state\":" + String(activeRelayState == HIGH ? 1 : 0);
  payload += "}";

  int httpCode = http.POST(payload);
  if (httpCode > 0) {
    Serial.println("Status POST HTTP " + String(httpCode));
    Serial.println("Response: " + http.getString());
  } else {
    Serial.println("Status POST failed: " + http.errorToString(httpCode));
  }

  http.end();
}

void pollPumpCommand() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("No WiFi, command poll skipped");
    return;
  }

  HTTPClient http;
  http.begin(secureClient, COMMAND_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", API_KEY);

  String payload = "{";
  payload += "\"device_id\":\"" + String(DEVICE_ID) + "\"";
  payload += "}";

  int httpCode = http.POST(payload);
  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("Command poll HTTP " + String(httpCode));
    Serial.println("Response: " + response);

    if (response.indexOf("1") >= 0) {
      setPumpState(true);
    } else {
      setPumpState(false);
    }
  } else {
    Serial.println("Command poll failed: " + http.errorToString(httpCode));
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== ESP32 Pump Controller Only ===");

  pinMode(RELAY_PIN, OUTPUT);
  setPumpState(false);
  secureClient.setInsecure();
  connectToWiFi();
  lastCommandPollAt = millis() - COMMAND_POLL_INTERVAL_MS;
  lastStatusReportAt = millis() - STATUS_REPORT_INTERVAL_MS;
  lastWiFiAt = millis() - WIFI_RECONNECT_INTERVAL_MS;
}

void loop() {
  unsigned long now = millis();

  if (now - lastWiFiAt >= WIFI_RECONNECT_INTERVAL_MS) {
    lastWiFiAt = now;
    if (WiFi.status() != WL_CONNECTED) {
      connectToWiFi();
    }
  }

  if (now - lastCommandPollAt >= COMMAND_POLL_INTERVAL_MS) {
    lastCommandPollAt = now;
    pollPumpCommand();
  }

  if (now - lastStatusReportAt >= STATUS_REPORT_INTERVAL_MS) {
    lastStatusReportAt = now;
    sendStatusReport();
  }

  delay(50);
}
