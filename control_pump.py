#!/usr/bin/env python3
"""
Script to control ESP32 pump motor via WiFi
"""
import json
import urllib.request
import urllib.error

def control_pump(pump_id="pump1", turn_on=True):
    """
    Send signal to ESP32 to turn pump on or off

    Args:
        pump_id (str): ID of the pump (default: "pump1")
        turn_on (bool): True to turn on, False to turn off
    """
    url = "https://cropconnect01-production.up.railway.app/api/pump/state"

    payload = {
        "pump_id": pump_id,
        "on": turn_on
    }

    data = json.dumps(payload).encode('utf-8')

    try:
        req = urllib.request.Request(
            url,
            data=data,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )

        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            print(f"✅ Pump {pump_id} turned {'ON' if turn_on else 'OFF'}")
            print(f"Response: {result}")
            return True

    except urllib.error.HTTPError as e:
        print(f"❌ HTTP Error {e.code}: {e.reason}")
        return False
    except urllib.error.URLError as e:
        print(f"❌ Network Error: {e.reason}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        action = sys.argv[1].lower()
        pump_id = sys.argv[2] if len(sys.argv) > 2 else "pump1"

        if action in ["on", "true", "1"]:
            control_pump(pump_id, True)
        elif action in ["off", "false", "0"]:
            control_pump(pump_id, False)
        else:
            print("Usage: python control_pump.py [on|off] [pump_id]")
    else:
        print("ESP32 Pump Control Script")
        print("Usage: python control_pump.py [on|off] [pump_id]")
        print("Examples:")
        print("  python control_pump.py on")
        print("  python control_pump.py off pump2")
        print()
        print("Or use the functions directly in Python:")
        print("  control_pump('pump1', True)   # Turn on")
        print("  control_pump('pump1', False)  # Turn off")