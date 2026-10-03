import React from "react";

export default function UsagePill({ remaining, signedIn, ready = true, onClick }) {
  const dot = !ready
    ? "bg-muted-foreground"
    : remaining > 0
      ? "bg-accent"
      : "bg-destructive";

  const label = !ready
    ? "Checking…"
    : signedIn
      ? `${remaining} left today`
      : `${remaining} free ${remaining === 1 ? "message" : "messages"}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </button>
  );
}