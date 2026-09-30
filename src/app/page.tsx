import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { HeroVisual } from "@/components/HeroVisual";
import { ScrollLink } from "@/components/ScrollLink";
import { DemoSection } from "@/components/landing/DemoSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { FinalCta } from "@/components/landing/FinalCta";
import { InsightSection } from "@/components/landing/InsightSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { PricingSection } from "@/components/landing/PricingSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { ScenarioShowcase } from "@/components/landing/ScenarioShowcase";
import { SkillsSection } from "@/components/landing/SkillsSection";
import { TrustSection } from "@/components/landing/TrustSection";
import { SCENARIOS, toPublic } from "@/lib/scenarios";
import styles from "./page.module.css";

const HERO_TAGS = ["Salary negotiation", "Boundaries", "Hard feedback"];

export default function Home() {
  // Only public fields reach the client; personas and secrets stay on the server.
  const scenarios = SCENARIOS.map(toPublic);

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="hero-title">
        <HeroVisual />

        <div className={styles.heroFoot}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={`eyebrow ${styles.heroEyebrow}`}>AI conversation rehearsal · Shipaton 2026</p>
              <h1 id="hero-title" className={styles.headline}>
                <span>Rehearse the conversations</span> <span>that matter.</span>
              </h1>
              <div className={styles.heroActions}>
                <Link href="/app" className="btn btn-primary">
                  Launch app
                  <ArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
                </Link>
                <ScrollLink href="#problem" className="btn btn-ghost">
                  Why Scenar
                </ScrollLink>
              </div>
            </div>
            <ul className={styles.heroTags} aria-label="Scenario types">
              {HERO_TAGS.map((t) => (
                <li key={t} className="tag">
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <ProblemSection />
      <InsightSection />
      <DemoSection />
      <SkillsSection />
      <ScenarioShowcase scenarios={scenarios} />
      <FeaturesSection />
      <PricingSection />
      <TrustSection />
      <FaqSection />
      <FinalCta />
      <LandingFooter />
    </div>
  );
}
