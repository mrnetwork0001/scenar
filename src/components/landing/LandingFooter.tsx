"use client";

import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";
import { ScrollLink } from "@/components/ScrollLink";
import styles from "./LandingFooter.module.css";
import { useSafeReducedMotion } from "@/components/useSafeReducedMotion";

const EASE = [0.16, 1, 0.3, 1] as const;

type FooterLink = { label: string; href: string; external?: boolean; hash?: boolean };

/** Edit these to restyle/re-order the footer without touching markup. */
const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Launch app", href: "/app" },
      { label: "Build your own", href: "/custom" },
      { label: "Pricing", href: "/#pricing", hash: true },
      { label: "FAQ", href: "/#faq", hash: true },
    ],
  },
  {
    title: "Scenarios",
    links: [
      { label: "Negotiate Your First Offer", href: "/play/salary-offer" },
      { label: "Say No to Your Manager", href: "/play/say-no-manager" },
      { label: "Appeal to a Strict Professor", href: "/play/professor-extension" },
      { label: "Give Hard Feedback to a Former Peer", href: "/play/hard-feedback" },
      { label: "Push Back on an Unfair Review", href: "/play/unfair-review" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "GitHub", href: "https://github.com/mrnetwork0001/scenar", external: true },
      { label: "Built for RevenueCat Shipaton 2026", href: "https://www.revenuecat.com", external: true },
    ],
  },
];

const WORDMARK = "Scenar";

function FooterLinkItem({ link }: { link: FooterLink }) {
  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noreferrer" className={styles.link}>
        {link.label}
        <ArrowUpRight size={12} strokeWidth={2} aria-hidden="true" className={styles.ext} />
      </a>
    );
  }
  if (link.hash) {
    return (
      <ScrollLink href={link.href} className={styles.link}>
        {link.label}
      </ScrollLink>
    );
  }
  return (
    <Link href={link.href} className={styles.link}>
      {link.label}
    </Link>
  );
}

function FooterBrand() {
  return (
    <div className={styles.brand}>
      <Link href="/" className={styles.logo} aria-label="Scenar home">
        <LogoMark size={26} />
        <span>Scenar</span>
      </Link>
      <p className={styles.tagline}>Rehearse the conversations that matter, before the stakes are real.</p>
      <Link href="/app" className={`btn btn-primary ${styles.brandCta}`}>
        Launch app
        <ArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
      </Link>
    </div>
  );
}

function FooterColumns() {
  return (
    <nav className={styles.columns} aria-label="Footer">
      {COLUMNS.map((col) => (
        <div key={col.title} className={styles.column}>
          <h2 className={styles.colTitle}>{col.title}</h2>
          <ul className={styles.links}>
            {col.links.map((l) => (
              <li key={l.href}>
                <FooterLinkItem link={l} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Oversized, faint wordmark whose letters rise into place when the footer scrolls in. */
function FooterWordmark() {
  const reduce = useSafeReducedMotion();
  return (
    <div className={styles.wordmark} aria-hidden="true">
      {WORDMARK.split("").map((ch, i) => (
        <motion.span
          key={i}
          initial={reduce ? false : { opacity: 0, y: "40%" }}
          whileInView={{ opacity: 1, y: "0%" }}
          viewport={{ once: true, margin: "0px 0px -5% 0px" }}
          transition={{ duration: 1.1, ease: EASE, delay: 0.06 * i }}
        >
          {ch}
        </motion.span>
      ))}
    </div>
  );
}

function FooterBottom() {
  return (
    <div className={styles.bottom}>
      <p>© 2026 Scenar · MIT License</p>
      <p className={styles.made}>
        <span className={styles.madeDot} aria-hidden="true" />
        Made with RevenueCat
      </p>
    </div>
  );
}

export function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <FooterBrand />
          <FooterColumns />
        </div>
      </div>
      <FooterWordmark />
      <div className={styles.inner}>
        <FooterBottom />
      </div>
    </footer>
  );
}
