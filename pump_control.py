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
ESP32_PUMP_COMMAND_MODE = env("ESP32_PUMP_COMMAND_MODE", "json").lower()


class PumpStateIn(BaseModel):
    pump_id: str = Field(default="pump1", min_length=1, max_length=40)
    on: bool


def pump_number(pump_id: str) -> str:
    digits = "".join(ch for ch in pump_id if ch.isdigit())
    return digits or pump_id


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
    if not ESP32_PUMP_BASE_URL:
        return {
            "sent": False,
            "message": "ESP32_PUMP_BASE_URL is not configured; frontend state was updated only.",
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
        raise HTTPException(
            status_code=502,
            detail=f"Could not reach ESP32 pump controller: {exc.reason}",
        ) from exc
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail="ESP32 pump controller timed out") from exc


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
