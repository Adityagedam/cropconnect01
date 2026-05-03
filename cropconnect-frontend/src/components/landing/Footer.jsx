import { Leaf } from "lucide-react";
import { useLandingLanguage } from "./LandingLanguageContext";

export default function Footer() {
  const { t } = useLandingLanguage();
  const year = new Date().getFullYear();
  return (
    <footer
      data-testid="site-footer"
      className="relative bg-[#1B4332] text-[#FDFBF7] overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 pt-20 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-full bg-[#FDFBF7] text-[#1B4332] flex items-center justify-center">
                <Leaf className="w-4 h-4" strokeWidth={2.5} />
              </span>
              <span className="font-display text-2xl">CropConnect</span>
            </div>
            <p className="mt-4 text-sm text-white/70 max-w-sm leading-relaxed">
              {t("footerBody")}
            </p>
          </div>

          <div className="md:col-span-2">
            <h5 className="eyebrow text-[#E3C77B] text-[10px]">Product</h5>
            <ul className="mt-4 space-y-2 text-sm text-white/75">
              <li><a href="#features" className="link-u">Features</a></li>
              <li><a href="#how-it-works" className="link-u">How it works</a></li>
              <li><a href="#app" className="link-u">Mobile app</a></li>
              <li><a href="#prototype" className="link-u">Prototype</a></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h5 className="eyebrow text-[#E3C77B] text-[10px]">Company</h5>
            <ul className="mt-4 space-y-2 text-sm text-white/75">
              <li><a href="#goals" className="link-u">Roadmap</a></li>
              <li><a href="#ecosystem" className="link-u">Ecosystem</a></li>
              <li><a href="#benefits" className="link-u">Benefits</a></li>
              <li><a href="#contact" className="link-u">Contact</a></li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <h5 className="eyebrow text-[#E3C77B] text-[10px]">Get updates</h5>
            <p className="mt-4 text-sm text-white/70">
              Want pilot access? Drop your email in the enquiry form above — we'll
              send the onboarding kit.
            </p>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50 font-mono">
          <span>© {year} CropConnect · Crafted with soil, sun & silicon.</span>
          <span>v1.0 · prototype ready</span>
        </div>
      </div>

      {/* Massive wordmark */}
      <div
        aria-hidden
        className="select-none pointer-events-none px-5 sm:px-8 pb-6"
      >
        <div className="font-display leading-none tracking-tighter text-[#FDFBF7]/10 text-[18vw] sm:text-[14vw]">
          CropConnect
        </div>
      </div>
    </footer>
  );
}
