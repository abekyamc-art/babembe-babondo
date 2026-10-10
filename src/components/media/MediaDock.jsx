import React from "react";
import { SkipForward, X } from "lucide-react";
import YouTubePlayer from "@/components/story/YouTubePlayer";

/**
 * The app's own player, standing under the talk with the piece the app chose.
 *
 * The video is played inside the app — never a link alone — and it is brought in by the person's own
 * press, because a player made to start on its own is the very one browsers silence; pressed, it
 * plays here with its sound. Only once the player is truly in place does the line under the title say
 * so, and the artist's other pieces stand behind this one for the next one.
 *
 * The line under the title is the app's own: `note` is what the app has really done with its player —
 * that the piece stands there, which piece is meant when two titles are alike, or that the voice has
 * gone quiet. A call may pass the player in through `playerRef`, so the piece standing in it can be
 * paused, started again or taken out by what the person asked for; `onPlaying` is said only when the
 * player itself reports that the sound has really begun.
 */
export default function MediaDock({
  item,
  others = 0,
  note = "",
  playing,
  onStart,
  onPlaying,
  onNext,
  onClose,
  playerRef,
}) {
  if (!item) return null;

  const line =
    note ||
    (playing
      ? "Nimekuweka — it stands in the player here."
      : "Press play — it plays right here, with its sound.");

  return (
    <section aria-label="Media player" className="border-t border-border px-4 py-3">
      <div className="mb-2 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-body text-sm font-semibold text-foreground">{item.name}</p>
          <p className="truncate font-body text-[11px] leading-snug text-muted-foreground">{line}</p>
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={!others}
          aria-label="Play the next piece"
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-border text-foreground disabled:opacity-40"
        >
          <SkipForward className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label="Put the player away"
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-border text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <YouTubePlayer
        ref={playerRef}
        url={item.url}
        title={item.name}
        onPlaybackStart={onStart}
        onPlaying={onPlaying}
      />
    </section>
  );
}