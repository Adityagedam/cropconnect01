/*
 * ESP32 pH Sensor Telemetry Only for CropConnect
 *
 * Reads pH probe analog voltage from GPIO 34 and sends pH telemetry to
 * CropConnect over WiFi. Also displays pH on an I2C OLED screen.
 *
 * Update:
 * - WIFI_SSID
 * - WIFI_PASSWORD
 * - DEVICE_ID to match your dashboard sensor setup
 *
 * OLED wiring for common 0.96" SSD1306 I2C display:
 * - OLED SDA -> ESP32 GPIO 21
 * - OLED SCL -> ESP32 GPIO 22
 * - OLED VCC -> 3.3V
 * - OLED GND -> GND
 *
 * Libraries required:
 * - Adafruit SSD1306
 * - Adafruit GFX Library
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ===== WIFI CONFIGURATION =====
const char* WIFI_SSID = "motorola edge 20 fusion_2684";
const char* WIFI_PASSWORD = "12345678";

// ===== CROPConnect API CONFIGURATION =====
const char* API_KEY = "dev-secret-key";
const char* DEVICE_ID = "sim-node-1";
const char* TELEMETRY_URL = "https://cropconnect01-production.up.railway.app/api/telemetry/ingest";

// ===== pH SENSOR CONFIGURATION =====
#define PH_PIN 34

// Your pH module has a low-voltage output range, so status is read from
// these voltage bands based on your tested code.
const float ACIDIC_MAX_VOLTAGE = 1.58;
const float BASIC_MIN_VOLTAGE = 1.69;

// The CropConnect dashboard expects a numeric pH value.
// These values represent the sensor status band. For exact pH, use buffer calibration.
const float ACIDIC_PH_VALUE = 6.0;
const float NEUTRAL_PH_VALUE = 7.0;
const float BASIC_PH_VALUE = 8.0;

// ===== OLED DISPLAY CONFIGURATION =====
const int SCREEN_WIDTH = 128;
const int SCREEN_HEIGHT = 64;
const int OLED_RESET = -1;
const int OLED_ADDRESS = 0x3C;
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
bool displayReady = false;

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
  if (voltage < ACIDIC_MAX_VOLTAGE) {
    return "ACIDIC";
  }
  if (voltage > BASIC_MIN_VOLTAGE) {
    return "BASIC";
  }
  return "NEUTRAL";
}

float phValueFromStatus(String status) {
  if (status == "ACIDIC") {
    return ACIDIC_PH_VALUE;
  }
  if (status == "BASIC") {
    return BASIC_PH_VALUE;
  }
  return NEUTRAL_PH_VALUE;
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

void updateDisplay(float phValue, float voltage, String status, bool sentOk) {
  if (!displayReady) {
    return;
  }

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("CropConnect pH");

  display.setTextSize(2);
  display.setCursor(0, 18);
  display.print("pH ");
  display.println(phValue, 2);

  display.setTextSize(1);
  display.setCursor(0, 44);
  display.print("Volt: ");
  display.print(voltage, 3);
  display.println(" V");
  display.print(status);
  display.print(" | ");
  display.println(sentOk ? "Sent" : "Waiting");
  display.display();
}

String buildTelemetryJson(float phValue, float voltage, String status) {
  String body = "{";
  body += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  body += "\"ph\":" + String(phValue, 2);
  body += "}";
  return body;
}

bool postTelemetry(const String& payload) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, telemetry skipped");
    return false;
  }

  HTTPClient http;
  http.begin(secureClient, TELEMETRY_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", API_KEY);

  Serial.println("Sending telemetry:");
  Serial.println(payload);

  int httpCode = http.POST(payload);
  bool sentOk = httpCode >= 200 && httpCode < 300;
  if (httpCode > 0) {
    Serial.println("Telemetry POST HTTP " + String(httpCode));
    Serial.println("Response: " + http.getString());
  } else {
    Serial.println("Telemetry POST failed: " + http.errorToString(httpCode));
  }

  http.end();
  return sentOk;
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("=== CropConnect pH Sensor Telemetry Only ===");

  pinMode(PH_PIN, INPUT);
  secureClient.setInsecure();

  Wire.begin(21, 22);
  displayReady = display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS);
  if (displayReady) {
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println("CropConnect pH");
    display.println("Starting...");
    display.display();
  } else {
    Serial.println("OLED not found at 0x3C. pH telemetry will still work.");
  }

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
    float phValue = phValueFromStatus(status);

    Serial.print("Voltage: ");
    Serial.print(voltage, 3);
    Serial.print(" V | Status: ");
    Serial.print(status);
    Serial.print(" | Dashboard pH: ");
    Serial.println(phValue, 2);

    String payload = buildTelemetryJson(phValue, voltage, status);
    bool sentOk = postTelemetry(payload);
    updateDisplay(phValue, voltage, status, sentOk);
  }

  delay(50);
}
