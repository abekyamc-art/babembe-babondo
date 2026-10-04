import React, { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import TypingDots from "@/components/voice/TypingDots";
import { secondsLabel } from "@/lib/rapSteps";

/** What one tap of Generate is doing: every step named, the running one marked, the finished
 *  ones ticked, and how long the run has been working. */
export default function RapSteps({ steps, startedAt, endedAt, wordCount }) {
  const running = (steps || []).some((step) => step.state === "running");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);

  if (!steps?.length) return null;

  const until = running ? now : endedAt || now;
  const seconds = startedAt ? Math.max(0, (until - startedAt) / 1000) : 0;

  return (
    <section className="rap-card rap-steps">
      <div className="rap-card-head">
        <span className="rap-label">Hatua</span>
        <span className="rap-hint rap-clock">{secondsLabel(seconds)}</span>
      </div>

      <ol className="rap-step-list">
        {steps.map((step) => (
          <li key={step.id} className={`rap-step is-${step.state}`}>
            <span className="rap-step-mark">
              {step.state === "running" ? <TypingDots /> : null}
              {step.state === "done" ? <Check /> : null}
              {step.state === "failed" ? <X /> : null}
            </span>
            <span className="rap-step-label">{step.label}</span>
          </li>
        ))}
      </ol>

      {wordCount ? (
        <p className="rap-hint">Maneno ya kurap: {wordCount}</p>
      ) : null}
    </section>
  );
}