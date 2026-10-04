import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { saveVoiceMode, useVoiceMode } from "@/lib/voiceMode";
import { providerName } from "@/lib/providerNames";

/** The admin's own switch: who answers — the original outside voice, or the second one. */
export default function ModeToggle() {
  const mode = useVoiceMode();
  const [busy, setBusy] = useState(false);
  const base = mode === "base44";

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
      aria-label={`Who answers: ${providerName(mode)}. Tap to switch.`}
      onClick={flip}
      disabled={busy}
      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] backdrop-blur transition-colors ${
        base
          ? "border-accent/60 bg-accent/10 text-accent"
          : "border-border bg-card/70 text-muted-foreground hover:text-foreground"
      }`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      {providerName(mode)}
    </button>
  );
}