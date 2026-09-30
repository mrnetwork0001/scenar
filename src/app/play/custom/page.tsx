import type { Metadata } from "next";
import { Suspense } from "react";
import { CustomPlay } from "@/components/CustomPlay";

export const metadata: Metadata = {
  title: "Your custom scenario",
  description: "Rehearse the real conversation you're dreading against an AI counterpart built from your own situation.",
  robots: { index: false },
};

export default function CustomPlayPage() {
  return (
    <Suspense fallback={null}>
      <CustomPlay />
    </Suspense>
  );
}
