#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

const char* WIFI_SSID = "motorola edge 20 fusion_2684";
const char* WIFI_PASSWORD = "12345678";
const char* API_KEY = "dev-secret-key";

const char* COMMAND_URL = "https://cropconnect01-production.up.railway.app/api/esp32/relay-command";
const char* STATUS_URL = "https://cropconnect01-production.up.railway.app/api/esp32/relay-status";

const int RELAY_COUNT = 8;
const int RELAY_PINS[RELAY_COUNT] = {19, 18, 5, 17, 32, 33, 25, 14};
const bool RELAY_ACTIVE_LOW = true;

bool relayStates[RELAY_COUNT] = {false, false, false, false, false, false, false, false};
unsigned long lastPollAt = 0;
const unsigned long POLL_INTERVAL_MS = 3000;

WiFiClientSecure secureClient;

void writeRelay(int relayIndex, bool on) {
  relayStates[relayIndex] = on;
  if (RELAY_ACTIVE_LOW) {
    digitalWrite(RELAY_PINS[relayIndex], on ? LOW : HIGH);
  } else {
    digitalWrite(RELAY_PINS[relayIndex], on ? HIGH : LOW);
  }
}

void setAllRelays(bool on) {
  for (int i = 0; i < RELAY_COUNT; i++) {
    writeRelay(i, on);
  }
}

void applyCommandPayload(String payload) {
  payload.toLowerCase();
  payload.trim();

  Serial.println("Command: " + payload);

  if (payload.indexOf("allon") != -1) {
    setAllRelays(true);
  }
  if (payload.indexOf("alloff") != -1) {
    setAllRelays(false);
  }

  for (int i = 0; i < RELAY_COUNT; i++) {
    String relayNumber = String(i + 1);
    if (payload.indexOf(relayNumber + "on") != -1) {
      writeRelay(i, true);
    }
    if (payload.indexOf(relayNumber + "off") != -1) {
      writeRelay(i, false);
    }
  }
}

String relayStatusJson() {
  String body = "{\"device_id\":\"esp32-relay-1\",\"relays\":{";
  for (int i = 0; i < RELAY_COUNT; i++) {
    if (i > 0) {
      body += ",";
    }
    body += "\"";
    body += String(i + 1);
    body += "\":";
    body += relayStates[i] ? "true" : "false";
  }
  body += "}}";
  return body;
}

void postRelayStatus() {
  HTTPClient http;
  http.begin(secureClient, STATUS_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", API_KEY);

  int httpCode = http.POST(relayStatusJson());
  if (httpCode > 0) {
    Serial.println("Status POST: " + String(httpCode));
  } else {
    Serial.println("Status POST failed: " + http.errorToString(httpCode));
  }

  http.end();
}

void pollRelayCommand() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    return;
  }

  HTTPClient http;
  http.begin(secureClient, COMMAND_URL);
  int httpCode = http.GET();

  if (httpCode == 200) {
    String payload = http.getString();
    http.end();
    applyCommandPayload(payload);
    postRelayStatus();
    return;
  } else if (httpCode > 0) {
    Serial.println("Command GET HTTP error: " + String(httpCode));
    Serial.println(http.getString());
  } else {
    Serial.println("Command GET failed: " + http.errorToString(httpCode));
  }

  http.end();
}

void setup() {
  Serial.begin(115200);

  for (int i = 0; i < RELAY_COUNT; i++) {
    pinMode(RELAY_PINS[i], OUTPUT);
    writeRelay(i, false);
  }

  secureClient.setInsecure();
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("Connected. ESP32 IP: ");
  Serial.println(WiFi.localIP());

  pollRelayCommand();
}

void loop() {
  unsigned long now = millis();
  if (now - lastPollAt >= POLL_INTERVAL_MS) {
    lastPollAt = now;
    pollRelayCommand();
  }
}
