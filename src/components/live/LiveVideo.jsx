import React, { useRef } from "react";
import { Loader2 } from "lucide-react";
import { Image } from "@/components/ui/image";
import useStream from "@/hooks/useStream";

/** The room's picture: the host's camera full screen. The sound is played by RoomAudio. */
export default function LiveVideo({
  isHost,
  hostEmail,
  hostUsername,
  hostAvatarUrl,
  localStream,
  remoteStreams,
  mediaError,
  filter,
  pictureOn,
}) {
  const videoRef = useRef(null);
  const main = isHost ? localStream : remoteStreams[hostEmail];
  useStream(videoRef, main);

  const hasVideo = !!main && main.getVideoTracks().length > 0;
  const picture = hasVideo && pictureOn;

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ filter: filter || "none" }}
        className={picture ? "absolute inset-0 h-full w-full object-cover" : "hidden"}
      />

      {!picture ? (
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
          ) : !pictureOn ? (
            <p className="text-[12px] text-white/60">
              {isHost ? "Your camera is off" : "The camera is off"}
            </p>
          ) : (
            <p className="flex items-center gap-2 text-[13px] text-white/60">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {isHost ? "Opening your camera…" : "Joining the live…"}
            </p>
          )}
        </div>
      ) : null}
    </>
  );
}