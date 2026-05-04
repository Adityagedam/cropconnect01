# CropConnect ESP32 Backend

FastAPI service for receiving ESP32 sensor readings, storing them in MySQL, sending enquiries, serving weather data, and proxying AI chat requests.

## Files

- `esp32_ingest.py` - Python API server.
- `schema.sql` - MySQL database and table setup.
- `.env.example` - environment variables.

## Setup

```bash
cd cropconnect-backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
mysql -u root -p < schema.sql
```

Set environment variables, or copy `.env.example` values into your shell.

```bash
export MYSQL_HOST=127.0.0.1
export MYSQL_PORT=3306
export MYSQL_USER=root
export MYSQL_PASSWORD=Rudra@123
export MYSQL_DATABASE=cropconnect
export ESP32_API_KEY=dev-secret-key
export ESP32_PUMP_COMMAND_MODE=poll
export ESP32_PUMP_BASE_URL=
export ESP32_PUMP_API_KEY=dev-secret-key
export CONTACT_TO_EMAIL=cropconnectco@gmail.com
export OPENAI_API_KEY=your_openai_key
export OPENAI_MODEL=gpt-4o-mini
export GOOGLE_API_KEY=your_google_api_key
export GOOGLE_CSE_ID=your_google_custom_search_engine_id
```

Run:

```bash
uvicorn esp32_ingest:app --host 0.0.0.0 --port 8001 --reload
```

Frontend `.env` should use:

```bash
REACT_APP_BACKEND_URL=http://localhost:8001
```

## ESP32 POST Example

Send readings to:

```text
POST http://:8001/api/telemetry/ingest
Header: X-API-Key: dev-secret-key
Content-Type: application/json
```

Payload:

```json
{
  "device_id": "sim-node-1",
  "soil_moisture": 62.4,
  "humidity": 74.2,
  "temperature": 28.6,
  "ph": 6.8,
  "nitrogen": 42,
  "phosphorus": 19,
  "potassium": 31
}
```

Latest readings for the website:

```text
GET http://localhost:8001/api/sensors/latest?device_id=sim-node-1
```

## ESP32 WiFi Pump Control

For Railway production, use polling mode. The website posts pump changes to:

```text
POST https://cropconnect01-production.up.railway.app/api/pump/state
```

The ESP32 should poll:

```text
GET https://cropconnect01-production.up.railway.app/api/esp32/relay-command
```

That endpoint returns plain text for 8 relays:

```text
1on 2off 3off 4off 5off 6off 7off 8off
```

In your sketch, set:

```cpp
const char* serverURL = "https://cropconnect01-production.up.railway.app/api/esp32/relay-command";
```

`HTTPClient` needs the `https://` protocol and the `/api/esp32/relay-command` path.

## ESP32 Direct WiFi Pump Control

Flash this sketch to the ESP32:

```text
cropconnect-backend/esp32_pump_controller/esp32_pump_controller.ino
```

Before flashing, edit:

```cpp
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_KEY = "dev-secret-key";
const int PUMP_1_RELAY_PIN = 26;
const int PUMP_2_RELAY_PIN = 27;
```

Open Arduino Serial Monitor after upload. Copy the printed ESP32 IP address into backend `.env`:

```bash
ESP32_PUMP_BASE_URL=http://192.168.x.x
ESP32_PUMP_API_KEY=dev-secret-key
ESP32_PUMP_COMMAND_MODE=json
```

Restart the backend. The frontend pump switches call:

```text
POST http://localhost:8001/api/pump/state
```

The backend then sends the WiFi command to:

```text
POST http://ESP32_IP/pump
Header: X-API-Key: dev-secret-key
```

Use a relay module between ESP32 and the pump. Do not connect pump power directly to ESP32 pins.

## Production notes

- Use a managed MySQL database and run `schema.sql` once before receiving device data.
- The frontend signup flow generates a unique `sensorDeviceId`; ESP32 payloads must send that value as `device_id`.
- Set `ESP32_API_KEY` to a strong secret in production and flash the same key into trusted farm devices.
- Set SMTP variables if you want `/api/enquiries` to send email directly. Without SMTP, the frontend falls back to a pre-filled mail client.
- Set `OPENAI_API_KEY` for GPT chat answers. Set `GOOGLE_API_KEY` and `GOOGLE_CSE_ID` to let the backend add Google Custom Search snippets to the GPT prompt.
