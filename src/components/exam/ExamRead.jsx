import React, { useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw, Square, Volume2 } from "lucide-react";
import { LETTERS } from "@/lib/examBank";
import { readAloud, stopReading, unlockReading } from "@/lib/examVoice";

/** The line the examination reads out: the question first, then its three choices, one after another. */
function spokenLine(text, options) {
  const question = String(text || "").trim();
  const choices = (options || [])
    .map((choice) => String(choice || "").trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((choice, at) => `${LETTERS[at]}, ${choice.slice(0, 70)}`);
  if (!choices.length) return question.slice(0, 400);
  const lead = /[.?!]$/.test(question) ? question : `${question}.`;
  return `${lead} Your choices are — ${choices.join(". ")}.`.slice(0, 400);
}

/**
 * The question read aloud: the button under the question reads the question and its choices to the
 * student, stops the reading while it plays, and asks for it again once it has ended. Nothing of the
 * answer is read out, and nothing keeps speaking once the reading is over.
 *
 * The reading is asked for by a tap and never starts on its own, because a tap is the one moment a phone
 * lets a page make sound — a reading begun on its own is refused by the phone and heard by nobody. The
 * question is not held shut behind the reading either: a student who would rather read it themselves is
 * asked nothing of it, and a line that cannot be heard is said plainly under the button.
 */
export default function ExamRead({ text, options = [], kibembe = "" }) {
  // "idle" — nothing is being read; "wait" — the voice is being made; "speak" — the line is being read;
  // "done" — the reading has ended; "failed" — the line could not be heard
  const [state, setState] = useState("idle");
  const [trouble, setTrouble] = useState("");
  const alive = useRef(true);
  // which reading is in hand: a reading that was stopped, or a question left behind, never speaks
  const mine = useRef(0);
  const asked = useRef("");
  const form = useRef("");

  asked.current = spokenLine(text, options);
  form.current = String(kibembe || "").trim();

  /** Read the question and its choices from beginning to end and let the reading be heard. */
  const speak = async () => {
    // the phone is opened to sound inside the tap itself — the one moment it accepts it — so the reading
    // made a moment later is let through rather than refused
    unlockReading();
    mine.current += 1;
    const hand = mine.current;
    setTrouble("");
    setState("wait");
    try {
      await readAloud(asked.current, form.current, () => {
        if (alive.current && hand === mine.current) setState("speak");
      });
      if (!alive.current || hand !== mine.current) return;
      setState("done");
    } catch (err) {
      if (!alive.current || hand !== mine.current) return;
      setTrouble(err?.message || "This question could not be read aloud.");
      setState("failed");
    }
  };

  /** Hang up the reading in hand: nothing more of it is heard. */
  const stop = () => {
    mine.current += 1;
    stopReading();
    setState("done");
  };

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      mine.current += 1;
      stopReading();
    };
  }, []);

  // every new question stands unread, and whatever was being read of the question before it is hung up
  useEffect(() => {
    mine.current += 1;
    stopReading();
    setState("idle");
    setTrouble("");
  }, [text]);

  const reading = state === "wait" || state === "speak";
  const label = reading
    ? "Stop reading"
    : state === "failed"
      ? "Try the reading again"
      : state === "done"
        ? "Read again"
        : "Read the question";

  return (
    <div className="exam-read-wrap">
      <button
        type="button"
        className={`exam-read ${reading ? "is-on" : ""}`}
        onClick={reading ? stop : speak}
        aria-label={reading ? "Stop the reading of the question" : "Read the question and its choices aloud"}
      >
        {reading ? (
          state === "wait" ? (
            <Loader2 className="exam-read-spin" />
          ) : (
            <Square />
          )
        ) : state === "idle" ? (
          <Volume2 />
        ) : (
          <RotateCcw />
        )}
        {label}
      </button>
      {reading ? (
        <p className="exam-read-note" aria-live="polite">
          {state === "wait"
            ? "The reading is being made…"
            : "The question and its choices are being read to you."}
        </p>
      ) : null}
      {trouble ? <p className="exam-read-say">{trouble}</p> : null}
    </div>
  );
}