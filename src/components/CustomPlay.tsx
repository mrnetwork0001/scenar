"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, SearchX } from "lucide-react";
import { useCustomScenario } from "@/lib/customStore";
import { PlayClient } from "./PlayClient";
import styles from "./CustomPlay.module.css";

/** Loads a saved custom scenario from local storage (by ?id) and hands it to PlayClient. */
export function CustomPlay() {
  const id = useSearchParams().get("id");
  const item = useCustomScenario(id);

  if (item === undefined) {
    return (
      <div className={styles.wrap} aria-busy="true">
        <span className={styles.loader} aria-hidden="true" />
        <span className={styles.srOnly}>Loading your scenario…</span>
      </div>
    );
  }

  if (!item) {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <span className={styles.icon} aria-hidden="true">
            <SearchX size={18} strokeWidth={2} />
          </span>
          <h1 className={styles.title}>Scenario not found</h1>
          <p className={styles.text}>
            Custom scenarios are saved in this browser. This one may have been deleted, or was built on another
            device.
          </p>
          <Link href="/custom" className="btn btn-primary">
            Build a scenario <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      </div>
    );
  }

  return <PlayClient key={item.scenario.id} scenario={item.scenario} sealed={item.sealed} />;
}
