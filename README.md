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

Use polling mode for Railway production. The cloud backend cannot directly call an ESP32 on private WiFi or mobile hotspot, so the ESP32 connects outward to Railway every 3 seconds.

The website posts pump changes to:

```text
POST https://cropconnect01-production.up.railway.app/api/pump/state
```

The ESP32 should poll:

```text
GET https://cropconnect01-production.up.railway.app/api/esp32/relay-command
```

After applying the relay states, the ESP32 sends status back to:

```text
POST https://cropconnect01-production.up.railway.app/api/esp32/relay-status
Header: X-API-Key: dev-secret-key
```

That endpoint returns plain text for 8 relays:

```text
1on 2off 3off 4off 5off 6off 7off 8off
```

You can view the last reported relay status at:

```text
GET https://cropconnect01-production.up.railway.app/api/esp32/relay-status
```

### Manual Pump Control

To manually control the pump motor via WiFi, you can use the provided scripts:

**Using Python script:**
```bash
# Turn pump on
python control_pump.py on

# Turn pump off
python control_pump.py off

# Control specific pump
python control_pump.py on pump2
```

**Using batch file (Windows):**
```cmd
# Turn pump on
control_pump.bat on

# Turn pump off
control_pump.bat off
```

**Using curl:**
```bash
# Turn on
curl -X POST "https://cropconnect01-production.up.railway.app/api/pump/state" \
  -H "Content-Type: application/json" \
  -d '{"pump_id": "pump1", "on": true}'

# Turn off
curl -X POST "https://cropconnect01-production.up.railway.app/api/pump/state" \
  -H "Content-Type: application/json" \
  -d '{"pump_id": "pump1", "on": false}'
```

The ESP32 will receive the command on its next poll (every 3 seconds) and turn the motor on/off accordingly.

## ESP32 Setup Instructions

Complete setup instructions are available in:

```text
cropconnect-backend/esp32_pump_controller/README.md
```

### Quick Setup

1. **Download the ESP32 code**:
   ```text
   cropconnect-backend/esp32_pump_controller/esp32_pump_controller_complete.ino
   ```

2. **Update WiFi credentials** in the code:
   ```cpp
   const char* WIFI_SSID = "YOUR_WIFI_SSID";
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
   ```

3. **Install Arduino IDE** and ESP32 board support

4. **Upload the code** to your ESP32 board

5. **Monitor Serial output** at 115200 baud to verify connection

### Hardware Connections

- **ESP32 GPIO pins**: 19, 18, 5, 17, 32, 33, 25, 14 (for 8 relays)
- **Relay module**: Connect to 5V/GND and control pins
- **Pumps/Motors**: Connect through relay module NO terminals

### Testing

Use the test script to verify ESP32 functionality:

```bash
python esp32_pump_controller/test_esp32.py
```

Before flashing, edit:

```cpp
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_KEY = "dev-secret-key";
```

Relay pins are configured here:

```cpp
const int RELAY_PINS[RELAY_COUNT] = {19, 18, 5, 17, 32, 33, 25, 14};
```

Set Railway backend variables:

```bash
ESP32_PUMP_COMMAND_MODE=poll
ESP32_PUMP_BASE_URL=
ESP32_API_KEY=dev-secret-key
```

Do not set `ESP32_PUMP_BASE_URL` to the ESP32 IP when using Railway. Leave it blank.

Open Arduino Serial Monitor after upload. You should see command GETs and status POSTs every 3 seconds.

Use a relay module between ESP32 and the pump. Do not connect pump power directly to ESP32 pins.

## Production notes

- Use a managed MySQL database and run `schema.sql` once before receiving device data.
- The frontend signup flow generates a unique `sensorDeviceId`; ESP32 payloads must send that value as `device_id`.
- Set `ESP32_API_KEY` to a strong secret in production and flash the same key into trusted farm devices.
- Set SMTP variables if you want `/api/enquiries` to send email directly. Without SMTP, the frontend falls back to a pre-filled mail client.
- Set `OPENAI_API_KEY` for GPT chat answers. Set `GOOGLE_API_KEY` and `GOOGLE_CSE_ID` to let the backend add Google Custom Search snippets to the GPT prompt.
