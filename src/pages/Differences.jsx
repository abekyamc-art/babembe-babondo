import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import GameScreen from "@/components/diffgame/GameScreen";
import LevelSelect from "@/components/diffgame/LevelSelect";
import { levelById, nextLevel } from "@/lib/differenceGame/levels";
import { loadGame, saveGame, withWin } from "@/lib/differenceGame/store";
import "@/diffgame.css";

/**
 * GLOIRE AI — FIND THE DIFFERENCES. The game's two screens: the map of levels, and the level being played.
 * The level stands open only once the one before it has been passed, and the best score and the stars of
 * every level passed are kept on the phone, so the game is found exactly as it was left.
 */
export default function Differences() {
  const navigate = useNavigate();
  const [state, setState] = useState(() => loadGame());
  const [playing, setPlaying] = useState(0);

  const write = (make) =>
    setState((held) => {
      const next = make(held);
      saveGame(next);
      return next;
    });

  const level = playing ? levelById(playing) : null;

  if (level) {
    const after = nextLevel(level.id);
    return (
      <GameScreen
        key={level.id}
        level={level}
        prefs={state}
        onPrefs={(patch) => write((held) => ({ ...held, ...patch }))}
        onWin={(id, result) => write((held) => withWin(held, id, result))}
        onNext={() => setPlaying(after ? after.id : 0)}
        onLevels={() => setPlaying(0)}
        onMenu={() => setPlaying(0)}
      />
    );
  }

  return (
    <LevelSelect
      state={state}
      onPrefs={(patch) => write((held) => ({ ...held, ...patch }))}
      onOpen={(id) => setPlaying(id)}
      onExit={() => navigate("/")}
    />
  );
}