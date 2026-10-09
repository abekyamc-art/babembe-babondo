import React from "react";
import StoryMedia from "@/components/story/StoryMedia";
import ArtistLinks from "@/components/story/ArtistLinks";
import { inlineStory } from "@/lib/storyPlacement";

/**
 * The story as people will meet it, drawn inside the studio so it can be checked before it is saved:
 * the telling's own lines, and every picture, video, audio recording and link standing exactly where
 * it was given its place — each one played right here.
 *
 * The studio's own dark room is given to the parts it is made of, so a picture, a player or a link
 * sits here as it will sit there. Nothing played here ends anyone's talk: this is the studio.
 */
export default function StoryPreview({
  text,
  title = "",
  items = [],
  media = null,
  channel = "",
  artistLinks = [],
}) {
  const blocks = inlineStory({ text, entries: items, legacy: media });
  const artist = !!(channel || (Array.isArray(artistLinks) && artistLinks.length));
  if (!blocks.length && !artist) return null;

  return (
    <div className="dark flex flex-col gap-3 rounded-2xl border border-border bg-card p-3">
      {blocks.map((block, index) =>
        block.type === "text" ? (
          <p
            key={index}
            className="whitespace-pre-wrap font-body text-[14px] leading-relaxed text-foreground"
          >
            {block.text}
          </p>
        ) : (
          <StoryMedia key={index} kind={block.kind} url={block.url} uri={block.uri} title={title} />
        )
      )}

      <ArtistLinks channel={channel} links={artistLinks} />
    </div>
  );
}