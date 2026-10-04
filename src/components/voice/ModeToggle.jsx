import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { nextVoiceMode, saveVoiceMode, useVoiceMode } from "@/lib/voiceMode";
import { providerName } from "@/lib/providerNames";

/**
 * The admin's own switch: who answers — the original outside voice, Mbembe's, Mbondo's, or
 * Sadiki's. One pill holds all four, each tap moves to the next provider, and the whole screen
 * follows the choice. The pill is named for whoever answers now, so the mode on screen is never
 * in doubt.
 */
export default function ModeToggle() {
  const mode = useVoiceMode();
  const [busy, setBusy] = useState(false);
  const next = nextVoiceMode(mode);
  // the original outside voice keeps the plain pill; the two separate accounts carry their own colour
  const tinted = mode !== "agent";

  const flip = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await saveVoiceMode(next);
    } catch (err) {
      // the mode stays as it was when the switch cannot be saved
    }
    setBusy(false);
  };

  return (
    <button
      type="button"
      aria-label={`${providerName(mode)} answers. Tap to switch to ${providerName(next)}.`}
      onClick={flip}
      disabled={busy}
      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] backdrop-blur transition-colors ${
        tinted
          ? "border-accent/60 bg-accent/10 text-accent"
          : "border-border bg-card/70 text-muted-foreground hover:text-foreground"
      }`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      {providerName(mode)}
    </button>
  );
}