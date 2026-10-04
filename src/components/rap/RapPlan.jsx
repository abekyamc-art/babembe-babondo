import React from "react";
import { Sparkles } from "lucide-react";

/** The words Base44 AI planned for this rap, so the person sees what the lines are built from —
 *  and the one control that plans them. */
export default function RapPlan({ plan, busy, ready, blocked, onGenerate }) {
  const words = plan || [];
  const working = busy === "plan";

  return (
    <section className="rap-card">
      <div className="rap-card-head">
        <span className="rap-label">Mpango wa maneno</span>
        <div className="rap-plan-tools">
          {words.length ? <span className="rap-hint">maneno {words.length}</span> : null}
          <button
            type="button"
            className="rap-tool"
            aria-label={words.length ? "Tunga mawazo mapya" : "Tunga mawazo"}
            aria-busy={working}
            disabled={!ready || blocked || !!busy}
            onClick={onGenerate}
          >
            <Sparkles />
          </button>
        </div>
      </div>

      {words.length ? (
        <div className="rap-plan-words">
          {words.map((word) => (
            <span className="rap-plan-word" key={word.term}>
              {word.term}
              {word.meaning ? <em className="rap-plan-meaning">{word.meaning}</em> : null}
            </span>
          ))}
        </div>
      ) : (
        <p className="rap-hint">
          {working
            ? "Base44 AI inapanga maneno kwa lugha uliyochagua…"
            : blocked
              ? "Ongeza maneno ya Kibembe kwenye knowledge kwanza, kisha gusa kitufe hapo juu."
              : "Gusa kitufe hapo juu: Base44 AI hupanga maneno kwa lugha uliyochagua, kisha hutoa mawazo matatu ya rap."}
        </p>
      )}
    </section>
  );
}