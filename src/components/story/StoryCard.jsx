import React, { useEffect, useState } from "react";
import { ExternalLink, Loader2, Play } from "lucide-react";
import { Image } from "@/components/ui/image";
import { hostOf, storyMediaUrl } from "@/lib/stories";

/**
 * The admin's story on screen: their own telling, its filing words, and whatever they attached —
 * a picture, a video, an audio recording, or a link that is played outside the app. What is
 * attached is opened here,
 * and anything that takes the person away from the talk hands the talk back: the call it was asked
 * on ends the moment the playing is over.
 */
export default function StoryCard({ story, onPlaybackEnd }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    const held = story?.media_file_uri && !story?.media_url;
    if (!story || (!story.media_url && !story.media_file_uri)) {
      setUrl("");
      setLoading(false);
      return () => {
        alive = false;
      };
    }
    if (!held) {
      setUrl(story.media_url || "");
      setLoading(false);
      return () => {
        alive = false;
      };
    }
    setLoading(true);
    storyMediaUrl(story).then((signed) => {
      if (!alive) return;
      setUrl(signed || "");
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [story]);

  // A link is played where it already stands, and the talk it was asked on ends as the person is
  // handed over: nothing of the story is heard over a page that has the person's ear.
  const openLink = (target) => {
    window.open(target, "_blank", "noopener,noreferrer");
    onPlaybackEnd?.();
  };

  if (!story) return null;

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

      <p className="whitespace-pre-wrap font-body text-[15px] leading-relaxed text-foreground">
        {story.text}
      </p>

      {loading ? (
        <p className="flex items-center gap-2 font-body text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Opening what was attached…
        </p>
      ) : null}

      {!loading && url && story.media_kind === "image" ? (
        <Image
          src={url}
          alt={story.title}
          fittingType="fit"
          className="w-full rounded-2xl border border-border"
        />
      ) : null}

      {!loading && url && story.media_kind === "video" ? (
        <video
          src={url}
          controls
          playsInline
          onEnded={() => onPlaybackEnd?.()}
          className="w-full rounded-2xl border border-border bg-black"
        />
      ) : null}

      {!loading && url && story.media_kind === "audio" ? (
        <audio
          src={url}
          controls
          onEnded={() => onPlaybackEnd?.()}
          className="w-full rounded-2xl border border-border bg-card"
        />
      ) : null}

      {!loading && story.media_kind === "link" && url ? (
        <button
          type="button"
          onClick={() => openLink(url)}
          className="flex items-center justify-center gap-2 rounded-2xl border border-accent/50 bg-accent/10 px-4 py-3 font-body text-sm font-semibold text-accent transition active:scale-[0.99]"
        >
          <Play className="h-4 w-4" />
          Play the link · {hostOf(url)}
        </button>
      ) : null}

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