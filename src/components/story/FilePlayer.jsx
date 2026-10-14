import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { AlertCircle, Play } from "lucide-react";

/**
 * A recording the app holds, played in the app itself.
 *
 * It rests as its own face — the piece's name on a dark cover with a play sign on it — and the player
 * is brought in by a press there, with the player's own controls under it. Where the piece was asked
 * for as the artist's own, the app brings the player in and starts it by itself and the person presses
 * nothing.
 *
 * Nothing is ever claimed before it is true: `onPlaying` is said only when the player itself reports
 * that the sound has really begun, a piece that has played out is reported once, and a recording that
 * cannot be played here says so plainly in its own place rather than being left standing as though it
 * were playing. The app's own `pause`, `play` and `stop` are always met with the truth of what the
 * player could do, so nothing is ever said to a voice that the app has not really done.
 */
const FilePlayer = forwardRef(function FilePlayer(
  { src, title = "", autoStart = false, onPlaybackEnd, onPlaybackStart, onPlaying, onTrackEnd },
  ref
) {
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  // the phone held the sound back when the app started the piece by itself: the cover comes back with
  // its own play sign rather than a silent player standing as though it were playing
  const [held, setHeld] = useState(false);
  const elementRef = useRef(null);
  const playingRef = useRef(onPlaying);
  const endedRef = useRef(onTrackEnd);
  playingRef.current = onPlaying;
  endedRef.current = onTrackEnd;
  // the piece the app itself has already brought in, so a piece stopped by hand is never overruled
  const broughtRef = useRef("");
  const name = String(title || "").trim() || String(src || "").split("/").pop();

  useImperativeHandle(
    ref,
    () => ({
      // the player is standing: nothing can be paused or started before it is
      standing: () => !!elementRef.current,
      pause: () => {
        const element = elementRef.current;
        if (!element) return false;
        element.pause();
        return true;
      },
      play: () => {
        const element = elementRef.current;
        if (!element) return false;
        element.play()?.catch(() => {});
        return true;
      },
      // taking it out is the only honest stop: the player goes, the piece is put away
      stop: () => {
        elementRef.current?.pause();
        setPlaying(false);
      },
    }),
    []
  );

  /**
   * A piece of the artist's own set: the app brings it in by itself, with no press on the cover — the
   * player starts it as soon as it can, and reports that the sound has really begun.
   */
  useEffect(() => {
    if (!autoStart || !src || broughtRef.current === src) return;
    broughtRef.current = src;
    setPlaying(true);
    onPlaybackStart?.();
  }, [autoStart, src, onPlaybackStart]);

  return (
    <div className="flex flex-col gap-2">
      {playing ? (
        <div className="w-full overflow-hidden rounded-2xl border border-border bg-black">
          <video
            ref={elementRef}
            src={src}
            title={name}
            controls
            playsInline
            autoPlay={autoStart}
            onCanPlay={(event) => {
              // A piece of the artist's own set begins here, started by the app and not by a press. A
              // phone that holds the sound back is never left standing as though it were playing: the
              // cover comes back with its play sign, and the line under it says what happened.
              if (!autoStart) return;
              event.currentTarget.play()?.catch(() => {
                setPlaying(false);
                setHeld(true);
              });
            }}
            onPlaying={() => playingRef.current?.()}
            onEnded={() => endedRef.current?.()}
            onError={() => {
              // a recording that cannot be played here is said so, never left standing as though playing
              setPlaying(false);
              setFailed(true);
            }}
            className="aspect-video w-full"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setFailed(false);
            setHeld(false);
            setPlaying(true);
            // the player is in place now, and that is the only thing the app claims here
            onPlaybackStart?.();
          }}
          aria-label={`Play ${name}`}
          className="group relative block w-full overflow-hidden rounded-2xl border border-border bg-black"
        >
          <span className="grid aspect-video w-full place-items-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-background/90 shadow-lg transition group-active:scale-95">
              <Play className="h-6 w-6 translate-x-[1px] fill-foreground text-foreground" />
            </span>
          </span>
          <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-3 py-2 font-body text-[12px] text-background">
            {name}
          </span>
        </button>
      )}

      {failed ? (
        <span className="flex items-center gap-1.5 font-body text-[11px] leading-snug text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5 flex-none" />
          This piece could not be played here, so nothing was started.
        </span>
      ) : null}

      {held ? (
        <span className="flex items-center gap-1.5 font-body text-[11px] leading-snug text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5 flex-none" />
          Your phone held the sound back — press play to hear it here.
        </span>
      ) : null}

      {playing ? (
        <button
          type="button"
          onClick={() => {
            elementRef.current?.pause();
            setPlaying(false);
            onPlaybackEnd?.();
          }}
          className="flex w-fit items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-body text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition hover:text-foreground"
        >
          Stop
        </button>
      ) : null}
    </div>
  );
});

export default FilePlayer;