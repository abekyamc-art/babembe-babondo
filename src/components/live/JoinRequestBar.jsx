import React from "react";
import { Loader2, UserPlus } from "lucide-react";

/** A viewer's way in: ask the host, wait, or step back out. */
export default function JoinRequestBar({ approved, pending, busy, onRequest, onCancel }) {
  if (approved) return null;

  if (pending) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-3 py-2 backdrop-blur">
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
        <span className="flex-1 text-[13px] text-white/80">Waiting for the host…</span>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold text-white"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onRequest}
      disabled={busy}
      className="flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[13px] font-semibold text-accent-foreground"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
      Request to join
    </button>
  );
}