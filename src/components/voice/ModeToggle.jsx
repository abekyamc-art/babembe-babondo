import React, { useState } from "react";
import { Loader2, Sparkles, Waves } from "lucide-react";
import { saveVoiceMode, useVoiceMode } from "@/lib/voiceMode";

/** The admin's own switch: who answers — the outside voice agent, or Base44 AI. */
export default function ModeToggle() {
  const mode = useVoiceMode();
  const [busy, setBusy] = useState(false);
  const base = mode === "base44";
  const Icon = base ? Sparkles : Waves;

  const flip = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await saveVoiceMode(base ? "agent" : "base44");
    } catch (err) {
      // the mode stays as it was when the switch cannot be saved
    }
    setBusy(false);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={base}
      aria-label={`Who answers: ${base ? "Base44 AI" : "the outside agent"}. Tap to switch.`}
      onClick={flip}
      disabled={busy}
      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] backdrop-blur transition-colors ${
        base
          ? "border-accent/60 bg-accent/10 text-accent"
          : "border-border bg-card/70 text-muted-foreground hover:text-foreground"
      }`}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Icon className="h-3.5 w-3.5" />
      )}
      {base ? "Base44" : "Agent"}
    </button>
  );
}