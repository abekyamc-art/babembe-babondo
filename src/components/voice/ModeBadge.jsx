import React from "react";
import { Radio, Signal, Sparkles, Waves } from "lucide-react";
import { providerName } from "@/lib/providerNames";

/**
 * Which experience is on screen, written on the home screen itself. The admin's switch
 * changes the whole page — its colour and what is said here — and not only the provider
 * working behind it.
 */
export default function ModeBadge({ mode, talk }) {
  const ICONS = { agent: Waves, base44: Sparkles, mbondo: Radio, sadiki: Signal };
  const Icon = ICONS[mode] || Waves;
  // the talk AI whose turn it is while the home page's four take turns, and the mode's own
  // provider everywhere else
  const label = `${talk || providerName(mode)} answers`;

  return (
    <span className="mode-badge" aria-label={label}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}