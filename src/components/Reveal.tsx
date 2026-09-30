"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useSafeReducedMotion } from "@/components/useSafeReducedMotion";

/** Fades content up into place the first time it scrolls into view. */
export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li" | "header";
}) {
  const reduce = useSafeReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      // Same initial state on server and client (avoids hydration mismatches);
      // reduced motion only makes the transition instant.
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={reduce ? { duration: 0 } : { duration: 0.9, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </Tag>
  );
}
