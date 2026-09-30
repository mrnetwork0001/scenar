import Link from "next/link";
import { IconArrowRight, IconPro } from "@/components/icons";
import { Reveal } from "./Reveal";
import styles from "./BuildYourOwnCard.module.css";

const EXAMPLES = ["Ask for a raise", "Get my deposit back", "Renegotiate equity", "Raise my rate"];

/** Landing-page entry point to the Pro custom scenario builder (inverse card). */
export function BuildYourOwnCard() {
  return (
    <Reveal className={styles.wrap}>
      <Link href="/custom" className={styles.card} aria-label="Build your own scenario (Pro)">
        <svg className={styles.art} viewBox="0 0 400 210" fill="none" aria-hidden="true">
          <path d="M20 200 A180 180 0 0 1 380 200" />
          <path d="M80 200 A120 120 0 0 1 320 200" strokeDasharray="2 6" />
          <path d="M140 200 A60 60 0 0 1 260 200" />
          <line x1="200" y1="200" x2="318" y2="92" className={styles.artNeedle} />
        </svg>

        <span className={styles.copy}>
          <span className={styles.top}>
            <span className={styles.pro}>
              <IconPro size={10} strokeWidth={2.5} aria-hidden="true" />
              Pro
            </span>
            <span className={styles.newTag}>New</span>
          </span>
          <span className={styles.title}>Build your own scenario</span>
          <span className={styles.text}>
            Describe the conversation you&apos;re dreading. We&apos;ll build the counterpart - with their own hidden
            agenda.
          </span>
          <span className={styles.examples} aria-hidden="true">
            {EXAMPLES.map((e) => (
              <span key={e} className={styles.example}>
                {e}
              </span>
            ))}
          </span>
        </span>

        <span className={styles.cta}>
          Start building
          <span className={styles.ctaIcon} aria-hidden="true">
            <IconArrowRight size={12} strokeWidth={3} />
          </span>
        </span>
      </Link>
    </Reveal>
  );
}
