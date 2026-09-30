"use client";

import { useEffect, useRef } from "react";
import { Lock, Mic } from "lucide-react";
import { useEntitlements } from "@/components/EntitlementProvider";
import { useDictation } from "./useVoice";
import styles from "./VoiceControls.module.css";

function joinSpeech(base: string, add: string): string {
  if (!add) return base;
  if (!base) return add.charAt(0).toUpperCase() + add.slice(1);
  return /\s$/.test(base) ? base + add : `${base} ${add}`;
}

/* ———————————————————————————— Mic button ———————————————————————————— */

export interface MicButtonProps {
  /** Current composer text. */
  value: string;
  /** Receives committed text + live interim transcript while dictating. */
  onChange: (next: string) => void;
  /** Composer disabled — any active dictation is aborted. */
  disabled?: boolean;
  maxLength?: number;
  /** Fired right before the mic opens (e.g. to silence text-to-speech). */
  onStart?: () => void;
  onListeningChange?: (listening: boolean) => void;
}

export function MicButton({ value, onChange, disabled, maxLength, onStart, onListeningChange }: MicButtonProps) {
  const { isPro, ready, openPaywall } = useEntitlements();
  const baseRef = useRef("");
  const emittedRef = useRef<string | null>(null);

  const emit = (next: string) => {
    const clipped = maxLength ? next.slice(0, maxLength) : next;
    emittedRef.current = clipped;
    onChange(clipped);
  };

  const dictation = useDictation({
    onFinal: (text) => {
      baseRef.current = joinSpeech(baseRef.current, text);
      emit(baseRef.current);
    },
    onInterim: (text) => emit(joinSpeech(baseRef.current, text)),
  });
  const { listening, abort, stop } = dictation;

  // If the user edits (or the parent clears) the text mid-dictation, build on their version.
  useEffect(() => {
    if (value !== emittedRef.current) baseRef.current = value;
  }, [value]);

  // Composer got disabled (message sent, session ending) — close the mic, discard stragglers.
  useEffect(() => {
    if (disabled && listening) abort();
  }, [disabled, listening, abort]);

  useEffect(() => {
    onListeningChange?.(listening);
  }, [listening, onListeningChange]);

  if (!dictation.supported) return null;

  const locked = ready && !isPro;

  function toggle() {
    if (locked) {
      openPaywall("voice");
      return;
    }
    if (listening) {
      stop();
      return;
    }
    baseRef.current = value;
    emittedRef.current = value;
    onStart?.();
    dictation.start();
  }

  const label = locked ? "Voice input (Pro)" : listening ? "Stop dictation" : "Dictate your reply";

  return (
    <span className={styles.micWrap}>
      {dictation.error && !listening && (
        <span key={dictation.error} className={styles.micError} role="status">
          {dictation.error}
        </span>
      )}
      <button
        type="button"
        className={`${styles.mic} ${listening ? styles.micOn : ""}`}
        onClick={toggle}
        disabled={!ready || (disabled && !listening)}
        aria-pressed={locked ? undefined : listening}
        aria-label={label}
        title={label}
      >
        {listening ? (
          <span className={styles.bars} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </span>
        ) : (
          <Mic size={17} strokeWidth={2} aria-hidden="true" />
        )}
        {locked && (
          <span className={styles.lockBadge} aria-hidden="true">
            <Lock size={8} strokeWidth={3} aria-hidden="true" />
          </span>
        )}
      </button>
    </span>
  );
}

/** Subtle hint shown under the composer while the mic is open. */
export function ListeningHint() {
  return (
    <p className={styles.listeningHint} role="status">
      <span className={styles.liveDot} aria-hidden="true" />
      Listening… speak naturally, then press Enter to send
    </p>
  );
}

/* ———————————————————————————— Speaker toggle ———————————————————————————— */

export interface SpeakerToggleProps {
  /** Effective state (preference && Pro). */
  on: boolean;
  onChange: (on: boolean) => void;
  supported: boolean;
  /** Currently reading a line aloud — animates the icon. */
  speaking?: boolean;
}

export function SpeakerToggle({ on, onChange, supported, speaking }: SpeakerToggleProps) {
  const { isPro, ready, openPaywall } = useEntitlements();
  if (!supported) return null;
  const locked = ready && !isPro;

  function click() {
    if (locked) {
      onChange(true); // switch on automatically once they upgrade
      openPaywall("voice");
      return;
    }
    onChange(!on);
  }

  const label = locked ? "Read replies aloud (Pro)" : on ? "Voice on — tap to mute replies" : "Voice off — tap to hear replies";

  return (
    <button
      type="button"
      className={`${styles.speaker} ${on ? styles.speakerOn : ""} ${on && speaking ? styles.speaking : ""}`}
      onClick={click}
      disabled={!ready}
      aria-pressed={locked ? undefined : on}
      aria-label={label}
      title={label}
    >
      <SpeakerIcon on={on} />
      <span className={styles.speakerText}>{on ? "Voice on" : "Voice off"}</span>
      {locked && (
        <span className={styles.lockBadge} aria-hidden="true">
          <Lock size={8} strokeWidth={3} aria-hidden="true" />
        </span>
      )}
    </button>
  );
}

/* ———————————————————————————— Icons ———————————————————————————— */

function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {on ? (
        <>
          <path className={styles.wave1} d="M15.5 9.2a4 4 0 0 1 0 5.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path className={styles.wave2} d="M18.2 6.6a7.6 7.6 0 0 1 0 10.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : (
        <path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}
