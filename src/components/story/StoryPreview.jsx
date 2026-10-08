import React from "react";
import StoryMedia from "@/components/story/StoryMedia";
import ArtistLinks from "@/components/story/ArtistLinks";
import { mediaPlacement } from "@/lib/stories";
import { storyBlocks } from "@/lib/storyMarks";

/**
 * The story as people will meet it, drawn inside the studio so it can be checked before it is
 * saved: the telling's own lines, and every picture, video, audio recording and link standing
 * exactly where the admin put it — each one played right here.
 *
 * The studio's own dark room is given to the parts it is made of, so a picture, a player or a link
 * sits here as it will sit there. Nothing played here ends anyone's talk: this is the studio.
 */
export default function StoryPreview({
  text,
  title = "",
  media = null,
  channel = "",
  artistLinks = [],
}) {
  const blocks = storyBlocks(text);
  const held = media && media.kind && media.kind !== "none" && (media.url || media.uri) ? media : null;
  // a story written before the marks keeps its one attachment at its own end
  const at = held ? mediaPlacement({ media_after: held.after }, blocks.length) : -1;
  const heldEl = held ? (
    <StoryMedia kind={held.kind} url={held.url} uri={held.uri} title={title} />
  ) : null;

  const artist = !!(channel || (Array.isArray(artistLinks) && artistLinks.length));
  if (!blocks.length && !heldEl && !artist) return null;

  return (
    <div className="dark flex flex-col gap-3 rounded-2xl border border-border bg-card p-3">
      {blocks.map((block, index) => (
        <React.Fragment key={index}>
          {index === at ? heldEl : null}

          {block.kind === "text" ? (
            <p className="whitespace-pre-wrap font-body text-[14px] leading-relaxed text-foreground">
              {block.text}
            </p>
          ) : (
            <StoryMedia
              kind={block.kind === "link" ? "link" : block.mediaKind}
              url={block.url}
              uri={block.uri}
              title={title}
            />
          )}
        </React.Fragment>
      ))}

      {heldEl && at >= blocks.length ? heldEl : null}

      <ArtistLinks channel={channel} links={artistLinks} />
    </div>
  );
}