"use client";

import { IconArrowRight, IconCheck, IconLock, IconShield, IconSpark, IconTrash } from "@/components/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useEntitlements } from "@/components/EntitlementProvider";
import { customStore, useCustomScenarios, type CustomBuildResponse, type CustomScenarioItem } from "@/lib/customStore";
import styles from "./CustomBuilder.module.css";

type Difficulty = 1 | 2 | 3;

const MAX_SITUATION = 800;
const MAX_SHORT = 200;

const DIFFICULTIES: { value: Difficulty; label: string; hint: string }[] = [
  { value: 1, label: "Friendly", hint: "Reasonable, softens quickly" },
  { value: 2, label: "Firm", hint: "Polite, protects their interests" },
  { value: 3, label: "Tough", hint: "Guarded, punishes every slip" },
];

const PRESETS: { label: string; situation: string; counterpart: string; goal: string; difficulty: Difficulty }[] = [
  {
    label: "Ask my boss for a raise",
    situation:
      "I've been a product designer here for two years. I led the checkout redesign that lifted conversion 14%, and I recently found out a new hire at my level earns about $10k more than me. Review season is next month.",
    counterpart: "My manager, the Head of Design",
    goal: "Get a raise from $86k to at least $96k before review season",
    difficulty: 2,
  },
  {
    label: "Get my deposit back from my landlord",
    situation:
      "I moved out five weeks ago after three years. I left the flat spotless and took dated photos. The landlord still hasn't returned my $2,400 deposit and now says the carpets need replacing.",
    counterpart: "My landlord, who owns a few buildings in town",
    goal: "Get my full $2,400 deposit back within 7 days",
    difficulty: 3,
  },
  {
    label: "Tell my co-founder I want more equity",
    situation:
      "We split equity 50/50 when we started 18 months ago. Since then I've taken on sales, fundraising and hiring while my co-founder went part-time for six months. We're about to raise a seed round.",
    counterpart: "My co-founder and CTO, also a close friend",
    goal: "Agree to rebalance to 60/40 before the seed round closes",
    difficulty: 3,
  },
  {
    label: "Negotiate my freelance rate",
    situation:
      "A client I've worked with for a year wants to extend my contract for another six months. I've been charging $65/hour, which is well below market for my experience, and my scope has grown a lot.",
    counterpart: "The client's marketing director",
    goal: "Raise my rate to $90/hour for the new contract",
    difficulty: 2,
  },
  {
    label: "Confront a roommate about chores",
    situation:
      "I share a flat with one roommate. For three months I've done nearly all the cleaning, dishes pile up for days, and I'm starting to resent it. We're otherwise friends and the lease runs another year.",
    counterpart: "My roommate, a friend from university",
    goal: "Agree on a fair weekly chore split we both stick to",
    difficulty: 1,
  },
];

const STEPS = ["Casting your counterpart…", "Writing their hidden agenda…", "Setting the stakes…"];
const STEP_MS = 1500;

export function CustomBuilder() {
  const router = useRouter();
  const { isPro, ready, openPaywall } = useEntitlements();
  const saved = useCustomScenarios();
  const formId = useId();

  const [situation, setSituation] = useState("");
  const [counterpart, setCounterpart] = useState("");
  const [goal, setGoal] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>(2);
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);

  const [building, setBuilding] = useState(false);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingAfterPurchase = useRef(false);
  const situationRef = useRef<HTMLTextAreaElement>(null);
  const buildId = useRef(0);

  const locked = ready && !isPro;
  const trimmed = { situation: situation.trim(), counterpart: counterpart.trim(), goal: goal.trim() };
  const missing = {
    situation: !trimmed.situation,
    counterpart: !trimmed.counterpart,
    goal: !trimmed.goal,
  };
  const valid = !missing.situation && !missing.counterpart && !missing.goal;

  // Advance the "building" steps while the request is in flight.
  useEffect(() => {
    if (!building) return;
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), STEP_MS);
    return () => clearInterval(t);
  }, [building]);

  // If the user hit Build, went through the paywall and unlocked Pro, carry straight on.
  const resumeAfterPurchase = useEffectEvent(() => {
    if (pendingAfterPurchase.current && valid) {
      pendingAfterPurchase.current = false;
      void build();
    }
  });
  useEffect(() => {
    if (isPro) resumeAfterPurchase();
  }, [isPro]);

  function applyPreset(i: number) {
    const p = PRESETS[i];
    setSituation(p.situation);
    setCounterpart(p.counterpart);
    setGoal(p.goal);
    setDifficulty(p.difficulty);
    setActivePreset(i);
    setError(null);
    requestAnimationFrame(() => situationRef.current?.focus({ preventScroll: true }));
  }

  function onField(setter: (v: string) => void) {
    return (v: string) => {
      setter(v);
      setActivePreset(null);
    };
  }

  async function build() {
    const id = ++buildId.current;
    setBuilding(true);
    setDone(false);
    setStep(0);
    setError(null);
    const started = Date.now();
    try {
      const res = await fetch("/api/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...trimmed, difficulty }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<CustomBuildResponse> & { error?: string };
      if (!res.ok || !data.scenario || !data.sealed) throw new Error(data.error || `Build failed (${res.status})`);
      // Let the building animation land before the hand-off.
      const minMs = STEP_MS * (STEPS.length - 1) + 400;
      const wait = Math.max(0, minMs - (Date.now() - started));
      if (wait) await new Promise((r) => setTimeout(r, wait));
      if (id !== buildId.current) return;
      setStep(STEPS.length);
      setDone(true);
      const item: CustomScenarioItem = { scenario: data.scenario, sealed: data.sealed, createdAt: Date.now() };
      customStore.save(item);
      await new Promise((r) => setTimeout(r, 650));
      if (id !== buildId.current) return;
      router.push(`/play/custom?id=${encodeURIComponent(data.scenario.id)}`);
    } catch (e) {
      if (id !== buildId.current) return;
      setBuilding(false);
      setError(e instanceof Error ? e.message : "Something went wrong building your scenario.");
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (building || !ready) return;
    if (!isPro) {
      // Gate first; if the form is filled in, building resumes automatically after purchase.
      pendingAfterPurchase.current = valid;
      openPaywall("custom-builder");
      return;
    }
    setTouched(true);
    if (!valid) {
      const first = missing.situation ? "situation" : missing.counterpart ? "counterpart" : "goal";
      document.getElementById(`${formId}-${first}`)?.focus();
      return;
    }
    void build();
  }

  function cancelBuild() {
    buildId.current += 1;
    setBuilding(false);
    setDone(false);
  }

  function onSegKey(e: KeyboardEvent<HTMLDivElement>) {
    const idx = DIFFICULTIES.findIndex((d) => d.value === difficulty);
    let next = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % DIFFICULTIES.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (idx - 1 + DIFFICULTIES.length) % DIFFICULTIES.length;
    else return;
    e.preventDefault();
    setDifficulty(DIFFICULTIES[next].value);
    setActivePreset(null);
    const btns = e.currentTarget.querySelectorAll<HTMLButtonElement>("[role=radio]");
    btns[next]?.focus();
  }

  const segIndex = DIFFICULTIES.findIndex((d) => d.value === difficulty);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.kicker}>
          <p className="eyebrow">Custom scenario builder</p>
          <span className={styles.proChip}>Pro</span>
        </div>
        <h1 className={styles.headline}>
          Rehearse your
          <br />
          real conversation.
        </h1>
        <p className={styles.sub}>
          Describe the talk you&apos;re dreading. We&apos;ll cast a realistic counterpart, give them a hidden agenda and
          a breaking point - then you practise until it feels easy.
        </p>
      </section>

      <div className={styles.chipsWrap}>
        <span className={styles.chipsLabel}>Quick start</span>
        <div className={styles.chips} role="group" aria-label="Quick-start examples">
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              type="button"
              className={`tag ${styles.presetChip} ${activePreset === i ? styles.presetActive : ""}`}
              style={{ ["--i" as string]: i }}
              onClick={() => applyPreset(i)}
              disabled={building}
              aria-pressed={activePreset === i}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <form className={`${styles.card} ${building ? styles.cardBuilding : ""}`} onSubmit={onSubmit} noValidate>
        <fieldset className={styles.fields} disabled={building} aria-hidden={building}>
          <div className={styles.field}>
            <label htmlFor={`${formId}-situation`} className={styles.label}>
              What&apos;s the situation?
            </label>
            <div className={styles.textareaWrap}>
              <textarea
                id={`${formId}-situation`}
                ref={situationRef}
                className={`${styles.input} ${styles.textarea} ${touched && missing.situation ? styles.invalid : ""}`}
                value={situation}
                onChange={(e) => onField(setSituation)(e.target.value)}
                maxLength={MAX_SITUATION}
                rows={5}
                placeholder="Give the context: history, numbers, what's already been said, why it matters to you…"
                aria-invalid={touched && missing.situation}
                aria-describedby={`${formId}-situation-count`}
              />
              <span
                id={`${formId}-situation-count`}
                className={`${styles.count} ${situation.length > MAX_SITUATION * 0.9 ? styles.countWarn : ""}`}
                aria-live="polite"
              >
                {situation.length}/{MAX_SITUATION}
              </span>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor={`${formId}-counterpart`} className={styles.label}>
                Who are you talking to?
              </label>
              <input
                id={`${formId}-counterpart`}
                className={`${styles.input} ${touched && missing.counterpart ? styles.invalid : ""}`}
                value={counterpart}
                onChange={(e) => onField(setCounterpart)(e.target.value)}
                maxLength={MAX_SHORT}
                placeholder="e.g. My manager, a skeptical client, my landlord"
                aria-invalid={touched && missing.counterpart}
                autoComplete="off"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={`${formId}-goal`} className={styles.label}>
                What do you want to walk away with?
              </label>
              <input
                id={`${formId}-goal`}
                className={`${styles.input} ${touched && missing.goal ? styles.invalid : ""}`}
                value={goal}
                onChange={(e) => onField(setGoal)(e.target.value)}
                maxLength={MAX_SHORT}
                placeholder="Be concrete: a number, a date, a yes"
                aria-invalid={touched && missing.goal}
                autoComplete="off"
              />
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.label} id={`${formId}-diff`}>
              How tough should they be?
            </span>
            <div
              className={styles.segmented}
              role="radiogroup"
              aria-labelledby={`${formId}-diff`}
              onKeyDown={onSegKey}
              style={{ ["--seg" as string]: segIndex }}
            >
              <span className={styles.segThumb} aria-hidden="true" data-level={difficulty} />
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  role="radio"
                  aria-checked={difficulty === d.value}
                  tabIndex={difficulty === d.value ? 0 : -1}
                  className={`${styles.segBtn} ${difficulty === d.value ? styles.segOn : ""}`}
                  onClick={() => {
                    setDifficulty(d.value);
                    setActivePreset(null);
                  }}
                >
                  <span className={styles.segLabel}>
                    <span className={styles.segDots} aria-hidden="true">
                      {[1, 2, 3].map((n) => (
                        <i key={n} className={n <= d.value ? styles.segDotOn : undefined} />
                      ))}
                    </span>
                    {d.label}
                  </span>
                  <span className={styles.segHint}>{d.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {touched && !valid && (
            <p className={styles.formError} role="alert">
              Fill in all three fields so we can build a believable counterpart.
            </p>
          )}
          {error && (
            <p className={styles.formError} role="alert">
              {error} <span className={styles.dim}>Try again in a moment.</span>
            </p>
          )}

          <div className={styles.actions}>
            <p className={styles.privacy}>
              <IconShield size={14} strokeWidth={2} aria-hidden="true" /> Their secret is encrypted on our server - you only see it in the final report.
            </p>
            <button
              type="submit"
              className={`btn btn-primary ${styles.buildBtn} ${locked ? styles.buildLocked : ""}`}
              disabled={!ready || building}
            >
              {!ready ? (
                "Checking access…"
              ) : locked ? (
                <>
                  <IconLock size={14} strokeWidth={2} aria-hidden="true" /> Unlock Pro to build
                </>
              ) : (
                <>
                  <IconSpark size={14} strokeWidth={2} aria-hidden="true" /> Build my scenario
                  <IconArrowRight size={14} strokeWidth={2} aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </fieldset>

        {building && (
          <div className={styles.building} role="status" aria-live="polite">
            <div className={`${styles.orb} ${done ? styles.orbDone : ""}`} aria-hidden="true">
              <span className={styles.orbRing} />
              <span className={styles.orbCore}>{done ? <IconCheck size={20} strokeWidth={2.5} /> : "?"}</span>
            </div>
            <ol className={styles.steps}>
              {STEPS.map((s, i) => {
                const state = i < step ? "done" : i === step ? "active" : "todo";
                return (
                  <li key={s} className={`${styles.step} ${styles[`step_${state}`]}`}>
                    <span className={styles.stepIcon} aria-hidden="true">
                      {state === "done" ? <IconCheck size={12} strokeWidth={3} /> : <span className={styles.stepSpinner} />}
                    </span>
                    {s}
                  </li>
                );
              })}
            </ol>
            <p className={styles.buildingNote}>{done ? "Your counterpart is ready. Taking you in…" : "This takes a few seconds."}</p>
            {!done && (
              <button type="button" className={styles.cancel} onClick={cancelBuild}>
                Cancel
              </button>
            )}
          </div>
        )}
      </form>

      <SavedList items={saved} />
    </div>
  );
}

const DIFFICULTY_LABEL = ["", "Friendly", "Firm", "Tough"];

function SavedList({ items }: { items: readonly CustomScenarioItem[] }) {
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);

  function onDelete(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;
    setRemoving(id);
    window.setTimeout(() => {
      customStore.remove(id);
      setRemoving(null);
    }, 320);
  }

  return (
    <section className={styles.saved} aria-labelledby="saved-title">
      <div className={styles.savedHead}>
        <div>
          <p className="eyebrow">Saved on this device</p>
          <h2 id="saved-title" className={styles.h2}>
            Your scenarios
          </h2>
        </div>
        <span className={styles.savedCount}>{items.length ? `${items.length} saved` : ""}</span>
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <IconSpark size={16} strokeWidth={2} />
          </span>
          <p>
            Nothing here yet. Build your first scenario above - it&apos;ll be saved here so you can rehearse it again
            and again.
          </p>
          <Link href="/app" className={styles.emptyLink}>
            Or try a ready-made scenario <IconArrowRight size={13} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <ul className={styles.grid}>
          {items.map(({ scenario: s }, i) => (
            <li
              key={s.id}
              className={`${styles.item} ${removing === s.id ? styles.itemOut : ""}`}
              style={{ ["--i" as string]: i }}
            >
              <div className={styles.savedCard} style={{ ["--accent" as string]: s.accent }}>
                <button
                  type="button"
                  className={styles.cardHit}
                  onClick={() => router.push(`/play/custom?id=${encodeURIComponent(s.id)}`)}
                  aria-label={`Rehearse ${s.title} with ${s.counterpart.name}`}
                />
                <span className={styles.top}>
                  <span className="tag">
                    <span className={styles.accentDot} aria-hidden="true" />
                    {s.category}
                  </span>
                  <button
                    type="button"
                    className={styles.delete}
                    onClick={() => onDelete(s.id, s.title)}
                    aria-label={`Delete ${s.title}`}
                    title="Delete"
                  >
                    <IconTrash size={14} strokeWidth={2} />
                  </button>
                </span>
                <span className={styles.title}>
                  {s.title}
                  <IconArrowRight className={styles.arrow} size={16} strokeWidth={2} aria-hidden="true" />
                </span>
                <span className={styles.brief}>{s.brief}</span>
                <span className={styles.foot}>
                  <span className={styles.person}>
                    <span className={styles.avatar} aria-hidden="true">
                      {s.counterpart.initials}
                    </span>
                    <span className={styles.personText}>
                      <span className={styles.name}>{s.counterpart.name}</span>
                      <span className={styles.role}>{s.counterpart.role}</span>
                    </span>
                  </span>
                  <span className={styles.meta}>
                    <span className={styles.dots} title={DIFFICULTY_LABEL[s.difficulty]}>
                      {[1, 2, 3].map((d) => (
                        <span key={d} className={d <= s.difficulty ? styles.dotOn : styles.dot} />
                      ))}
                    </span>
                    <span className={styles.mins}>{s.minutes} min</span>
                  </span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
