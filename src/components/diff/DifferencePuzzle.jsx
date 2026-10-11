import React, { useEffect, useMemo, useRef, useState } from "react";
import { Heart as HeartIcon } from "lucide-react";
import PuzzlePanel from "@/components/diffgame/PuzzlePanel";
import "@/diffgame.css";
import "@/diff.css";

/**
 * The picture puzzle of one episode: the same drawing twice, the lower copy carrying the differences, and
 * the student looking for the places himself — nothing marks where they stand. Every difference found is
 * one point and fills its own badge; a touch on a place that holds no difference is marked where it landed
 * and costs one of the three tries. Finding them all, or spending the tries, ends the puzzle and hands the
 * differences it found to the examination.
 *
 * The two pictures are the app's own drawings — the same scenes, and the same places, the Find the
 * Differences game is played on — so they are on the card the moment the question opens, they never come
 * up blank, and a difference is always exactly where the drawing changes.
 */
export default function DifferencePuzzle({ puzzle, mark, onDone }) {
  const [found, setFound] = useState([]);
  const [misses, setMisses] = useState(0);
  const [note, setNote] = useState("");
  const [marks, setMarks] = useState([]);
  const shut = !!mark;
  const total = puzzle.differences.length;
  const lastWrong = useRef(0);
  const timers = useRef([]);

  // the copy standing below is the one the differences are drawn into
  const altered = useMemo(
    () => new Set(puzzle.differences.map((difference) => difference.id)),
    [puzzle]
  );
  const untouched = useMemo(() => new Set(), []);

  // a fresh puzzle opens with nothing found and every try standing
  useEffect(() => {
    setFound([]);
    setMisses(0);
    setNote("");
    setMarks([]);
  }, [puzzle.id]);

  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
    },
    []
  );

  const left = Math.max(0, puzzle.hearts - misses);
  const allFound = found.length === total;

  // one difference found is one point; finding them all passes the question
  const spot = (id) => {
    if (shut || found.includes(id)) return;
    const next = [...found, id];
    setFound(next);
    setNote("");
    if (next.length === total) onDone(next.length);
  };

  // a touch that found nothing is marked where it landed, and costs one try
  const miss = (x, y, panel) => {
    if (shut) return;
    const now = Date.now();
    // a quick second touch in the same breath is the same touch, not a new try
    if (now - lastWrong.current < 260) return;
    lastWrong.current = now;
    const one = { key: `${now}-${panel}-${Math.round(x * 1000)}`, panel, x, y };
    setMarks((held) => [...held, one]);
    timers.current.push(
      window.setTimeout(
        () => setMarks((held) => held.filter((heldOne) => heldOne.key !== one.key)),
        760
      )
    );
    const next = misses + 1;
    setMisses(next);
    if (next >= puzzle.hearts) {
      setNote("Never mind — here is where the differences stood.");
      onDone(found.length);
      return;
    }
    setNote(
      `Not there — look again. ${puzzle.hearts - next} ${
        puzzle.hearts - next === 1 ? "try" : "tries"
      } left.`
    );
  };

  const picture = (uid, changed, label) => (
    <PuzzlePanel
      scene={puzzle.scene}
      uid={uid}
      label={label}
      differences={puzzle.differences}
      changed={changed}
      found={found}
      reveal={shut && !allFound}
      marks={marks.filter((one) => one.panel === uid)}
      onFound={spot}
      onWrong={miss}
    />
  );

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
          const on = found.includes(difference.id);
          return (
            <span
              key={difference.id}
              className={`diff-badge ${on ? "is-found" : ""}`}
              aria-label={`${on ? "Found" : "Still to find"}: ${difference.label}`}
            >
              {on ? "✓" : "?"}
            </span>
          );
        })}
      </div>

      <div className="diff-panels">
        {picture("ea", untouched, `${puzzle.alt} The picture above is as it stands.`)}
        {picture("eb", altered, `${puzzle.alt} The picture below carries the differences.`)}
      </div>

      <p className="diff-note" aria-live="polite">
        {note ||
          "Look closely — nothing is marked. Tap each place where the lower picture differs from the one above it."}
      </p>
    </div>
  );
}