/**
 * Scenar icon set.
 *
 * One drawing system for every glyph in the product:
 * - 24×24 grid, content kept inside a 3-21 safe area;
 * - stroke only (`currentColor`), round caps and joins, default stroke 1.5;
 * - geometry borrowed from the brand where it earns its place: the logo's two
 *   bars leaning at -35° (Pro, streak, wand) and the tension meter's thin
 *   gauge arc and needle (gauge, target, best, pulse).
 *
 * The API mirrors the common icon-library shape (`size`, `strokeWidth`, `className`, aria props), so a
 * glyph can be passed around as a component: `icon: ScenarIcon`.
 */
import type { ComponentType, ReactNode, SVGProps } from "react";

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "ref"> {
  size?: number | string;
  strokeWidth?: number | string;
}

export type ScenarIcon = ComponentType<IconProps>;

function createIcon(name: string, paths: ReactNode): ScenarIcon {
  function Icon({ size = 24, strokeWidth = 1.5, className, ...rest }: IconProps) {
    const labelled = rest["aria-label"] != null || rest["aria-labelledby"] != null;
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
        aria-hidden={labelled ? undefined : true}
        className={className ? `scenar-icon ${className}` : "scenar-icon"}
        data-icon={name}
        {...rest}
      >
        {paths}
      </svg>
    );
  }
  Icon.displayName = `Icon${name}`;
  return Icon;
}

/* ------------------------------------------------------------------ */
/* Brand geometry                                                      */
/* ------------------------------------------------------------------ */

/**
 * The logo mark itself (two rounded bars at -35°), drawn solid at small scale so it
 * reads as the brand even at 10px. Source geometry: `LogoMark` (32×32 grid).
 */
const MARK = (
  <g transform="translate(0.6 4.6) scale(0.62)" fill="currentColor" stroke="none">
    <g transform="rotate(-35 16 16)">
      <rect x="7.5" y="4" width="7.5" height="24" rx="3.75" />
      <rect x="17" y="9" width="7.5" height="15" rx="3.75" />
    </g>
  </g>
);

/** A four-point spark with concave sides, centred on (cx, cy). */
function spark(cx: number, cy: number, r: number) {
  const k = r * 0.18;
  return `M${cx} ${cy - r}Q${cx + k} ${cy - k} ${cx + r} ${cy}Q${cx + k} ${cy + k} ${cx} ${cy + r}Q${cx - k} ${cy + k} ${cx - r} ${cy}Q${cx - k} ${cy - k} ${cx} ${cy - r}Z`;
}

/* ------------------------------------------------------------------ */
/* Brand & premium                                                     */
/* ------------------------------------------------------------------ */

/** Pro: the solid Scenar mark with a spark lifting off its short bar. */
export const IconPro = createIcon(
  "Pro",
  <>
    {MARK}
    <path d={spark(18.6, 5.4, 3.6)} />
  </>,
);

/** Generate / AI: one large spark and a small companion. */
export const IconSpark = createIcon(
  "Spark",
  <>
    <path d={spark(10.5, 13, 7.5)} />
    <path d={spark(18.5, 5.5, 2.5)} />
  </>,
);

/** Rewrite: a single leaning bar (the logo's stroke) touched by a spark. */
export const IconWand = createIcon(
  "Wand",
  <>
    <path d="M4.5 19.5 14 10" />
    <path d={spark(17.5, 6.5, 3.5)} />
  </>,
);

/** Streak: three bars at the logo's -35° lean, rising in height left to right. */
export const IconStreak = createIcon(
  "Streak",
  <>
    <path d="M5 14.2 8.4 19" />
    <path d="M7.2 10 13.5 19" />
    <path d="M9.4 5.6 18.8 19" />
  </>,
);

/** Personal best: a three-step podium with a peak marker above the top step. */
export const IconBest = createIcon(
  "Best",
  <>
    <path d="M3.5 19.5h17" />
    <path d="M5 19.5v-5h4.5v5" />
    <path d="M9.5 19.5v-9h5v9" />
    <path d="M14.5 19.5v-3.5H19v3.5" />
    <path d="m12 3.8 1.6 2.2-1.6 2.2-1.6-2.2Z" />
  </>,
);

/* ------------------------------------------------------------------ */
/* Tension, progress & insight                                          */
/* ------------------------------------------------------------------ */

/** Tension pulse: a flat line that spikes once, like a heart-rate trace. */
export const IconPulse = createIcon(
  "Pulse",
  <path d="M3 12.5h3.5l2.2-5 3.6 10 2.4-7 1.5 2H21" />,
);

/** Gauge: the tension meter in miniature, arc, end ticks and needle. */
export const IconGauge = createIcon(
  "Gauge",
  <>
    <path d="M4 16.5a8 8 0 0 1 16 0" />
    <path d="M12 16.5 16.2 11.3" />
    <path d="M3.5 19.5h17" />
  </>,
);

/** Target: an open dial with a centre point and a needle aimed through the gap. */
export const IconTarget = createIcon(
  "Target",
  <>
    <path d="M18.5 9.1A7.5 7.5 0 1 1 14.9 5.5" />
    <path d="M15.6 12.1a3.6 3.6 0 1 1-3.7-3.6" />
    <path d="M12 12 19.5 4.5" />
    <path d="M16.5 4.5h3v3" />
  </>,
);

/** Trend up: a stepped pulse line climbing to an open arrowhead. */
export const IconTrendUp = createIcon(
  "TrendUp",
  <>
    <path d="m3.5 16.5 5-5 3.5 3.5 7-7" />
    <path d="M14.5 8H19v4.5" />
  </>,
);

/** Trend down: the same line, falling. */
export const IconTrendDown = createIcon(
  "TrendDown",
  <>
    <path d="m3.5 7.5 5 5 3.5-3.5 7 7" />
    <path d="M14.5 16H19v-4.5" />
  </>,
);

/** Analytics: three rounded columns rising left to right. */
export const IconBars = createIcon(
  "Bars",
  <>
    <path d="M6 19.5v-5" />
    <path d="M12 19.5v-9" />
    <path d="M18 19.5v-14" />
  </>,
);

/** Playbook: an open book drawn from two gentle pages and a spine. */
export const IconBook = createIcon(
  "Book",
  <>
    <path d="M12 7c-2-1.6-4.7-2.2-8.5-2.2v12.9c3.8 0 6.5.6 8.5 2.2 2-1.6 4.7-2.2 8.5-2.2V4.8C16.7 4.8 14 5.4 12 7Z" />
    <path d="M12 7v12.9" />
  </>,
);

/** Reveal: an almond eye with a round pupil. */
export const IconEye = createIcon(
  "Eye",
  <>
    <path d="M2.8 12Q12 2.8 21.2 12 12 21.2 2.8 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </>,
);

/** Instant: a geometric bolt. */
export const IconZap = createIcon(
  "Zap",
  <path d="M13.5 3 5 13.5h6.5L10.5 21 19 10.5h-6.5Z" />,
);

/* ------------------------------------------------------------------ */
/* People & voice                                                      */
/* ------------------------------------------------------------------ */

/** Two people, one slightly behind the other: two voices in one conversation. */
export const IconPeople = createIcon(
  "People",
  <>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
    <path d="M15.2 5.7a3 3 0 0 1 0 5.6" />
    <path d="M17.5 14.4a5.5 5.5 0 0 1 3 5.1" />
  </>,
);

/** No account: a person with a small cross beside them. */
export const IconAnonymous = createIcon(
  "Anonymous",
  <>
    <circle cx="10" cy="8.5" r="3.5" />
    <path d="M4 19.5a6 6 0 0 1 9.8-4.6" />
    <path d="m16.5 15.5 4 4" />
    <path d="m20.5 15.5-4 4" />
  </>,
);

/** Voice: a capsule microphone cradled by an open arc, on a short stem. */
export const IconMic = createIcon(
  "Mic",
  <>
    <rect x="9" y="3.5" width="6" height="10.5" rx="3" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
    <path d="M12 18v2.5" />
  </>,
);

/** Speaker: a cone with two sound arcs. */
export const IconSpeaker = createIcon(
  "Speaker",
  <>
    <path d="M4 9.5h3l4.5-4v13l-4.5-4H4Z" />
    <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5" />
    <path d="M18.3 6.8a7.3 7.3 0 0 1 0 10.4" />
  </>,
);

/** Waveform: five rounded bars, loudest in the middle. */
export const IconWaveform = createIcon(
  "Waveform",
  <>
    <path d="M4 10.5v3" />
    <path d="M8 7.5v9" />
    <path d="M12 4.5v15" />
    <path d="M16 8.5v7" />
    <path d="M20 10.5v3" />
  </>,
);

/* ------------------------------------------------------------------ */
/* Security & trust                                                    */
/* ------------------------------------------------------------------ */

const LOCK_BODY = <rect x="5" y="10.5" width="14" height="10" rx="2.5" />;

/** Locked: a clean padlock with a rounded shackle. */
export const IconLock = createIcon(
  "Lock",
  <>
    {LOCK_BODY}
    <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
  </>,
);

/** Unlocked: the same padlock with its shackle swung open. */
export const IconUnlock = createIcon(
  "Unlock",
  <>
    {LOCK_BODY}
    <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 6.8-1.2" />
  </>,
);

/** Encrypted: the padlock with a keyhole. */
export const IconEncrypted = createIcon(
  "Encrypted",
  <>
    {LOCK_BODY}
    <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
    <path d="M12 14.5v2" />
  </>,
);

/** Key: a round bow and a straight shaft with two teeth. */
export const IconKey = createIcon(
  "Key",
  <>
    <circle cx="8" cy="16" r="3.8" />
    <path d="M10.7 13.3 19.5 4.5" />
    <path d="m16.5 7.5 2.5 2.5" />
    <path d="m14 10 1.8 1.8" />
  </>,
);

/** Protected: a shield with a check. */
export const IconShield = createIcon(
  "Shield",
  <>
    <path d="M12 3.5 19 6v5.5c0 4.2-2.9 7.5-7 9-4.1-1.5-7-4.8-7-9V6Z" />
    <path d="m9 12 2.2 2.2 3.8-4" />
  </>,
);

/** Server: two stacked racks with status dots. */
export const IconServer = createIcon(
  "Server",
  <>
    <rect x="4" y="4" width="16" height="7" rx="2" />
    <rect x="4" y="13" width="16" height="7" rx="2" />
    <path d="M7.5 7.5h.01" />
    <path d="M7.5 16.5h.01" />
  </>,
);

/** On-device storage: a drive with a split line and two indicator dots. */
export const IconDevice = createIcon(
  "Device",
  <>
    <path d="M3.5 13.5 6 6.5h12l2.5 7v4.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" />
    <path d="M3.5 13.5h17" />
    <path d="M7.5 16.8h.01" />
    <path d="M10.5 16.8h.01" />
  </>,
);

/** Open source: angle brackets around a slash. */
export const IconCode = createIcon(
  "Code",
  <>
    <path d="M8 7.5 3.5 12 8 16.5" />
    <path d="M16 7.5 20.5 12 16 16.5" />
    <path d="m13.5 5.5-3 13" />
  </>,
);

/* ------------------------------------------------------------------ */
/* Actions & feedback                                                  */
/* ------------------------------------------------------------------ */

/** Write: a pen resting on a baseline. */
export const IconPen = createIcon(
  "Pen",
  <>
    <path d="M5 19l.9-3.9 10-10a2.1 2.1 0 0 1 3 3l-10 10Z" />
    <path d="M13 19.5h6.5" />
  </>,
);

/** Scenario library: four rounded tiles. */
export const IconGrid = createIcon(
  "Grid",
  <>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.8" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8" />
  </>,
);

/** Not found: a magnifier with a cross in the lens. */
export const IconSearchMissing = createIcon(
  "SearchMissing",
  <>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m15.3 15.3 5.2 5.2" />
    <path d="m8.5 8.5 4 4" />
    <path d="m12.5 8.5-4 4" />
  </>,
);

/** Alert: a ring with an exclamation mark. */
export const IconAlert = createIcon(
  "Alert",
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.8v4.7" />
    <path d="M12 16.2h.01" />
  </>,
);

/** Discard: a bin with a lid, handle and two ribs. */
export const IconTrash = createIcon(
  "Trash",
  <>
    <path d="M4.5 7h15" />
    <path d="M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7" />
    <path d="m6.5 7 .8 11.6a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
    <path d="M10.3 11v5" />
    <path d="M13.7 11v5" />
  </>,
);

/** Send: a flat paper dart pointing right. */
export const IconSend = createIcon(
  "Send",
  <>
    <path d="M4.5 4.8 20 12 4.5 19.2 7.2 12Z" />
    <path d="M7.2 12h5.3" />
  </>,
);

/** Try again: an open ring turning anticlockwise into a corner arrowhead. */
export const IconRetry = createIcon(
  "Retry",
  <>
    <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9" />
    <path d="M4.5 4.5V9H9" />
  </>,
);

/* ------------------------------------------------------------------ */
/* Billing & inspector                                                 */
/* ------------------------------------------------------------------ */

/** Copy: two offset rounded sheets. */
export const IconCopy = createIcon(
  "Copy",
  <>
    <rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.5" />
    <path d="M15.5 8.5V6.5A2.5 2.5 0 0 0 13 4H6.5A2.5 2.5 0 0 0 4 6.5V13a2.5 2.5 0 0 0 2.5 2.5h2" />
  </>,
);

/** Time left: the gauge dial closed into a clock face, one hand. */
export const IconClock = createIcon(
  "Clock",
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </>,
);

/** Inspector: a window with a right-hand drawer pulled out. */
export const IconInspect = createIcon(
  "Inspect",
  <>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <path d="M14 4.5v15" />
    <path d="M16.5 9h1.5" />
    <path d="M16.5 12h1.5" />
    <path d="M16.5 15h1.5" />
  </>,
);

/** Webhook: three linked nodes, events travelling between systems. */
export const IconWebhook = createIcon(
  "Webhook",
  <>
    <circle cx="12" cy="6.5" r="2.5" />
    <circle cx="6" cy="17" r="2.5" />
    <circle cx="18" cy="17" r="2.5" />
    <path d="M10.8 8.7 7.2 14.8" />
    <path d="m13.2 8.7 3.6 6.1" />
    <path d="M8.5 17h7" />
  </>,
);

/** Billing: a card with a stripe and a short signature line. */
export const IconCard = createIcon(
  "Card",
  <>
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    <path d="M3 10h18" />
    <path d="M6.5 14.5h4" />
  </>,
);

/** Document: a sheet with a folded corner and two text lines. */
export const IconDoc = createIcon(
  "Doc",
  <>
    <path d="M13.5 3.5H7.5A2 2 0 0 0 5.5 5.5v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8.5z" />
    <path d="M13.5 3.5v5h5" />
    <path d="M9 13h6" />
    <path d="M9 16.5h4" />
  </>,
);

/* ------------------------------------------------------------------ */
/* Utility                                                             */
/* ------------------------------------------------------------------ */

export const IconArrowRight = createIcon(
  "ArrowRight",
  <>
    <path d="M4.5 12h15" />
    <path d="m13.5 6 6 6-6 6" />
  </>,
);

export const IconArrowLeft = createIcon(
  "ArrowLeft",
  <>
    <path d="M19.5 12h-15" />
    <path d="m10.5 6-6 6 6 6" />
  </>,
);

export const IconArrowUp = createIcon(
  "ArrowUp",
  <>
    <path d="M12 19.5v-15" />
    <path d="m6 10.5 6-6 6 6" />
  </>,
);

export const IconArrowDown = createIcon(
  "ArrowDown",
  <>
    <path d="M12 4.5v15" />
    <path d="m6 13.5 6 6 6-6" />
  </>,
);

export const IconArrowUpRight = createIcon(
  "ArrowUpRight",
  <>
    <path d="M6.5 17.5 17.5 6.5" />
    <path d="M8 6.5h9.5V16" />
  </>,
);

export const IconChevronDown = createIcon("ChevronDown", <path d="m6 9 6 6 6-6" />);

export const IconPlus = createIcon(
  "Plus",
  <>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </>,
);

export const IconMinus = createIcon("Minus", <path d="M5 12h14" />);

export const IconCheck = createIcon("Check", <path d="m5 12.5 4.5 4.5L19 7.5" />);

export const IconClose = createIcon(
  "Close",
  <>
    <path d="m6 6 12 12" />
    <path d="M18 6 6 18" />
  </>,
);

/** Every icon by name, for previews and tests. */
export const ICONS = {
  Pro: IconPro,
  Spark: IconSpark,
  Wand: IconWand,
  Streak: IconStreak,
  Best: IconBest,
  Pulse: IconPulse,
  Gauge: IconGauge,
  Target: IconTarget,
  TrendUp: IconTrendUp,
  TrendDown: IconTrendDown,
  Bars: IconBars,
  Book: IconBook,
  Eye: IconEye,
  Zap: IconZap,
  People: IconPeople,
  Anonymous: IconAnonymous,
  Mic: IconMic,
  Speaker: IconSpeaker,
  Waveform: IconWaveform,
  Lock: IconLock,
  Unlock: IconUnlock,
  Encrypted: IconEncrypted,
  Key: IconKey,
  Shield: IconShield,
  Server: IconServer,
  Device: IconDevice,
  Code: IconCode,
  Pen: IconPen,
  Grid: IconGrid,
  SearchMissing: IconSearchMissing,
  Alert: IconAlert,
  Trash: IconTrash,
  Send: IconSend,
  Retry: IconRetry,
  Copy: IconCopy,
  Clock: IconClock,
  Inspect: IconInspect,
  Webhook: IconWebhook,
  Card: IconCard,
  Doc: IconDoc,
  ArrowRight: IconArrowRight,
  ArrowLeft: IconArrowLeft,
  ArrowUp: IconArrowUp,
  ArrowDown: IconArrowDown,
  ArrowUpRight: IconArrowUpRight,
  ChevronDown: IconChevronDown,
  Plus: IconPlus,
  Minus: IconMinus,
  Check: IconCheck,
  Close: IconClose,
} satisfies Record<string, ScenarIcon>;
