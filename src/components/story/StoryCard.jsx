import React from "react";
import StoryMedia from "@/components/story/StoryMedia";
import StoryLinks from "@/components/story/StoryLinks";
import ArtistLinks from "@/components/story/ArtistLinks";
import { storyLinks } from "@/lib/stories";
import { inlineStory, legacyMedia, storyMediaItems } from "@/lib/storyPlacement";

/**
 * The admin's story on screen: their own telling, its filing words, and every picture, video, audio
 * recording or link the story carries, each one standing exactly where the admin gave it its place —
 * inside the sentence it was written into, or after the line it was put behind.
 *
 * A link is opened where it stands, and anything that takes the person away from the talk hands the
 * talk back: the call the story was asked on ends the moment the playing is over.
 */
export default function StoryCard({ story, onPlaybackEnd }) {
  const openLink = (target) => {
    window.open(target, "_blank", "noopener,noreferrer");
    onPlaybackEnd?.();
  };

  if (!story) return null;

  // the whole story as it is read: the telling's own lines, and everything it carries among them
  const blocks = inlineStory({
    text: story.text,
    entries: storyMediaItems(story),
    legacy: legacyMedia(story),
  });

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

      {blocks.map((block, index) =>
        block.type === "text" ? (
          <p
            key={index}
            className="whitespace-pre-wrap font-body text-[15px] leading-relaxed text-foreground"
          >
            {block.text}
          </p>
        ) : (
          <StoryMedia
            key={index}
            kind={block.kind}
            url={block.url}
            uri={block.uri}
            title={story.title}
            onPlaybackEnd={onPlaybackEnd}
          />
        )
      )}

      <ArtistLinks
        channel={story.channel_url}
        links={story.artist_links}
        matched={story.matched_media}
        onOpen={openLink}
        onPlaybackEnd={onPlaybackEnd}
      />

      {/* only the story's real addresses stand here: a stray line saved among them is not a link,
          and opening one is an error rather than anything the admin meant to attach */}
      <StoryLinks
        links={storyLinks(story.links)}
        title={story.title}
        onOpen={openLink}
        onPlaybackEnd={onPlaybackEnd}
      />
    </article>
  );
}