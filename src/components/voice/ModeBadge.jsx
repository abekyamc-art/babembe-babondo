import React from "react";
import { Radio, Signal, Sparkles, Waves } from "lucide-react";
import { providerName } from "@/lib/providerNames";

/**
 * Which experience is on screen, written on the page itself. On the Kibembe screen the admin's
 * switch changes the whole page — its colour and what is said here — and not only the provider
 * working behind it; the home screen's own assistant is named outright, since it is the one that
 * answers there.
 */
export default function ModeBadge({ mode, talk, label: fixed, icon: Fixed }) {
  const ICONS = { agent: Waves, base44: Sparkles, mbondo: Radio, sadiki: Signal };
  const Icon = Fixed || ICONS[mode] || Waves;
  // the talk AI whose turn it is while the four take turns, the mode's own provider everywhere
  // else, and the fixed name of an assistant that answers on a screen of its own
  const label = fixed || `${talk || providerName(mode)} answers`;

  return (
    <span className="mode-badge" aria-label={label}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}