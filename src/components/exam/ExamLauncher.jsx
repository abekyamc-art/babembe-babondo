import React from "react";
import { BookmarkCheck } from "lucide-react";
import "@/exam-launcher.css";

/**
 * The whole examination series met in one tap: the seal stands in the home screen's lower left, beside
 * the message box, stepping through its own pure colours while everything around it holds still.
 *
 * It only opens the series. Nothing of the examination itself is touched here, and the screen it stands
 * on is left as it was.
 */
export default function ExamLauncher({ onOpen }) {
  return (
    <button
      type="button"
      className="exam-corner"
      onClick={onOpen}
      aria-label="Open the GLOIRE AI Kibembe examination seasons"
    >
      <span className="exam-seal" aria-hidden="true">
        <BookmarkCheck />
      </span>
    </button>
  );
}