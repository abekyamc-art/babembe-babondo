import React, { useEffect, useState } from "react";
import { Loader2, Play } from "lucide-react";
import { Image } from "@/components/ui/image";
import { hostOf, storyMediaUrl } from "@/lib/stories";

/**
 * Whatever the admin attached to a story — a picture, a video, an audio recording, or a link —
 * drawn in the place the telling has for it. An uploaded file lives in the app's own private
 * storage, so it is opened through a short-lived link; a link is played where it already stands,
 * and the talk it was asked on ends as the person is handed over.
 */
export default function StoryMedia({ story, onPlaybackEnd }) {
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

  if (!story || !story.media_kind || story.media_kind === "none") return null;

  if (loading) {
    return (
      <p className="flex items-center gap-2 font-body text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Opening what was attached…
      </p>
    );
  }

  if (!url) return null;

  if (story.media_kind === "image") {
    return (
      <Image
        src={url}
        alt={story.title}
        fittingType="fit"
        className="w-full rounded-2xl border border-border"
      />
    );
  }

  if (story.media_kind === "video") {
    return (
      <video
        src={url}
        controls
        playsInline
        onEnded={() => onPlaybackEnd?.()}
        className="w-full rounded-2xl border border-border bg-black"
      />
    );
  }

  if (story.media_kind === "audio") {
    return (
      <audio
        src={url}
        controls
        onEnded={() => onPlaybackEnd?.()}
        className="w-full rounded-2xl border border-border bg-card"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        window.open(url, "_blank", "noopener,noreferrer");
        onPlaybackEnd?.();
      }}
      className="flex items-center justify-center gap-2 rounded-2xl border border-accent/50 bg-accent/10 px-4 py-3 font-body text-sm font-semibold text-accent transition active:scale-[0.99]"
    >
      <Play className="h-4 w-4" />
      Play the link · {hostOf(url)}
    </button>
  );
}