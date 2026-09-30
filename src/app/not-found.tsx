import type { Metadata } from "next";
import Link from "next/link";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Not found",
};

export default function NotFound() {
  return (
    <section className={styles.wrap} aria-labelledby="nf-title">
      <div className={styles.inner}>
        <p className={styles.code} aria-hidden="true">
          404
        </p>
        <div className={styles.bubbles} aria-hidden="true">
          <span className={styles.bubbleThem}>So… what did you want to talk about?</span>
          <span className={styles.bubbleYou}>
            <i />
            <i />
            <i />
          </span>
        </div>
        <p className="eyebrow">Error 404</p>
        <h1 id="nf-title" className={styles.title}>
          This conversation doesn&rsquo;t exist&hellip; yet.
        </h1>
        <p className={styles.sub}>
          The page you&rsquo;re looking for has left the room. Pick a scenario and start a conversation that does.
        </p>
        <div className={styles.actions}>
          <Link href="/" className="btn btn-primary">
            Back to Scenar
          </Link>
          <Link href="/app" className="btn btn-ghost">
            Browse scenarios
          </Link>
        </div>
      </div>
    </section>
  );
}
