import type { Metadata } from "next";
import { AccountClient } from "./AccountClient";

export const metadata: Metadata = {
  title: "Account & billing",
  description:
    "Your Scenar plan, trial and renewal dates, subscription management, billing environment, and how to restore access on another device.",
  alternates: { canonical: "/account" },
  robots: { index: false },
};

export default function AccountPage() {
  return <AccountClient />;
}
