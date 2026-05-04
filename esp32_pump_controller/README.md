# ESP32 Pump Controller Setup

This ESP32 code controls irrigation pumps through WiFi commands from the CropConnect backend system.

## Hardware Requirements

- **ESP32 Development Board** (any model with WiFi)
- **8-Channel Relay Module** (active LOW relays recommended)
- **Power Supply** (5V for ESP32, appropriate voltage for relays/pumps)
- **Jumper Wires** for connections

## Pin Configuration

The code uses these GPIO pins for relay control:
- Relay 1 (Main Pump): GPIO 19
- Relay 2 (Secondary Pump): GPIO 18
- Relay 3: GPIO 5
- Relay 4: GPIO 17
- Relay 5: GPIO 32
- Relay 6: GPIO 33
- Relay 7: GPIO 25
- Relay 8: GPIO 14

**Note**: Adjust `RELAY_PINS` array in code if using different pins.

## Wiring Instructions

1. **ESP32 to Relay Module**:
   - Connect ESP32 GND to relay module GND
   - Connect ESP32 5V/VIN to relay module VCC
   - Connect relay control pins (GPIO 19, 18, 5, 17, 32, 33, 25, 14) to relay module IN1-IN8

2. **Relay Module to Pumps/Motors**:
   - Connect pump/motor power supply to relay module COM terminals
   - Connect pump/motor wires to relay module NO (Normally Open) terminals
   - **IMPORTANT**: Ensure relay module can handle your pump's current requirements

## Software Setup

### 1. Install Arduino IDE
Download from: https://www.arduino.cc/en/software

### 2. Install ESP32 Board Support
- Open Arduino IDE
- Go to File → Preferences
- Add this URL to "Additional Boards Manager URLs":
  ```
  https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
  ```
- Go to Tools → Board → Boards Manager
- Search for "esp32" and install "esp32 by Espressif Systems"

### 3. Install Required Libraries
- Go to Tools → Manage Libraries
- Install "WiFi" (built-in)
- Install "HTTPClient" (built-in)

### 4. Configure the Code

Use one of the dedicated ESP32 sketches for your hardware setup:

- `esp32_pump_controller_only.ino` — pump controller only. This sketch polls the backend for pump commands and reports relay state. No sensor telemetry is sent.
- `esp32_sensor_telemetry_only.ino` — sensor-only device. This sketch reads soil moisture, DHT temperature/humidity, and fake pH/NPK values, then sends telemetry to the backend.

For legacy or combined examples, the repository also includes:
- `esp32_pump_controller_complete.ino`
- `esp32_pump_sensor.ino`

Update the selected sketch with your WiFi and backend API settings:

```cpp
// WiFi Configuration - CHANGE THESE!
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// API Configuration
const char* API_KEY = "dev-secret-key";  // Must match backend ESP32_API_KEY
const char* DEVICE_ID = "sim-node-1";    // Replace with a unique device_id for this ESP32
```

For the pump-only sketch, use a unique `DEVICE_ID` such as `pump-node-1`.

### 5. Install DHT Library

If you are using a DHT temperature/humidity sensor, install the library:

- Open Arduino IDE → Tools → Manage Libraries
- Search for `DHT sensor library`
- Install the one by Adafruit

### 6. Upload to ESP32

1. Connect ESP32 to computer via USB
2. In Arduino IDE:
   - Select your ESP32 board (Tools → Board)
   - Select correct COM port (Tools → Port)
   - Click Upload button
3. Open Serial Monitor (Tools → Serial Monitor) at 115200 baud
4. Watch for connection messages
## Integration Flow

Use dedicated sketches for each ESP32:

- `esp32_pump_controller_only.ino` will:
  - poll the backend for pump commands
  - update the relay output
  - report pump state to the backend
- `esp32_sensor_telemetry_only.ino` will:
  - read soil moisture and DHT temperature/humidity
  - generate simulated pH/NPK values
  - send telemetry to `POST /api/telemetry/ingest`

This links the ESP32 devices, backend, and frontend together in a real-time system.
## Testing the System

### 1. Check Serial Output
After upload, you should see:
```
=== ESP32 Pump Controller Starting ===
Initializing relay pins...
Relay 1 pin: GPIO19
...
WiFi connected!
ESP32 IP: 192.168.1.100
=== Setup Complete ===
Polling for commands...
```

### 2. Test from Backend
Use the Python script or web interface to send pump commands:

```bash
# Turn pump 1 on
python control_pump.py on

# Turn pump 1 off
python control_pump.py off
```

### 3. Monitor ESP32 Response
In Serial Monitor, you should see:
```
Received command: '1on'
Relay 1 set to ON
Sending status: {"device_id":"esp32-relay-1","relays":{"1":true,"2":false,...}}
```

## Troubleshooting

### WiFi Connection Issues
- Check WiFi credentials in code
- Ensure ESP32 is in range of WiFi router
- Try different WiFi network if needed

### Relay Not Working
- Verify relay module power supply
- Check wiring connections
- Test with LED first (connect LED + resistor between relay output and GND)
- Verify `RELAY_ACTIVE_LOW` setting matches your relay module

### Backend Communication Issues
- Check API_KEY matches backend configuration
- Verify backend server is running
- Check firewall/antivirus blocking connections
- Use `curl` to test backend directly:
  ```bash
  curl "https://cropconnect01-production.up.railway.app/api/esp32/relay-command"
  ```

### Pump/Motor Issues
- Ensure relay module can handle motor current
- Add flyback diode across motor terminals
- Use separate power supply for motors if needed
- Check motor voltage/current requirements

## Advanced Configuration

### Changing Relay Pins
Modify the `RELAY_PINS` array:
```cpp
const int RELAY_PINS[RELAY_COUNT] = {19, 18, 5, 17, 32, 33, 25, 14};  // Your pins here
```

### Active HIGH vs LOW Relays
If your relays turn ON with HIGH signal:
```cpp
const bool RELAY_ACTIVE_LOW = false;
```

### Adjusting Poll Interval
Change polling frequency (default 3 seconds):
```cpp
const unsigned long POLL_INTERVAL_MS = 3000;  // Milliseconds
```

## Safety Notes

- **Electrical Safety**: Work with appropriate voltage/current levels
- **Water Protection**: Keep electronics away from water
- **Power Supply**: Use regulated power supplies
- **Motor Protection**: Add fuses and protection circuits for motors
- **Backup Power**: Consider battery backup for critical irrigation systems

## Support

If you encounter issues:
1. Check Serial Monitor output for error messages
2. Verify all connections and power supplies
3. Test backend API endpoints manually
4. Check ESP32 board compatibility

The system is designed to be robust and will automatically reconnect to WiFi and resume operation after power outages.