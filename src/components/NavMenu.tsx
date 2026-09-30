"use client";

import { AnimatePresence, motion } from "motion/react";
import { IconArrowUpRight, IconPlus } from "@/components/icons";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useHistory } from "@/lib/history";
import { ScrollLink } from "./ScrollLink";
import styles from "./NavMenu.module.css";
import { useSafeReducedMotion } from "@/components/useSafeReducedMotion";

const EASE = [0.16, 1, 0.3, 1] as const;

const LINKS = [
  { href: "/app", label: "Launch app", hint: "Pick a conversation" },
  { href: "/custom", label: "Build your own", hint: "Pro · any scenario" },
  { href: "/app#progress", label: "Your progress", hint: "Scores & streak", needsHistory: true },
  { href: "/#how", label: "How it works", hint: "See a live demo" },
  { href: "/#pricing", label: "Pricing", hint: "Free & Pro plans" },
  { href: "/#faq", label: "FAQ", hint: "Common questions" },
];

/** The black "Menu" pill with its dropdown card. */
export function NavMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  const history = useHistory();
  const reduce = useSafeReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  // Close on route change (adjusting state during render instead of in an effect).
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const links = LINKS.filter((l) => !l.needsHistory || history.length > 0);

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.pill}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`${styles.icon} ${open ? styles.iconOpen : ""}`} aria-hidden="true">
          <IconPlus size={12} strokeWidth={3} />
        </span>
        <span className={styles.label}>Menu</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.nav
            id={menuId}
            aria-label="Site"
            className={styles.card}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <ul className={styles.list}>
              {links.map((l, i) => (
                <motion.li
                  key={l.href}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE, delay: 0.04 + i * 0.04 }}
                >
                  <ScrollLink
                    href={l.href}
                    className={styles.link}
                    aria-current={l.href === pathname ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    <span className={styles.linkText}>
                      <span className={styles.linkLabel}>{l.label}</span>
                      <span className={styles.linkHint}>{l.hint}</span>
                    </span>
                    <span className={styles.linkIcon} aria-hidden="true">
                      <IconArrowUpRight size={14} strokeWidth={2} />
                    </span>
                  </ScrollLink>
                </motion.li>
              ))}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}
