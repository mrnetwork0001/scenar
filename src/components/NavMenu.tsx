"use client";

import { AnimatePresence, motion } from "motion/react";
import { IconArrowUpRight, IconInspect, IconPlus } from "@/components/icons";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useHistory } from "@/lib/history";
import { openInspector } from "@/lib/inspector";
import { MobileSheet } from "./MobileSheet";
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
  { href: "/account", label: "Account & billing", hint: "Plan, restore, environment" },
];

const MOBILE_QUERY = "(max-width: 767px)";

function subscribeMobile(cb: () => void) {
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** Below 768px (hydration-safe: false on the server; the menu is closed then anyway). */
function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );
}

/**
 * The black "Menu" pill. Desktop: a small dropdown card. Mobile: a full-screen control-centre
 * sheet (plan, billing environment, navigation).
 */
export function NavMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  const history = useHistory();
  const reduce = useSafeReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const mobile = useIsMobile();
  const sheetOpen = open && mobile;

  // Close on route change (adjusting state during render instead of in an effect).
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  // Desktop dropdown: close on outside pointer and Esc.
  useEffect(() => {
    if (!open || mobile) return;
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
  }, [open, mobile]);

  // Mobile sheet: Esc closes (the Live confirm dialog swallows its own Esc first) and the page
  // behind stops scrolling. The lock sits on <html> so it never fights the Paywall's body lock.
  useEffect(() => {
    if (!sheetOpen) return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen]);

  const links = LINKS.filter((l) => !l.needsHistory || history.length > 0);

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.pill}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup={mobile ? "dialog" : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`${styles.icon} ${open ? styles.iconOpen : ""}`} aria-hidden="true">
          <IconPlus size={12} strokeWidth={3} />
        </span>
        <span className={styles.label}>Menu</span>
      </button>

      {/* Portaled so the fixed sheet escapes the nav's stacking context and entrance transform. */}
      {mobile
        ? createPortal(
            <AnimatePresence>
              {sheetOpen ? (
                <MobileSheet
                  key="sheet"
                  id={menuId}
                  reduce={reduce}
                  onClose={() => {
                    setOpen(false);
                    buttonRef.current?.focus({ preventScroll: true });
                  }}
                  onNavigate={() => setOpen(false)}
                />
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}

      <AnimatePresence>
        {open && !mobile && (
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
              <motion.li
                className={styles.divided}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE, delay: 0.04 + links.length * 0.04 }}
              >
                <button
                  type="button"
                  className={styles.link}
                  onClick={() => {
                    setOpen(false);
                    openInspector("open");
                  }}
                >
                  <span className={styles.linkText}>
                    <span className={styles.linkLabel}>RevenueCat inspector</span>
                    <span className={styles.linkHint}>Live SDK state · Shift+I</span>
                  </span>
                  <span className={`${styles.linkIcon} ${styles.linkIconStatic}`} aria-hidden="true">
                    <IconInspect size={14} strokeWidth={2} />
                  </span>
                </button>
              </motion.li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}
