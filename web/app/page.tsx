import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { BuiltForSection } from "@/components/built-for-section"
import { WhyTeamsSection } from "@/components/why-teams-section"
import { MunshiDadaModesSection } from "@/components/munshi-dada-modes-section"
import { NoNewAppSection } from "@/components/no-new-app-section"
import { FeaturesSection } from "@/components/features-section"
import { HowItWorksSection } from "@/components/how-it-works-section"
import { BusinessEvolutionSection } from "@/components/business-evolution-section"
import { LiveDemosSection } from "@/components/live-demos-section"
import { OutcomesSection } from "@/components/outcomes-section"
import { FAQSection } from "@/components/faq-section"
import { GetStartedSection } from "@/components/get-started-section"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <HeroSection />
      <BuiltForSection />
      <div id="how-it-works">
        <HowItWorksSection />
      </div>
      <BusinessEvolutionSection />
      <div id="features">
        <FeaturesSection />
      </div>
      <div id="roles">
        <MunshiDadaModesSection />
      </div>
      <div id="use-cases">
        <WhyTeamsSection />
      </div>
      <NoNewAppSection />
      <OutcomesSection />
      <LiveDemosSection />
      <FAQSection />
      <GetStartedSection />
      <Footer />
    </main>
  )
}