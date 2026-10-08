import React from "react";
import StoryMedia from "@/components/story/StoryMedia";
import StoryLinks from "@/components/story/StoryLinks";
import ArtistLinks from "@/components/story/ArtistLinks";
import { mediaPlacement, storyLinks } from "@/lib/stories";
import { storyBlocks } from "@/lib/storyMarks";

/**
 * The admin's story on screen: their own telling, its filing words, and every picture, video, audio
 * recording or link they put into it — each one standing exactly where they put it, in the order
 * they wrote it. A story written before the marks keeps its one attachment at its own end.
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

  const blocks = storyBlocks(story.text);
  const attached = !!story.media_kind && story.media_kind !== "none";
  // where the one attachment of an older story stands: after its last line, as it always did
  const at = attached ? mediaPlacement(story, blocks.length) : -1;
  const older = attached ? (
    <StoryMedia
      kind={story.media_kind}
      url={story.media_url}
      uri={story.media_file_uri}
      title={story.title}
      onPlaybackEnd={onPlaybackEnd}
    />
  ) : null;

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

      {blocks.map((block, index) => (
        <React.Fragment key={index}>
          {index === at ? older : null}

          {block.kind === "text" ? (
            <p className="whitespace-pre-wrap font-body text-[15px] leading-relaxed text-foreground">
              {block.text}
            </p>
          ) : (
            <StoryMedia
              kind={block.kind === "link" ? "link" : block.mediaKind}
              url={block.url}
              uri={block.uri}
              title={story.title}
              onPlaybackEnd={onPlaybackEnd}
            />
          )}
        </React.Fragment>
      ))}

      {older && at >= blocks.length ? older : null}

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