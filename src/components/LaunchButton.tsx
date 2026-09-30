"use client";

import { IconArrowUpRight } from "@/components/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./LaunchButton.module.css";

/**
 * Black "Launch app" pill for the marketing pages; hidden once you're inside the app.
 * Icon-only (arrow in a white circle) below 768px.
 */
export function LaunchButton() {
  const pathname = usePathname();
  const inApp = /^\/(app|play|custom)(\/|$)/.test(pathname);
  if (inApp) return null;
  return (
    // aria-label keeps the name when the label is hidden (icon-only below 768px).
    <Link href="/app" className={styles.launch} aria-label="Launch app">
      <span className={styles.label} aria-hidden="true">
        Launch app
      </span>
      <span className={styles.icon} aria-hidden="true">
        <IconArrowUpRight size={14} strokeWidth={2.5} />
      </span>
    </Link>
  );
}
