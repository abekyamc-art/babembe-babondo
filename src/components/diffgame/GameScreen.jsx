import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Clock3, HeartCrack, Trophy, Volume2, VolumeX } from "lucide-react";
import DifferenceTracker from "./DifferenceTracker";
import PuzzlePanel from "./PuzzlePanel";
import GameControls from "./GameControls";
import WinSheet from "./WinSheet";
import FailSheet from "./FailSheet";
import PauseSheet from "./PauseSheet";
import { HINTS_PER_LEVEL, POINTS, nextLevel, tierOf } from "@/lib/differenceGame/levels";
import { extraCount, extraPlaces, requiredCount, requiredPlaces } from "@/lib/differenceGame/places";
import { sfx, buzz } from "@/lib/differenceGame/sfx";

/**
 * One level being played.
 *
 * The same drawing stands twice, one above the other, and the copy below carries the level's own
 * differences. The player may touch either picture; a right touch rings the place out on both and turns a
 * circle green, a wrong touch is marked where it landed. The level ends when every place it asks for is
 * found — or when the clock runs out, or the three wrong touches are spent. A picture may hold a place or
 * two more than the level asks for: they are real differences, a touch finds them and they earn their
 * points, and the level is passed without them, so a player who finds the number asked for still has the
 * extras standing beside it. Both pictures of a level are drawn by the app itself, so they are on screen
 * the moment the level opens and never come up blank.
 */
export default function GameScreen({ level, prefs, onPrefs, onWin, onNext, onLevels, onMenu }) {
  // Keep the original target; any visible difference counts, including the two spare choices.
  const required = requiredCount(level);
  const extras = extraCount(level);
  const timed = !prefs.relaxed;

  const [found, setFound] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [hintsLeft, setHintsLeft] = useState(HINTS_PER_LEVEL);
  const [hintId, setHintId] = useState("");
  const [marks, setMarks] = useState([]);
  const [timeLeft, setTimeLeft] = useState(level.seconds);
  const [phase, setPhase] = useState("playing");
  const [result, setResult] = useState(null);
  const [ready, setReady] = useState(false);

  const lastWrong = useRef(0);
  const hintTimer = useRef(0);
  const markTimers = useRef([]);

  const master = useMemo(() => new Set(), []);
  const altered = useMemo(() => new Set(level.differences.map((difference) => difference.id)), [level]);

  const scoreOf = (foundCount, wrong, seconds, hints) =>
    Math.max(
      0,
      foundCount * POINTS.found +
        (wrong === 0 ? POINTS.clean : 0) +
        (timed ? Math.max(0, seconds) * POINTS.perSecond : 0) -
        (HINTS_PER_LEVEL - hints) * POINTS.hint
    );

  const score = scoreOf(found.length, mistakes, timeLeft, hintsLeft);

  // the picture is ready on the first frame the screen shows, and the loading line goes with it
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(
    () => () => {
      if (hintTimer.current) window.clearTimeout(hintTimer.current);
      markTimers.current.forEach((id) => window.clearTimeout(id));
    },
    []
  );

  useEffect(() => {
    if (phase !== "playing" || !timed) return undefined;
    const tick = window.setInterval(() => setTimeLeft((held) => Math.max(0, held - 1)), 1000);
    return () => window.clearInterval(tick);
  }, [phase, timed]);

  useEffect(() => {
    if (!timed || phase !== "playing" || timeLeft > 0) return;
    setPhase("lost");
    setResult({
      reason: "time",
      score,
      found: found.length,
      foundRequired: Math.min(required, found.length),
    });
    sfx.lose(prefs.sound);
  }, [timeLeft, phase, timed, found.length, score, prefs.sound]);

  const find = (id) => {
    if (phase !== "playing" || found.includes(id)) return;
    // Each touch credits one actual difference. Any of the visible places counts toward the target.
    const next = [...found, id];
    setFound(next);
    sfx.found(prefs.sound);
    buzz(35, prefs.vibration);
    if (next.length < required) return;
    const stars = mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1;
    const finalScore = scoreOf(next.length, mistakes, timeLeft, hintsLeft);
    setPhase("won");
    setResult({
      score: finalScore,
      stars,
      mistakes,
      timeLeft,
      timed,
      found: next.length,
      foundRequired: required,
    });
    sfx.win(prefs.sound);
    buzz([40, 60, 40], prefs.vibration);
    onWin(level.id, { score: finalScore, stars });
  };

  const wrong = (x, y, panel) => {
    if (phase !== "playing") return;
    const now = Date.now();
    // a quick second touch in the same breath is the same touch, not a new mistake
    if (now - lastWrong.current < 260) return;
    lastWrong.current = now;
    const mark = { key: `${now}-${panel}-${Math.round(x * 1000)}`, panel, x, y };
    setMarks((held) => [...held, mark]);
    markTimers.current.push(
      window.setTimeout(() => setMarks((held) => held.filter((one) => one.key !== mark.key)), 760)
    );
    sfx.wrong(prefs.sound);
    buzz(60, prefs.vibration);
    const used = mistakes + 1;
    setMistakes(used);
    if (timed && used >= level.mistakes) {
      setPhase("lost");
      setResult({
        reason: "mistakes",
        score: scoreOf(found.length, used, timeLeft, hintsLeft),
        found: found.length,
        foundRequired: Math.min(required, found.length),
      });
      sfx.lose(prefs.sound);
    }
  };

  const hint = () => {
    if (phase !== "playing" || hintsLeft <= 0) return;
    // the hint points at a place the level asks for, so it carries the level on; an extra waits behind them
    const missing = [
      ...requiredPlaces(level).filter((place) => !found.includes(place.id)),
      ...extraPlaces(level).filter((place) => !found.includes(place.id)),
    ];
    if (!missing.length) return;
    setHintsLeft((held) => held - 1);
    setHintId(missing[0].id);
    sfx.hint(prefs.sound);
    if (hintTimer.current) window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHintId(""), 2800);
  };

  const restart = () => {
    if (hintTimer.current) window.clearTimeout(hintTimer.current);
    markTimers.current.forEach((id) => window.clearTimeout(id));
    markTimers.current = [];
    setFound([]);
    setMistakes(0);
    setHintsLeft(HINTS_PER_LEVEL);
    setHintId("");
    setMarks([]);
    setTimeLeft(level.seconds);
    setResult(null);
    setPhase("playing");
  };

  const carryOn = () => {
    setHintsLeft((held) => Math.max(0, held - 1));
    setMistakes(Math.max(0, level.mistakes - 1));
    setTimeLeft(Math.max(30, Math.round(level.seconds / 2)));
    setResult(null);
    setPhase("playing");
  };

  const after = nextLevel(level.id);

  return (
    <div className="dg-shell">
      <header className="dg-head">
        <button type="button" className="dg-icon" onClick={onMenu} aria-label="Back to the game menu">
          <ChevronLeft aria-hidden="true" />
        </button>
        <div className="dg-head-text">
          <h1 className="dg-title">Find the Differences</h1>
          <p className="dg-sub">
            Episode {level.id} · {tierOf(level)} · {level.title}
          </p>
        </div>
        <button
          type="button"
          className={"dg-icon" + (prefs.sound ? "" : " is-off")}
          onClick={() => onPrefs({ sound: !prefs.sound })}
          aria-pressed={prefs.sound}
          aria-label={prefs.sound ? "Turn the sound off" : "Turn the sound on"}
        >
          {prefs.sound ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
        </button>
      </header>

      <div className="dg-strip">
        <span className="dg-stat">
          <Trophy aria-hidden="true" />
          <span>{score}</span>
          <em>score</em>
        </span>
        <span
          className={"dg-stat" + (timed && timeLeft <= 10 ? " is-low" : "")}
          role="timer"
          aria-live="off"
        >
          <Clock3 aria-hidden="true" />
          <span>{timed ? `${timeLeft}s` : "No clock"}</span>
          <em>{timed ? "left" : "relaxed"}</em>
        </span>
        <span className={"dg-stat" + (timed && mistakes >= level.mistakes - 1 ? " is-low" : "")}>
          <HeartCrack aria-hidden="true" />
          <span>{timed ? `${mistakes}/${level.mistakes}` : mistakes}</span>
          <em>{timed ? "mistakes" : "mistakes, relaxed"}</em>
        </span>
      </div>

      <DifferenceTracker
        total={required}
        found={Math.min(required, found.length)}
        extras={extras}
      />

      <div className="dg-board">
        <PuzzlePanel
          scene={level.scene}
          uid="a"
          differences={level.differences}
          changed={master}
          found={found}
          hintId={hintId}
          reveal={phase === "lost"}
          marks={marks.filter((mark) => mark.panel === "a")}
          onFound={find}
          onWrong={wrong}
        />
        <span className="dg-divide" aria-hidden="true" />
        <PuzzlePanel
          scene={level.scene}
          uid="b"
          differences={level.differences}
          changed={altered}
          found={found}
          hintId={hintId}
          reveal={phase === "lost"}
          marks={marks.filter((mark) => mark.panel === "b")}
          onFound={find}
          onWrong={wrong}
        />
        {!ready ? (
          <p className="dg-loading" role="status">
            Preparing the scene…
          </p>
        ) : null}
      </div>

      <GameControls
        hintsLeft={hintsLeft}
        paused={phase !== "playing"}
        onHint={hint}
        onPause={() => setPhase("paused")}
        onRestart={restart}
      />

      {phase === "paused" ? (
        <PauseSheet
          onResume={() => setPhase("playing")}
          onRestart={restart}
          onLevels={onLevels}
        />
      ) : null}

      {phase === "won" && result ? (
        <WinSheet
          level={level}
          result={result}
          hasNext={!!after}
          onNext={onNext}
          onAgain={restart}
          onMenu={onLevels}
        />
      ) : null}

      {phase === "lost" && result ? (
        <FailSheet
          level={level}
          result={result}
          mistakesUsed={mistakes}
          onRetry={restart}
          canContinue={hintsLeft > 0}
          onContinue={carryOn}
          onLevels={onLevels}
          onMenu={onMenu}
        />
      ) : null}
    </div>
  );
}