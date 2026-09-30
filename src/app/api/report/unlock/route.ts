import { NextResponse } from "next/server";
import { proRequired, verifyPro } from "@/lib/entitlementServer";
import { rateLimit } from "@/lib/rateLimit";
import { unsealProSection } from "@/lib/seal";
import type { ProReportSection } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { proSealed } -> ProReportSection, only for callers RevenueCat confirms have scenar_pro.
export async function POST(req: Request) {
  const limited = rateLimit(req, "unlock");
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { proSealed } = (body ?? {}) as { proSealed?: unknown };
  if (typeof proSealed !== "string" || !proSealed) {
    return NextResponse.json({ error: "proSealed is required" }, { status: 400 });
  }

  // Always ask RevenueCat fresh: this is typically called seconds after a purchase.
  const v = await verifyPro(req, { bust: true });
  if (!v.pro) return proRequired(v);

  const opened = unsealProSection(proSealed);
  if ("error" in opened) {
    return NextResponse.json(
      {
        error: opened.error === "expired" ? "This report's coaching has expired - play the scenario again." : "Invalid or tampered report token",
        code: opened.error === "expired" ? "expired" : "invalid_token",
      },
      { status: 400 },
    );
  }
  const section: ProReportSection = opened.section;
  return NextResponse.json(section, { headers: { "Cache-Control": "no-store" } });
}
