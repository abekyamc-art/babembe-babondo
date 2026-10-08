import React from "react";
import { ExternalLink } from "lucide-react";
import StoryMedia from "@/components/story/StoryMedia";
import ArtistLinks from "@/components/story/ArtistLinks";
import { hostOf, mediaPlacement } from "@/lib/stories";
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
        onOpen={openLink}
      />

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