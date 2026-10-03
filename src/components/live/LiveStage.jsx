import React from "react";
import { ArrowLeft, Coins, X } from "lucide-react";
import LiveVideo from "@/components/live/LiveVideo";
import GuestRequests from "@/components/live/GuestRequests";
import RoomAudio from "@/components/live/RoomAudio";

/** The room itself: the host's video edge to edge, with everything else laid over it. */
export default function LiveStage({
  isHost,
  hostEmail,
  hostUsername,
  hostAvatarUrl,
  localStream,
  remoteStreams,
  mediaError,
  problem,
  viewerCount,
  coins,
  requests,
  busy,
  filter,
  pictureOn,
  onApprove,
  onDecline,
  onExit,
  children,
  overlays,
}) {
  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black text-white">
      <LiveVideo
        isHost={isHost}
        hostEmail={hostEmail}
        hostUsername={hostUsername}
        hostAvatarUrl={hostAvatarUrl}
        localStream={localStream}
        remoteStreams={remoteStreams}
        mediaError={mediaError}
        filter={filter}
        pictureOn={pictureOn}
      />
      <RoomAudio streams={remoteStreams} />

      <header className="absolute inset-x-0 top-0 z-30 flex items-start gap-2.5 bg-gradient-to-b from-black/70 to-transparent px-4 pb-6 pt-[max(0.7rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onExit}
          aria-label={isHost ? "End the live" : "Leave the live"}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 bg-black/40 backdrop-blur"
        >
          {isHost ? <X className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
        </button>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="flex items-center gap-2">
            <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
              Live
            </span>
            <span className="truncate text-[14px] font-semibold">
              {isHost ? "You're live" : `@${hostUsername || "friend"}`}
            </span>
          </p>
          <p className="mt-0.5 text-[11px] text-white/60">
            {viewerCount} {viewerCount === 1 ? "person" : "people"} watching
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">
          <Coins className="h-3.5 w-3.5 text-accent" />
          {coins}
        </span>
      </header>

      {isHost ? (
        <div className="absolute inset-x-0 top-[calc(env(safe-area-inset-top)+5rem)] z-20 flex justify-end px-4">
          <div className="w-[13.5rem]">
            <GuestRequests
              requests={requests}
              busy={busy}
              onApprove={onApprove}
              onDecline={onDecline}
            />
          </div>
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-4 pb-[max(0.9rem,env(safe-area-inset-bottom))] pt-12">
        {problem ? (
          <p className="text-center text-[11px] leading-snug text-white/75">{problem}</p>
        ) : null}
        {children}
      </div>

      {overlays}
    </div>
  );
}