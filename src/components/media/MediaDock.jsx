import React from "react";
import { Play, SkipForward, X } from "lucide-react";
import ClipPlayer from "@/components/story/ClipPlayer";

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
 *
 * An artist's own set is brought in and started by the app itself: `autoStart` holds the piece the
 * person asked for with the artist's own pieces behind it, listed here in the order they play, and
 * `onTrackEnd` is what the player reports when one of them has played out, so the set moves on by
 * itself until the last of them is done.
 */
export default function MediaDock({
  item,
  queue = [],
  others = 0,
  offer = [],
  note = "",
  playing,
  autoStart = false,
  onPick,
  onStart,
  onPlaying,
  onTrackEnd,
  onNext,
  onClose,
  playerRef,
}) {
  // Where the app holds pieces of the artist but could settle on none of them — two titles alike, or a
  // title that answers none of them — the pieces themselves stand here to be pressed. So a request the
  // app could not decide still ends in something the person can play here, in the app's own player,
  // rather than in a line alone.
  if (!item) {
    if (!offer.length) return null;
    return (
      <section aria-label="The artist's own pieces" className="border-t border-border px-4 py-3">
        <div className="mb-2 flex items-start gap-3">
          <p className="min-w-0 flex-1 font-body text-[11px] leading-snug text-muted-foreground">
            {note || "Which of the artist's own pieces did you mean? Press one to play it here."}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Put the list away"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-border text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="space-y-1">
          {offer.map((one) => (
            <li key={one.url}>
              <button
                type="button"
                onClick={() => onPick?.(one)}
                className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-left"
              >
                <Play className="h-4 w-4 flex-none text-accent" />
                <span className="min-w-0 flex-1 truncate font-body text-sm text-foreground">
                  {one.name || one.url}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const line =
    note ||
    (playing
      ? "Playing here, with its sound."
      : "Starting here — if it has not begun, press play on the video itself.");

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

      {queue.length ? (
        <div className="mt-1 border-t border-border pt-2">
          <p className="font-body text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Baada ya hii — {queue.length} more of the artist's own
          </p>
          <ul className="mt-1 space-y-0.5">
            {queue.map((one) => (
              <li
                key={one.url}
                className="truncate font-body text-[11px] leading-snug text-muted-foreground"
              >
                {one.name || one.url}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ClipPlayer
        ref={playerRef}
        url={item.url}
        title={item.name}
        autoStart={autoStart}
        onPlaybackStart={onStart}
        onPlaying={onPlaying}
        onTrackEnd={onTrackEnd}
      />
    </section>
  );
}