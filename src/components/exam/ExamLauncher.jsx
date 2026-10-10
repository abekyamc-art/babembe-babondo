import React from "react";
import { BookmarkCheck } from "lucide-react";
import "@/exam-launcher.css";

/**
 * Every examination of the app gathered behind one professional seal, standing on the home screen.
 *
 * The seal keeps still and steps through its own pure colours, so the eye is caught without the
 * screen moving; the two examinations stand beside it as their own choices. It only opens what the
 * screen already opened — nothing of the examinations themselves is touched here.
 */
export default function ExamLauncher({ onExam, onLifeExam }) {
  return (
    <div className="exam-launcher">
      <span className="exam-seal" aria-hidden="true">
        <BookmarkCheck />
      </span>

      <div className="exam-choices">
        <button
          type="button"
          className="exam-choice"
          onClick={onExam}
          aria-label="Open the GLOIRE AI Kibembe medical examination"
        >
          Exam
        </button>
        <button
          type="button"
          className="exam-choice"
          onClick={onLifeExam}
          aria-label="Open the GLOIRE AI Kibembe daily life examination"
        >
          Daily life exam
        </button>
      </div>
    </div>
  );
}