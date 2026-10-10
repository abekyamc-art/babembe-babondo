import React from "react";
import { GraduationCap } from "lucide-react";

/** The examination's own door on the call screen: it opens over the call, which is never touched. */
export default function ExamPill({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mode-badge cursor-pointer"
      aria-label="Open the GLOIRE AI Kibembe medical examination"
    >
      <GraduationCap className="h-3.5 w-3.5" />
      Kibembe exam
    </button>
  );
}