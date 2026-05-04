#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <DHT.h>

// ===== CONFIGURATION =====
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_KEY = "dev-secret-key"; // Must match backend ESP32_API_KEY
const char* DEVICE_ID = "sim-node-1";  // Must be the exact device ID shown in your dashboard's sensor setup (e.g. farm-1777841576132)

const char* TELEMETRY_URL = "https://cropconnect01-production.up.railway.app/api/telemetry/ingest";

#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

const int SOIL_MOISTURE_PIN = 34;
const unsigned long TELEMETRY_INTERVAL_MS = 8000;
const unsigned long WIFI_RECONNECT_INTERVAL_MS = 5000;

float fakePh = 6.8;
float fakeN = 38.0;
float fakeP = 18.5;
float fakeK = 30.0;
unsigned long lastTelemetryAt = 0;
unsigned long lastWiFiAt = 0;
WiFiClientSecure secureClient;

float clampFloat(float value, float minValue, float maxValue) {
  if (value < minValue) return minValue;
  if (value > maxValue) return maxValue;
  return value;
}

float randomFloat(float low, float high) {
  return low + ((float)random(0, 1001) / 1000.0f) * (high - low);
}

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

float readSoilMoisture() {
  int raw = analogRead(SOIL_MOISTURE_PIN);
  raw = constrain(raw, 300, 3600);
  int percent = map(raw, 3600, 300, 0, 100);
  return clampFloat(percent, 0, 100);
}

bool readDHT(float& temperature, float& humidity) {
  humidity = dht.readHumidity();
  temperature = dht.readTemperature();
  return !isnan(humidity) && !isnan(temperature);
}

void driftFakeValues() {
  fakePh = clampFloat(fakePh + randomFloat(-0.05, 0.05), 5.8, 7.5);
  fakeN = clampFloat(fakeN + randomFloat(-0.5, 0.5), 20.0, 50.0);
  fakeP = clampFloat(fakeP + randomFloat(-0.3, 0.3), 10.0, 30.0);
  fakeK = clampFloat(fakeK + randomFloat(-0.4, 0.4), 20.0, 40.0);
}

String buildTelemetryBody(float soilMoisture, float temperature, float humidity) {
  driftFakeValues();

  String body = "{";
  body += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  body += "\"soil_moisture\":" + String(soilMoisture, 1) + ",";
  body += "\"humidity\":" + String(humidity, 1) + ",";
  body += "\"temperature\":" + String(temperature, 1) + ",";
  body += "\"ph\":" + String(fakePh, 2) + ",";
  body += "\"nitrogen\":" + String(fakeN, 1) + ",";
  body += "\"phosphorus\":" + String(fakeP, 1) + ",";
  body += "\"potassium\":" + String(fakeK, 1);
  body += "}";
  return body;
}

void postTelemetry(const String& payload) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("No WiFi, telemetry skipped");
    return;
  }

  HTTPClient http;
  http.begin(secureClient, TELEMETRY_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", API_KEY);

  int httpCode = http.POST(payload);
  if (httpCode > 0) {
    Serial.println("Telemetry POST HTTP " + String(httpCode));
    Serial.println("Payload: " + payload);
    Serial.println("Response: " + http.getString());
  } else {
    Serial.println("Telemetry POST failed: " + http.errorToString(httpCode));
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== ESP32 Sensor Telemetry Only ===");

  dht.begin();
  pinMode(SOIL_MOISTURE_PIN, INPUT);
  secureClient.setInsecure();
  randomSeed(analogRead(15));

  connectToWiFi();
  lastTelemetryAt = millis() - TELEMETRY_INTERVAL_MS;
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

  if (now - lastTelemetryAt >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryAt = now;

    float temperature = 0.0;
    float humidity = 0.0;
    bool dhtOk = readDHT(temperature, humidity);

    if (!dhtOk) {
      temperature = randomFloat(22.0, 30.0);
      humidity = randomFloat(45.0, 75.0);
      Serial.println("DHT read failed, using simulated temperature/humidity");
    }

    float soilMoisture = readSoilMoisture();
    Serial.println("Soil moisture: " + String(soilMoisture, 1) + "%");
    Serial.println("Temperature: " + String(temperature, 1) + " C");
    Serial.println("Humidity: " + String(humidity, 1) + "%");

    String payload = buildTelemetryBody(soilMoisture, temperature, humidity);
    postTelemetry(payload);
  }

  delay(50);
}
