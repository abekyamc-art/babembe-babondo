import React from "react";
import { BookmarkCheck } from "lucide-react";
import "@/exam-launcher.css";

/**
 * The whole examination series met in one place on the home screen: one professional seal, stepping
 * through its own pure colours while it keeps still, and the one way into the levels — 1, 2, 3 and on.
 *
 * It only opens the series. Nothing of the examination itself is touched here, and the screen it stands
 * on is left as it was.
 */
export default function ExamLauncher({ onOpen }) {
  return (
    <div className="exam-launcher">
      <span className="exam-seal" aria-hidden="true">
        <BookmarkCheck />
      </span>

      <div className="exam-choices">
        <button
          type="button"
          className="exam-choice"
          onClick={onOpen}
          aria-label="Open the GLOIRE AI Kibembe examination levels"
        >
          Exam levels
        </button>
      </div>
    </div>
  );
}