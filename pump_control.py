import json
import os
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field


router = APIRouter(prefix="/api/pump", tags=["pump-control"])


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default)


ESP32_PUMP_BASE_URL = env("ESP32_PUMP_BASE_URL").rstrip("/")
ESP32_PUMP_API_KEY = env("ESP32_PUMP_API_KEY", env("ESP32_API_KEY", "dev-secret-key"))
ESP32_PUMP_COMMAND_MODE = env("ESP32_PUMP_COMMAND_MODE", "poll").lower()
RELAY_COMMAND_STATE: dict[int, bool] = {index: False for index in range(1, 9)}
RELAY_APPLIED_STATE: dict[int, bool] = {index: False for index in range(1, 9)}
RELAY_STATUS_UPDATED_AT = ""


class PumpStateIn(BaseModel):
    pump_id: str = Field(default="pump1", min_length=1, max_length=40)
    on: bool


def pump_number(pump_id: str) -> str:
    digits = "".join(ch for ch in pump_id if ch.isdigit())
    return digits or pump_id


def update_relay_command_state(pump_id: str, on: bool) -> None:
    try:
        relay_number = int(pump_number(pump_id))
    except ValueError:
        return

    if 1 <= relay_number <= 8:
        RELAY_COMMAND_STATE[relay_number] = on


def relay_command_text() -> str:
    return " ".join(
        f"{relay_number}{'on' if RELAY_COMMAND_STATE[relay_number] else 'off'}"
        for relay_number in range(1, 9)
    )


def update_relay_applied_state(states: dict[int, bool]) -> None:
    global RELAY_STATUS_UPDATED_AT
    for relay_number, on in states.items():
        if 1 <= relay_number <= 8:
            RELAY_APPLIED_STATE[relay_number] = on
    RELAY_STATUS_UPDATED_AT = datetime.now(timezone.utc).isoformat()


def relay_status_payload() -> dict[str, Any]:
    return {
        "desired": {
            str(relay_number): RELAY_COMMAND_STATE[relay_number]
            for relay_number in range(1, 9)
        },
        "applied": {
            str(relay_number): RELAY_APPLIED_STATE[relay_number]
            for relay_number in range(1, 9)
        },
        "updated_at": RELAY_STATUS_UPDATED_AT,
    }


def build_esp32_request(payload: PumpStateIn) -> urllib.request.Request:
    state = "on" if payload.on else "off"
    pump = pump_number(payload.pump_id)

    if ESP32_PUMP_COMMAND_MODE == "query":
        query = urllib.parse.urlencode({"pump": pump, "state": state})
        url = f"{ESP32_PUMP_BASE_URL}/pump?{query}"
        return urllib.request.Request(url, method="GET")

    url = f"{ESP32_PUMP_BASE_URL}/pump"
    body: dict[str, Any] = {
        "pump_id": payload.pump_id,
        "pump": pump,
        "state": state,
        "on": payload.on,
    }
    return urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "X-API-Key": ESP32_PUMP_API_KEY,
        },
        method="POST",
    )


def send_pump_signal(payload: PumpStateIn) -> dict[str, Any]:
    update_relay_command_state(payload.pump_id, payload.on)

    if ESP32_PUMP_COMMAND_MODE not in {"direct", "query"} or not ESP32_PUMP_BASE_URL:
        return {
            "sent": False,
            "message": "Pump command sent to backend. ESP32 will apply it on the next WiFi poll.",
        }

    request = build_esp32_request(payload)

    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            raw_body = response.read().decode("utf-8", errors="replace")
            try:
                body: Any = json.loads(raw_body) if raw_body else {}
            except json.JSONDecodeError:
                body = raw_body

            return {
                "sent": True,
                "status_code": response.status,
                "esp32_response": body,
            }
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise HTTPException(
            status_code=502,
            detail=f"ESP32 rejected pump command with HTTP {exc.code}: {detail}",
        ) from exc
    except urllib.error.URLError as exc:
        return {
            "sent": False,
            "message": "Pump command sent to backend. ESP32 will apply it on the next WiFi poll.",
        }
    except TimeoutError as exc:
        return {
            "sent": False,
            "message": "Pump command sent to backend. ESP32 will apply it on the next WiFi poll.",
        }


@router.post("/state")
def set_pump_state(payload: PumpStateIn):
    result = send_pump_signal(payload)
    state = "on" if payload.on else "off"

    return {
        "ok": True,
        "pump_id": payload.pump_id,
        "state": state,
        "sent_to_esp32": result["sent"],
        "message": result.get("message", f"{payload.pump_id} turned {state}"),
        "esp32": result.get("esp32_response"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
