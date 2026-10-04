import React from "react";
import { Sparkles, Waves } from "lucide-react";

/**
 * Which experience is on screen, written on the home screen itself. The admin's switch
 * changes the whole page — its colour and what is said here — and not only the provider
 * working behind it.
 */
export default function ModeBadge({ mode }) {
  const base = mode === "base44";
  const Icon = base ? Sparkles : Waves;
  const label = base ? "Base44 AI answers" : "Agent answers";

  return (
    <span className="mode-badge" aria-label={label}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}