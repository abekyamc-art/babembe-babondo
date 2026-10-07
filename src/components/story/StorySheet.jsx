import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import StoryCard from "@/components/story/StoryCard";

/**
 * The story the person asked for, drawn over the whole screen so it is read without leaving the
 * talk behind it: the admin's own telling, its media, and its links. Closing it returns to the
 * call exactly where it stood.
 */
export default function StorySheet({ story, onClose, onPlaybackEnd }) {
  if (!story) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div aria-hidden onClick={onClose} className="account-backdrop absolute inset-0" />

      <section
        role="dialog"
        aria-modal="true"
        aria-label={story.title}
        className="absolute inset-x-3 bottom-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="font-body text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              A story from the admin
            </p>
            <h2 className="truncate font-heading text-base leading-tight">{story.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the story"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <StoryCard story={story} onPlaybackEnd={onPlaybackEnd} />
        </div>
      </section>
    </div>,
    document.body
  );
}