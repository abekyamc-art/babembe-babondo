import React from "react";
import { ExternalLink, Play, X } from "lucide-react";
import { Image } from "@/components/ui/image";
import { hostOf } from "@/lib/stories";
import { youtubeVideo } from "@/lib/youtube";
import YouTubePlayer from "@/components/story/YouTubePlayer";

/**
 * One of the artist's published pieces, as it stands in a list of them.
 *
 * A video shows itself before it is played — its own cover, with the play sign on it and its name
 * under it — so a person meets the video rather than a line of text about one. Tapping it brings the
 * player in right there, with its own sound and its own volume, and the address it came from stands
 * underneath, so the same video can always be opened on YouTube as well.
 *
 * Choosing a video ends the talk the story was asked on: the call goes the moment the piece is
 * tapped, so nothing of it is heard over the video. Putting the video away is a quiet tap and leaves
 * the talk as it is, and the player's own stop hands the story back when the playing is over.
 *
 * Anything that is not a video — an artist's page, a piece on another site — is a link, and it opens
 * where it already stands.
 */
export default function ArtistVideoRow({
  entry,
  shown = false,
  onToggle,
  onOpen,
  onPlaybackEnd,
}) {
  const video = youtubeVideo(entry.url);
  const label = entry.name || hostOf(entry.url);

  if (video) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            if (!shown) onPlaybackEnd?.();
            onToggle?.();
          }}
          aria-label={shown ? `Put ${label} away` : `Play ${label}`}
          className="group relative block w-full overflow-hidden rounded-xl border border-border bg-black"
        >
          <Image
            src={video.cover}
            alt={label}
            fittingType="fill"
            className="aspect-video w-full object-cover opacity-90"
          />
          <span className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-background/90 shadow-lg transition group-active:scale-95">
              {shown ? (
                <X className="h-5 w-5 text-foreground" />
              ) : (
                <Play className="h-5 w-5 translate-x-[1px] fill-foreground text-foreground" />
              )}
            </span>
          </span>
          <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2 pt-6 text-left">
            <span className="block truncate font-body text-[12px] font-semibold text-white">
              {label}
            </span>
            <span className="block font-body text-[10px] text-white/75">
              {shown ? "Playing here · tap to put it away" : "Plays here in the app"}
            </span>
          </span>
        </button>

        {shown ? (
          <YouTubePlayer url={entry.url} title={entry.name || ""} onPlaybackEnd={onPlaybackEnd} />
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen?.(entry.url)}
      className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-left transition hover:border-accent/50"
    >
      <span className="min-w-0">
        <span className="block truncate font-body text-[13px] text-foreground">{label}</span>
        <span className="block truncate font-body text-[11px] text-muted-foreground">
          {hostOf(entry.url)}
        </span>
      </span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </button>
  );
}