import React, { useEffect, useState } from "react";
import { ExternalLink, Music } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { storyFace } from "@/lib/storyPlacement";

// How many of the admin's stories stand in the strip at once.
const LIMIT = 8;

/** One story's own face: the first picture it carries, the first frame of its first video, or the
 *  mark of what else it carries — wherever in the telling the admin gave it its place. */
function StoryFace({ story }) {
  const face = storyFace(story);

  if (face?.kind === "image") {
    return <Image src={face.url} alt={story.title} className="h-full w-full" />;
  }
  if (face?.kind === "video") {
    return (
      <video
        src={face.url}
        muted
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
      />
    );
  }
  return (
    <span className="grid h-full w-full place-items-center bg-accent/10 text-accent">
      {face?.kind === "audio" ? (
        <Music className="h-4 w-4" />
      ) : face?.kind === "link" ? (
        <ExternalLink className="h-4 w-4" />
      ) : null}
    </span>
  );
}

/**
 * The admin's own stories in the middle of the voice screen: what the app has been told stands on
 * screen before anything is asked of it, and a tap opens the story itself, with its media, in the
 * same sheet the assistant uses.
 *
 * Only published stories stand here, and the strip is simply absent when the app has none of them —
 * the screen is then exactly as it was without it.
 */
export default function StoryRail({ onOpen, refresh = 0 }) {
  const [stories, setStories] = useState([]);

  useEffect(() => {
    let alive = true;
    base44.entities.Story.filter({ published: true }, { sort: "-updated_date", limit: LIMIT })
      .then((page) => {
        if (alive) setStories(page?.items || []);
      })
      .catch(() => {
        // a strip that cannot be read is no reason to hold up the screen
        if (alive) setStories([]);
      });
    return () => {
      alive = false;
    };
  }, [refresh]);

  if (!stories.length) return null;

  return (
    // a screen too short to hold the strip keeps the call's own screen exactly as it was
    <div className="w-full shrink-0 [@media(max-height:744px)]:hidden">
      <p className="mb-1.5 font-body text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Hadithi · stories
      </p>
      <div className="flex gap-2.5 overflow-x-auto">
        {stories.map((story) => (
          <button
            key={story.id}
            type="button"
            onClick={() => onOpen(story)}
            className="flex w-[68px] shrink-0 flex-col gap-1.5 text-left"
          >
            <span className="block h-[56px] w-[68px] overflow-hidden rounded-xl border border-border bg-secondary">
              <StoryFace story={story} />
            </span>
            <span className="line-clamp-2 font-body text-[10px] font-semibold leading-tight text-foreground">
              {story.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}