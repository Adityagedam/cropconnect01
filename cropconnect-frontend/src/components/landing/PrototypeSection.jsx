import { CircuitBoard, Cpu, Radio, Ruler } from "lucide-react";
import { useLandingLanguage } from "./LandingLanguageContext";

const specs = [
  { icon: Cpu, label: "MCU", value: "ESP32 / Arduino UNO R4" },
  { icon: Radio, label: "Connectivity", value: "Wi-Fi + LoRa gateway" },
  { icon: CircuitBoard, label: "Sensors", value: "Soil · DHT22 · pH · LDR · EC" },
  { icon: Ruler, label: "Field scale", value: "1 node / 0.25 acre (demo)" },
];

export default function PrototypeSection() {
  const { t } = useLandingLanguage();
  return (
    <section
      id="prototype"
      data-testid="prototype-section"
      className="relative py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-5 order-2 lg:order-1">
          <span className="eyebrow">{t("prototypeEyebrow")}</span>
          <h2 className="font-display mt-3 text-4xl sm:text-5xl leading-tight text-[#1A201C]">
            {t("prototypeTitle")} <span className="italic text-[#1B4332]">{t("prototypeTitleItalic")}</span>
          </h2>
          <p className="mt-5 text-base text-[#1A201C]/70 max-w-md">
            {t("prototypeBody")}
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4">
            {specs.map((s, i) => (
              <div
                key={i}
                data-testid={`prototype-spec-${i}`}
                className="rounded-xl border border-[#D5D1C5] bg-white p-4 hover-lift"
              >
                <s.icon className="w-4 h-4 text-[#E07A5F]" />
                <div className="mt-3 eyebrow text-[10px]">{s.label}</div>
                <div className="mt-1 text-sm font-medium text-[#1A201C]">{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 order-1 lg:order-2">
          {/* Framed photo */}
          <div className="relative">
            <div className="absolute -inset-3 rounded-[28px] bg-[#1B4332]/5 -z-0" />
            <div className="relative rounded-[22px] border-[10px] border-[#1B4332] bg-[#0F2A1F] overflow-hidden shadow-[0_40px_80px_-40px_rgba(15,42,31,0.6)]">
              <img
                src="https://customer-assets.emergentagent.com/job_sensor-live-hub/artifacts/9bjw3xur_WhatsApp%20Image%202026-04-27%20at%2019.59.47.jpeg"
                alt="CropConnect prototype hardware"
                data-testid="prototype-image"
                className="w-full h-[420px] sm:h-[520px] object-cover"
              />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-4 py-2 rounded-lg bg-black/40 backdrop-blur-md border border-white/10">
                <span className="font-mono text-xs text-white/80">prototype_v1.jpg</span>
                <span className="flex items-center gap-2 text-white/80 text-xs">
                  <span className="live-dot" /> streaming
                </span>
              </div>
            </div>
            <p className="mt-3 text-xs text-[#1A201C]/50 font-mono">
              Live prototype · built & tested in the lab.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
