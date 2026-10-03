import React from "react";
import { Check, Loader2, Users, X } from "lucide-react";
import { Image } from "@/components/ui/image";
import { Button } from "@/components/ui/button";

export default function LiveStage({
  room,
  isHost,
  viewers,
  requests,
  myRequest,
  busy,
  onRequest,
  onCancel,
  onApprove,
  onDecline,
}) {
  const approved = myRequest?.status === "approved";
  const pending = myRequest?.status === "pending";

  return (
    <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#1b2948] to-[#0b1020]">
      <div className="flex items-center gap-2 px-4 pt-3">
        <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive-foreground">
          Live
        </span>
        <span className="flex items-center gap-1 text-[12px] text-white/70">
          <Users className="h-3.5 w-3.5" />
          {viewers}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full border-2 border-accent/60 bg-white/10 text-[22px] font-semibold uppercase text-white/80">
          {room.host_avatar_url ? (
            <Image src={room.host_avatar_url} alt="" className="h-20 w-20" />
          ) : (
            (room.host_username || "?").slice(0, 1)
          )}
        </div>
        <p className="text-[15px] font-semibold text-white">
          {isHost ? "You're live" : `@${room.host_username || "friend"}`}
        </p>
        <p className="text-[13px] text-white/60">{room.title || "Live now"}</p>
        <p className="max-w-[15rem] text-[11px] leading-snug text-white/40">
          Video starts the moment a streaming service is connected to this app.
        </p>
      </div>

      <div className="px-4 pb-4">
        {isHost ? (
          requests.length ? (
            <div className="max-h-32 space-y-2 overflow-y-auto">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between gap-2 rounded-2xl bg-white/10 px-3 py-2"
                >
                  <span className="truncate text-[13px] text-white">
                    @{request.viewer_username || "viewer"}
                  </span>
                  <span className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => onApprove(request)}
                      aria-label="Let in"
                      className="grid h-8 w-8 place-items-center rounded-full bg-accent text-accent-foreground"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDecline(request)}
                      aria-label="Keep out"
                      className="grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-[12px] text-white/50">
              Join requests land here — approve to let someone in.
            </p>
          )
        ) : approved ? (
          <p className="text-center text-[12px] text-white/60">You're in — say hi below.</p>
        ) : pending ? (
          <div className="flex items-center gap-2">
            <span className="flex flex-1 items-center gap-2 text-[12px] text-white/70">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Waiting for the host…
            </span>
            <Button size="sm" variant="secondary" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button className="w-full" onClick={onRequest} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Request to join
          </Button>
        )}
      </div>
    </section>
  );
}