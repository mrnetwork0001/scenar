"use client";

import { ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { useId, useRef, useState, type ReactNode } from "react";
import { Reveal } from "@/components/Reveal";
import { sectionStyles } from "./SectionHeader";
import styles from "./FaqSection.module.css";
import { useSafeReducedMotion } from "@/components/useSafeReducedMotion";

const EASE = [0.16, 1, 0.3, 1] as const;

const FAQS: { q: string; a: ReactNode }[] = [
  {
    q: "Is Scenar free?",
    a: "Yes. Two full scenarios, Negotiate Your First Offer and Say No to Your Manager, are free, along with the live tension meter, scoring, the report with the hidden truth and progress tracking. There's no sign-up and no card. Pro unlocks the other three scenarios and the advanced tools.",
  },
  {
    q: "What's the hidden agenda?",
    a: "Every counterpart has a secret and a win condition you can't see, like a recruiter's real salary ceiling or a deadline that can quietly slip. It shapes how they respond to you. At the end, the report reveals the secret and how close you got to it.",
  },
  {
    q: "How is this different from asking a chatbot to roleplay?",
    a: "A chatbot plays along. Scenar's counterpart has private goals that stay on the server, so there's a real outcome to win or lose. Every message is scored live on assertiveness, emotional regulation, clarity and boundary setting, and the tension meter shows how they're reacting turn by turn.",
  },
  {
    q: "Can I rehearse my real situation?",
    a: "Yes, with Pro. The custom scenario builder turns a description of the conversation you're dreading into a counterpart with their own hidden agenda. It's sealed with AES-256-GCM on the server, so the browser can't read the secret before the reveal.",
  },
  {
    q: "Is my data private?",
    a: "There's no account to create. Your practice history stays in your browser's local storage. Your messages are sent to the AI only to generate the counterpart's replies and your report, and scenario secrets never reach the browser.",
  },
  {
    q: "Can I use my voice?",
    a: "Yes, with Pro. Voice mode uses your browser's built-in speech recognition and speech synthesis, so you can speak your replies and hear the counterpart answer. Availability depends on your browser.",
  },
  {
    q: "How do payments work?",
    a: "Checkout runs on RevenueCat Web Billing. Plans and prices are served live from RevenueCat, subscriptions can be cancelled anytime, and when a plan includes a free trial the paywall shows the exact terms and date before you confirm. RevenueCat uses an anonymous ID, so no Scenar account is needed.",
  },
  {
    q: "Who is it for?",
    a: "Students and new professionals facing conversations they dread: a first salary negotiation, pushing back on a manager, asking a professor for an extension, or giving hard feedback. It's for anyone who wants to rehearse before the stakes are real.",
  },
];

function FaqItem({
  q,
  a,
  open,
  onToggle,
}: {
  q: string;
  a: ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  const reduce = useSafeReducedMotion();
  const uid = useId();
  const btnId = `${uid}-q`;
  const panelId = `${uid}-a`;

  return (
    <li className={styles.item} data-open={open || undefined}>
      <h3 className={styles.qWrap}>
        <button
          id={btnId}
          type="button"
          className={styles.q}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span>{q}</span>
          <span className={styles.icon} aria-hidden="true">
            <span className={styles.barH} />
            <span className={styles.barV} />
          </span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="panel"
            id={panelId}
            role="region"
            aria-labelledby={btnId}
            className={styles.panel}
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
          >
            <motion.p
              className={styles.a}
              initial={reduce ? false : { y: -6 }}
              animate={{ y: 0 }}
              exit={reduce ? undefined : { y: -6 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              {a}
            </motion.p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

/** A single huge, faint question mark drifting with a slow parallax as the section scrolls by. */
function QuestionGlyph() {
  const reduce = useSafeReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [120, -120]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-8, 6]);

  return (
    <div ref={ref} className={styles.glyphWrap} aria-hidden="true">
      <motion.span className={styles.glyph} style={reduce ? undefined : { y, rotate }}>
        ?
      </motion.span>
    </div>
  );
}

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className={`${sectionStyles.section} ${styles.section}`} aria-labelledby="faq-title">
      <QuestionGlyph />

      <div className={`${sectionStyles.inner} ${styles.layout}`}>
        <Reveal as="header" className={styles.head}>
          <p className="eyebrow">FAQ</p>
          <h2 id="faq-title" className={sectionStyles.title}>
            Questions, answered.
          </h2>
          <p className={styles.sub}>
            Still curious? The whole project is open source.
          </p>
          <a
            className={`btn btn-ghost ${styles.source}`}
            href="https://github.com/mrnetwork0001/scenar"
            target="_blank"
            rel="noreferrer"
          >
            Read the source
            <ArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
          </a>
        </Reveal>

        <Reveal className={styles.listWrap} delay={0.1}>
          <ul className={styles.list}>
            {FAQS.map((f, i) => (
              <FaqItem
                key={f.q}
                q={f.q}
                a={f.a}
                open={openIndex === i}
                onToggle={() => setOpenIndex((cur) => (cur === i ? null : i))}
              />
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
