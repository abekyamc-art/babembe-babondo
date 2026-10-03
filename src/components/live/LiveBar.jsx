import React from "react";
import { Image } from "@/components/ui/image";

export default function LiveBar({ rooms, onOpen }) {
  if (!rooms.length) return null;

  return (
    <div className="flex shrink-0 gap-3 overflow-x-auto px-4 pb-3">
      {rooms.map((room) => (
        <button
          key={room.id}
          type="button"
          onClick={() => onOpen(room)}
          className="flex w-16 shrink-0 flex-col items-center gap-1.5"
        >
          <span className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-full border-2 border-destructive bg-secondary text-[15px] font-semibold uppercase text-muted-foreground">
            {room.host_avatar_url ? (
              <Image src={room.host_avatar_url} alt="" className="h-14 w-14" />
            ) : (
              (room.host_username || "?").slice(0, 1)
            )}
          </span>
          <span className="rounded-full bg-destructive px-1.5 text-[9px] font-bold uppercase tracking-wide text-destructive-foreground">
            Live
          </span>
          <span className="w-full truncate text-center text-[10px] text-muted-foreground">
            @{room.host_username || "friend"}
          </span>
        </button>
      ))}
    </div>
  );
}