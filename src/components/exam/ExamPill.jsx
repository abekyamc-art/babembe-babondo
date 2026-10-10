import React from "react";
import { GraduationCap } from "lucide-react";

/** An examination's own door on the call screen: it opens over the call, which is never touched. */
export default function ExamPill({
  onClick,
  label = "Kibembe exam",
  ariaLabel = "Open the GLOIRE AI Kibembe medical examination",
  icon: Icon = GraduationCap,
}) {
  return (
    <button type="button" onClick={onClick} className="mode-badge cursor-pointer" aria-label={ariaLabel}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}