"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/* ----------------------------------------------------------------
 * Minimal local typings for the Web Speech API.
 * (lib.dom does not ship SpeechRecognition in every TS version, and
 * Safari/Chrome still expose it as `webkitSpeechRecognition`.)
 * ---------------------------------------------------------------- */

interface SRAlternative {
  readonly transcript: string;
  readonly confidence: number;
}
interface SRResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SRAlternative;
}
interface SRResultList {
  readonly length: number;
  [index: number]: SRResult;
}
interface SRResultEvent extends Event {
  readonly resultIndex: number;
  readonly results: SRResultList;
}
interface SRErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}
interface SRInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((ev: SRResultEvent) => void) | null;
  onerror: ((ev: SRErrorEvent) => void) | null;
  onend: ((ev: Event) => void) | null;
  onstart: ((ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SRConstructor = new () => SRInstance;

function getRecognitionCtor(): SRConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noopSubscribe = () => () => {};

/** SSR-safe feature detection: false on the server and during hydration, real value after. */
function useClientFlag(detect: () => boolean): boolean {
  return useSyncExternalStore(noopSubscribe, detect, () => false);
}

/* ---------------------------- Dictation ---------------------------- */

export interface DictationOptions {
  /** Called with each finalised chunk of speech. */
  onFinal: (text: string) => void;
  /** Called with the current in-progress (not yet final) transcript; "" when it clears. */
  onInterim?: (text: string) => void;
  lang?: string;
  /** Auto-stop after this much silence following a final result. */
  silenceMs?: number;
}

export interface Dictation {
  supported: boolean;
  listening: boolean;
  error: string | null;
  start: () => void;
  stop: () => void;
  /** Stop and discard anything not yet finalised. */
  abort: () => void;
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Microphone access is blocked - allow it in your browser's site settings.",
  "service-not-allowed": "Speech recognition isn't available in this browser.",
  "no-speech": "Didn't catch anything - tap the mic and try again.",
  "audio-capture": "No microphone found.",
  network: "Speech recognition needs a network connection.",
  "language-not-supported": "Dictation isn't available for this language.",
};

export function useDictation({ onFinal, onInterim, lang = "en-US", silenceMs = 2500 }: DictationOptions): Dictation {
  const supported = useClientFlag(() => getRecognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<SRInstance | null>(null);
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cbRef = useRef({ onFinal, onInterim });
  useEffect(() => {
    cbRef.current = { onFinal, onInterim };
  });

  const clearSilence = useCallback(() => {
    if (silenceRef.current) clearTimeout(silenceRef.current);
    silenceRef.current = null;
  }, []);

  const stop = useCallback(() => {
    clearSilence();
    recRef.current?.stop();
  }, [clearSilence]);

  const abort = useCallback(() => {
    clearSilence();
    const rec = recRef.current;
    if (!rec) return;
    recRef.current = null;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    try {
      rec.abort();
    } catch {
      /* already stopped */
    }
    setListening(false);
    cbRef.current.onInterim?.("");
  }, [clearSilence]);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor || recRef.current) return;
    setError(null);

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (ev) => {
      let interim = "";
      let gotFinal = false;
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const result = ev.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          const clean = text.trim();
          if (clean) cbRef.current.onFinal(clean);
          gotFinal = true;
        } else {
          interim += text;
        }
      }
      cbRef.current.onInterim?.(interim.trim());
      clearSilence();
      if (gotFinal && !interim.trim()) {
        silenceRef.current = setTimeout(() => recRef.current?.stop(), silenceMs);
      }
    };

    rec.onerror = (ev) => {
      if (ev.error === "aborted") return; // we (or the browser) cancelled on purpose
      setError(ERROR_MESSAGES[ev.error] ?? "Voice input stopped unexpectedly.");
    };

    rec.onend = () => {
      clearSilence();
      if (recRef.current === rec) recRef.current = null;
      setListening(false);
      cbRef.current.onInterim?.("");
    };

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      recRef.current = null;
      setError("Couldn't start the microphone.");
    }
  }, [lang, silenceMs, clearSilence]);

  // Never leave the mic open after unmount.
  useEffect(() => () => abort(), [abort]);

  return { supported, listening, error, start, stop, abort };
}

/* ---------------------------- Speech (TTS) ---------------------------- */

export interface Speech {
  supported: boolean;
  speaking: boolean;
  speak: (text: string, voiceKey: string) => void;
  cancel: () => void;
}

const GOOD_VOICE = /natural|neural|premium|enhanced|google|samantha|daniel|karen|moira|tessa|serena|alex|aria|jenny|guy|libby|ryan|sonia/i;
const NOVELTY_VOICE =
  /albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|deranged|hysterical|junior|ralph|fred|kathy|grandma|grandpa|rocko|sandy|shelley|flo\b|eddy|reed/i;

function hashKey(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickVoice(voices: SpeechSynthesisVoice[], key: string): SpeechSynthesisVoice | null {
  const english = voices.filter((v) => /^en([-_]|$)/i.test(v.lang) && !NOVELTY_VOICE.test(v.name));
  if (!english.length) return null;
  const good = english.filter((v) => GOOD_VOICE.test(v.name));
  const pool = (good.length ? good : english).slice().sort((a, b) => a.name.localeCompare(b.name));
  return pool[hashKey(key) % pool.length];
}

/** Split into sentence-sized chunks - Chrome silently stops utterances longer than ~15s. */
function chunkText(text: string): string[] {
  const parts = text.replace(/\s+/g, " ").match(/[^.!?…]+[.!?…]*["')\]]*\s*/g) ?? [text];
  const out: string[] = [];
  let buf = "";
  for (const p of parts) {
    if ((buf + p).length > 220 && buf) {
      out.push(buf.trim());
      buf = "";
    }
    buf += p;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

export function useSpeech(): Speech {
  const supported = useClientFlag(() => typeof window !== "undefined" && "speechSynthesis" in window);
  const [speaking, setSpeaking] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const tokenRef = useRef(0);

  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const load = () => {
      voicesRef.current = synth.getVoices();
    };
    load();
    synth.addEventListener("voiceschanged", load);
    return () => {
      synth.removeEventListener("voiceschanged", load);
      tokenRef.current += 1;
      synth.cancel();
    };
  }, [supported]);

  const cancel = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    tokenRef.current += 1;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string, voiceKey: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const token = ++tokenRef.current;
    synth.cancel();

    if (!voicesRef.current.length) voicesRef.current = synth.getVoices();
    const voice = pickVoice(voicesRef.current, voiceKey);
    const h = hashKey(voiceKey);
    const pitch = 0.9 + ((h >>> 8) % 21) / 100; // 0.90 – 1.10, stable per counterpart

    const chunks = chunkText(text);
    if (!chunks.length) return;
    chunks.forEach((chunk, i) => {
      const u = new SpeechSynthesisUtterance(chunk);
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      } else {
        u.lang = "en-US";
      }
      u.rate = 1.02;
      u.pitch = pitch;
      if (i === 0) u.onstart = () => token === tokenRef.current && setSpeaking(true);
      if (i === chunks.length - 1) {
        const done = () => token === tokenRef.current && setSpeaking(false);
        u.onend = done;
        u.onerror = done;
      }
      synth.speak(u);
    });
  }, []);

  return { supported, speaking, speak, cancel };
}

/* ------------------------ Speak-aloud preference ------------------------ */

const SPEAK_KEY = "scenar.voice.speak";
const prefListeners = new Set<() => void>();
let memoryPref = false; // fallback when storage is blocked (private mode, etc.)

function readSpeakPref(): boolean {
  try {
    const v = window.localStorage.getItem(SPEAK_KEY);
    return v === null ? memoryPref : v === "1";
  } catch {
    return memoryPref;
  }
}

function subscribeSpeakPref(cb: () => void) {
  prefListeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === SPEAK_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    prefListeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** Persisted "read replies aloud" preference (localStorage, defaults to off). */
export function useSpeakPreference(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribeSpeakPref, readSpeakPref, () => false);
  const set = useCallback((next: boolean) => {
    memoryPref = next;
    try {
      window.localStorage.setItem(SPEAK_KEY, next ? "1" : "0");
    } catch {
      /* storage blocked - preference just won't persist */
    }
    prefListeners.forEach((l) => l());
  }, []);
  return [on, set];
}
