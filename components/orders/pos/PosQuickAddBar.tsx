"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parsePosQuickAdd } from "@/lib/pos-quick-add";

type PosQuickAddBarProps = {
  onQuickAdd: (posCode: number, quantity: number) => void;
  disabled?: boolean;
  onHint?: (message: string) => void;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function PosQuickAddBar({ onQuickAdd, disabled, onHint }: PosQuickAddBarProps) {
  const [value, setValue] = useState("");
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSpeechSupported(getSpeechRecognition() != null);
  }, []);

  const submit = useCallback(
    (raw: string) => {
      const parsed = parsePosQuickAdd(raw);
      if (!parsed) {
        onHint?.('Say or type e.g. "1 qty 5" (code 1, quantity 5)');
        return false;
      }
      onQuickAdd(parsed.posCode, parsed.quantity);
      setValue("");
      return true;
    },
    [onHint, onQuickAdd]
  );

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition || disabled) {
      onHint?.("Voice not supported in this browser — use Chrome or Edge");
      return;
    }

    stopListening();
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() ?? "";
      if (transcript) {
        setValue(transcript);
        submit(transcript);
      }
    };

    recognition.onerror = () => {
      onHint?.("Could not hear that — try again or type the code");
      stopListening();
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
      setListening(true);
      onHint?.("Listening… say e.g. one qty five");
    } catch {
      onHint?.("Microphone unavailable");
      stopListening();
    }
  }, [disabled, onHint, stopListening, submit]);

  useEffect(() => () => stopListening(), [stopListening]);

  return (
    <div className="flex gap-2">
      <input
        type="text"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit(value);
          }
        }}
        placeholder='Quick add: 1 qty 5 or say "1 qty 5"'
        aria-label="Quick add by POS code"
        className="input-field min-w-0 flex-1 text-sm"
      />
      {speechSupported && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => (listening ? stopListening() : startListening())}
          className={`touch-target shrink-0 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
            listening
              ? "border-red-300 bg-red-50 text-red-700"
              : "border-gray-300 bg-surface-card text-gray-700 hover:bg-gray-50"
          } disabled:opacity-50`}
          aria-pressed={listening}
          title={listening ? "Stop listening" : "Speak to add (e.g. 1 qty 5)"}
        >
          {listening ? "Stop" : "🎤"}
        </button>
      )}
      <button
        type="button"
        disabled={disabled || !value.trim()}
        onClick={() => submit(value)}
        className="touch-target shrink-0 rounded-lg bg-servora-charcoal px-3 py-2 text-sm font-semibold text-white hover:bg-servora-charcoal/90 disabled:opacity-50"
      >
        Add
      </button>
    </div>
  );
}
