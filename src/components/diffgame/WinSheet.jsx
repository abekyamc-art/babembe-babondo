import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { Star, Trophy, Clock3, HeartCrack } from "lucide-react";
import { praiseFor } from "@/lib/differenceGame/levels";

/**
 * The level is passed: every difference found before the time ran out. It says what was earned — the
 * score, the mistakes, the time left over and the stars — and one short word of praise in Kibembe with
 * its meaning under it. Three stars are for a level passed without a single wrong touch.
 */
export default function WinSheet({ level, result, hasNext, onNext, onAgain, onMenu }) {
  const praise = praiseFor(level.id);

  useEffect(() => {
    try {
      confetti({ particleCount: 120, spread: 74, origin: { y: 0.66 }, colors: ["#16a34a", "#ffd23f", "#2f6fb0", "#ffffff"] });
    } catch {
      /* the screen still shows the win without the confetti */
    }
  }, []);

  return (
    <div className="dg-sheet-wrap" role="dialog" aria-modal="true" aria-label="Episode complete">
      <div className="dg-sheet is-win">
        <span className="dg-sheet-mark" aria-hidden="true">
          <Trophy />
        </span>
        <h2 className="dg-sheet-title">Excellent! Episode Complete!</h2>
        <p className="dg-sheet-sub">
          Episode {level.id} · {level.title}
        </p>

        <div className="dg-stars-big" aria-label={`${result.stars} of 3 stars earned`}>
          {[1, 2, 3].map((n) => (
            <Star key={n} className={n <= result.stars ? "dg-star is-on" : "dg-star"} aria-hidden="true" />
          ))}
        </div>

        <dl className="dg-facts">
          <div>
            <dt>Score</dt>
            <dd>{result.score}</dd>
          </div>
          <div>
            <dt>Mistakes</dt>
            <dd>{result.mistakes}</dd>
          </div>
          <div>
            <dt>
              <Clock3 aria-hidden="true" /> Time left
            </dt>
            <dd>{result.timed ? `${result.timeLeft}s` : "—"}</dd>
          </div>
        </dl>

        <p className="dg-praise">
          <span className="dg-praise-kb">{praise.kb}</span>
          <span className="dg-praise-en">{praise.en}</span>
        </p>

        <div className="dg-sheet-actions">
          {hasNext ? (
            <button type="button" className="dg-btn is-main" onClick={onNext}>
              Next Episode
            </button>
          ) : null}
          <button type="button" className={hasNext ? "dg-btn" : "dg-btn is-main"} onClick={onAgain}>
            Play Again
          </button>
          <button type="button" className="dg-btn is-ghost" onClick={onMenu}>
            Back to Game Menu
          </button>
        </div>
        <p className="dg-sheet-note">
          {hasNext
            ? "The next episode is open now."
            : "Every episode that stands is passed. More episodes are on the way."}
        </p>
      </div>
    </div>
  );
}