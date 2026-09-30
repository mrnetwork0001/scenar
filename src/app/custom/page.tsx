import type { Metadata } from "next";
import { CustomBuilder } from "@/components/CustomBuilder";

export const metadata: Metadata = {
  title: "Build your own scenario",
  description:
    "Describe the conversation you're dreading and Scenar builds an AI counterpart with a hidden agenda, so you can rehearse it before the real thing.",
};

export default function CustomPage() {
  return <CustomBuilder />;
}
