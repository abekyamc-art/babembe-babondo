import React, { useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw, SkipForward } from "lucide-react";
import { readAloud, stopReading } from "@/lib/examVoice";

/**
 * The question read aloud: the moment a question stands on screen it is read to the student in the
 * examination's own voice, from its first word to its last, and the voice is then hung up — nothing is
 * read of the answer, and nothing keeps speaking once the reading has ended. `onDone` is called when the
 * reading has ended, however it ended, so the choices open only after the question has been read.
 *
 * Moving on to the next question hangs up whatever is being read, and leaving the card hangs it up too.
 * A student who would rather not wait can skip the reading, and a line that cannot be heard is said
 * plainly here and changes nothing else about the paper.
 */
export default function ExamRead({ text, kibembe = "", onDone }) {
  // "wait" — the voice is being made; "speak" — the line is being read; "done" — it has been hung up
  const [state, setState] = useState("wait");
  const [trouble, setTrouble] = useState("");
  const alive = useRef(true);
  const line = useRef("");
  const form = useRef("");
  const done = useRef(onDone);

  line.current = String(text || "").trim();
  form.current = String(kibembe || "").trim();
  useEffect(() => {
    done.current = onDone;
  });

  /** Read the line from beginning to end, hang up, and let the choices open. */
  const speak = async () => {
    setTrouble("");
    if (!line.current) {
      setState("done");
      done.current?.();
      return;
    }
    setState("wait");
    try {
      await readAloud(line.current, form.current, () => {
        if (alive.current) setState("speak");
      });
    } catch (err) {
      if (alive.current) setTrouble(err?.message || "This question could not be read aloud.");
    }
    if (!alive.current) return;
    setState("done");
    done.current?.();
  };

  // every new question is read as it appears, and the one before it is hung up as it goes
  useEffect(() => {
    alive.current = true;
    speak();
    return () => {
      alive.current = false;
      stopReading();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, kibembe]);

  const reading = state !== "done";

  return (
    <div className="exam-read-wrap">
      <button
        type="button"
        className={`exam-read ${reading ? "is-on" : ""}`}
        onClick={reading ? stopReading : speak}
        aria-label={reading ? "Skip the reading of the question" : "Read the question aloud again"}
      >
        {reading ? (
          state === "wait" ? (
            <Loader2 className="exam-read-spin" />
          ) : (
            <SkipForward />
          )
        ) : (
          <RotateCcw />
        )}
        {reading ? "Skip reading" : "Read again"}
      </button>
      {reading ? (
        <p className="exam-read-note" aria-live="polite">
          {state === "wait"
            ? "The question is being prepared to be read…"
            : "The question is being read to you — the choices open when the reading ends."}
        </p>
      ) : null}
      {trouble ? <p className="exam-read-say">{trouble}</p> : null}
    </div>
  );
}