import GalaxyInteractiveHeroBackground from "@/components/ui/galaxy-interactive-hero-background"
import HomeHero from "@/components/home/home-hero"
import KeyActions from "@/components/home/key-actions"
import WhoUsesThis from "@/components/home/who-uses-this"
import HowItWorks from "@/components/home/how-it-works"
import Footer from "@/components/home/footer"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background relative">
      <HomeHero />

      <KeyActions />

      <WhoUsesThis />

      <HowItWorks />

      <Footer />
    </div>
  )
}
