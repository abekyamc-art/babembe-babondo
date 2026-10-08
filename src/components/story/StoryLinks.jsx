import React from "react";
import { ExternalLink } from "lucide-react";
import { hostOf } from "@/lib/stories";
import { youtubeVideo } from "@/lib/youtube";
import YouTubePlayer from "@/components/story/YouTubePlayer";

/**
 * The links the admin attached to a story.
 *
 * A YouTube address among them is a video, and a video is watched where it stands: it is drawn as
 * its own player, resting as the video's own cover, and it plays inside the app with its sound
 * while the address it came from stands underneath it, so it can always be opened on YouTube as
 * well. Any other address is a link, and is opened where it already stands.
 *
 * Both take the person away from the talk the story was asked on, so the talk is handed back: the
 * call ends the moment a video is chosen or a link is opened.
 */
export default function StoryLinks({ links = [], title = "", onOpen, onPlaybackEnd }) {
  if (!links.length) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <span className="font-body text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        Links
      </span>

      {links.map((link) =>
        youtubeVideo(link) ? (
          <YouTubePlayer key={link} url={link} title={title} onPlaybackEnd={onPlaybackEnd} />
        ) : (
          <button
            key={link}
            type="button"
            onClick={() => onOpen?.(link)}
            className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-left font-body text-[13px] text-foreground transition hover:border-accent/50"
          >
            <span className="truncate">{hostOf(link)}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        )
      )}
    </div>
  );
}