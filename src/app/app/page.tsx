import type { Metadata } from "next";
import { BuildYourOwnCard } from "@/components/BuildYourOwnCard";
import { ProgressPanel } from "@/components/ProgressPanel";
import { ScenarioGrid } from "@/components/ScenarioGrid";
import { SectionHeader, sectionStyles } from "@/components/landing/SectionHeader";
import { SCENARIOS, toPublic } from "@/lib/scenarios";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Choose your conversation",
  description: "Pick a high-stakes conversation to rehearse, track your progress, or build your own scenario.",
};

export default function AppHome() {
  const scenarios = SCENARIOS.map(toPublic);

  return (
    <div className={styles.page}>
      <div className={sectionStyles.inner}>
        <ProgressPanel />

        <section id="scenarios" className={styles.section} aria-labelledby="scenarios-title">
          <SectionHeader
            id="scenarios"
            eyebrow="Scenarios"
            title="Choose your conversation"
            sub="Every counterpart is hiding something. Two are free, with no sign-up and no card."
          />
          <ScenarioGrid scenarios={scenarios} />
          <BuildYourOwnCard />
        </section>
      </div>
    </div>
  );
}
