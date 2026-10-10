import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ExternalLink, Play, X } from "lucide-react";
import { Image } from "@/components/ui/image";
import { youtubeVideo } from "@/lib/youtube";
import { hostOf } from "@/lib/stories";

/**
 * A YouTube video standing inside a story.
 *
 * It rests as its own cover — the picture YouTube itself uses — with a play sign on it, and the
 * address it came from written underneath. Tapping the cover brings the player in right here, in the
 * story's own place, with no autoplay asked for at all: YouTube is handed the video's own id, full
 * controls, and the page the player is standing in, because a player that arrives without that page
 * is the one YouTube turns away with a configuration error. The player carries its own play sign and
 * its own volume, and it is started
 * from there — a press inside the player itself — because a player made to start on its own is the
 * very one browsers silence. Started that way it speaks with its sound, and the stop beside the link
 * takes it away completely, so the telling keeps the place it had.
 *
 * If YouTube still refuses to play it here — a video its owner has kept off other pages, or a browser
 * that will not allow it — the link underneath opens the same video on YouTube, where it plays.
 *
 * The link underneath is the only way out: it is opened only when it is deliberately tapped, and
 * what took the person away from the talk hands the talk back.
 *
 * The player also answers the app itself, because a call may ask for the piece in it to be paused,
 * started again or taken out: `pause`, `play` and `stop` are handed to the player through the ref,
 * and only the player's own report of what it is doing — never a guess — is what the app tells a
 * voice, so nothing is ever said to be playing before the sound has really begun.
 */
const YouTubePlayer = forwardRef(function YouTubePlayer(
  { url, title = "", onPlaybackEnd, onPlaybackStart, onPlaying, onTrackEnd, autoStart = false },
  ref
) {
  // the player is told which page it is standing in, so YouTube can recognise the address it is on
  const video = youtubeVideo(url, typeof window === "undefined" ? "" : window.location.origin);
  const [playing, setPlaying] = useState(false);
  const frameRef = useRef(null);
  const playingRef = useRef(onPlaying);
  playingRef.current = onPlaying;
  const endedRef = useRef(onTrackEnd);
  endedRef.current = onTrackEnd;
  // the piece that has already been reported as played out, so one end is never told twice
  const endedFor = useRef("");
  // the piece the app itself has already brought in, so a stop by hand is never overruled
  const broughtRef = useRef("");
  const autoRef = useRef(autoStart);
  autoRef.current = autoStart;
  const videoIdRef = useRef("");
  videoIdRef.current = video?.id || "";

  /** One of YouTube's own commands, handed to the frame it belongs to. */
  const command = (func, args = []) => {
    const frame = frameRef.current;
    if (!frame?.contentWindow) return false;
    frame.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "*");
    return true;
  };

  useImperativeHandle(
    ref,
    () => ({
      // the player is standing: nothing can be paused or started before it is
      standing: () => !!frameRef.current,
      pause: () => command("pauseVideo"),
      play: () => command("playVideo"),
      // taking it out is the only honest stop: the frame goes, the cover stays
      stop: () => setPlaying(false),
    }),
    []
  );

  /**
   * What the player itself says it is doing. YouTube reports it to the page the player stands in, and
   * that report — a played video, or a paused one — is the only thing the app takes as true.
   */
  useEffect(() => {
    if (!playing) return undefined;
    const onMessage = (event) => {
      const from = String(event?.origin || "").replace(/^https?:\/\//, "");
      if (!/(^|\.)youtube(-nocookie)?\.com$/.test(from)) return;
      let data = event.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (err) {
          return;
        }
      }
      const state =
        typeof data?.info === "number" && data?.event === "onStateChange"
          ? data.info
          : typeof data?.info?.playerState === "number"
            ? data.info.playerState
            : null;
      if (state === 1) {
        playingRef.current?.();
        // The sound is asked for once more the moment the piece is really playing: a player that came
        // up muted is the one nobody hears, and the app's own set is meant to be heard.
        if (autoRef.current) {
          command("unMute");
          command("setVolume", [100]);
        }
        return;
      }
      // The piece has played out. The app is told once for each piece, so the artist's own set moves on
      // to the piece behind it rather than the same end being reported again.
      if (state === 0 && endedFor.current !== videoIdRef.current) {
        endedFor.current = videoIdRef.current;
        endedRef.current?.();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [playing]);

  /**
   * A piece of the artist's own set is brought in by the app itself: the frame arrives with no press on
   * the cover, and the piece is started from inside it once it has loaded. The piece the app already
   * brought in is remembered, so a person who stops it by hand is never overruled by the app.
   */
  useEffect(() => {
    if (!autoStart || !video?.id || broughtRef.current === video.id) return;
    broughtRef.current = video.id;
    setPlaying(true);
    onPlaybackStart?.();
  }, [autoStart, video?.id, onPlaybackStart]);

  if (!video) return null;

  const stop = (handBack) => {
    setPlaying(false);
    if (handBack) onPlaybackEnd?.();
  };

  const leave = () => {
    // the video is put away before the address is opened, so no sound is left playing behind it
    setPlaying(false);
    window.open(video.watch, "_blank", "noopener,noreferrer");
    onPlaybackEnd?.();
  };

  return (
    <div className="flex flex-col gap-2">
      {playing ? (
        <div className="w-full overflow-hidden rounded-2xl border border-border bg-black">
          <iframe
            ref={frameRef}
            src={video.embed}
            title={title || "YouTube video"}
            allow="autoplay; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
            // the player is told where it is standing, so a page that asks for a known address is given one
            referrerPolicy="strict-origin-when-cross-origin"
            // the frame is told the page is listening, which is how it starts reporting what it does
            onLoad={() => {
              const frame = frameRef.current;
              frame?.contentWindow?.postMessage(JSON.stringify({ event: "listening" }), "*");
              // A piece of the artist's own set begins here, started by the app and not by a press: the
              // sound is asked for plainly — unmuted, at full volume — and the piece is set going.
              if (autoStart) {
                command("unMute");
                command("setVolume", [100]);
                command("playVideo");
              }
            }}
            className="aspect-video w-full"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setPlaying(true);
            // the player is in place now, and that is the only thing the app claims here
            onPlaybackStart?.();
          }}
          aria-label="Show the YouTube video here"
          className="group relative block w-full overflow-hidden rounded-2xl border border-border bg-black"
        >
          <Image
            src={video.cover}
            alt={title}
            fittingType="fill"
            className="aspect-video w-full object-cover opacity-90"
          />
          <span className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-background/90 shadow-lg transition group-active:scale-95">
              <Play className="h-6 w-6 translate-x-[1px] fill-foreground text-foreground" />
            </span>
          </span>
        </button>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={leave}
          className="flex min-w-0 items-center gap-2 font-body text-[12px] text-muted-foreground underline decoration-border underline-offset-2 transition hover:text-foreground"
        >
          <span className="truncate">Watch on YouTube · {hostOf(video.watch)}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        </button>

        {playing ? (
          <button
            type="button"
            onClick={() => stop(true)}
            className="flex flex-none items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-body text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Stop
          </button>
        ) : null}
      </div>

      {playing ? (
        <span className="font-body text-[11px] leading-snug text-muted-foreground">
          Press play on the video itself — it plays here with its sound, and its own volume. If
          YouTube keeps it from playing here, the Watch on YouTube line above opens the same video
          where it does play.
        </span>
      ) : null}
    </div>
  );
});

export default YouTubePlayer;