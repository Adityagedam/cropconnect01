/*
 * ESP32 Pump Controller for CropConnect
 *
 * This code controls irrigation pumps via WiFi commands from the CropConnect backend.
 * It polls the backend every 3 seconds for relay commands and controls up to 8 relays.
 *
 * Hardware Requirements:
 * - ESP32 board
 * - 8-channel relay module (active LOW)
 * - Relay pins: GPIO 19, 18, 5, 17, 32, 33, 25, 14
 *
 * Setup Instructions:
 * 1. Update WiFi credentials below
 * 2. Update API_KEY if changed in backend
 * 3. Update server URLs if needed
 * 4. Upload to ESP32
 * 5. Monitor Serial output for connection status
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

// ===== CONFIGURATION =====
// Update these values for your setup

// WiFi Configuration
const char* WIFI_SSID = "YOUR_WIFI_SSID";           // Replace with your WiFi name
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";   // Replace with your WiFi password

// API Configuration
const char* API_KEY = "dev-secret-key";             // Must match backend ESP32_API_KEY
const char* COMMAND_URL = "https://cropconnect01-production.up.railway.app/api/esp32/relay-command";
const char* STATUS_URL = "https://cropconnect01-production.up.railway.app/api/esp32/relay-status";

// Relay Configuration
const int RELAY_COUNT = 8;
const int RELAY_PINS[RELAY_COUNT] = {19, 18, 5, 17, 32, 33, 25, 14};  // GPIO pins for relays
const bool RELAY_ACTIVE_LOW = true;  // Set to false if your relays are active HIGH

// Timing Configuration
const unsigned long POLL_INTERVAL_MS = 3000;  // Poll backend every 3 seconds
const unsigned long WIFI_RECONNECT_DELAY_MS = 5000;  // Wait 5 seconds before WiFi reconnect

// ===== GLOBAL VARIABLES =====
bool relayStates[RELAY_COUNT] = {false, false, false, false, false, false, false, false};
unsigned long lastPollAt = 0;
unsigned long lastWiFiCheckAt = 0;
int wifiReconnectAttempts = 0;

WiFiClientSecure secureClient;

// ===== RELAY CONTROL FUNCTIONS =====

/*
 * Controls a single relay
 * relayIndex: 0-7 (corresponding to relay 1-8)
 * on: true to turn ON, false to turn OFF
 */
void writeRelay(int relayIndex, bool on) {
  if (relayIndex < 0 || relayIndex >= RELAY_COUNT) {
    Serial.println("ERROR: Invalid relay index: " + String(relayIndex));
    return;
  }

  relayStates[relayIndex] = on;

  if (RELAY_ACTIVE_LOW) {
    // Active LOW: LOW = ON, HIGH = OFF
    digitalWrite(RELAY_PINS[relayIndex], on ? LOW : HIGH);
  } else {
    // Active HIGH: HIGH = ON, LOW = OFF
    digitalWrite(RELAY_PINS[relayIndex], on ? HIGH : LOW);
  }

  Serial.println("Relay " + String(relayIndex + 1) + " set to " + (on ? "ON" : "OFF"));
}

/*
 * Turns all relays on or off
 */
void setAllRelays(bool on) {
  Serial.println("Setting ALL relays to " + String(on ? "ON" : "OFF"));
  for (int i = 0; i < RELAY_COUNT; i++) {
    writeRelay(i, on);
  }
}

/*
 * Parses and applies relay commands from backend
 * Expected format: "1on 2off 3on 4off..." or "allon" or "alloff"
 */
void applyCommandPayload(String payload) {
  payload.toLowerCase();
  payload.trim();

  Serial.println("Received command: '" + payload + "'");

  // Handle global commands
  if (payload.indexOf("allon") != -1) {
    setAllRelays(true);
    return;
  }
  if (payload.indexOf("alloff") != -1) {
    setAllRelays(false);
    return;
  }

  // Handle individual relay commands
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

// ===== COMMUNICATION FUNCTIONS =====

/*
 * Creates JSON status payload for backend
 */
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

/*
 * Sends current relay status to backend
 */
void postRelayStatus() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, skipping status update");
    return;
  }

  HTTPClient http;
  http.begin(secureClient, STATUS_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", API_KEY);

  String jsonPayload = relayStatusJson();
  Serial.println("Sending status: " + jsonPayload);

  int httpCode = http.POST(jsonPayload);
  if (httpCode > 0) {
    Serial.println("Status POST: HTTP " + String(httpCode));
  } else {
    Serial.println("Status POST failed: " + http.errorToString(httpCode));
  }

  http.end();
}

/*
 * Polls backend for new relay commands
 */
void pollRelayCommand() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, attempting reconnection...");
    connectToWiFi();
    return;
  }

  HTTPClient http;
  http.begin(secureClient, COMMAND_URL);

  Serial.println("Polling for commands...");
  int httpCode = http.GET();

  if (httpCode == 200) {
    String payload = http.getString();
    http.end();

    if (payload.length() > 0) {
      applyCommandPayload(payload);
      postRelayStatus();
    } else {
      Serial.println("Empty command payload received");
    }
    return;
  } else if (httpCode > 0) {
    Serial.println("Command GET HTTP error: " + String(httpCode));
    String response = http.getString();
    Serial.println("Response: " + response);
  } else {
    Serial.println("Command GET failed: " + http.errorToString(httpCode));
  }

  http.end();
}

// ===== WIFI MANAGEMENT =====

/*
 * Connects to WiFi network
 */
void connectToWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.println("Connecting to WiFi: " + String(WIFI_SSID));

  WiFi.disconnect();
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startTime < 30000) {  // 30 second timeout
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi connected!");
    Serial.print("ESP32 IP: ");
    Serial.println(WiFi.localIP());
    wifiReconnectAttempts = 0;
  } else {
    Serial.println();
    Serial.println("WiFi connection failed!");
    wifiReconnectAttempts++;
  }
}

// ===== SETUP AND LOOP =====

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=== ESP32 Pump Controller Starting ===");

  // Initialize relay pins
  Serial.println("Initializing relay pins...");
  for (int i = 0; i < RELAY_COUNT; i++) {
    pinMode(RELAY_PINS[i], OUTPUT);
    writeRelay(i, false);  // Start with all relays OFF
    Serial.println("Relay " + String(i + 1) + " pin: GPIO" + String(RELAY_PINS[i]));
  }

  // Configure secure client
  secureClient.setInsecure();  // For development - use proper certificates in production

  // Connect to WiFi
  connectToWiFi();

  // Initial command poll
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Performing initial command poll...");
    pollRelayCommand();
  }

  Serial.println("=== Setup Complete ===");
}

void loop() {
  unsigned long now = millis();

  // Poll for commands at regular intervals
  if (now - lastPollAt >= POLL_INTERVAL_MS) {
    lastPollAt = now;
    pollRelayCommand();
  }

  // Periodic WiFi health check
  if (now - lastWiFiCheckAt >= WIFI_RECONNECT_DELAY_MS) {
    lastWiFiCheckAt = now;
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi connection lost, attempting reconnection...");
      connectToWiFi();
    }
  }

  // Small delay to prevent watchdog issues
  delay(100);
}