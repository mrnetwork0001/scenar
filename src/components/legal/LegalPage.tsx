import Link from "next/link";
import type { ReactNode } from "react";
import { IconArrowUpRight } from "@/components/icons";
import styles from "./LegalPage.module.css";

export const LEGAL_UPDATED = "30 September 2026";
export const REPO_URL = "https://github.com/mrnetwork0001/scenar";
export const ISSUES_URL = `${REPO_URL}/issues`;

const PAGES = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refunds", label: "Refunds" },
] as const;

/** Shared, quiet layout for Terms / Privacy / Refunds: a readable 68ch column. */
export function LegalPage({
  current,
  title,
  summary,
  children,
}: {
  current: (typeof PAGES)[number]["href"];
  title: string;
  /** Plain-English "in short" bullets shown above the full text. */
  summary: ReactNode[];
  children: ReactNode;
}) {
  return (
    <div className={styles.page}>
      <article className={styles.col}>
        <header className={styles.head}>
          <p className="eyebrow">Legal</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.meta}>
            Last updated <time dateTime="2026-09-30">{LEGAL_UPDATED}</time>
          </p>
        </header>

        <nav className={styles.tabs} aria-label="Legal pages">
          {PAGES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className={`${styles.tab} ${p.href === current ? styles.tabActive : ""}`}
              aria-current={p.href === current ? "page" : undefined}
            >
              {p.label}
            </Link>
          ))}
        </nav>

        <aside className={styles.summary} aria-label="In short">
          <p className={styles.summaryTitle}>In short</p>
          <ul>
            {summary.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </aside>

        <div className={styles.prose}>{children}</div>

        <footer className={styles.foot}>
          <p>
            Scenar is an independent student project built for RevenueCat Shipaton 2026. These pages
            explain in plain English how the app works; they are not legal advice.
          </p>
          <div className={styles.footLinks}>
            <a href={ISSUES_URL} target="_blank" rel="noreferrer" className="btn btn-ghost">
              Contact us on GitHub
              <IconArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
            </a>
            <Link href="/account" className="btn btn-ghost">
              Account & billing
            </Link>
          </div>
        </footer>
      </article>
    </div>
  );
}

/** External link with the arrow glyph, for inline use in legal prose. */
export function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}
