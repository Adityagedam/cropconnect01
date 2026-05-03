import { useEffect, useState } from "react";
import axios from "axios";
import {
  Droplets,
  Thermometer,
  CloudRain,
  FlaskConical,
  Sun,
  Zap,
} from "lucide-react";

const API_BASE_URL =
  process.env.REACT_APP_BACKEND_URL || "https://cropconnect01-production.up.railway.app/api";
const API = API_BASE_URL.replace(/\/$/, "");

const META = {
  soil_moisture: { label: "Soil moisture", icon: Droplets, accent: "#1B4332" },
  temperature:   { label: "Temperature",   icon: Thermometer, accent: "#E07A5F" },
  humidity:      { label: "Humidity",      icon: CloudRain,  accent: "#2D6A4F" },
  ph:            { label: "Soil pH",       icon: FlaskConical, accent: "#52796F" },
  light:         { label: "Light",         icon: Sun,        accent: "#C97B5C" },
  ec:            { label: "Conductivity",  icon: Zap,        accent: "#1B4332" },
};

const ORDER = ["soil_moisture", "temperature", "humidity", "ph"];

export default function LiveSensorCard() {
  const [readings, setReadings] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = async () => {
    try {
      const { data } = await axios.get(`${API}/sensors/latest`);
      setReadings(data.readings || []);
      setUpdatedAt(new Date());
    } catch (e) {
      // fail silently - landing page shouldn't break
      console.error("sensor fetch failed", e);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  const visible = ORDER.map((k) => readings.find((r) => r.sensor_type === k)).filter(Boolean);

  return (
    <div
      data-testid="live-sensor-card"
      className="bg-white/95 backdrop-blur-md border border-[#D5D1C5] rounded-2xl p-5 shadow-[0_20px_60px_-25px_rgba(15,42,31,0.35)]"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="live-dot" />
          <span className="eyebrow">Live · Prototype node</span>
        </div>
        <span className="font-mono text-[10px] text-[#1A201C]/50" data-testid="sensor-updated-at">
          {updatedAt ? updatedAt.toLocaleTimeString() : "—"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {visible.map((r) => {
          const meta = META[r.sensor_type] || { label: r.sensor_type, icon: Droplets, accent: "#1B4332" };
          const Icon = meta.icon;
          return (
            <div
              key={r.sensor_type}
              data-testid={`sensor-${r.sensor_type}`}
              className="rounded-xl border border-[#E8E4D7] bg-[#FDFBF7] p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: meta.accent }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="text-[11px] uppercase tracking-wider text-[#1A201C]/60 font-semibold">
                  {meta.label}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span
                  className="font-display text-2xl text-[#1A201C]"
                  data-testid={`sensor-${r.sensor_type}-value`}
                >
                  {r.value}
                </span>
                <span className="text-xs text-[#1A201C]/60">{r.unit}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-dashed border-[#D5D1C5] flex items-center justify-between text-[11px] text-[#1A201C]/60">
        <span className="font-mono">device: sim-node-1</span>
        <span>auto-refresh · 4s</span>
      </div>
    </div>
  );
}
