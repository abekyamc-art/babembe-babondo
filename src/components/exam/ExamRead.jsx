import React, { useEffect, useRef, useState } from "react";
import { Loader2, Volume2, VolumeX } from "lucide-react";
import { readAloud, stopReading } from "@/lib/examVoice";

/**
 * The question read aloud: one control under the question, which speaks it in the examination's own voice
 * and stops it again. Nothing of the answer is ever read out — only the line the student is asked.
 *
 * Moving on to the next question, or leaving the card, ends whatever was being read. A line that cannot
 * be heard is said plainly here and changes nothing else about the paper.
 */
export default function ExamRead({ text }) {
  // "idle" — nothing is heard; "wait" — the voice is being made; "speak" — the line is being heard
  const [state, setState] = useState("idle");
  const [trouble, setTrouble] = useState("");
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stopReading();
    };
  }, []);

  // a line that is no longer on screen is never left speaking
  useEffect(() => {
    stopReading();
    setState("idle");
    setTrouble("");
  }, [text]);

  const toggle = async () => {
    if (state !== "idle") {
      stopReading();
      setState("idle");
      return;
    }
    setState("wait");
    setTrouble("");
    try {
      await readAloud(text, () => alive.current && setState("speak"));
    } catch (err) {
      if (alive.current) setTrouble(err?.message || "This question could not be read aloud.");
    }
    if (alive.current) setState("idle");
  };

  const label = state === "wait" ? "Reading…" : state === "speak" ? "Stop" : "Read aloud";

  return (
    <div className="exam-read-wrap">
      <button
        type="button"
        className={`exam-read ${state === "idle" ? "" : "is-on"}`}
        onClick={toggle}
        aria-label={state === "speak" ? "Stop reading the question" : "Read the question aloud"}
      >
        {state === "wait" ? (
          <Loader2 className="exam-read-spin" />
        ) : state === "speak" ? (
          <VolumeX />
        ) : (
          <Volume2 />
        )}
        {label}
      </button>
      {trouble ? <p className="exam-read-say">{trouble}</p> : null}
    </div>
  );
}