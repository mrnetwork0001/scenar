"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./LaunchButton.module.css";

/** Black "Launch app" pill for the marketing pages; hidden once you're inside the app. */
export function LaunchButton() {
  const pathname = usePathname();
  const inApp = /^\/(app|play|custom)(\/|$)/.test(pathname);
  if (inApp) return null;
  return (
    <Link href="/app" className={styles.launch}>
      <span className={styles.label}>Launch app</span>
      <span className={styles.icon} aria-hidden="true">
        <ArrowUpRight size={14} strokeWidth={2.5} />
      </span>
    </Link>
  );
}
