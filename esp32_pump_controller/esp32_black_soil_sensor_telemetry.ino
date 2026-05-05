/*
 * ESP32 CropConnect Sensor Telemetry - WiFi Version
 *
 * Real sensors:
 * - Soil moisture sensor on GPIO 34
 * - DHT22/DHT11 temperature + humidity sensor on GPIO 4
 * - RS485/Modbus soil NPK sensor, with demo fallback if NPK is not connected
 *
 * Data transport:
 * - WiFi HTTPS upload to CropConnect
 *
 * Libraries required in Arduino IDE:
 * - DHT sensor library
 * - Adafruit Unified Sensor
 * - ModbusMaster
 * - Adafruit SSD1306
 * - Adafruit GFX Library
 *
 * RS485 NPK sensor wiring through MAX485 module:
 *   MAX485 RO -> ESP32 GPIO 26
 *   MAX485 DI -> ESP32 GPIO 27
 *   MAX485 DE + RE -> ESP32 GPIO 25
 *   NPK sensor A -> MAX485 A
 *   NPK sensor B -> MAX485 B
 *
 * OLED wiring for common 0.96" SSD1306 I2C display:
 *   OLED SDA -> ESP32 GPIO 21
 *   OLED SCL -> ESP32 GPIO 22
 *   OLED VCC -> 3.3V
 *   OLED GND -> GND
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <DHT.h>
#include <ModbusMaster.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ===== WIFI CONFIGURATION =====
const char* WIFI_SSID = "motorola edge 20 fusion_2684";
const char* WIFI_PASSWORD = "12345678";

// ===== CROPConnect API CONFIGURATION =====
const char* API_KEY = "dev-secret-key";
const char* DEVICE_ID = "sim-node-1";
const char* FIRMWARE_TAG = "REAL_SENSOR_ONLY_WIFI_V1";
const char* TELEMETRY_URL = "https://cropconnect01-production.up.railway.app/api/telemetry/ingest";

// ===== SENSOR PINS =====
#define DHTPIN 4
#define DHTTYPE DHT22
// Use DHT11 instead if needed:
// #define DHTTYPE DHT11

const int SOIL_MOISTURE_PIN = 34;
const float FIXED_PH_VALUE = 7.0;

// ===== OLED DISPLAY CONFIGURATION =====
const int SCREEN_WIDTH = 128;
const int SCREEN_HEIGHT = 64;
const int OLED_RESET = -1;
const int OLED_ADDRESS = 0x3C;
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
bool displayReady = false;

// ===== REAL NPK RS485/MODBUS CONFIGURATION =====
const int NPK_RX_PIN = 26;       // ESP32 RX pin, connect to MAX485 RO
const int NPK_TX_PIN = 27;       // ESP32 TX pin, connect to MAX485 DI
const int NPK_DE_RE_PIN = 25;    // Connect to MAX485 DE and RE
const unsigned long NPK_BAUD = 4800;
const uint8_t NPK_MODBUS_ID = 1;

// Many soil NPK sensors use holding registers 0x001E, 0x001F, 0x0020 for N/P/K.
// If your sensor datasheet uses 0x0004, 0x0005, 0x0006, change this to 0x0004.
const uint16_t NPK_REGISTER_START = 0x001E;

// Set true to keep the website receiving soil/DHT data when the NPK Modbus sensor fails.
// The fallback is a black-soil demo profile and is clearly printed on Serial/OLED.
const bool USE_FAKE_NPK_ON_FAILURE = true;
const char* FALLBACK_SOIL_PROFILE = "Black soil";
const float BLACK_SOIL_NITROGEN = 38.0;
const float BLACK_SOIL_PHOSPHORUS = 16.0;
const float BLACK_SOIL_POTASSIUM = 56.0;

// Calibrate these two values for your soil moisture sensor.
// Read Serial Monitor in dry air and wet soil, then update these numbers.
const int SOIL_DRY_RAW = 3600;
const int SOIL_WET_RAW = 1200;

// ===== TIMING =====
const unsigned long TELEMETRY_INTERVAL_MS = 10000;
const unsigned long WIFI_RECONNECT_INTERVAL_MS = 5000;

DHT dht(DHTPIN, DHTTYPE);
HardwareSerial NpkSerial(1);
ModbusMaster npkNode;
WiFiClientSecure secureClient;

unsigned long lastTelemetryAt = 0;
unsigned long lastWiFiCheckAt = 0;

float nitrogen = 0.0;
float phosphorus = 0.0;
float potassium = 0.0;
bool npkIsReal = false;

float clampFloat(float value, float minValue, float maxValue) {
  if (value < minValue) return minValue;
  if (value > maxValue) return maxValue;
  return value;
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

void useFakeNpk(float& n, float& p, float& k) {
  n = BLACK_SOIL_NITROGEN;
  p = BLACK_SOIL_PHOSPHORUS;
  k = BLACK_SOIL_POTASSIUM;
  Serial.println("Using BLACK SOIL DEMO/FALLBACK NPK values because real Modbus NPK failed.");
}

String buildTelemetryJson(float soilMoisture, float temperature, float humidity, float ph, float n, float p, float k) {
  String body = "{";
  body += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  body += "\"soil_moisture\":" + String(soilMoisture, 1) + ",";
  body += "\"humidity\":" + String(humidity, 1) + ",";
  body += "\"temperature\":" + String(temperature, 1) + ",";
  body += "\"ph\":" + String(ph, 1) + ",";
  body += "\"nitrogen\":" + String(n, 1) + ",";
  body += "\"phosphorus\":" + String(p, 1) + ",";
  body += "\"potassium\":" + String(k, 1);
  body += "}";

  return body;
}

void showBootDisplay(String line1, String line2) {
  if (!displayReady) {
    return;
  }

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("CropConnect WiFi");
  display.println(line1);
  display.println(line2);
  display.display();
}

void updateSensorDisplay(
  float soilMoisture,
  int soilRaw,
  float temperature,
  float humidity,
  float ph,
  float n,
  float p,
  float k,
  bool realNpk,
  bool sentOk
) {
  if (!displayReady) {
    return;
  }

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("CropConnect Sensors");

  display.setCursor(0, 12);
  display.print("M:");
  display.print(soilMoisture, 0);
  display.print("% Raw:");
  display.println(soilRaw);

  display.setCursor(0, 24);
  display.print("T:");
  display.print(temperature, 1);
  display.print("C H:");
  display.print(humidity, 0);
  display.println("%");

  display.setCursor(0, 36);
  display.print("pH:");
  display.print(ph, 1);
  display.print(" ");
  display.print("N:");
  display.print(n, 0);
  display.print(" P:");
  display.print(p, 0);
  display.print(" K:");
  display.println(k, 0);

  display.setCursor(0, 48);
  display.print("NPK: ");
  display.println(realNpk ? "REAL" : "BLACK");

  display.setCursor(0, 56);
  display.print("WiFi: ");
  display.println(sentOk ? "Sent" : "Not sent");
  display.display();
}

void showWaitingDisplay(String reason) {
  if (!displayReady) {
    return;
  }

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("CropConnect Sensors");
  display.println("Waiting for real");
  display.println("sensor reading...");
  display.println(reason);
  display.display();
}

bool postTelemetry(const String& payload) {
  if (!connectToWiFi()) {
    Serial.println("No WiFi, telemetry skipped");
    return false;
  }

  HTTPClient http;
  http.begin(secureClient, TELEMETRY_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", API_KEY);

  Serial.println("Sending telemetry through WiFi:");
  Serial.println(payload);

  int statusCode = http.POST(payload);
  String response = statusCode > 0 ? http.getString() : http.errorToString(statusCode);

  Serial.println("Telemetry POST HTTP " + String(statusCode));
  Serial.println("Response: " + response);
  http.end();

  return statusCode >= 200 && statusCode < 300;
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("=== CropConnect Full Sensor Telemetry - WiFi ===");
  Serial.println("Firmware: " + String(FIRMWARE_TAG));
  Serial.println("Real: soil moisture, temperature, humidity, NPK");

  dht.begin();
  pinMode(SOIL_MOISTURE_PIN, INPUT);
  pinMode(NPK_DE_RE_PIN, OUTPUT);
  digitalWrite(NPK_DE_RE_PIN, LOW);

  Wire.begin(21, 22);
  displayReady = display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS);
  if (displayReady) {
    showBootDisplay("Real sensor mode", "Starting...");
  } else {
    Serial.println("OLED not found at 0x3C. Telemetry will still work.");
  }

  secureClient.setInsecure();

  NpkSerial.begin(NPK_BAUD, SERIAL_8N1, NPK_RX_PIN, NPK_TX_PIN);
  npkNode.begin(NPK_MODBUS_ID, NpkSerial);
  npkNode.preTransmission(preTransmission);
  npkNode.postTransmission(postTransmission);
  delay(3000);

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

    float temperature = 0.0;
    float humidity = 0.0;
    bool dhtOk = readDhtValues(temperature, humidity);

    if (!dhtOk) {
      Serial.println("Skipping telemetry until DHT gives a valid reading");
      showWaitingDisplay("DHT not ready");
      return;
    }

    float soilMoisture = 0.0;
    int soilRaw = 0;
    bool soilOk = readSoilMoisturePercent(soilMoisture, soilRaw);
    if (!soilOk) {
      Serial.println("Skipping telemetry until real soil moisture sensor gives a valid reading");
      showWaitingDisplay("Soil ADC invalid");
      return;
    }

    npkIsReal = readNpkSensor(nitrogen, phosphorus, potassium);
    if (!npkIsReal && USE_FAKE_NPK_ON_FAILURE) {
      useFakeNpk(nitrogen, phosphorus, potassium);
    } else if (!npkIsReal) {
      Serial.println("Skipping telemetry until real NPK sensor gives a valid reading");
      showWaitingDisplay("NPK not ready");
      return;
    }

    Serial.println("Soil moisture: " + String(soilMoisture, 1) + "%");
    Serial.println("Soil moisture proof raw ADC: " + String(soilRaw));
    Serial.println("Temperature: " + String(temperature, 1) + " C");
    Serial.println("Humidity: " + String(humidity, 1) + "%");
    Serial.println("Fixed pH: " + String(FIXED_PH_VALUE, 1));
    Serial.println(String(npkIsReal ? "Real" : "Black soil fallback") + " NPK: " + String(nitrogen, 1) + "/" + String(phosphorus, 1) + "/" + String(potassium, 1) + " mg/kg");

    String payload = buildTelemetryJson(soilMoisture, temperature, humidity, FIXED_PH_VALUE, nitrogen, phosphorus, potassium);
    bool sentOk = postTelemetry(payload);
    updateSensorDisplay(soilMoisture, soilRaw, temperature, humidity, FIXED_PH_VALUE, nitrogen, phosphorus, potassium, npkIsReal, sentOk);
  }

  delay(50);
}
