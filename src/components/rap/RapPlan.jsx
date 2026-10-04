import React from "react";

/** The words Base44 AI planned for this rap, so the person sees what the lines are built from. */
export default function RapPlan({ plan }) {
  if (!plan?.length) return null;

  return (
    <section className="rap-card">
      <div className="rap-card-head">
        <span className="rap-label">Mpango wa maneno</span>
        <span className="rap-hint">maneno {plan.length}</span>
      </div>
      <div className="rap-plan-words">
        {plan.map((word) => (
          <span className="rap-plan-word" key={word.term}>
            {word.term}
            {word.meaning ? <em className="rap-plan-meaning">{word.meaning}</em> : null}
          </span>
        ))}
      </div>
    </section>
  );
}