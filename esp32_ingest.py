import os
import json
import smtplib
import ssl
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from decimal import Decimal
from email.message import EmailMessage
from typing import Any
from urllib.parse import urlparse
import mysql.connector
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from pump_control import router as pump_router


load_dotenv()


def env(name: str, default: str) -> str:
    return os.getenv(name, default)


db_url = os.getenv("MYSQL_PUBLIC_URL")

if not db_url:
    raise RuntimeError("MYSQL_PUBLIC_URL is missing")

url = urlparse(db_url)

DB_CONFIG = {
    "host": url.hostname,
    "port": int(url.port or 3306),
    "user": url.username,
    "password": url.password,
    "database": url.path[1:] or "railway"
}
FARMERS_DATABASE = env("MYSQL_FARMERS_DATABASE", "farmers")

API_KEY = env("ESP32_API_KEY", "dev-secret-key")
CONTACT_TO_EMAIL = env("CONTACT_TO_EMAIL", "cropconnectco@gmail.com")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = env("OPENAI_MODEL", "gpt-4o-mini")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GOOGLE_CSE_ID = os.getenv("GOOGLE_CSE_ID", "")

PLANT_SOIL_TERMS = {
    "agriculture",
    "agronomy",
    "crop",
    "crops",
    "farm",
    "farming",
    "field",
    "plant",
    "plants",
    "seed",
    "seedling",
    "germination",
    "leaf",
    "leaves",
    "root",
    "roots",
    "stem",
    "flower",
    "fruit",
    "vegetable",
    "grain",
    "wheat",
    "rice",
    "maize",
    "corn",
    "soybean",
    "onion",
    "cotton",
    "sugarcane",
    "turmeric",
    "chilli",
    "groundnut",
    "soil",
    "moisture",
    "ph",
    "npk",
    "nitrogen",
    "phosphorus",
    "potassium",
    "fertilizer",
    "fertiliser",
    "compost",
    "manure",
    "irrigation",
    "irrigate",
    "water",
    "watering",
    "drip",
    "pest",
    "disease",
    "fungus",
    "fungal",
    "weed",
    "harvest",
    "sowing",
    "spray",
    "pesticide",
    "weather",
    "rain",
    "humidity",
    "temperature",
    "sensor",
    "sensors",
}

app = FastAPI(title="CropConnect ESP32 Ingestion API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pump_router)


class TelemetryIn(BaseModel):
    device_id: str = Field(default="sim-node-1", max_length=80)
    soil_moisture: float | None = Field(default=None, ge=0, le=100)
    humidity: float | None = Field(default=None, ge=0, le=100)
    temperature: float | None = Field(default=None, ge=-20, le=80)
    ph: float | None = Field(default=None, ge=0, le=14)
    nitrogen: float | None = Field(default=None, ge=0)
    phosphorus: float | None = Field(default=None, ge=0)
    potassium: float | None = Field(default=None, ge=0)


class EnquiryIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=254)
    phone: str | None = Field(default="", max_length=40)
    organization: str | None = Field(default="", max_length=160)
    message: str = Field(min_length=1, max_length=4000)


class ChatIn(BaseModel):
    user_id: int | None = Field(default=None, ge=1)
    email: str | None = Field(default=None, max_length=255)
    message: str = Field(min_length=1, max_length=2000)
    language: str = Field(default="en", max_length=16)
    sensor_data: dict[str, Any] = Field(default_factory=dict)
    location: str | None = Field(default="", max_length=160)
    history: list[dict[str, str]] = Field(default_factory=list, max_length=12)


class AuthSignupIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=255)
    phone: str | None = Field(default="", max_length=30)
    state: str | None = Field(default="", max_length=120)
    location: str | None = Field(default="", max_length=255)
    land_size: float | None = Field(default=None, ge=0)
    location_type: str | None = Field(default="city", max_length=20)
    city: str | None = Field(default="", max_length=120)
    village: str | None = Field(default="", max_length=120)
    sensor_device_id: str | None = Field(default="sim-node-1", max_length=80)
    sensors: str | None = Field(default="0", max_length=20)
    pumps: str | None = Field(default="0", max_length=20)
    sensor_setup_complete: bool = False
    sensor_setup_status: str | None = Field(default="pending", max_length=40)


class AuthLoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=255)


class AuthProfileUpdateIn(BaseModel):
    user_id: int | None = Field(default=None, ge=1)
    email: str | None = Field(default=None, max_length=255)
    name: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=30)
    state: str | None = Field(default=None, max_length=120)
    location: str | None = Field(default=None, max_length=255)
    land_size: float | None = Field(default=None, ge=0)
    location_type: str | None = Field(default=None, max_length=20)
    city: str | None = Field(default=None, max_length=120)
    village: str | None = Field(default=None, max_length=120)
    sensor_device_id: str | None = Field(default=None, max_length=80)
    sensors: str | None = Field(default=None, max_length=20)
    pumps: str | None = Field(default=None, max_length=20)
    sensor_setup_complete: bool | None = None
    sensor_setup_status: str | None = Field(default=None, max_length=40)


class PumpStateSaveIn(BaseModel):
    user_id: int | None = Field(default=None, ge=1)
    email: str | None = Field(default=None, max_length=255)
    pump_id: str = Field(min_length=1, max_length=40)
    on: bool
    runtime: int | None = Field(default=0, ge=0)
    schedule: dict[str, Any] = Field(default_factory=dict)
    sent_to_esp32: bool = False
    message: str | None = Field(default="", max_length=255)


class PumpTimersSaveIn(BaseModel):
    user_id: int | None = Field(default=None, ge=1)
    email: str | None = Field(default=None, max_length=255)
    timers: dict[str, list[dict[str, Any]]] = Field(default_factory=dict)


class ChatMessageSaveIn(BaseModel):
    user_id: int | None = Field(default=None, ge=1)
    email: str | None = Field(default=None, max_length=255)
    message_type: str = Field(min_length=1, max_length=20)
    text: str = Field(min_length=1, max_length=8000)
    related_to_plant_or_soil: bool | None = None
    sensor_data: dict[str, Any] = Field(default_factory=dict)
    location: str | None = Field(default="", max_length=160)


class DashboardSnapshotIn(BaseModel):
    user_id: int | None = Field(default=None, ge=1)
    email: str | None = Field(default=None, max_length=255)
    device_id: str | None = Field(default="sim-node-1", max_length=80)
    source: str | None = Field(default="dashboard", max_length=40)
    sensor_data: dict[str, Any] = Field(default_factory=dict)
    pump_data: dict[str, Any] = Field(default_factory=dict)
    timers: dict[str, Any] = Field(default_factory=dict)
    weather_data: dict[str, Any] | None = Field(default=None)
    market_data: dict[str, Any] | None = Field(default=None)
    telemetry_packet: dict[str, Any] = Field(default_factory=dict)


def get_connection():
    return mysql.connector.connect(**DB_CONFIG)


def get_server_connection():
    config = {**DB_CONFIG}
    config.pop("database", None)
    return mysql.connector.connect(**config)


def get_farmers_connection(database: str | None = FARMERS_DATABASE):
    config = {**DB_CONFIG, "database": database}
    return mysql.connector.connect(**config)


def add_column_if_missing(cursor, table_schema: str, table_name: str, column_name: str, definition: str) -> None:
    cursor.execute(
        """
        SELECT COUNT(*) AS count
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s
        """,
        (table_schema, table_name, column_name),
    )
    row = cursor.fetchone()
    count = row["count"] if isinstance(row, dict) else row[0]
    if not count:
        cursor.execute(f"ALTER TABLE `{table_name}` ADD COLUMN `{column_name}` {definition}")


def ensure_sensor_tables() -> None:
    database = DB_CONFIG["database"]
    with get_server_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS `{database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        conn.commit()

    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS sensor_readings (
                  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                  device_id VARCHAR(80) NOT NULL,
                  soil_moisture DECIMAL(6,2) NULL,
                  humidity DECIMAL(6,2) NULL,
                  temperature DECIMAL(6,2) NULL,
                  ph DECIMAL(5,2) NULL,
                  nitrogen DECIMAL(8,2) NULL,
                  phosphorus DECIMAL(8,2) NULL,
                  potassium DECIMAL(8,2) NULL,
                  raw_payload JSON NULL,
                  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (id),
                  INDEX idx_device_recorded_at (device_id, recorded_at),
                  INDEX idx_recorded_at (recorded_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS devices (
                  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                  device_id VARCHAR(80) NOT NULL UNIQUE,
                  display_name VARCHAR(120) NULL,
                  location VARCHAR(160) NULL,
                  api_key VARCHAR(120) NULL,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                  PRIMARY KEY (id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS pump_states (
                  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                  user_id BIGINT UNSIGNED NULL,
                  email VARCHAR(255) NULL,
                  pump_id VARCHAR(40) NOT NULL,
                  is_on TINYINT(1) NOT NULL DEFAULT 0,
                  runtime_minutes INT UNSIGNED NOT NULL DEFAULT 0,
                  schedule JSON NULL,
                  sent_to_esp32 TINYINT(1) NOT NULL DEFAULT 0,
                  message VARCHAR(255) NULL,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (id),
                  INDEX idx_pump_user_created (user_id, email, created_at),
                  INDEX idx_pump_id_created (pump_id, created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS pump_timers (
                  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                  user_id BIGINT UNSIGNED NULL,
                  email VARCHAR(255) NULL,
                  pump_id VARCHAR(40) NOT NULL,
                  timer_key VARCHAR(80) NOT NULL,
                  start_time VARCHAR(10) NOT NULL,
                  duration_minutes INT UNSIGNED NOT NULL,
                  days JSON NULL,
                  active TINYINT(1) NOT NULL DEFAULT 1,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                  PRIMARY KEY (id),
                  UNIQUE KEY uq_timer_owner (`user_id`, `email`, `pump_id`, `timer_key`),
                  INDEX idx_timer_owner (user_id, email, pump_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS chat_messages (
                  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                  user_id BIGINT UNSIGNED NULL,
                  email VARCHAR(255) NULL,
                  message_type VARCHAR(20) NOT NULL,
                  text TEXT NOT NULL,
                  related_to_plant_or_soil TINYINT(1) NULL,
                  sensor_data JSON NULL,
                  location VARCHAR(160) NULL,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (id),
                  INDEX idx_chat_owner_created (user_id, email, created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS dashboard_snapshots (
                  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                  user_id BIGINT UNSIGNED NULL,
                  email VARCHAR(255) NULL,
                  device_id VARCHAR(80) NULL,
                  source VARCHAR(40) NULL,
                  sensor_data JSON NULL,
                  pump_data JSON NULL,
                  timers JSON NULL,
                  weather_data JSON NULL,
                  market_data JSON NULL,
                  telemetry_packet JSON NULL,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (id),
                  INDEX idx_snapshot_owner_created (user_id, email, created_at),
                  INDEX idx_snapshot_device_created (device_id, created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """
            )
        conn.commit()


def ensure_farmers_tables() -> None:
    create_db_sql = """
        CREATE DATABASE IF NOT EXISTS `{database}`
          CHARACTER SET utf8mb4
          COLLATE utf8mb4_unicode_ci
    """.format(database=FARMERS_DATABASE)
    create_sign_in_sql = """
        CREATE TABLE IF NOT EXISTS `sign-in` (
          `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          `email` VARCHAR(255) NOT NULL,
          `password` VARCHAR(255) NOT NULL,
          `phone` VARCHAR(30) NULL,
          `name` VARCHAR(120) NULL,
          `state` VARCHAR(120) NULL,
          `location` VARCHAR(255) NULL,
          `land size` DECIMAL(10,2) NULL,
          PRIMARY KEY (`id`),
          UNIQUE KEY `uq_sign_in_email` (`email`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """

    with get_server_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(create_db_sql)
        conn.commit()

    with get_farmers_connection() as conn:
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute(create_sign_in_sql)
            add_column_if_missing(cursor, FARMERS_DATABASE, "sign-in", "location_type", "VARCHAR(20) NULL")
            add_column_if_missing(cursor, FARMERS_DATABASE, "sign-in", "city", "VARCHAR(120) NULL")
            add_column_if_missing(cursor, FARMERS_DATABASE, "sign-in", "village", "VARCHAR(120) NULL")
            add_column_if_missing(cursor, FARMERS_DATABASE, "sign-in", "sensor_device_id", "VARCHAR(80) NULL")
            add_column_if_missing(cursor, FARMERS_DATABASE, "sign-in", "sensors", "VARCHAR(20) NULL")
            add_column_if_missing(cursor, FARMERS_DATABASE, "sign-in", "pumps", "VARCHAR(20) NULL")
            add_column_if_missing(cursor, FARMERS_DATABASE, "sign-in", "sensor_setup_complete", "TINYINT(1) NOT NULL DEFAULT 0")
            add_column_if_missing(cursor, FARMERS_DATABASE, "sign-in", "sensor_setup_status", "VARCHAR(40) NULL")
        conn.commit()


def user_row_to_payload(row: dict[str, Any]) -> dict[str, Any]:
    location = row.get("location") or ""
    location_type = row.get("location_type") or "city"
    city = row.get("city") or (location if location_type == "city" else "")
    village = row.get("village") or (location if location_type == "village" else "")
    return {
        "id": row["id"],
        "name": row.get("name") or row["email"].split("@")[0],
        "email": row["email"],
        "phone": row.get("phone") or "",
        "state": row.get("state") or "",
        "location": location,
        "locationType": location_type,
        "city": city,
        "village": village,
        "landSize": decimal_to_float(row.get("land size")),
        "sensorDeviceId": row.get("sensor_device_id") or "sim-node-1",
        "sensors": row.get("sensors") or "0",
        "pumps": row.get("pumps") or "0",
        "sensorSetupComplete": bool(row.get("sensor_setup_complete")),
        "sensorSetupStatus": row.get("sensor_setup_status") or "pending",
    }


def check_api_key(x_api_key: str | None) -> None:
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid ESP32 API key")


def decimal_to_float(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()
    return value


def json_text(value: Any) -> str:
    return json.dumps(value if value is not None else {}, ensure_ascii=False)


def owner_where(user_id: int | None, email: str | None) -> tuple[str, tuple[Any, ...]]:
    if user_id:
        return "user_id = %s", (user_id,)
    if email:
        return "email = %s", (email.strip().lower(),)
    return "email IS NULL AND user_id IS NULL", ()


def parse_json_column(value: Any, fallback: Any) -> Any:
    if value in (None, ""):
        return fallback
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except Exception:
        return fallback


def insert_chat_record(
    user_id: int | None,
    email: str | None,
    message_type: str,
    text: str,
    related_to_plant_or_soil: bool | None,
    sensor_data: dict[str, Any] | None,
    location: str | None,
) -> None:
    try:
        ensure_sensor_tables()
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO chat_messages (
                      user_id, email, message_type, text, related_to_plant_or_soil, sensor_data, location
                    )
                    VALUES (%s, %s, %s, %s, %s, CAST(%s AS JSON), %s)
                    """,
                    (
                        user_id,
                        email.strip().lower() if email else None,
                        message_type,
                        text,
                        None if related_to_plant_or_soil is None else (1 if related_to_plant_or_soil else 0),
                        json_text(sensor_data),
                        location or "",
                    ),
                )
            conn.commit()
    except Exception:
        # Chat should still answer even if persistence is temporarily unavailable.
        pass


def request_json(
    url: str,
    payload: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    verify_ssl: bool = True,
) -> dict[str, Any]:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", **(headers or {})},
        method="POST" if payload is not None else "GET",
    )
    context = None if verify_ssl else ssl._create_unverified_context()
    try:
        with urllib.request.urlopen(req, timeout=15, context=context) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.reason
        try:
            body = exc.read().decode("utf-8")
            parsed = json.loads(body)
            detail = parsed.get("error", {}).get("message") or parsed.get("detail") or body
        except Exception:
            pass
        raise RuntimeError(f"HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Network error: {repr(exc.reason)}") from exc


def send_enquiry_email(payload: EnquiryIn) -> bool:
    smtp_host = os.getenv("SMTP_HOST")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_port = int(env("SMTP_PORT", "587"))

    if not smtp_host or not smtp_user or not smtp_password:
        return False

    msg = EmailMessage()
    msg["Subject"] = f"CropConnect Enquiry from {payload.name}"
    msg["From"] = smtp_user
    msg["To"] = CONTACT_TO_EMAIL
    msg["Reply-To"] = payload.email
    msg.set_content(
        "\n".join(
            [
                f"Name: {payload.name}",
                f"Email: {payload.email}",
                f"Phone: {payload.phone or '-'}",
                f"Organization/Farm: {payload.organization or '-'}",
                "",
                "Message:",
                payload.message,
            ]
        )
    )

    with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as smtp:
        smtp.starttls()
        smtp.login(smtp_user, smtp_password)
        smtp.send_message(msg)

    return True


def google_search(query: str, location: str | None = "") -> list[dict[str, str]]:
    if not GOOGLE_API_KEY or not GOOGLE_CSE_ID:
        return []

    search_query = f"{query} {location or ''} agriculture farming India".strip()
    url = "https://www.googleapis.com/customsearch/v1?" + urllib.parse.urlencode(
        {
            "key": GOOGLE_API_KEY,
            "cx": GOOGLE_CSE_ID,
            "q": search_query,
            "num": 5,
        }
    )
    try:
        data = request_json(url)
    except Exception:
        return []

    return [
        {
            "title": item.get("title", ""),
            "snippet": item.get("snippet", ""),
            "link": item.get("link", ""),
        }
        for item in data.get("items", [])
    ]


def is_plant_or_soil_question(message: str) -> bool:
    normalized = message.lower()
    normalized = normalized.replace("-", " ")
    words = {word.strip(".,?!:;()[]{}\"'") for word in normalized.split()}

    if words & PLANT_SOIL_TERMS:
        return True

    return any(term in normalized for term in PLANT_SOIL_TERMS if len(term) > 4)


def sensor_value(payload: ChatIn, *keys: str, default: Any = "unknown") -> Any:
    for key in keys:
        value = payload.sensor_data.get(key)
        if value not in (None, ""):
            return value
    return default


def local_ai_reply(payload: ChatIn) -> str:
    message = payload.message.lower()
    moisture = sensor_value(payload, "soilMoisture", "soil_moisture")
    temp = sensor_value(payload, "temperature")
    humidity = sensor_value(payload, "humidity")
    ph = sensor_value(payload, "soilPh", "ph")
    location = payload.location or "your farm"

    if "monsoon" in message or "kharif" in message or ("crop" in message and ("plant" in message or "grow" in message)):
        return (
            f"For the monsoon season near {location}, good practical crop choices are soybean, maize, pigeon pea/tur dal, "
            "groundnut, green gram, black gram, and vegetables like okra or chilli if you can manage drainage. "
            f"With your current soil moisture around {moisture}% and pH {ph}, soybean or pigeon pea are strong safer choices "
            "for medium black soil; maize works well if you can give nutrients and avoid waterlogging. "
            "If your field holds water for many days, avoid groundnut and choose pigeon pea or paddy only if water is reliable. "
            "Final choice should depend on seed availability, last crop, market price, and whether the field drains within 24-48 hours after heavy rain."
        )

    if "crop health" in message or "plant health" in message or "disease" in message or "pest" in message:
        return (
            f"Crop health looks generally okay from sensors: moisture {moisture}%, temperature {temp}C, humidity {humidity}%, "
            f"and pH {ph}. The main risk is high humidity, which can increase fungal disease pressure in monsoon. "
            "Check leaves twice a week for yellowing, curling, spots, powdery growth, stem rot, and insects under the leaves. "
            "Keep drainage open, avoid watering late evening, remove badly infected leaves, and use a recommended fungicide or pesticide only after identifying the symptom. "
            "If you tell me the crop name and symptom, I can give a more specific action."
        )

    if "soil type" in message or ("soil" in message and ("popular" in message or "common" in message)):
        return (
            "The most common farm soil type depends on the region, but for many Indian farms, alluvial soil is widely used "
            "because it is fertile and supports crops like wheat, rice, sugarcane, pulses, and vegetables. "
            f"For {location}, do a simple field check too: sandy soil drains fast, clay soil holds water longer, and loamy soil "
            "usually gives the best balance for most crops. A soil test is the safest way to confirm your exact type."
        )

    if "irrigat" in message or "water" in message or "moisture" in message:
        return (
            f"Your current soil moisture is {moisture}%. If this is accurate, irrigation is not urgent unless the crop is in a "
            "water-sensitive stage or the topsoil is drying quickly. For many field crops, consider irrigation when moisture "
            "moves below about 50-55%, and avoid watering during strong afternoon heat."
        )

    if "fertilizer" in message or "npk" in message or "nutrient" in message:
        return (
            f"Use fertilizer based on crop stage and a soil test. With pH around {ph}, most nutrients should remain available "
            "if the value is near 6.5-7.5. For wheat or vegetables, a balanced NPK dose is usually safer early, then add "
            "nitrogen in split doses during active growth. Avoid over-fertilizing when soil moisture is low."
        )

    if "ph" in message:
        return (
            f"Your soil pH reading is {ph}. Most crops prefer about 6.0-7.5. If pH is below 6.0, lime can help; if it is above "
            "8.0, organic matter, gypsum where suitable, and better drainage can help. Confirm with a soil lab before major correction."
        )

    if "weather" in message or "rain" in message or "temperature" in message:
        return (
            f"Current farm context shows temperature {temp}C and humidity {humidity}% at {location}. Before irrigation or spraying, "
            "check the latest local forecast. Avoid spraying in strong wind, high heat, or just before rain."
        )

    if "market" in message or "price" in message or "sell" in message:
        return (
            f"For market decisions near {location}, compare today's mandi price with your storage cost and crop condition. "
            "If prices are above your target and quality may drop in storage, selling part of the harvest now can reduce risk."
        )

    return (
        f"Based on your farm context at {location}: soil moisture {moisture}%, temperature {temp}C, humidity {humidity}%, "
        f"and pH {ph}. Ask me about irrigation, fertilizer, soil pH, crop health, weather timing, or market prices and I can "
        "give a practical recommendation from this data."
    )


def local_ai_unavailable_reply(payload: ChatIn) -> str:
    moisture = payload.sensor_data.get("soilMoisture") or payload.sensor_data.get("soil_moisture") or "unknown"
    temp = payload.sensor_data.get("temperature") or "unknown"
    humidity = payload.sensor_data.get("humidity") or "unknown"
    return (
        "Live GPT is not connected yet, so I cannot import a fresh answer from GPT or Google Search right now. "
        f"I can still see your farm context: soil moisture {moisture}%, temperature {temp}C, humidity {humidity}%, "
        f"and location {payload.location or 'not set'}. "
        "Set OPENAI_API_KEY for GPT answers, and set GOOGLE_API_KEY plus GOOGLE_CSE_ID to add Google search context."
    )


def reading_to_sensor_list(row: dict[str, Any]) -> list[dict[str, Any]]:
    sensor_meta = [
        ("soil_moisture", "%"),
        ("humidity", "%"),
        ("temperature", "C"),
        ("ph", "pH"),
        ("nitrogen", "mg/kg"),
        ("phosphorus", "mg/kg"),
        ("potassium", "mg/kg"),
    ]

    return [
        {
            "sensor_type": sensor_type,
            "value": decimal_to_float(row[sensor_type]),
            "unit": unit,
            "recorded_at": decimal_to_float(row["recorded_at"]),
            "device_id": row["device_id"],
        }
        for sensor_type, unit in sensor_meta
        if row.get(sensor_type) is not None
    ]


@app.get("/api/health")
def health():
    try:
      ensure_sensor_tables()
      ensure_farmers_tables()
      with get_connection() as conn:
          conn.ping(reconnect=True, attempts=1, delay=0)
      return {"ok": True, "database": "connected", "farmers_database": FARMERS_DATABASE}
    except Exception as exc:
      raise HTTPException(status_code=503, detail=f"Database not connected: {exc}") from exc


@app.get("/")
def root():
    return {
        "service": "CropConnect ESP32 Ingestion API",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.post("/api/telemetry/ingest")
def ingest_telemetry(payload: TelemetryIn, x_api_key: str | None = Header(default=None)):
    check_api_key(x_api_key)
    ensure_sensor_tables()

    insert_sql = """
        INSERT INTO sensor_readings (
          device_id,
          soil_moisture,
          humidity,
          temperature,
          ph,
          nitrogen,
          phosphorus,
          potassium,
          raw_payload
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CAST(%s AS JSON))
    """

    values = (
        payload.device_id,
        payload.soil_moisture,
        payload.humidity,
        payload.temperature,
        payload.ph,
        payload.nitrogen,
        payload.phosphorus,
        payload.potassium,
        payload.model_dump_json(),
    )

    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(insert_sql, values)
            reading_id = cursor.lastrowid
        conn.commit()

    return {
        "ok": True,
        "id": reading_id,
        "device_id": payload.device_id,
        "received_at": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/sensors/latest")
def latest_sensors(device_id: str = Query(default="sim-node-1", max_length=80)):
    ensure_sensor_tables()
    query = """
        SELECT
          id,
          device_id,
          soil_moisture,
          humidity,
          temperature,
          ph,
          nitrogen,
          phosphorus,
          potassium,
          recorded_at
        FROM sensor_readings
        WHERE device_id = %s
        ORDER BY recorded_at DESC, id DESC
        LIMIT 1
    """

    try:
        with get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(query, (device_id,))
                row = cursor.fetchone()
    except Exception as exc:
        return {
            "device_id": device_id,
            "readings": [],
            "database": "unavailable",
            "message": str(exc),
        }

    if not row:
        return {"device_id": device_id, "readings": [], "message": "No readings yet"}

    return {
        "device_id": row["device_id"],
        "recorded_at": decimal_to_float(row["recorded_at"]),
        "readings": reading_to_sensor_list(row),
    }


@app.get("/api/sensors/history")
def sensor_history(
    device_id: str = Query(default="sim-node-1", max_length=80),
    limit: int = Query(default=50, ge=1, le=500),
):
    ensure_sensor_tables()
    query = """
        SELECT
          id,
          device_id,
          soil_moisture,
          humidity,
          temperature,
          ph,
          nitrogen,
          phosphorus,
          potassium,
          recorded_at
        FROM sensor_readings
        WHERE device_id = %s
        ORDER BY recorded_at DESC, id DESC
        LIMIT %s
    """

    try:
        with get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(query, (device_id, limit))
                rows = cursor.fetchall()
    except Exception as exc:
        return {
            "device_id": device_id,
            "count": 0,
            "items": [],
            "database": "unavailable",
            "message": str(exc),
        }

    return {
        "device_id": device_id,
        "count": len(rows),
        "items": [
            {key: decimal_to_float(value) for key, value in row.items()}
            for row in rows
        ],
    }


@app.post("/api/auth/signup")
def auth_signup(payload: AuthSignupIn):
    ensure_farmers_tables()

    insert_sql = """
        INSERT INTO `sign-in` (
          `email`,
          `password`,
          `phone`,
          `name`,
          `state`,
          `location`,
          `land size`,
          `location_type`,
          `city`,
          `village`,
          `sensor_device_id`,
          `sensors`,
          `pumps`,
          `sensor_setup_complete`,
          `sensor_setup_status`
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    location_type = payload.location_type or "city"
    city = payload.city or (payload.location if location_type == "city" else "")
    village = payload.village or (payload.location if location_type == "village" else "")
    values = (
        payload.email.strip().lower(),
        payload.password,
        payload.phone or "",
        payload.name,
        payload.state or "",
        payload.location or "",
        payload.land_size,
        location_type,
        city or "",
        village or "",
        payload.sensor_device_id or "sim-node-1",
        payload.sensors or "0",
        payload.pumps or "0",
        1 if payload.sensor_setup_complete else 0,
        payload.sensor_setup_status or "pending",
    )

    try:
        with get_farmers_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(insert_sql, values)
                user_id = cursor.lastrowid
                cursor.execute("SELECT * FROM `sign-in` WHERE `id` = %s", (user_id,))
                row = cursor.fetchone()
            conn.commit()
    except mysql.connector.IntegrityError as exc:
        raise HTTPException(status_code=409, detail="An account with this email already exists") from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not create account: {exc}") from exc

    return {
        "ok": True,
        "user": user_row_to_payload(row),
    }


@app.post("/api/auth/login")
def auth_login(payload: AuthLoginIn):
    ensure_farmers_tables()

    query = """
        SELECT
          *
        FROM `sign-in`
        WHERE `email` = %s AND `password` = %s
        LIMIT 1
    """

    try:
        with get_farmers_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(query, (payload.email.strip().lower(), payload.password))
                row = cursor.fetchone()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not check login: {exc}") from exc

    if not row:
        raise HTTPException(status_code=401, detail="Email and password do not match")

    return {
        "ok": True,
        "user": user_row_to_payload(row),
    }


@app.post("/api/auth/profile")
def auth_profile_update(payload: AuthProfileUpdateIn):
    ensure_farmers_tables()

    if not payload.user_id and not payload.email:
        raise HTTPException(status_code=400, detail="user_id or email is required")

    updates: list[str] = []
    values: list[Any] = []
    field_map = {
        "name": "name",
        "phone": "phone",
        "state": "state",
        "location": "location",
        "land_size": "land size",
        "location_type": "location_type",
        "city": "city",
        "village": "village",
        "sensor_device_id": "sensor_device_id",
        "sensors": "sensors",
        "pumps": "pumps",
        "sensor_setup_status": "sensor_setup_status",
    }

    data = payload.model_dump(exclude_unset=True)
    for input_name, column_name in field_map.items():
        if input_name in data and data[input_name] is not None:
            updates.append(f"`{column_name}` = %s")
            values.append(data[input_name])

    if "sensor_setup_complete" in data and data["sensor_setup_complete"] is not None:
        updates.append("`sensor_setup_complete` = %s")
        values.append(1 if data["sensor_setup_complete"] else 0)

    if not updates:
        raise HTTPException(status_code=400, detail="No profile fields provided")

    where_sql = "`id` = %s" if payload.user_id else "`email` = %s"
    values.append(payload.user_id or payload.email.strip().lower())

    try:
        with get_farmers_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(f"UPDATE `sign-in` SET {', '.join(updates)} WHERE {where_sql}", tuple(values))
                if cursor.rowcount == 0:
                    raise HTTPException(status_code=404, detail="User not found")
                cursor.execute(
                    "SELECT * FROM `sign-in` WHERE " + where_sql,
                    (payload.user_id or payload.email.strip().lower(),),
                )
                row = cursor.fetchone()
            conn.commit()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not update profile: {exc}") from exc

    return {"ok": True, "user": user_row_to_payload(row)}


@app.post("/api/farm/pump-state")
def save_pump_state(payload: PumpStateSaveIn):
    ensure_sensor_tables()
    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO pump_states (
                      user_id, email, pump_id, is_on, runtime_minutes, schedule, sent_to_esp32, message
                    )
                    VALUES (%s, %s, %s, %s, %s, CAST(%s AS JSON), %s, %s)
                    """,
                    (
                        payload.user_id,
                        payload.email.strip().lower() if payload.email else None,
                        payload.pump_id,
                        1 if payload.on else 0,
                        payload.runtime or 0,
                        json_text(payload.schedule),
                        1 if payload.sent_to_esp32 else 0,
                        payload.message or "",
                    ),
                )
            conn.commit()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not save pump state: {exc}") from exc

    return {"ok": True}


@app.get("/api/farm/pump-states")
def get_pump_states(
    user_id: int | None = Query(default=None, ge=1),
    email: str | None = Query(default=None, max_length=255),
):
    ensure_sensor_tables()
    where_sql, values = owner_where(user_id, email)
    query = f"""
        SELECT ps.*
        FROM pump_states ps
        INNER JOIN (
          SELECT pump_id, MAX(id) AS latest_id
          FROM pump_states
          WHERE {where_sql}
          GROUP BY pump_id
        ) latest ON ps.id = latest.latest_id
        ORDER BY ps.pump_id
    """
    try:
        with get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(query, values)
                rows = cursor.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not load pump states: {exc}") from exc

    return {
        "ok": True,
        "items": [
            {
                "pump_id": row["pump_id"],
                "on": bool(row["is_on"]),
                "runtime": int(row.get("runtime_minutes") or 0),
                "schedule": parse_json_column(row.get("schedule"), {}),
                "sent_to_esp32": bool(row.get("sent_to_esp32")),
                "message": row.get("message") or "",
                "updated_at": decimal_to_float(row.get("created_at")),
            }
            for row in rows
        ],
    }


@app.post("/api/farm/timers")
def save_pump_timers(payload: PumpTimersSaveIn):
    ensure_sensor_tables()
    email = payload.email.strip().lower() if payload.email else None
    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                where_sql, values = owner_where(payload.user_id, email)
                cursor.execute(f"DELETE FROM pump_timers WHERE {where_sql}", values)
                for pump_id, timers in payload.timers.items():
                    for timer in timers:
                        cursor.execute(
                            """
                            INSERT INTO pump_timers (
                              user_id, email, pump_id, timer_key, start_time, duration_minutes, days, active
                            )
                            VALUES (%s, %s, %s, %s, %s, %s, CAST(%s AS JSON), %s)
                            """,
                            (
                                payload.user_id,
                                email,
                                str(pump_id),
                                str(timer.get("id") or f"{pump_id}-{timer.get('startTime')}"),
                                str(timer.get("startTime") or ""),
                                int(timer.get("duration") or 0),
                                json_text(timer.get("days") or []),
                                1,
                            ),
                        )
            conn.commit()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not save timers: {exc}") from exc

    return {"ok": True}


@app.get("/api/farm/timers")
def get_pump_timers(
    user_id: int | None = Query(default=None, ge=1),
    email: str | None = Query(default=None, max_length=255),
):
    ensure_sensor_tables()
    where_sql, values = owner_where(user_id, email)
    try:
        with get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(
                    f"""
                    SELECT *
                    FROM pump_timers
                    WHERE {where_sql} AND active = 1
                    ORDER BY pump_id, start_time
                    """,
                    values,
                )
                rows = cursor.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not load timers: {exc}") from exc

    timers: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        timers.setdefault(row["pump_id"], []).append(
            {
                "id": row["timer_key"],
                "startTime": row["start_time"],
                "duration": int(row["duration_minutes"]),
                "days": parse_json_column(row.get("days"), []),
            }
        )

    return {"ok": True, "timers": timers}


@app.post("/api/farm/chat-message")
def save_chat_message(payload: ChatMessageSaveIn):
    ensure_sensor_tables()
    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO chat_messages (
                      user_id, email, message_type, text, related_to_plant_or_soil, sensor_data, location
                    )
                    VALUES (%s, %s, %s, %s, %s, CAST(%s AS JSON), %s)
                    """,
                    (
                        payload.user_id,
                        payload.email.strip().lower() if payload.email else None,
                        payload.message_type,
                        payload.text,
                        None if payload.related_to_plant_or_soil is None else (1 if payload.related_to_plant_or_soil else 0),
                        json_text(payload.sensor_data),
                        payload.location or "",
                    ),
                )
            conn.commit()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not save chat message: {exc}") from exc

    return {"ok": True}


@app.get("/api/farm/chat-history")
def get_chat_history(
    user_id: int | None = Query(default=None, ge=1),
    email: str | None = Query(default=None, max_length=255),
    limit: int = Query(default=50, ge=1, le=200),
):
    ensure_sensor_tables()
    where_sql, values = owner_where(user_id, email)
    try:
        with get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(
                    f"""
                    SELECT *
                    FROM chat_messages
                    WHERE {where_sql}
                    ORDER BY id DESC
                    LIMIT %s
                    """,
                    (*values, limit),
                )
                rows = cursor.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not load chat history: {exc}") from exc

    return {
        "ok": True,
        "items": [
            {
                "id": row["id"],
                "type": "bot" if row["message_type"] == "bot" else "user",
                "text": row["text"],
                "relatedToPlantOrSoil": None if row.get("related_to_plant_or_soil") is None else bool(row["related_to_plant_or_soil"]),
                "createdAt": decimal_to_float(row.get("created_at")),
            }
            for row in reversed(rows)
        ],
    }


@app.post("/api/farm/snapshot")
def save_dashboard_snapshot(payload: DashboardSnapshotIn):
    ensure_sensor_tables()
    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO dashboard_snapshots (
                      user_id, email, device_id, source, sensor_data, pump_data, timers,
                      weather_data, market_data, telemetry_packet
                    )
                    VALUES (%s, %s, %s, %s, CAST(%s AS JSON), CAST(%s AS JSON), CAST(%s AS JSON),
                            CAST(%s AS JSON), CAST(%s AS JSON), CAST(%s AS JSON))
                    """,
                    (
                        payload.user_id,
                        payload.email.strip().lower() if payload.email else None,
                        payload.device_id,
                        payload.source,
                        json_text(payload.sensor_data),
                        json_text(payload.pump_data),
                        json_text(payload.timers),
                        json_text(payload.weather_data),
                        json_text(payload.market_data),
                        json_text(payload.telemetry_packet),
                    ),
                )
            conn.commit()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not save dashboard snapshot: {exc}") from exc

    return {"ok": True}


@app.get("/api/farm/snapshot/latest")
def get_latest_dashboard_snapshot(
    user_id: int | None = Query(default=None, ge=1),
    email: str | None = Query(default=None, max_length=255),
):
    ensure_sensor_tables()
    where_sql, values = owner_where(user_id, email)
    try:
        with get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(
                    f"""
                    SELECT *
                    FROM dashboard_snapshots
                    WHERE {where_sql}
                    ORDER BY id DESC
                    LIMIT 1
                    """,
                    values,
                )
                row = cursor.fetchone()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not load dashboard snapshot: {exc}") from exc

    if not row:
        return {"ok": True, "snapshot": None}

    return {
        "ok": True,
        "snapshot": {
            "id": row["id"],
            "device_id": row.get("device_id"),
            "source": row.get("source"),
            "sensor_data": parse_json_column(row.get("sensor_data"), {}),
            "pump_data": parse_json_column(row.get("pump_data"), {}),
            "timers": parse_json_column(row.get("timers"), {}),
            "weather_data": parse_json_column(row.get("weather_data"), None),
            "market_data": parse_json_column(row.get("market_data"), None),
            "telemetry_packet": parse_json_column(row.get("telemetry_packet"), {}),
            "created_at": decimal_to_float(row.get("created_at")),
        },
    }


@app.post("/api/enquiries")
def enquiries(payload: EnquiryIn):
    sent = False
    try:
        sent = send_enquiry_email(payload)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Email delivery failed: {exc}") from exc

    return {
        "ok": True,
        "message": "Enquiry received" if sent else "Enquiry received; SMTP delivery is not configured",
        "sent_to": CONTACT_TO_EMAIL,
        "email_sent": sent,
        "received_at": datetime.now(timezone.utc).isoformat(),
        "data": payload.model_dump(),
    }


@app.post("/api/ai/chat")
def ai_chat(payload: ChatIn):
    if not is_plant_or_soil_question(payload.message):
        reply = "Please enter a correct question related to plant or soil."
        insert_chat_record(payload.user_id, payload.email, "user", payload.message, False, payload.sensor_data, payload.location)
        insert_chat_record(payload.user_id, payload.email, "bot", reply, False, payload.sensor_data, payload.location)
        return {
            "ok": False,
            "related_to_plant_or_soil": False,
            "reply": reply,
        }

    context = {
        "location": payload.location,
        "language": payload.language,
        "sensor_data": payload.sensor_data,
    }
    search_results = google_search(payload.message, payload.location)

    if not OPENAI_API_KEY:
        reply = local_ai_reply(payload)
        insert_chat_record(payload.user_id, payload.email, "user", payload.message, True, payload.sensor_data, payload.location)
        insert_chat_record(payload.user_id, payload.email, "bot", reply, True, payload.sensor_data, payload.location)
        return {
            "ok": True,
            "related_to_plant_or_soil": True,
            "reply": reply,
            "needs_setup": ["OPENAI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_CSE_ID"],
        }

    messages = [
        {
            "role": "developer",
            "content": (
                "You are CropConnect's farming assistant. Give concise, practical crop, irrigation, "
                "weather, market, and sensor guidance. Use the supplied farm context. If a question "
                "needs certified agronomy, veterinary, legal, medical, or financial advice, say so clearly. "
                "When web search results are supplied, use them as supporting context and mention that the "
                "answer is based on the available search snippets, not direct Google pages."
            ),
        },
        {"role": "user", "content": f"Farm context: {json.dumps(context, ensure_ascii=False)}"},
    ]
    if search_results:
        messages.append(
            {
                "role": "user",
                "content": f"Google search context: {json.dumps(search_results, ensure_ascii=False)}",
            }
        )
    for item in payload.history[-8:]:
        role = "assistant" if item.get("type") == "bot" else "user"
        text = item.get("text", "")
        if text:
            messages.append({"role": role, "content": text})
    messages.append({"role": "user", "content": payload.message})

    try:
        data = request_json(
            "https://api.openai.com/v1/chat/completions",
            {
                "model": OPENAI_MODEL,
                "messages": messages,
                "temperature": 0.4,
                "max_tokens": 450,
            },
            {"Authorization": f"Bearer {OPENAI_API_KEY}"},
        )
    except Exception as exc:
        reply = local_ai_reply(payload)
        insert_chat_record(payload.user_id, payload.email, "user", payload.message, True, payload.sensor_data, payload.location)
        insert_chat_record(payload.user_id, payload.email, "bot", reply, True, payload.sensor_data, payload.location)
        return {
            "ok": True,
            "related_to_plant_or_soil": True,
            "reply": reply,
            "needs_setup": ["OPENAI_API_KEY quota/billing"],
            "used_google_search": bool(search_results),
        }

    reply = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
    final_reply = reply or "I could not generate a response. Please try again."
    insert_chat_record(payload.user_id, payload.email, "user", payload.message, True, payload.sensor_data, payload.location)
    insert_chat_record(payload.user_id, payload.email, "bot", final_reply, True, payload.sensor_data, payload.location)
    return {
        "ok": True,
        "related_to_plant_or_soil": True,
        "reply": final_reply,
        "used_google_search": bool(search_results),
    }


@app.get("/api/weather/forecast")
def weather_forecast(location: str = Query(default="Pune, Maharashtra", max_length=160)):
    try:
        # Geocoding using Open-Meteo (free)
        geo_url = "https://geocoding-api.open-meteo.com/v1/search?" + urllib.parse.urlencode(
            {"name": location, "count": 1, "language": "en", "format": "json"}
        )
        geo = request_json(geo_url, verify_ssl=False)
        result = (geo.get("results") or [None])[0]
        if not result and "," in location:
            city_name = location.split(",", 1)[0].strip()
            geo_url = "https://geocoding-api.open-meteo.com/v1/search?" + urllib.parse.urlencode(
                {"name": city_name, "count": 1, "language": "en", "format": "json"}
            )
            geo = request_json(geo_url, verify_ssl=False)
            result = (geo.get("results") or [None])[0]
        if not result:
            raise HTTPException(status_code=404, detail="Location not found")

        # Open-Meteo provides live internet forecast data without requiring an API key.
        params = {
            "latitude": result["latitude"],
            "longitude": result["longitude"],
            "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,pressure_msl,precipitation,weather_code",
            "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum",
            "forecast_days": 7,
            "timezone": "auto",
        }
        forecast_url = "https://api.open-meteo.com/v1/forecast?" + urllib.parse.urlencode(params)
        data = request_json(forecast_url, verify_ssl=False)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Weather request failed: {exc}") from exc

    current = data.get("current", {})
    daily = data.get("daily", {})
    days = daily.get("time", [])
    rain = daily.get("precipitation_probability_max", [])
    rain_amount = daily.get("precipitation_sum", [])
    highs = daily.get("temperature_2m_max", [])
    lows = daily.get("temperature_2m_min", [])

    return {
        "ok": True,
        "source": "Open-Meteo live internet forecast",
        "requested_location": location,
        "location": {
            "name": result.get("name"),
            "admin1": result.get("admin1"),
            "country": result.get("country"),
            "latitude": result.get("latitude"),
            "longitude": result.get("longitude"),
        },
        "temp": round(current.get("temperature_2m", 0)),
        "humidity": round(current.get("relative_humidity_2m", 0)),
        "wind": round(current.get("wind_speed_10m", 0)),
        "pressure": round(current.get("pressure_msl", 0)),
        "rainfall": [
            {
                "day": "Today" if index == 0 else datetime.fromisoformat(day).strftime("%a"),
                "date": day,
                "value": int(rain[index] or 0) if index < len(rain) else 0,
                "mm": round(float(rain_amount[index] or 0), 1) if index < len(rain_amount) else 0,
            }
            for index, day in enumerate(days[:7])
        ],
        "forecast": [
            {
                "day": "Today" if index == 0 else datetime.fromisoformat(day).strftime("%a"),
                "icon": "🌧️" if (rain[index] or 0) >= 50 else "⛅" if (rain[index] or 0) >= 25 else "☀️",
                "high": round(highs[index] or 0),
                "low": round(lows[index] or 0),
            }
            for index, day in enumerate(days)
        ],
    }



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=env("HOST", "0.0.0.0"), port=int(env("PORT", "8001")))
