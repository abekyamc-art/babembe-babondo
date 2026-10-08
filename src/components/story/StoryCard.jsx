import React from "react";
import { ExternalLink } from "lucide-react";
import StoryMedia from "@/components/story/StoryMedia";
import { hostOf, mediaPlacement, storyLines } from "@/lib/stories";

/**
 * The admin's story on screen: their own telling, its filing words, and whatever they attached —
 * a picture, a video, an audio recording or a link — standing where the admin put it inside the
 * telling rather than only at its foot. What is attached is opened here, and anything that takes
 * the person away from the talk hands the talk back: the call it was asked on ends the moment the
 * playing is over.
 */
export default function StoryCard({ story, onPlaybackEnd }) {
  // A link is played where it already stands, and the talk it was asked on ends as the person is
  // handed over: nothing of the story is heard over a page that has the person's ear.
  const openLink = (target) => {
    window.open(target, "_blank", "noopener,noreferrer");
    onPlaybackEnd?.();
  };

  if (!story) return null;

  const lines = storyLines(story.text);
  const attached = !!story.media_kind && story.media_kind !== "none";
  // where the attached thing stands in the telling: before it, after one of its lines, or at its end
  const at = attached ? mediaPlacement(story, lines.length) : -1;
  const media = attached ? <StoryMedia story={story} onPlaybackEnd={onPlaybackEnd} /> : null;

  return (
    <article className="flex flex-col gap-4">
      {story.tags?.length ? (
        <div className="flex flex-wrap gap-2">
          {story.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border px-3 py-1 font-body text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {lines.map((line, index) => (
        <React.Fragment key={index}>
          {index === at ? media : null}
          <p className="whitespace-pre-wrap font-body text-[15px] leading-relaxed text-foreground">
            {line}
          </p>
        </React.Fragment>
      ))}

      {media && at >= lines.length ? media : null}

      {story.links?.length ? (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <span className="font-body text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Links
          </span>
          {story.links.map((link) => (
            <button
              key={link}
              type="button"
              onClick={() => openLink(link)}
              className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-left font-body text-[13px] text-foreground transition hover:border-accent/50"
            >
              <span className="truncate">{hostOf(link)}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}