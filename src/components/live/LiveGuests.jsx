import React from "react";
import { Mic, X } from "lucide-react";
import { Image } from "@/components/ui/image";

/** Who is on the microphone with the host, and the host's way to let them go. */
export default function LiveGuests({ guests, isHost, onRemove }) {
  if (!guests.length) return null;

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {guests.map((guest) => (
        <div
          key={guest.id}
          className="flex shrink-0 items-center gap-2 rounded-full border border-white/15 bg-black/50 py-1 pl-1 pr-2 backdrop-blur"
        >
          <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-white/15 text-[11px] font-semibold uppercase text-white/80">
            {guest.avatar_url ? (
              <Image src={guest.avatar_url} alt="" className="h-7 w-7" />
            ) : (
              (guest.username || "?").slice(0, 1)
            )}
          </span>
          <span className="flex items-center gap-1 text-[12px] font-medium">
            <Mic className="h-3 w-3 text-accent" />
            @{guest.username || "friend"}
          </span>
          {isHost ? (
            <button
              type="button"
              onClick={() => onRemove(guest)}
              aria-label={`Let @${guest.username || "guest"} go`}
              className="grid h-5 w-5 place-items-center rounded-full bg-white/15 text-white"
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}