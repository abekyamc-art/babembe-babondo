import React, { useRef } from "react";
import { Loader2 } from "lucide-react";
import { Image } from "@/components/ui/image";
import useStream from "@/hooks/useStream";
import RemoteAudio from "@/components/live/RemoteAudio";

/** The room's picture: the host's camera full screen, plus every guest's voice. */
export default function LiveVideo({
  isHost,
  hostEmail,
  hostUsername,
  hostAvatarUrl,
  localStream,
  remoteStreams,
  mediaError,
}) {
  const videoRef = useRef(null);
  const main = isHost ? localStream : remoteStreams[hostEmail];
  useStream(videoRef, main);

  const guests = Object.entries(remoteStreams).filter(([email]) => email !== hostEmail);

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isHost}
        className="absolute inset-0 h-full w-full object-cover"
      />

      {!main ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-8 text-center">
          <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full border-2 border-accent/50 bg-white/10 text-[24px] font-semibold uppercase text-white/80">
            {hostAvatarUrl ? (
              <Image src={hostAvatarUrl} alt="" className="h-20 w-20" />
            ) : (
              (hostUsername || "?").slice(0, 1)
            )}
          </div>
          {mediaError ? (
            <p className="max-w-[16rem] text-[12px] leading-snug text-white/70">{mediaError}</p>
          ) : (
            <p className="flex items-center gap-2 text-[13px] text-white/60">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {isHost ? "Opening your camera…" : "Joining the live…"}
            </p>
          )}
        </div>
      ) : null}

      {guests.map(([email, stream]) => (
        <RemoteAudio key={email} stream={stream} />
      ))}
    </>
  );
}