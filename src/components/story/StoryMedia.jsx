import React, { useEffect, useState } from "react";
import { ExternalLink, Loader2, Play } from "lucide-react";
import { Image } from "@/components/ui/image";
import { base44 } from "@/api/base44Client";
import { hostOf } from "@/lib/stories";
import { youtubeVideo } from "@/lib/youtube";
import YouTubePlayer from "@/components/story/YouTubePlayer";

/**
 * The address a picture, a recording or a video came from, standing directly under it and opened
 * only when it is deliberately tapped — so the source is one tap away, and the talk the story was
 * asked on is handed back the moment the person goes there. An uploaded file has no public address
 * of its own, so nothing stands under it.
 */
function SourceLine({ url, onOpen }) {
  if (!url) return null;
  return (
    <button
      type="button"
      onClick={() => {
        window.open(url, "_blank", "noopener,noreferrer");
        onOpen?.();
      }}
      className="flex max-w-full items-center gap-1.5 self-start font-body text-[12px] text-muted-foreground underline decoration-border underline-offset-2 transition hover:text-foreground"
    >
      <span className="truncate">Open the source · {hostOf(url)}</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
    </button>
  );
}

/**
 * One picture, video, audio recording or link, drawn in the place the admin gave it inside a story.
 * An uploaded file lives in the app's own private storage, so it is opened through a short-lived
 * link; an address is used as it stands.
 *
 * Playing what takes the person away from the talk hands the talk back: the call the story was
 * asked on ends the moment the playing is over.
 */
export default function StoryMedia({
  kind,
  url = "",
  uri = "",
  title = "",
  onPlaybackEnd,
}) {
  const [src, setSrc] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    const done = (value) => {
      if (!alive) return;
      setSrc(value || "");
      setLoading(false);
    };

    if (!kind || kind === "none" || (!url && !uri)) {
      setSrc("");
      setLoading(false);
      return () => {
        alive = false;
      };
    }

    // an address is already open to everyone; only a held file needs the short-lived link
    if (url || !uri) {
      setSrc(url || "");
      setLoading(false);
      return () => {
        alive = false;
      };
    }

    setLoading(true);
    base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri })
      .then(({ signed_url }) => done(signed_url))
      .catch(() => done(""));
    return () => {
      alive = false;
    };
  }, [kind, url, uri]);

  if (!kind || kind === "none") return null;

  if (loading) {
    return (
      <p className="flex items-center gap-2 font-body text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Opening what was attached…
      </p>
    );
  }

  if (!src) return null;

  if (kind === "image") {
    return (
      <div className="flex flex-col gap-1.5">
        <Image
          src={src}
          alt={title}
          fittingType="fit"
          className="w-full rounded-2xl border border-border"
        />
        <SourceLine url={url} onOpen={onPlaybackEnd} />
      </div>
    );
  }

  // A YouTube address is played right here in the story, with its own sound, whether the admin put
  // it in as a video or as a link: either way it is watched inside the app, never sent away.
  if ((kind === "video" || kind === "link") && youtubeVideo(src)) {
    return <YouTubePlayer url={src} title={title} onPlaybackEnd={onPlaybackEnd} />;
  }

  if (kind === "video") {
    return (
      <div className="flex flex-col gap-1.5">
        <video
          src={src}
          controls
          playsInline
          onEnded={() => onPlaybackEnd?.()}
          className="w-full rounded-2xl border border-border bg-black"
        />
        <SourceLine url={url} onOpen={onPlaybackEnd} />
      </div>
    );
  }

  if (kind === "audio") {
    return (
      <div className="flex flex-col gap-1.5">
        <audio
          src={src}
          controls
          onEnded={() => onPlaybackEnd?.()}
          className="w-full rounded-2xl border border-border bg-card"
        />
        <SourceLine url={url} onOpen={onPlaybackEnd} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        window.open(src, "_blank", "noopener,noreferrer");
        onPlaybackEnd?.();
      }}
      className="flex items-center justify-center gap-2 rounded-2xl border border-accent/50 bg-accent/10 px-4 py-3 font-body text-sm font-semibold text-accent transition active:scale-[0.99]"
    >
      <Play className="h-4 w-4" />
      Play the link · {hostOf(src)}
    </button>
  );
}