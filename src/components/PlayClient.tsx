"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconChevronDown,
  IconLock,
  IconRetry,
} from "@/components/icons";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useEntitlements } from "@/components/EntitlementProvider";
import { identityHeaders } from "@/lib/identity";
import type { PublicScenario } from "@/lib/scenarios";
import {
  METRIC_LABELS,
  type ChatMessage,
  type MetricKey,
  type Metrics,
  type ReportRequest,
  type ReportResponse,
  type TurnRequest,
  type TurnResponse,
  type TurnStatus,
} from "@/lib/types";
import { Report, type SessionOutcome } from "./Report";
import { TensionMeter } from "./TensionMeter";
import { ListeningHint, MicButton, SpeakerToggle } from "./VoiceControls";
import { useSpeakPreference, useSpeech } from "./useVoice";
import styles from "./PlayClient.module.css";

export interface PlayClientProps {
  scenario: PublicScenario;
  /** Sealed token for Pro custom scenarios; sent back with every turn/report. */
  sealed?: string;
}

type Phase = "briefing" | "playing" | "ending" | "report";

const MAX_USER_TURNS = 14;
const MAX_CHARS = 1200;
const METRIC_KEYS = Object.keys(METRIC_LABELS) as MetricKey[];
const SHORT_LABELS: Record<MetricKey, string> = {
  assertiveness: "Assertive",
  regulation: "Composure",
  clarity: "Clarity",
  boundaries: "Boundaries",
};

const HONORIFIC = /^(prof|professor|dr|mr|mrs|ms|mx|sir|dame)\.?$/i;
/** "Prof. Elena Ricci" → "Elena"; "Dana Whitfield" → "Dana". */
function firstNameOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.find((p) => !HONORIFIC.test(p)) ?? parts[0] ?? name;
}

/** Thrown when the server's RevenueCat check says this needs Scenar Pro (403 pro_required). */
class ProRequiredError extends Error {}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...identityHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    let code: string | undefined;
    try {
      const j = (await res.json()) as { error?: string; code?: string };
      if (j?.error) msg = j.error;
      code = j?.code;
    } catch {
      /* ignore */
    }
    if (res.status === 403 && code === "pro_required") throw new ProRequiredError(msg);
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

const UNVERIFIED_MSG = "Couldn't verify your Scenar Pro purchase with RevenueCat yet - try again in a moment.";

export function PlayClient({ scenario, sealed }: PlayClientProps) {
  const { isPro, ready, openPaywall } = useEntitlements();
  const reduceMotion = useReducedMotion();
  const opening: ChatMessage = { role: "counterpart", content: scenario.opening };

  const [phase, setPhase] = useState<Phase>("briefing");
  const [messages, setMessages] = useState<ChatMessage[]>([opening]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [turnError, setTurnError] = useState<string | null>(null);
  const [tension, setTension] = useState(50);
  const [progress, setProgress] = useState(0);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [coachNote, setCoachNote] = useState<string | null>(null);
  const [mock, setMock] = useState(false);
  const [outcome, setOutcome] = useState<SessionOutcome | null>(null);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const runId = useRef(0);

  // --- Voice mode (Pro): read counterpart lines aloud + dictation ---
  const { supported: speechSupported, speaking, speak, cancel: cancelSpeech } = useSpeech();
  const [speakPref, setSpeakPref] = useSpeakPreference();
  const [listening, setListening] = useState(false);
  const speakOn = speakPref && isPro && speechSupported;
  const spokenRef = useRef(0); // messages already "heard" - history is never replayed
  const voiceKey = scenario.counterpart.name;

  useEffect(() => {
    if (phase === "briefing") return;
    const fresh = messages.length > spokenRef.current;
    spokenRef.current = messages.length;
    const last = messages[messages.length - 1];
    if (fresh && speakOn && last?.role === "counterpart") speak(last.content, voiceKey);
  }, [messages, phase, speakOn, speak, voiceKey]);

  useEffect(() => {
    if (!speakOn) cancelSpeech();
  }, [speakOn, cancelSpeech]);

  const userTurns = messages.filter((m) => m.role === "user").length;
  const locked = scenario.tier === "pro" && ready && !isPro;
  const checking = scenario.tier === "pro" && !ready;

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, pending, turnError, phase]);

  // Page-level scroll to top when the report appears.
  useEffect(() => {
    if (phase === "report") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [phase]);

  function reset(toPhase: Phase) {
    runId.current += 1;
    spokenRef.current = 0;
    cancelSpeech();
    setListening(false);
    setMessages([opening]);
    setDraft("");
    setPending(false);
    setTurnError(null);
    setTension(50);
    setProgress(0);
    setMetrics(null);
    setCoachNote(null);
    setOutcome(null);
    setReport(null);
    setReportError(null);
    setPhase(toPhase);
  }

  function start() {
    reset("playing");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function fetchReport(history: ChatMessage[], result: SessionOutcome) {
    const id = runId.current;
    setPhase("ending");
    setReportError(null);
    const body: ReportRequest = {
      scenarioId: scenario.id,
      messages: history,
      outcome: (result === "ended" ? "ongoing" : result) as TurnStatus,
      ...(sealed ? { sealed } : {}),
    };
    try {
      const [data] = await Promise.all([
        postJSON<ReportResponse>("/api/report", body),
        new Promise((r) => setTimeout(r, 1200)), // let the outcome banner breathe
      ]);
      if (id !== runId.current) return;
      setReport(data);
      setPhase("report");
    } catch (e) {
      if (id !== runId.current) return;
      if (e instanceof ProRequiredError) {
        // Server says this scenario needs Pro: show the paywall (or, if the client already thinks
        // we're Pro, a verification hint) instead of a raw error.
        setReportError(isPro ? UNVERIFIED_MSG : "This scenario's report needs Scenar Pro.");
        if (!isPro) openPaywall("locked-scenario");
        return;
      }
      setReportError(e instanceof Error ? e.message : "Could not generate the report.");
    }
  }

  function endSession(result: SessionOutcome, history: ChatMessage[] = messages) {
    if (history.every((m) => m.role !== "user")) return;
    setOutcome(result);
    void fetchReport(history, result);
  }

  async function runTurn(history: ChatMessage[]) {
    const id = runId.current;
    setPending(true);
    setTurnError(null);
    const body: TurnRequest = { scenarioId: scenario.id, messages: history, ...(sealed ? { sealed } : {}) };
    try {
      const data = await postJSON<TurnResponse>("/api/turn", body);
      if (id !== runId.current) return;
      const next: ChatMessage[] = [...history, { role: "counterpart", content: data.reply }];
      setMessages(next);
      setTension(data.tension);
      setProgress(data.progress);
      setMetrics(data.metrics);
      if (data.coachNote) setCoachNote(data.coachNote);
      if (data.mock) setMock(true);
      setPending(false);

      const turns = next.filter((m) => m.role === "user").length;
      if (data.status === "won" || data.status === "lost") {
        endSession(data.status, next);
      } else if (turns >= MAX_USER_TURNS) {
        endSession("ended", next);
      } else {
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    } catch (e) {
      if (id !== runId.current) return;
      setPending(false);
      if (e instanceof ProRequiredError) {
        // Give the unsent line back so it can be resent after upgrading.
        const last = history[history.length - 1];
        setMessages(history.slice(0, -1));
        if (last?.role === "user") setDraft(last.content);
        if (isPro) setTurnError(UNVERIFIED_MSG);
        else openPaywall("locked-scenario");
        return;
      }
      setTurnError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  function send(e?: FormEvent) {
    e?.preventDefault();
    const text = draft.trim().slice(0, MAX_CHARS);
    if (!text || pending || phase !== "playing" || turnError) return;
    const history: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(history);
    setDraft("");
    void runTurn(history);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  /* ------------------- Briefing ------------------- */
  if (phase === "briefing") {
    const custom = scenario.id.startsWith("custom-");
    const firstName = firstNameOf(scenario.counterpart.name);
    return (
      <motion.div
        className={styles.briefWrap}
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: reduceMotion ? 0 : 0.1 } } }}
      >
        <motion.div variants={rise}>
          <Link href={custom ? "/custom" : "/app"} className={styles.back}>
            <IconArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
            {custom ? "Your scenarios" : "All scenarios"}
          </Link>
        </motion.div>

        <motion.article variants={rise} className={styles.brief} aria-labelledby="brief-title">
          <div className={styles.briefMeta}>
            <span className="tag">
              <span className={styles.accentDot} style={{ background: scenario.accent }} aria-hidden="true" />
              {scenario.category}
            </span>
            <span className={styles.tierPill}>
              {scenario.tier === "pro" && <IconLock size={10} strokeWidth={2.5} aria-hidden="true" />}
              {scenario.tier === "pro" ? "PRO" : "FREE"}
            </span>
            <span className={styles.metaText}>
              {scenario.minutes} min
              <span className={styles.metaSep} aria-hidden="true" />
              <span className={styles.difficulty} aria-label={`Difficulty ${scenario.difficulty} of 3`}>
                {[1, 2, 3].map((n) => (
                  <span key={n} className={n <= scenario.difficulty ? styles.diffOn : styles.diffOff} />
                ))}
              </span>
            </span>
          </div>

          <h1 id="brief-title" className={styles.briefTitle}>
            {scenario.title}
          </h1>

          <div className={styles.who}>
            <Avatar initials={scenario.counterpart.initials} />
            <p>
              <strong>{scenario.counterpart.name}</strong>
              <span>{scenario.counterpart.role}</span>
            </p>
          </div>

          <p className={styles.briefText}>{scenario.brief}</p>

          <div className={styles.goalBox}>
            <p className="eyebrow">Your goal</p>
            <p className={styles.goalText}>{scenario.goal}</p>
          </div>

          <p className={styles.tips}>
            <span className={styles.tipTag}>Tip</span>
            Stay specific, name what you need, and watch the tension meter - {firstName} is hiding something you can
            use.
          </p>

          {locked ? (
            <div className={styles.lockedBox}>
              <span className={styles.lockCircle} aria-hidden="true">
                <IconLock size={16} strokeWidth={2} />
              </span>
              <p>
                <strong>This is a Pro scenario.</strong> Unlock every scenario plus tactical coaching reports.
              </p>
              <button type="button" className="btn btn-primary" onClick={() => openPaywall("locked-scenario")}>
                Unlock with Pro
              </button>
            </div>
          ) : (
            <div className={styles.briefActions}>
              <button type="button" className={`btn btn-primary ${styles.startBtn}`} onClick={start} disabled={checking}>
                {checking ? "Checking access…" : "Start conversation"}
                {!checking && <IconArrowRight size={16} strokeWidth={2} aria-hidden="true" />}
              </button>
              <span className={styles.hint}>Up to {MAX_USER_TURNS} messages · end any time</span>
            </div>
          )}
        </motion.article>
      </motion.div>
    );
  }

  /* ------------------- Report ------------------- */
  if (phase === "report" && report && outcome) {
    return (
      <div className={styles.reportWrap}>
        <Report report={report} scenario={scenario} outcome={outcome} onRetry={start} />
      </div>
    );
  }

  /* ------------------- Playing / ending ------------------- */
  const ending = phase === "ending";
  const composerDisabled = pending || ending || !!turnError;
  const pct = Math.round(Math.max(0, Math.min(100, progress)));

  return (
    <div className={styles.stage}>
      {/* --- Side panel / mobile bar --- */}
      <aside className={styles.side} aria-label="Live conversation signals">
        <div className={styles.sideTop}>
          <div className={styles.meterDesktop}>
            <TensionMeter value={tension} size="lg" />
          </div>
          <div className={styles.meterMobile}>
            <TensionMeter value={tension} size="sm" />
          </div>
          <div className={styles.progressBlock}>
            <div className={styles.progressHead}>
              <span>Progress to goal</span>
              <span className={styles.num}>{pct}%</span>
            </div>
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-label="Progress to goal"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
            >
              <div className={styles.progressFill} style={{ transform: `scaleX(${pct / 100})` }} />
            </div>
            <button
              type="button"
              className={styles.detailsToggle}
              aria-expanded={detailsOpen}
              aria-controls="play-details"
              onClick={() => setDetailsOpen((o) => !o)}
            >
              {detailsOpen ? "Hide coach" : "Coach & scores"}
              <IconChevronDown
                size={12}
                strokeWidth={2.5}
                className={`${styles.chev} ${detailsOpen ? styles.chevUp : ""}`}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        <div id="play-details" className={`${styles.details} ${detailsOpen ? styles.detailsOpen : ""}`}>
          <div className={styles.goalMini}>
            <p className="eyebrow">Your goal</p>
            <p className={styles.goalText}>{scenario.goal}</p>
          </div>

          <div className={styles.metrics}>
            <p className={styles.sectionHead}>
              <span>Last message</span>
              <span>0–100</span>
            </p>
            {METRIC_KEYS.map((k) => {
              const v = metrics ? Math.round(metrics[k]) : 0;
              return (
                <div key={k} className={styles.metricRow}>
                  <span className={styles.metricName} title={METRIC_LABELS[k]}>
                    {SHORT_LABELS[k]}
                  </span>
                  <div className={styles.metricTrack}>
                    <div className={styles.metricFill} style={{ transform: `scaleX(${v / 100})` }} />
                  </div>
                  <span className={styles.num}>{metrics ? v : "–"}</span>
                </div>
              );
            })}
          </div>

          <div className={styles.coach} aria-live="polite">
            <p className="eyebrow">Coach</p>
            {coachNote ? (
              <p key={coachNote} className={styles.coachNote}>
                {coachNote}
              </p>
            ) : (
              <p className={styles.coachIdle}>Send your first message - I&apos;ll whisper tips as you go.</p>
            )}
          </div>
        </div>
      </aside>

      {/* --- Chat --- */}
      <section className={styles.chat} aria-label={`Conversation with ${scenario.counterpart.name}`}>
        <header className={styles.chatHead}>
          <Avatar initials={scenario.counterpart.initials} />
          <div className={styles.chatWho}>
            <strong>{scenario.counterpart.name}</strong>
            <span>{scenario.counterpart.role}</span>
          </div>
          {mock && (
            <span className={styles.mockPill} title="No LLM key configured - using scripted replies">
              Offline demo AI
            </span>
          )}
          <SpeakerToggle on={speakOn} onChange={setSpeakPref} supported={speechSupported} speaking={speaking} />
          <button
            type="button"
            className={`btn btn-ghost ${styles.endBtn}`}
            onClick={() => endSession("ended")}
            disabled={userTurns === 0 || pending || ending}
          >
            <span>
              End<span className={styles.endLong}> &amp; get report</span>
            </span>
          </button>
        </header>

        <div className={styles.log} ref={scrollRef} aria-live="polite" aria-relevant="additions">
          {messages.map((m, i) => (
            <div key={i} className={`${styles.msg} ${m.role === "user" ? styles.mine : styles.theirs}`}>
              {m.role === "counterpart" && <Avatar initials={scenario.counterpart.initials} tiny />}
              <p className={styles.bubble}>{m.content}</p>
            </div>
          ))}

          {pending && (
            <div className={`${styles.msg} ${styles.theirs}`} aria-label={`${scenario.counterpart.name} is typing`}>
              <Avatar initials={scenario.counterpart.initials} tiny />
              <p className={`${styles.bubble} ${styles.typing}`}>
                <span />
                <span />
                <span />
              </p>
            </div>
          )}

          {turnError && (
            <div className={styles.errorRow} role="alert">
              <span>Message didn&apos;t go through - {turnError}</span>
              <button type="button" className={styles.retryBtn} onClick={() => void runTurn(messages)}>
                <IconRetry size={12} strokeWidth={2.5} aria-hidden="true" />
                Retry
              </button>
            </div>
          )}

          {outcome && (
            <div className={styles.outcome} role="status">
              <span className={`${styles.outcomePill} ${styles[`outcome_${outcome}`] ?? ""}`}>
                {outcome === "won" ? "Goal reached" : outcome === "lost" ? "Walked away" : "Session ended"}
              </span>
              <strong className={styles.outcomeTitle}>
                {outcome === "won"
                  ? "You got there."
                  : outcome === "lost"
                    ? "That one slipped away."
                    : "Conversation ended."}
              </strong>
              {reportError ? (
                <span className={styles.outcomeSub}>
                  Report failed: {reportError}{" "}
                  <button type="button" className={styles.linkBtn} onClick={() => void fetchReport(messages, outcome)}>
                    Try again
                  </button>
                </span>
              ) : (
                <span className={styles.outcomeSub}>
                  <span className={styles.spinner} aria-hidden="true" /> Analysing your conversation…
                </span>
              )}
            </div>
          )}
        </div>

        <form className={styles.composer} onSubmit={send}>
          <label htmlFor="composer" className={styles.srOnly}>
            Your reply
          </label>
          <textarea
            id="composer"
            ref={inputRef}
            className={styles.input}
            value={draft}
            maxLength={MAX_CHARS}
            rows={1}
            placeholder={ending ? "Conversation over" : `Reply to ${firstNameOf(scenario.counterpart.name)}…`}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={composerDisabled}
          />
          {draft.length > MAX_CHARS - 200 && (
            <span className={styles.count}>
              {draft.length}/{MAX_CHARS}
            </span>
          )}
          <MicButton
            value={draft}
            onChange={setDraft}
            disabled={composerDisabled}
            maxLength={MAX_CHARS}
            onStart={cancelSpeech}
            onListeningChange={setListening}
          />
          <button
            type="submit"
            className={styles.sendBtn}
            disabled={composerDisabled || !draft.trim()}
            aria-label="Send message"
          >
            <IconArrowUp size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </form>
        {listening ? (
          <ListeningHint />
        ) : (
          <p className={styles.turns}>
            <span className={styles.num}>
              {userTurns}/{MAX_USER_TURNS}
            </span>{" "}
            messages<span className={styles.kbdHint}> · Enter to send, Shift+Enter for a new line</span>
          </p>
        )}
      </section>
    </div>
  );
}

const rise = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] as const } },
};

function Avatar({ initials, tiny }: { initials: string; tiny?: boolean }) {
  return (
    <span className={`${styles.avatar} ${tiny ? styles.avatarSm : ""}`} aria-hidden="true">
      {initials}
    </span>
  );
}
