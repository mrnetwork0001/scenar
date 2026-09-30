import type { MetadataRoute } from "next";
import { SCENARIOS } from "@/lib/scenarios";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/app`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/custom`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    ...SCENARIOS.map((s) => ({
      url: `${SITE}/play/${s.id}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
