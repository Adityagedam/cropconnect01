import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Leaf, Menu, X } from "lucide-react";
import { Button } from "../ui/button";
import LanguageSelect from "../LanguageSelect";
import { useLandingLanguage } from "./LandingLanguageContext";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { language, setLanguage, t } = useLandingLanguage();
  const links = [
    { id: "prototype", label: t("nav")[0] },
    { id: "features", label: t("nav")[1] },
    { id: "how-it-works", label: t("nav")[2] },
    { id: "goals", label: t("nav")[3] },
    { id: "ecosystem", label: t("nav")[4] },
    { id: "contact", label: t("nav")[5] },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setOpen(false);
  };

  return (
    <header
      data-testid="site-header"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "backdrop-blur-xl bg-[#FDFBF7]/75 border-b border-black/5"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 h-16 flex items-center justify-between">
        <a
          href="#top"
          data-testid="header-logo"
          className="flex items-center gap-2 group"
        >
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#1B4332] text-[#FDFBF7]">
            <Leaf className="w-4 h-4" strokeWidth={2.5} />
          </span>
          <span className="font-display text-xl text-[#1A201C] tracking-tight">
            Crop<span className="text-[#1B4332]">Connect</span>
          </span>
        </a>

        <nav className="hidden lg:flex items-center gap-9">
          {links.map((l) => (
            <button
              key={l.id}
              onClick={() => scrollTo(l.id)}
              data-testid={`nav-${l.id}`}
              className="text-sm text-[#1A201C]/80 hover:text-[#1B4332] transition-colors link-u"
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <LanguageSelect value={language} onChange={setLanguage} />
          <Button
            asChild
            variant="outline"
            data-testid="header-login"
            className="rounded-full border-[#1B4332]/20 bg-white/60 px-5 text-[#1B4332] hover:bg-[#EDF6F0]"
          >
            <Link to="/login">{t("login")}</Link>
          </Button>
          <Button
            asChild
            data-testid="header-cta"
            className="bg-[#1B4332] hover:bg-[#0F2A1F] text-[#FDFBF7] rounded-full px-5"
          >
            <Link to="/signin">{t("signin")}</Link>
          </Button>
        </div>

        <div className="lg:hidden flex items-center gap-1.5">
          <LanguageSelect value={language} onChange={setLanguage} className="hidden sm:inline-flex" />
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-full border-[#1B4332]/20 bg-white/80 px-2.5 text-xs text-[#1B4332] hover:bg-[#EDF6F0]"
          >
            <Link to="/login">{t("login")}</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="bg-[#1B4332] hover:bg-[#0F2A1F] text-[#FDFBF7] rounded-full px-2.5 text-xs"
          >
            <Link to="/signin">{t("signin")}</Link>
          </Button>
          <button
            data-testid="mobile-menu-toggle"
            onClick={() => setOpen((v) => !v)}
            className="w-10 h-10 rounded-full border border-[#D5D1C5] flex items-center justify-center bg-white/80"
            aria-label="Toggle menu"
          >
            {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden bg-[#FDFBF7] border-t border-[#D5D1C5]">
          <div className="px-5 py-5 flex flex-col gap-3">
            {links.map((l) => (
              <button
                key={l.id}
                data-testid={`mobile-nav-${l.id}`}
                onClick={() => scrollTo(l.id)}
                className="text-left py-2 text-[#1A201C]"
              >
                {l.label}
              </button>
            ))}
            <Button
              onClick={() => scrollTo("contact")}
              className="bg-[#1B4332] hover:bg-[#0F2A1F] text-[#FDFBF7] rounded-full mt-2"
              data-testid="mobile-cta"
            >
              {t("getInTouch")}
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
