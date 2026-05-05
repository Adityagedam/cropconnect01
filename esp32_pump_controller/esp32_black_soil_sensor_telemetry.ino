/*
 * ESP32 CropConnect Sensor Telemetry - SIM800L GPRS Version
 *
 * Real sensors:
 * - Soil moisture sensor on GPIO 34
 * - DHT22/DHT11 temperature + humidity sensor on GPIO 4
 * - RS485/Modbus soil NPK sensor
 *
 * Data transport:
 * - SIM800L GPRS, not WiFi
 *
 * Libraries required in Arduino IDE:
 * - TinyGSM
 * - ArduinoHttpClient
 * - DHT sensor library
 * - Adafruit Unified Sensor
 * - ModbusMaster
 *
 * Hardware notes:
 * - SIM800L needs a stable 4.0V supply with 2A peak current.
 * - Connect ESP32 GND and SIM800L GND together.
 * - Default wiring below:
 *   SIM800L TX -> ESP32 GPIO 16
 *   SIM800L RX -> ESP32 GPIO 17
 *
 * RS485 NPK sensor wiring through MAX485 module:
 *   MAX485 RO -> ESP32 GPIO 26
 *   MAX485 DI -> ESP32 GPIO 27
 *   MAX485 DE + RE -> ESP32 GPIO 25
 *   NPK sensor A -> MAX485 A
 *   NPK sensor B -> MAX485 B
 */

#define TINY_GSM_MODEM_SIM800

#include <TinyGsmClient.h>
#include <ArduinoHttpClient.h>
#include <DHT.h>
#include <ModbusMaster.h>

// ===== SIM800L / MOBILE NETWORK CONFIGURATION =====
// Replace APN settings with your SIM provider details.
// Common India examples:
// Airtel: airtelgprs.com
// Jio: jionet
// Vi: www
const char* APN = "airtelgprs.com";
const char* GPRS_USER = "";
const char* GPRS_PASS = "";

// SIM800L serial pins.
const int MODEM_RX_PIN = 16; // ESP32 RX pin, connect to SIM800L TX
const int MODEM_TX_PIN = 17; // ESP32 TX pin, connect to SIM800L RX
const unsigned long MODEM_BAUD = 9600;

// ===== CROPConnect API CONFIGURATION =====
const char* API_KEY = "dev-secret-key";
const char* DEVICE_ID = "sim-node-1";
const char* FIRMWARE_TAG = "REAL_SENSOR_ONLY_SIM800L_V2";

// SIM800L HTTPS can be unreliable with modern TLS/SNI.
// If HTTPS fails, deploy/use an HTTP telemetry proxy or local backend URL.
const char* API_HOST = "cropconnect01-production.up.railway.app";
const int API_PORT = 80;
const char* TELEMETRY_PATH = "/api/telemetry/ingest";

// ===== SENSOR PINS =====
#define DHTPIN 4
#define DHTTYPE DHT22
// Use DHT11 instead if needed:
// #define DHTTYPE DHT11

const int SOIL_MOISTURE_PIN = 34;

// ===== REAL NPK RS485/MODBUS CONFIGURATION =====
const int NPK_RX_PIN = 26;       // ESP32 RX pin, connect to MAX485 RO
const int NPK_TX_PIN = 27;       // ESP32 TX pin, connect to MAX485 DI
const int NPK_DE_RE_PIN = 25;    // Connect to MAX485 DE and RE
const unsigned long NPK_BAUD = 4800;
const uint8_t NPK_MODBUS_ID = 1;

// Many soil NPK sensors use holding registers 0x001E, 0x001F, 0x0020 for N/P/K.
// If your sensor datasheet uses 0x0004, 0x0005, 0x0006, change this to 0x0004.
const uint16_t NPK_REGISTER_START = 0x001E;

// Calibrate these two values for your soil moisture sensor.
// Read Serial Monitor in dry air and wet soil, then update these numbers.
const int SOIL_DRY_RAW = 3600;
const int SOIL_WET_RAW = 1200;

// ===== TIMING =====
const unsigned long TELEMETRY_INTERVAL_MS = 10000;
const unsigned long NETWORK_RECONNECT_INTERVAL_MS = 10000;

DHT dht(DHTPIN, DHTTYPE);
HardwareSerial SerialAT(2);
HardwareSerial NpkSerial(1);
TinyGsm modem(SerialAT);
TinyGsmClient gsmClient(modem);
HttpClient http(gsmClient, API_HOST, API_PORT);
ModbusMaster npkNode;

unsigned long lastTelemetryAt = 0;
unsigned long lastNetworkCheckAt = 0;

float nitrogen = 0.0;
float phosphorus = 0.0;
float potassium = 0.0;

float clampFloat(float value, float minValue, float maxValue) {
  if (value < minValue) return minValue;
  if (value > maxValue) return maxValue;
  return value;
}

bool connectToGprs() {
  if (modem.isGprsConnected()) {
    return true;
  }

  Serial.println();
  Serial.println("Checking modem...");
  if (!modem.testAT(10000)) {
    Serial.println("SIM800L not responding. Check wiring and power.");
    return false;
  }

  Serial.println("Waiting for mobile network...");
  if (!modem.waitForNetwork(60000L)) {
    Serial.println("Network registration failed");
    return false;
  }

  Serial.println("Network connected");
  Serial.print("Signal quality: ");
  Serial.println(modem.getSignalQuality());

  Serial.println("Connecting GPRS with APN: " + String(APN));
  if (!modem.gprsConnect(APN, GPRS_USER, GPRS_PASS)) {
    Serial.println("GPRS connection failed");
    return false;
  }

  Serial.println("GPRS connected");
  Serial.print("Local IP: ");
  Serial.println(modem.localIP());
  return true;
}

bool readSoilMoisturePercent(float& soilMoisture, int& raw) {
  raw = analogRead(SOIL_MOISTURE_PIN);

  if (raw <= 20 || raw >= 4075) {
    Serial.println("Soil moisture ADC invalid or disconnected: " + String(raw));
    return false;
  }

  int moisture = map(raw, SOIL_DRY_RAW, SOIL_WET_RAW, 0, 100);
  moisture = constrain(moisture, 0, 100);

  Serial.println("Soil moisture raw ADC: " + String(raw));
  soilMoisture = (float)moisture;
  return true;
}

bool readDhtValues(float& temperature, float& humidity) {
  humidity = dht.readHumidity();
  temperature = dht.readTemperature();

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("DHT read failed");
    return false;
  }

  return true;
}

void preTransmission() {
  digitalWrite(NPK_DE_RE_PIN, HIGH);
}

void postTransmission() {
  digitalWrite(NPK_DE_RE_PIN, LOW);
}

bool readNpkSensor(float& n, float& p, float& k) {
  uint8_t result = npkNode.readHoldingRegisters(NPK_REGISTER_START, 3);

  if (result != npkNode.ku8MBSuccess) {
    Serial.println("NPK Modbus read failed. Error: " + String(result));
    return false;
  }

  n = (float)npkNode.getResponseBuffer(0);
  p = (float)npkNode.getResponseBuffer(1);
  k = (float)npkNode.getResponseBuffer(2);

  if ((n + p + k) <= 0) {
    Serial.println("NPK Modbus returned all zero values. Check sensor power, soil contact, and register address.");
    return false;
  }

  return true;
}

String buildTelemetryJson(float soilMoisture, float temperature, float humidity, float n, float p, float k) {
  String body = "{";
  body += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  body += "\"soil_moisture\":" + String(soilMoisture, 1) + ",";
  body += "\"humidity\":" + String(humidity, 1) + ",";
  body += "\"temperature\":" + String(temperature, 1) + ",";
  body += "\"nitrogen\":" + String(n, 1) + ",";
  body += "\"phosphorus\":" + String(p, 1) + ",";
  body += "\"potassium\":" + String(k, 1);
  body += "}";

  return body;
}

void postTelemetry(const String& payload) {
  if (!connectToGprs()) {
    Serial.println("No GPRS, telemetry skipped");
    return;
  }

  Serial.println("Sending telemetry through SIM800L:");
  Serial.println(payload);

  http.stop();
  http.beginRequest();
  http.post(TELEMETRY_PATH);
  http.sendHeader("Host", API_HOST);
  http.sendHeader("Content-Type", "application/json");
  http.sendHeader("X-API-Key", API_KEY);
  http.sendHeader("Content-Length", payload.length());
  http.beginBody();
  http.print(payload);
  http.endRequest();

  int statusCode = http.responseStatusCode();
  String response = http.responseBody();

  Serial.println("Telemetry POST HTTP " + String(statusCode));
  Serial.println("Response: " + response);
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("=== CropConnect Black Soil Sensor Telemetry - SIM800L ===");
  Serial.println("Firmware: " + String(FIRMWARE_TAG));
  Serial.println("Real: soil moisture, temperature, humidity, NPK");

  dht.begin();
  pinMode(SOIL_MOISTURE_PIN, INPUT);
  pinMode(NPK_DE_RE_PIN, OUTPUT);
  digitalWrite(NPK_DE_RE_PIN, LOW);

  SerialAT.begin(MODEM_BAUD, SERIAL_8N1, MODEM_RX_PIN, MODEM_TX_PIN);
  NpkSerial.begin(NPK_BAUD, SERIAL_8N1, NPK_RX_PIN, NPK_TX_PIN);
  npkNode.begin(NPK_MODBUS_ID, NpkSerial);
  npkNode.preTransmission(preTransmission);
  npkNode.postTransmission(postTransmission);
  delay(3000);

  Serial.println("Restarting SIM800L modem...");
  modem.restart();

  connectToGprs();

  lastTelemetryAt = millis() - TELEMETRY_INTERVAL_MS;
  lastNetworkCheckAt = millis() - NETWORK_RECONNECT_INTERVAL_MS;
}

void loop() {
  unsigned long now = millis();

  if (now - lastNetworkCheckAt >= NETWORK_RECONNECT_INTERVAL_MS) {
    lastNetworkCheckAt = now;
    if (!modem.isGprsConnected()) {
      connectToGprs();
    }
  }

  if (now - lastTelemetryAt >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryAt = now;

    float temperature = 0.0;
    float humidity = 0.0;
    bool dhtOk = readDhtValues(temperature, humidity);

    if (!dhtOk) {
      Serial.println("Skipping telemetry until DHT gives a valid reading");
      return;
    }

    float soilMoisture = 0.0;
    int soilRaw = 0;
    bool soilOk = readSoilMoisturePercent(soilMoisture, soilRaw);
    if (!soilOk) {
      Serial.println("Skipping telemetry until real soil moisture sensor gives a valid reading");
      return;
    }

    bool npkOk = readNpkSensor(nitrogen, phosphorus, potassium);
    if (!npkOk) {
      Serial.println("Skipping telemetry until real NPK sensor gives a valid reading");
      return;
    }

    Serial.println("Soil moisture: " + String(soilMoisture, 1) + "%");
    Serial.println("Soil moisture proof raw ADC: " + String(soilRaw));
    Serial.println("Temperature: " + String(temperature, 1) + " C");
    Serial.println("Humidity: " + String(humidity, 1) + "%");
    Serial.println("Real NPK: " + String(nitrogen, 1) + "/" + String(phosphorus, 1) + "/" + String(potassium, 1) + " mg/kg");

    String payload = buildTelemetryJson(soilMoisture, temperature, humidity, nitrogen, phosphorus, potassium);
    postTelemetry(payload);
  }

  delay(50);
}
