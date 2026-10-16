import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import ArtistVideoRow from "@/components/story/ArtistVideoRow";

/**
 * Everything the artist has published, in a place of its own. A channel with a lot published keeps
 * the story short, and the whole list is opened here by the one control standing under it — so a
 * person meets every video without the telling being buried under them.
 *
 * Only one of them is played at a time, and choosing one ends the talk the story was asked on
 * exactly as it does in the story itself. Closing this returns to the story where it stood.
 */
export default function ArtistVideosSheet({
  title = "",
  rows = [],
  onClose,
  onOpen,
  onPlaybackEnd,
}) {
  // which of the artist's pieces is standing open right now
  const [openAt, setOpenAt] = useState(-1);

  if (!rows.length) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <div aria-hidden onClick={onClose} className="account-backdrop absolute inset-0" />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Every video the artist has published"
        className="absolute inset-x-3 bottom-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="font-body text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Published by the artist
            </p>
            <h2 className="truncate font-heading text-base leading-tight">
              {title || "Every video"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the video list"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-4 py-4">
          {rows.map((entry, index) => (
            <ArtistVideoRow
              key={`${entry.url}-${index}`}
              entry={entry}
              shown={openAt === index}
              onToggle={() => setOpenAt(openAt === index ? -1 : index)}
              onOpen={onOpen}
              onPlaybackEnd={onPlaybackEnd}
            />
          ))}
        </div>
      </section>
    </div>,
    document.body
  );
}