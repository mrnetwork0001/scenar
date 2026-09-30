"use client";

import { useEffect, useState } from "react";
import { IconCheck, IconCopy } from "@/components/icons";
import styles from "./CopyButton.module.css";

/** Small circular copy button with a check confirmation and a polite live-region announcement. */
export function CopyButton({
  value,
  label = "Copy",
  className,
  tone = "light",
}: {
  value: string | null | undefined;
  label?: string;
  className?: string;
  tone?: "light" | "dark";
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(id);
  }, [copied]);

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard can be blocked (permissions, insecure context): fall back to a selection copy.
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
      } finally {
        ta.remove();
      }
    }
  }

  return (
    <button
      type="button"
      className={`${styles.btn} ${tone === "dark" ? styles.dark : ""} ${copied ? styles.done : ""} ${className ?? ""}`}
      onClick={copy}
      disabled={!value}
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied" : label}
    >
      {copied ? (
        <IconCheck size={13} strokeWidth={2.5} aria-hidden="true" />
      ) : (
        <IconCopy size={13} strokeWidth={2} aria-hidden="true" />
      )}
      <span className={styles.sr} aria-live="polite">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </button>
  );
}
