import React from "react";
import { Loader2, UserPlus } from "lucide-react";

/** A viewer's way in: its own slot above the message box, from asking to being let in. */
export default function JoinRequestBar({ approved, pending, declined, busy, onRequest, onCancel }) {
  if (approved) return null;

  if (pending) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-accent/45 bg-accent/15 px-3 py-2.5 backdrop-blur">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white">Waiting for the host…</p>
          <p className="text-[11px] text-white/60">They decide who speaks.</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="shrink-0 rounded-full bg-white/15 px-3.5 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/55 px-3 py-2.5 backdrop-blur">
      <UserPlus className="h-4 w-4 shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-white">Want to speak?</p>
        <p className="text-[11px] text-white/60">
          {declined ? "The host didn't pick you this time." : "Ask the host to join."}
        </p>
      </div>
      <button
        type="button"
        onClick={onRequest}
        disabled={busy}
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-[12px] font-semibold text-accent-foreground disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        {declined ? "Ask again" : "Request"}
      </button>
    </div>
  );
}