import React from "react";
import { formatWait } from "@/lib/usage";

export default function UsagePill({
  remaining,
  signedIn,
  ready = true,
  nextReturnAt = null,
  nowMs = Date.now(),
  onClick,
}) {
  const waiting = ready && remaining === 0 && nextReturnAt != null;

  const dot = !ready
    ? "bg-muted-foreground"
    : remaining > 0
      ? "bg-accent"
      : "bg-destructive";

  const label = !ready
    ? "Checking…"
    : waiting
      ? `Back in ${formatWait(nextReturnAt - nowMs)}`
      : signedIn
        ? `${remaining} left`
        : `${remaining} free`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      {label}
    </button>
  );
}