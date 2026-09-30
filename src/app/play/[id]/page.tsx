import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlayClient } from "@/components/PlayClient";
import { SCENARIOS, getScenario, toPublic } from "@/lib/scenarios";

export function generateStaticParams() {
  return SCENARIOS.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/play/[id]">): Promise<Metadata> {
  const { id } = await params;
  const scenario = getScenario(id);
  if (!scenario) return { title: "Scenario not found" };
  return {
    title: scenario.title,
    description: `Rehearse with ${scenario.counterpart.name}, ${scenario.counterpart.role}. ${scenario.goal}`,
  };
}

export default async function PlayPage({ params }: PageProps<"/play/[id]">) {
  const { id } = await params;
  const scenario = getScenario(id);
  if (!scenario) notFound();

  // Only the public fields cross the server→client boundary; persona and secret stay here.
  return <PlayClient key={scenario.id} scenario={toPublic(scenario)} />;
}
