"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";

/**
 * Smoothly scrolls to `#id` on the current page (instant under reduced motion) and updates the hash.
 * Returns false when the target isn't on the page so callers can fall back to normal navigation.
 */
export function scrollToId(id: string): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  history.pushState(null, "", `#${id}`);
  return true;
}

/** Split "/#scenarios" → { path: "/", id: "scenarios" }. */
function parseHashHref(href: string) {
  const i = href.indexOf("#");
  if (i === -1) return null;
  return { path: href.slice(0, i) || null, id: href.slice(i + 1) };
}

type ScrollLinkProps = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

/** A Link that smooth-scrolls when its hash target is on the current page. */
export function ScrollLink({ href, onClick, ...rest }: ScrollLinkProps) {
  const pathname = usePathname();

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const target = parseHashHref(href);
    if (!target || (target.path && target.path !== pathname)) return;
    if (scrollToId(target.id)) e.preventDefault();
  }

  return <Link href={href} onClick={handleClick} scroll={false} {...rest} />;
}
