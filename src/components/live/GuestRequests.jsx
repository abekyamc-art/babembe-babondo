import React from "react";
import { Check, X } from "lucide-react";

/** The host's join requests, arriving on the live screen itself. */
export default function GuestRequests({ requests, busy, onApprove, onDecline }) {
  if (!requests.length) return null;

  return (
    <div className="w-full space-y-1.5 rounded-2xl border border-white/15 bg-black/55 p-2 backdrop-blur">
      <p className="px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/60">
        Wants to join
      </p>
      {requests.map((request) => (
        <div key={request.id} className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
            @{request.viewer_username || "viewer"}
          </span>
          <button
            type="button"
            onClick={() => onApprove(request)}
            disabled={busy}
            aria-label="Let in"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDecline(request)}
            disabled={busy}
            aria-label="Keep out"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/15 text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}