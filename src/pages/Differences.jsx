import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import GameScreen from "@/components/diffgame/GameScreen";
import LevelSelect from "@/components/diffgame/LevelSelect";
import { levelById, nextLevel } from "@/lib/differenceGame/levels";
import { briefOf, loadEpisodeArt } from "@/lib/differenceGame/episodeArt";
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
  const [art, setArt] = useState(null);
  const [opening, setOpening] = useState(false);

  const write = (make) =>
    setState((held) => {
      const next = make(held);
      saveGame(next);
      return next;
    });

  const level = playing ? levelById(playing) : null;

  // An episode whose own cartoon picture already stands is opened on that picture; one still waiting for
  // its picture is opened on the game's drawn scene. The picture is fetched before the episode opens, so
  // the places it is played on never change under a player's finger.
  const open = async (id) => {
    const held = levelById(id);
    if (!held) return;
    setOpening(true);
    let drawn = null;
    if (briefOf(held)) drawn = await loadEpisodeArt(id).catch(() => null);
    setArt(drawn);
    setOpening(false);
    setPlaying(id);
  };

  if (level) {
    const after = nextLevel(level.id);
    return (
      <GameScreen
        key={level.id}
        level={level}
        art={art}
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
    <>
      <LevelSelect
        state={state}
        onPrefs={(patch) => write((held) => ({ ...held, ...patch }))}
        onOpen={open}
        onExit={() => navigate("/")}
      />
      {opening ? (
        <p className="dg-opening" role="status">
          Opening the episode…
        </p>
      ) : null}
    </>
  );
}