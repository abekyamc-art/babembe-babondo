import React, { useEffect, useState } from "react";
import { Heart as HeartIcon } from "lucide-react";
import DiffPanel from "./DiffPanel";
import "@/diff.css";

/**
 * The picture puzzle of one episode: the same picture twice, the lower copy carrying the differences,
 * and the student looking for the places himself — nothing marks where they stand. Every difference
 * found is one point and fills its own badge; a tap on a place that holds no difference costs one of
 * the three tries. Finding them all, or spending the tries, ends the puzzle and hands the differences it
 * found to the examination.
 */
export default function DifferencePuzzle({ puzzle, mark, onDone }) {
  const [found, setFound] = useState([]);
  const [misses, setMisses] = useState(0);
  const [note, setNote] = useState("");
  const shut = !!mark;

  // a fresh puzzle opens with nothing found and every try standing
  useEffect(() => {
    setFound([]);
    setMisses(0);
    setNote("");
  }, [puzzle.id]);

  // once the answer has been given, every difference is shown where it stood
  const shown = shut ? puzzle.differences.map((difference) => difference.id) : found;
  const left = Math.max(0, puzzle.hearts - misses);

  // one difference found is one point; finding them all passes the question
  const spot = (difference) => {
    if (shut) return;
    const next = [...found, difference.id];
    setFound(next);
    setNote("");
    if (next.length === puzzle.differences.length) onDone(next.length);
  };

  const miss = () => {
    if (shut) return;
    const next = misses + 1;
    setMisses(next);
    if (next >= puzzle.hearts) {
      setNote("Never mind — here is where the differences stood.");
      onDone(found.length);
      return;
    }
    setNote(`Not there — look again. ${puzzle.hearts - next} ${puzzle.hearts - next === 1 ? "try" : "tries"} left.`);
  };

  return (
    <div className="diff">
      <div className="diff-bar">
        <span className="diff-level">{puzzle.level}</span>
        <span className="diff-hearts" aria-label={`${left} tries left`}>
          <HeartIcon className="diff-heart" />
          {left}
        </span>
      </div>

      <div className="diff-badges">
        {puzzle.differences.map((difference) => {
          const on = shown.includes(difference.id);
          return (
            <span key={difference.id} className={`diff-badge ${on ? "is-found" : ""}`}>
              {on ? "✓" : "?"}
            </span>
          );
        })}
      </div>

      <div className="diff-panels">
        <DiffPanel puzzle={puzzle} src={puzzle.top} shown={shown} onSpot={spot} onMiss={miss} />
        <DiffPanel puzzle={puzzle} src={puzzle.bottom} shown={shown} onSpot={spot} onMiss={miss} />
      </div>

      <p className="diff-note" aria-live="polite">
        {note || "Look closely — nothing is marked. Tap each place where the lower picture differs from the one above it."}
      </p>
    </div>
  );
}