import React from "react";
import { ExternalLink, Play } from "lucide-react";
import { hostOf } from "@/lib/stories";
import { youtubeVideo } from "@/lib/youtube";
import YouTubePlayer from "@/components/story/YouTubePlayer";

/**
 * One of the artist's published pieces, as it stands in a list of them. A video plays right here in
 * the app with its own sound; anything else opens where it already stands.
 *
 * Choosing a video ends the talk the story was asked on: the call goes the moment the piece is
 * tapped, so nothing of it is heard over the video. Putting the video away is a quiet tap and leaves
 * the talk as it is, and the player's own stop hands the story back when the playing is over.
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
          className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-left transition hover:border-accent/50"
        >
          <span className="min-w-0">
            <span className="block truncate font-body text-[13px] text-foreground">
              {label}
            </span>
            <span className="block truncate font-body text-[11px] text-muted-foreground">
              {shown ? "Playing here · tap to put it away" : "Plays here · YouTube"}
            </span>
          </span>
          <Play className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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