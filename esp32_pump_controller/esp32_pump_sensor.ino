#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <DHT.h>

// ===== CONFIGURATION =====
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_KEY = "dev-secret-key"; // Must match backend ESP32_API_KEY
const char* DEVICE_ID = "sim-node-1";  // Use the same device_id your frontend expects

const char* COMMAND_URL = "https://cropconnect01-production.up.railway.app/api/esp32/relay-command";
const char* STATUS_URL = "https://cropconnect01-production.up.railway.app/api/esp32/relay-status";
const char* TELEMETRY_URL = "https://cropconnect01-production.up.railway.app/api/telemetry/ingest";

// DHT sensor configuration
#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// Soil moisture sensor configuration
const int SOIL_MOISTURE_PIN = 34; // Analog pin for soil moisture sensor

// Relay configuration
const int RELAY_COUNT = 8;
const int RELAY_PINS[RELAY_COUNT] = {19, 18, 5, 17, 32, 33, 25, 14};
const bool RELAY_ACTIVE_LOW = true;

// Timing configuration
const unsigned long COMMAND_POLL_INTERVAL_MS = 3000;
const unsigned long TELEMETRY_INTERVAL_MS = 8000;
const unsigned long WIFI_RECONNECT_INTERVAL_MS = 5000;

// Global state
bool relayStates[RELAY_COUNT] = {false, false, false, false, false, false, false, false};
float fakePh = 6.8;
float fakeN = 38.0;
float fakeP = 18.5;
float fakeK = 30.0;
unsigned long lastCommandPollAt = 0;
unsigned long lastTelemetryAt = 0;
unsigned long lastWiFiCheckAt = 0;

WiFiClientSecure secureClient;

float clampFloat(float value, float minValue, float maxValue) {
  if (value < minValue) return minValue;
  if (value > maxValue) return maxValue;
  return value;
}

float getRandomFloat(float minValue, float maxValue) {
  return minValue + ((float)random(0, 1001) / 1000.0f) * (maxValue - minValue);
}

void writeRelay(int relayIndex, bool on) {
  if (relayIndex < 0 || relayIndex >= RELAY_COUNT) {
    Serial.println("Invalid relay index: " + String(relayIndex));
    return;
  }

  relayStates[relayIndex] = on;
  if (RELAY_ACTIVE_LOW) {
    digitalWrite(RELAY_PINS[relayIndex], on ? LOW : HIGH);
  } else {
    digitalWrite(RELAY_PINS[relayIndex], on ? HIGH : LOW);
  }

  Serial.println("Relay " + String(relayIndex + 1) + " " + (on ? "ON" : "OFF"));
}

void setAllRelays(bool on) {
  Serial.println("Setting all relays " + String(on ? "ON" : "OFF"));
  for (int i = 0; i < RELAY_COUNT; i++) {
    writeRelay(i, on);
  }
}

void applyCommandPayload(const String& payloadRaw) {
  String payload = payloadRaw;
  payload.toLowerCase();
  payload.trim();

  Serial.println("Command payload: " + payload);

  if (payload.indexOf("allon") >= 0) {
    setAllRelays(true);
    return;
  }
  if (payload.indexOf("alloff") >= 0) {
    setAllRelays(false);
    return;
  }

  for (int i = 0; i < RELAY_COUNT; i++) {
    String relayNumber = String(i + 1);
    if (payload.indexOf(relayNumber + "on") >= 0) {
      writeRelay(i, true);
    }
    if (payload.indexOf(relayNumber + "off") >= 0) {
      writeRelay(i, false);
    }
  }
}

bool readDHTSensor(float& temperature, float& humidity) {
  humidity = dht.readHumidity();
  temperature = dht.readTemperature();
  if (isnan(humidity) || isnan(temperature)) {
    return false;
  }
  return true;
}

float readSoilMoisture() {
  int raw = analogRead(SOIL_MOISTURE_PIN);
  raw = constrain(raw, 300, 3600);
  int percent = map(raw, 3600, 300, 0, 100);
  return clampFloat(percent, 0, 100);
}

void driftFakeChemicals() {
  fakePh = clampFloat(fakePh + getRandomFloat(-0.05, 0.05), 5.8, 7.5);
  fakeN = clampFloat(fakeN + getRandomFloat(-0.5, 0.5), 20.0, 50.0);
  fakeP = clampFloat(fakeP + getRandomFloat(-0.3, 0.3), 10.0, 30.0);
  fakeK = clampFloat(fakeK + getRandomFloat(-0.4, 0.4), 20.0, 40.0);
}

String buildTelemetryJson(float soilMoisture, float temperature, float humidity) {
  driftFakeChemicals();

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

void postTelemetry() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, skipping telemetry");
    return;
  }

  float soilMoisture = readSoilMoisture();
  float temperature = 0.0;
  float humidity = 0.0;
  bool hasDHT = readDHTSensor(temperature, humidity);

  if (!hasDHT) {
    temperature = getRandomFloat(22.0, 30.0);
    humidity = getRandomFloat(45.0, 75.0);
    Serial.println("DHT read failed, using generated temperature/humidity values");
  }

  String payload = buildTelemetryJson(soilMoisture, temperature, humidity);
  Serial.println("Telemetry payload: " + payload);

  HTTPClient http;
  http.begin(secureClient, TELEMETRY_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", API_KEY);

  int httpCode = http.POST(payload);
  if (httpCode > 0) {
    Serial.println("Telemetry POST HTTP " + String(httpCode));
    String response = http.getString();
    Serial.println("Telemetry response: " + response);
  } else {
    Serial.println("Telemetry POST failed: " + http.errorToString(httpCode));
  }

  http.end();
}

void postRelayStatus() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  String body = "{";
  body += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  body += "\"relays\":{";
  for (int i = 0; i < RELAY_COUNT; i++) {
    if (i > 0) body += ",";
    body += "\"" + String(i + 1) + "\":" + (relayStates[i] ? "true" : "false");
  }
  body += "}}";

  HTTPClient http;
  http.begin(secureClient, STATUS_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", API_KEY);

  int httpCode = http.POST(body);
  if (httpCode > 0) {
    Serial.println("Status POST HTTP " + String(httpCode));
  } else {
    Serial.println("Status POST failed: " + http.errorToString(httpCode));
  }

  http.end();
}

void pollRelayCommand() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, reconnecting...");
    return;
  }

  HTTPClient http;
  http.begin(secureClient, COMMAND_URL);

  int httpCode = http.GET();
  if (httpCode == 200) {
    String payload = http.getString();
    applyCommandPayload(payload);
    postRelayStatus();
  } else if (httpCode > 0) {
    Serial.println("Command GET HTTP error " + String(httpCode));
  } else {
    Serial.println("Command GET failed: " + http.errorToString(httpCode));
  }

  http.end();
}

void connectToWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
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
  } else {
    Serial.println("\nWiFi connect failed");
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== ESP32 Pump + Sensor Controller ===");

  for (int i = 0; i < RELAY_COUNT; i++) {
    pinMode(RELAY_PINS[i], OUTPUT);
    writeRelay(i, false);
  }

  pinMode(SOIL_MOISTURE_PIN, INPUT);
  dht.begin();

  secureClient.setInsecure();
  randomSeed(analogRead(15));

  connectToWiFi();
  lastTelemetryAt = millis() - TELEMETRY_INTERVAL_MS;
  lastCommandPollAt = millis() - COMMAND_POLL_INTERVAL_MS;
}

void loop() {
  unsigned long now = millis();

  if (now - lastWiFiCheckAt >= WIFI_RECONNECT_INTERVAL_MS) {
    lastWiFiCheckAt = now;
    if (WiFi.status() != WL_CONNECTED) {
      connectToWiFi();
    }
  }

  if (now - lastCommandPollAt >= COMMAND_POLL_INTERVAL_MS) {
    lastCommandPollAt = now;
    pollRelayCommand();
  }

  if (now - lastTelemetryAt >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryAt = now;
    postTelemetry();
  }

  delay(50);
}
