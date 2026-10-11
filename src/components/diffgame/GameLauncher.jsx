import React from "react";
import { Link } from "react-router-dom";
import { Puzzle } from "lucide-react";

/**
 * The game met in one tap from the app's own screen: the game's seal stands beside the examination's,
 * before the message box. It only opens the game — nothing of the screen it stands on is touched.
 */
export default function GameLauncher() {
  return (
    <Link to="/differences" className="game-corner" aria-label="Open the Find the Differences game">
      <span className="game-seal" aria-hidden="true">
        <Puzzle />
      </span>
    </Link>
  );
}