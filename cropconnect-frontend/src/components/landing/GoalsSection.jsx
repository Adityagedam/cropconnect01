import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { CheckCircle2 } from "lucide-react";
import { useLandingLanguage } from "./LandingLanguageContext";

const shortTerm = [
  "Ship the multilanguage mobile app (Android first) with live sensor dashboard",
  "Connect the physical prototype (ESP32 + soil/temp/humidity/pH) to the cloud",
  "Deploy the website with enquiry capture for farmer onboarding",
  "Pilot with 20 farmers in 2 districts of Maharashtra for a single kharif cycle",
  "Release threshold-based alerts over SMS & push",
  "Publish an open REST API for any node / gateway to plug in",
];

const longTerm = [
  "Pan-India rollout with regional language packs & offline crop calendars",
  "AI-based disease detection from leaf photos + sensor correlation",
  "LoRa mesh kit priced under ₹2,000 per node for smallholder farmers",
  "Marketplace integration — fertiliser, seeds & buyers plugged into advice",
  "Govt. & agri-university data partnerships for regional yield models",
  "Carbon & water credits tied to verified sustainable practice data",
];

export default function GoalsSection() {
  const { t } = useLandingLanguage();
  return (
    <section
      id="goals"
      data-testid="goals-section"
      className="relative py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <span className="eyebrow">{t("goalsEyebrow")}</span>
          <h2 className="font-display mt-3 text-4xl sm:text-5xl leading-tight text-[#1A201C]">
            {t("goalsTitle")}
            <br />
            <span className="italic text-[#1B4332]">{t("goalsItalic")}</span>
          </h2>
          <p className="mt-5 text-base text-[#1A201C]/70">
            {t("goalsBody")}
          </p>
        </div>

        <div className="mt-12">
          <Tabs defaultValue="short" className="w-full">
            <TabsList
              data-testid="goals-tabs"
              className="bg-[#F4F1EA] border border-[#D5D1C5] rounded-full p-1 h-12"
            >
              <TabsTrigger
                value="short"
                data-testid="tab-short-term"
                className="rounded-full data-[state=active]:bg-[#1B4332] data-[state=active]:text-[#FDFBF7] px-6 h-10 text-sm"
              >
                Short-term · 0–6 months
              </TabsTrigger>
              <TabsTrigger
                value="long"
                data-testid="tab-long-term"
                className="rounded-full data-[state=active]:bg-[#1B4332] data-[state=active]:text-[#FDFBF7] px-6 h-10 text-sm"
              >
                Long-term · 1–3 years
              </TabsTrigger>
            </TabsList>

            <TabsContent value="short" className="mt-8">
              <GoalList items={shortTerm} accent="#1B4332" />
            </TabsContent>
            <TabsContent value="long" className="mt-8">
              <GoalList items={longTerm} accent="#E07A5F" />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
}

function GoalList({ items, accent }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((g, i) => (
        <div
          key={i}
          data-testid={`goal-item-${i}`}
          className="flex gap-4 p-5 rounded-2xl border border-[#D5D1C5] bg-white hover-lift"
        >
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: accent }} />
          <p className="text-[15px] leading-relaxed text-[#1A201C]">{g}</p>
        </div>
      ))}
    </div>
  );
}
