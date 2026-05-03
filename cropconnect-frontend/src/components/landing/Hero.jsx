import { ArrowRight, Sparkles, Globe2 } from "lucide-react";
import { Button } from "../ui/button";
import LiveSensorCard from "./LiveSensorCard";
import { useLandingLanguage } from "./LandingLanguageContext";

export default function Hero() {
  const { t } = useLandingLanguage();
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="top"
      data-testid="hero-section"
      className="relative pt-28 lg:pt-36 pb-16 lg:pb-24 overflow-hidden"
    >
      {/* Decorative dashed ring */}
      <div className="absolute -top-24 -right-24 w-[480px] h-[480px] rounded-full dashed-ring opacity-60 pointer-events-none" />
      <div className="absolute -bottom-40 -left-20 w-[360px] h-[360px] rounded-full bg-[#E07A5F]/10 blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-7xl px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7 reveal" style={{ animationDelay: "0.05s" }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F4F1EA] border border-[#D5D1C5] text-[#1B4332]">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="eyebrow">{t("heroBadge")}</span>
          </div>

          <h1
            data-testid="hero-headline"
            className="font-display mt-6 text-[clamp(2.6rem,6.5vw,4.8rem)] leading-[0.98] tracking-tight text-[#1A201C]"
          >
            {t("heroTitle1")}
            <span className="italic text-[#1B4332]">{t("heroTitle2")}</span>
            <br />
            {t("heroTitle3")}
          </h1>

          <p className="mt-6 max-w-xl text-base sm:text-lg text-[#1A201C]/70 leading-relaxed">
            {t("heroBody")}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              data-testid="hero-cta-primary"
              onClick={() => scrollTo("features")}
              className="bg-[#1B4332] hover:bg-[#0F2A1F] text-[#FDFBF7] h-12 px-6 rounded-full group"
            >
              {t("explore")}
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              data-testid="hero-cta-secondary"
              variant="outline"
              onClick={() => scrollTo("contact")}
              className="h-12 px-6 rounded-full border-[#1B4332]/20 text-[#1B4332] hover:bg-[#1B4332] hover:text-[#FDFBF7]"
            >
              {t("talkTeam")}
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap gap-6 text-sm text-[#1A201C]/70">
            <div className="flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-[#1B4332]" />
              <span>{t("heroFacts")[0]}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E07A5F]" />
              <span>{t("heroFacts")[1]}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1B4332]" />
              <span>{t("heroFacts")[2]}</span>
            </div>
          </div>
        </div>

        <div
          className="lg:col-span-5 relative reveal"
          style={{ animationDelay: "0.25s" }}
        >
          {/* Hero image frame */}
          <div className="relative aspect-[4/5] w-full rounded-[28px] overflow-hidden border border-[#D5D1C5] bg-[#F4F1EA]">
            <img
              src="https://images.unsplash.com/photo-1632135558972-195494369111?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTJ8MHwxfHNlYXJjaHwxfHxzbWFydCUyMGFncmljdWx0dXJlJTIwSW9UJTIwZmFybSUyMHNlbnNvcnxlbnwwfHx8fDE3Nzc2MTM5Mjh8MA&ixlib=rb-4.1.0&q=85"
              alt="Smart agriculture field"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F2A1F]/40 via-transparent to-transparent" />
            <div className="absolute top-5 left-5 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-white">
              <span className="live-dot" />
              <span className="text-xs tracking-[0.2em] uppercase font-semibold">
                Node #01 · Live
              </span>
            </div>
          </div>

          {/* Floating live sensor card */}
          <div
            className="absolute -left-4 sm:-left-10 lg:-left-20 bottom-6 sm:bottom-10 w-[88%] sm:w-[92%] max-w-[420px] float-soft"
          >
            <LiveSensorCard />
          </div>
        </div>
      </div>
    </section>
  );
}
