import React from "react";
import { X } from "lucide-react";

/** The head every examination wears: its name, what it is, who made it, and the way out. */
export default function ExamHeader({ title, subtitle, system, credit, closeLabel, onClose }) {
  return (
    <header className="exam-head">
      <div>
        <p className="exam-title">{title}</p>
        <p className="exam-sub">{subtitle}</p>
        <p className="exam-system">{system}</p>
        <p className="exam-credit">{credit}</p>
      </div>
      <button type="button" className="exam-close" onClick={onClose} aria-label={closeLabel}>
        <X className="h-4 w-4" />
      </button>
    </header>
  );
}