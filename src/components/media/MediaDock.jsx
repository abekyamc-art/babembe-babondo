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
 */
export default function MediaDock({ item, others = 0, playing, onStart, onNext, onClose }) {
  if (!item) return null;

  return (
    <section aria-label="Media player" className="border-t border-border px-4 py-3">
      <div className="mb-2 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-body text-sm font-semibold text-foreground">{item.name}</p>
          <p className="truncate font-body text-[11px] leading-snug text-muted-foreground">
            {playing
              ? "Nimekuweka — it stands in the player here."
              : "Press play — it plays right here, with its sound."}
          </p>
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

      <YouTubePlayer url={item.url} title={item.name} onPlaybackStart={onStart} />
    </section>
  );
}