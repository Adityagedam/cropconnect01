import { Languages, Smartphone, Droplets, Thermometer, Bell } from "lucide-react";
import { useLandingLanguage } from "./LandingLanguageContext";

const langs = [
  "English",
  "हिंदी",
  "मराठी",
  "తెలుగు",
  "தமிழ்",
  "বাংলা",
  "ಕನ್ನಡ",
];

export default function MobileAppSection() {
  const { t } = useLandingLanguage();
  return (
    <section
      id="app"
      data-testid="mobile-app-section"
      className="relative py-20 sm:py-28 overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-6 order-2 lg:order-1 relative">
          <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-[#D5D1C5]">
            <img
              src="https://images.unsplash.com/photo-1696371269200-2c8d837426aa?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzV8MHwxfHNlYXJjaHwzfHxmYXJtZXIlMjBtb2JpbGUlMjBhcHAlMjBhZ3JpY3VsdHVyZXxlbnwwfHx8fDE3Nzc2MTM5Mjh8MA&ixlib=rb-4.1.0&q=85"
              alt="Farmer using CropConnect mobile app"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#0F2A1F]/50 via-transparent to-transparent" />
          </div>

          {/* Phone mockup card */}
          <div className="absolute -right-4 sm:-right-10 -bottom-6 w-[240px] rounded-[32px] bg-[#1B4332] p-2 shadow-2xl hidden sm:block">
            <div className="rounded-[24px] bg-[#FDFBF7] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="eyebrow text-[10px]">नमस्ते, राजू</div>
                  <div className="font-display text-lg text-[#1A201C]">प्लॉट A</div>
                </div>
                <span className="live-dot" />
              </div>
              <div className="mt-4 space-y-2">
                <Row icon={Droplets} label="मिट्टी नमी" value="46%" tone="#1B4332" />
                <Row icon={Thermometer} label="तापमान" value="27°C" tone="#E07A5F" />
                <Row icon={Bell} label="अलर्ट" value="सिंचाई" tone="#52796F" />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 order-1 lg:order-2">
          <span className="eyebrow">{t("appEyebrow")}</span>
          <h2 className="font-display mt-3 text-4xl sm:text-5xl leading-tight text-[#1A201C]">
            {t("appTitle")}
            <span className="italic text-[#1B4332]">{t("appItalic")}</span>
          </h2>
          <p className="mt-5 text-base text-[#1A201C]/70 max-w-lg">
            {t("appBody")}
          </p>

          <div className="mt-8 flex flex-wrap gap-2" data-testid="language-chips">
            {langs.map((l, i) => (
              <span
                key={i}
                className="px-4 py-2 rounded-full border border-[#D5D1C5] bg-white text-sm text-[#1A201C]"
              >
                {l}
              </span>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 max-w-lg">
            <div className="p-4 rounded-xl bg-[#F4F1EA] border border-[#D5D1C5]">
              <Languages className="w-5 h-5 text-[#1B4332]" />
              <div className="mt-2 font-display text-xl text-[#1A201C]">7 languages</div>
              <div className="text-xs text-[#1A201C]/60">switchable in-app</div>
            </div>
            <div className="p-4 rounded-xl bg-[#F4F1EA] border border-[#D5D1C5]">
              <Smartphone className="w-5 h-5 text-[#E07A5F]" />
              <div className="mt-2 font-display text-xl text-[#1A201C]">~12 MB</div>
              <div className="text-xs text-[#1A201C]/60">light on data & RAM</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ icon: Icon, label, value, tone }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-[#E8E4D7] bg-white">
      <div className="flex items-center gap-2">
        <span
          className="w-6 h-6 rounded-md flex items-center justify-center text-white"
          style={{ backgroundColor: tone }}
        >
          <Icon className="w-3 h-3" />
        </span>
        <span className="text-xs text-[#1A201C]/70">{label}</span>
      </div>
      <span className="font-display text-sm text-[#1A201C]">{value}</span>
    </div>
  );
}
