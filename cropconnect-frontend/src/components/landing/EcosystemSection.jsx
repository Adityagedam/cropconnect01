import { Users, Landmark, Truck, GraduationCap, Store, Leaf } from "lucide-react";
import { useLandingLanguage } from "./LandingLanguageContext";

const nodes = [
  { icon: Users, label: "Farmers", angle: 0 },
  { icon: Landmark, label: "Cooperatives & FPOs", angle: 60 },
  { icon: GraduationCap, label: "Agri Universities", angle: 120 },
  { icon: Truck, label: "Supply-chain", angle: 180 },
  { icon: Store, label: "Buyers & Markets", angle: 240 },
  { icon: Leaf, label: "Govt. & Policy", angle: 300 },
];

export default function EcosystemSection() {
  const { t } = useLandingLanguage();
  return (
    <section
      id="ecosystem"
      data-testid="ecosystem-section"
      className="relative py-20 sm:py-28 bg-[#0F2A1F] text-[#FDFBF7] overflow-hidden"
    >
      {/* Soft radial */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-white/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full border border-white/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full border border-white/10" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-5">
          <span className="eyebrow text-[#E07A5F]">{t("ecosystemEyebrow")}</span>
          <h2 className="font-display mt-3 text-4xl sm:text-5xl leading-tight">
            {t("ecosystemTitle")}
            <br />
            <span className="italic text-[#E3C77B]">{t("ecosystemItalic")}</span>
          </h2>
          <p className="mt-5 text-[15px] text-white/75 max-w-md leading-relaxed">
            {t("ecosystemBody")}
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {["open REST API", "webhooks", "LoRa ready", "data export"].map((t) => (
              <span
                key={t}
                className="px-3 py-1.5 rounded-full border border-white/15 text-xs tracking-wider font-mono text-white/80"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 relative h-[460px] flex items-center justify-center">
          <div className="relative w-[420px] h-[420px]">
            {/* Center node */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-[#FDFBF7] text-[#1B4332] flex flex-col items-center justify-center text-center shadow-[0_0_60px_rgba(224,122,95,0.25)]">
              <Leaf className="w-5 h-5 mb-1" />
              <span className="font-display text-lg leading-tight">Crop</span>
              <span className="font-display text-lg leading-tight -mt-1">Connect</span>
            </div>

            {/* Orbiting nodes */}
            <div className="absolute inset-0 spin-slow">
              {nodes.map((n, i) => {
                const rad = (n.angle * Math.PI) / 180;
                const r = 180;
                const x = Math.cos(rad) * r;
                const y = Math.sin(rad) * r;
                return (
                  <div
                    key={i}
                    data-testid={`ecosystem-node-${i}`}
                    className="absolute top-1/2 left-1/2 w-28 h-28 -translate-x-1/2 -translate-y-1/2"
                    style={{ transform: `translate(${x - 56}px, ${y - 56}px)` }}
                  >
                    <div
                      className="w-full h-full rounded-2xl bg-white/5 border border-white/15 backdrop-blur-sm flex flex-col items-center justify-center text-center px-2"
                      style={{ animation: "rotate 42s linear infinite reverse" }}
                    >
                      <n.icon className="w-4 h-4 text-[#E07A5F]" />
                      <span className="mt-1.5 text-[11px] leading-tight font-medium text-white/85">
                        {n.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
