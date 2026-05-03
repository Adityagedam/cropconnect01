#include <WebServer.h>
#include <WiFi.h>

// Replace these values before flashing.
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_KEY = "dev-secret-key";

// Relay pins. Change these to match your ESP32 wiring.
const int PUMP_1_RELAY_PIN = 26;
const int PUMP_2_RELAY_PIN = 27;

// Most relay boards are active LOW. Set false if your relay turns on with HIGH.
const bool RELAY_ACTIVE_LOW = true;

WebServer server(80);
const char* HEADER_KEYS[] = {"X-API-Key"};

void writePumpRelay(int pin, bool on) {
  if (RELAY_ACTIVE_LOW) {
    digitalWrite(pin, on ? LOW : HIGH);
  } else {
    digitalWrite(pin, on ? HIGH : LOW);
  }
}

bool headerApiKeyIsValid() {
  if (String(API_KEY).length() == 0) {
    return true;
  }

  return server.header("X-API-Key") == API_KEY;
}

String jsonValue(String body, String key) {
  String quotedKey = "\"" + key + "\"";
  int keyIndex = body.indexOf(quotedKey);
  if (keyIndex < 0) {
    return "";
  }

  int colonIndex = body.indexOf(":", keyIndex + quotedKey.length());
  if (colonIndex < 0) {
    return "";
  }

  int valueStart = colonIndex + 1;
  while (valueStart < body.length() && isspace(body[valueStart])) {
    valueStart++;
  }

  if (valueStart < body.length() && body[valueStart] == '"') {
    int valueEnd = body.indexOf("\"", valueStart + 1);
    return valueEnd > valueStart ? body.substring(valueStart + 1, valueEnd) : "";
  }

  int valueEnd = valueStart;
  while (
    valueEnd < body.length() &&
    body[valueEnd] != ',' &&
    body[valueEnd] != '}'
  ) {
    valueEnd++;
  }

  String value = body.substring(valueStart, valueEnd);
  value.trim();
  return value;
}

int pumpPinFromId(String pumpId) {
  pumpId.toLowerCase();

  if (pumpId == "1" || pumpId == "pump1") {
    return PUMP_1_RELAY_PIN;
  }
  if (pumpId == "2" || pumpId == "pump2") {
    return PUMP_2_RELAY_PIN;
  }

  return -1;
}

bool stateFromValue(String value) {
  value.toLowerCase();
  return value == "on" || value == "true" || value == "1";
}

void sendCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type, X-API-Key");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

void handleOptions() {
  sendCorsHeaders();
  server.send(204);
}

void handleHealth() {
  sendCorsHeaders();
  server.send(
    200,
    "application/json",
    "{\"ok\":true,\"service\":\"CropConnect ESP32 pump controller\"}"
  );
}

void handlePump() {
  sendCorsHeaders();

  if (!headerApiKeyIsValid()) {
    server.send(401, "application/json", "{\"ok\":false,\"error\":\"Invalid API key\"}");
    return;
  }

  String pumpId = server.arg("pump");
  String stateValue = server.arg("state");

  if (server.method() == HTTP_POST && server.hasArg("plain")) {
    String body = server.arg("plain");

    String jsonPump = jsonValue(body, "pump");
    String jsonPumpId = jsonValue(body, "pump_id");
    String jsonState = jsonValue(body, "state");
    String jsonOn = jsonValue(body, "on");

    if (jsonPump.length() > 0) {
      pumpId = jsonPump;
    } else if (jsonPumpId.length() > 0) {
      pumpId = jsonPumpId;
    }

    if (jsonState.length() > 0) {
      stateValue = jsonState;
    } else if (jsonOn.length() > 0) {
      stateValue = jsonOn;
    }
  }

  int relayPin = pumpPinFromId(pumpId);
  if (relayPin < 0) {
    server.send(400, "application/json", "{\"ok\":false,\"error\":\"Unknown pump\"}");
    return;
  }

  bool turnOn = stateFromValue(stateValue);
  writePumpRelay(relayPin, turnOn);

  String response = "{";
  response += "\"ok\":true,";
  response += "\"pump\":\"" + pumpId + "\",";
  response += "\"state\":\"" + String(turnOn ? "on" : "off") + "\",";
  response += "\"relay_pin\":" + String(relayPin);
  response += "}";

  server.send(200, "application/json", response);
}

void setup() {
  Serial.begin(115200);

  pinMode(PUMP_1_RELAY_PIN, OUTPUT);
  pinMode(PUMP_2_RELAY_PIN, OUTPUT);
  writePumpRelay(PUMP_1_RELAY_PIN, false);
  writePumpRelay(PUMP_2_RELAY_PIN, false);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("ESP32 pump controller IP: ");
  Serial.println(WiFi.localIP());

  server.collectHeaders(HEADER_KEYS, 1);
  server.on("/", HTTP_GET, handleHealth);
  server.on("/health", HTTP_GET, handleHealth);
  server.on("/pump", HTTP_OPTIONS, handleOptions);
  server.on("/pump", HTTP_GET, handlePump);
  server.on("/pump", HTTP_POST, handlePump);
  server.begin();

  Serial.println("HTTP server ready on port 80");
}

void loop() {
  server.handleClient();
}
