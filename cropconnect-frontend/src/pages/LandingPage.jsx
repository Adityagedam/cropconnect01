import Header from "../components/landing/Header";
import Hero from "../components/landing/Hero";
import PrototypeSection from "../components/landing/PrototypeSection";
import FeaturesSection from "../components/landing/FeaturesSection";
import HowItWorks from "../components/landing/HowItWorks";
import GoalsSection from "../components/landing/GoalsSection";
import EcosystemSection from "../components/landing/EcosystemSection";
import MobileAppSection from "../components/landing/MobileAppSection";
import BenefitsSection from "../components/landing/BenefitsSection";
import ImpactStats from "../components/landing/ImpactStats";
import ContactSection from "../components/landing/ContactSection";
import Footer from "../components/landing/Footer";
import { LandingLanguageProvider } from "../components/landing/LandingLanguageContext";

export default function LandingPage() {
  return (
    <LandingLanguageProvider>
    <div data-testid="landing-page" className="relative">
      <Header />
      <main className="relative z-10">
        <Hero />
        <ImpactStats />
        <PrototypeSection />
        <FeaturesSection />
        <HowItWorks />
        <GoalsSection />
        <BenefitsSection />
        <EcosystemSection />
        <MobileAppSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
    </LandingLanguageProvider>
  );
}
