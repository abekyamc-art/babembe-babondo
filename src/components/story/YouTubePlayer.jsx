import React, { useState } from "react";
import { ExternalLink, Play, X } from "lucide-react";
import { Image } from "@/components/ui/image";
import { youtubeVideo } from "@/lib/youtube";
import { hostOf } from "@/lib/stories";

/**
 * A YouTube video standing inside a story.
 *
 * It rests as its own cover — the picture YouTube itself uses — with a play sign on it, and the
 * address it came from written underneath. Tapping the cover starts the video right here, in the
 * story's own place, with its sound, without sending anyone to YouTube. The player YouTube puts on
 * The player carries its own play sign and its own volume, and it is started from there — a press
 * inside the player itself — because a player made to start on its own is the very one browsers
 * silence. Started that way it speaks with its sound, and the stop beside the link takes it away
 * completely, so the telling keeps the place it had.
 *
 * The link underneath is the only way out: it is opened only when it is deliberately tapped, and
 * what took the person away from the talk hands the talk back.
 */
export default function YouTubePlayer({ url, title = "", onPlaybackEnd }) {
  const video = youtubeVideo(url);
  const [playing, setPlaying] = useState(false);

  if (!video) return null;

  const stop = (handBack) => {
    setPlaying(false);
    if (handBack) onPlaybackEnd?.();
  };

  const leave = () => {
    // the video is put away before the address is opened, so no sound is left playing behind it
    setPlaying(false);
    window.open(video.watch, "_blank", "noopener,noreferrer");
    onPlaybackEnd?.();
  };

  return (
    <div className="flex flex-col gap-2">
      {playing ? (
        <div className="w-full overflow-hidden rounded-2xl border border-border bg-black">
          <iframe
            src={video.embed}
            title={title || "YouTube video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="aspect-video w-full"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label="Show the YouTube video here"
          className="group relative block w-full overflow-hidden rounded-2xl border border-border bg-black"
        >
          <Image
            src={video.cover}
            alt={title}
            fittingType="fill"
            className="aspect-video w-full object-cover opacity-90"
          />
          <span className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-background/90 shadow-lg transition group-active:scale-95">
              <Play className="h-6 w-6 translate-x-[1px] fill-foreground text-foreground" />
            </span>
          </span>
        </button>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={leave}
          className="flex min-w-0 items-center gap-2 font-body text-[12px] text-muted-foreground underline decoration-border underline-offset-2 transition hover:text-foreground"
        >
          <span className="truncate">Watch on YouTube · {hostOf(video.watch)}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        </button>

        {playing ? (
          <button
            type="button"
            onClick={() => stop(true)}
            className="flex flex-none items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-body text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Stop
          </button>
        ) : null}
      </div>

      {playing ? (
        <span className="font-body text-[11px] leading-snug text-muted-foreground">
          Press play on the video itself — it plays here with its sound, and its own volume.
        </span>
      ) : null}
    </div>
  );
}