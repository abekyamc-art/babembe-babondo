import { useCallback, useEffect, useRef, useState } from "react";
import { StudioPlayer, loadMissing } from "@/lib/studioEngine";

const EMPTY = { tracks: {}, master: { rms: 0, peak: 0 } };

/**
 * Hearing the song. The engine owns the sound and the phone's own clock keeps the time, so the
 * playhead follows the music and the timeline can go on drawing itself while the song plays without
 * ever interrupting what is heard.
 */
export default function useStudioPlayback(project) {
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [levels, setLevels] = useState(EMPTY);
  const [missing, setMissing] = useState([]);
  const [error, setError] = useState("");

  const player = useRef(null);
  const frame = useRef(0);
  const live = useRef(project);
  live.current = project;

  const stopClock = () => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
  };

  const stop = useCallback(() => {
    stopClock();
    if (player.current) {
      const at = player.current.stop();
      player.current = null;
      setPosition(at);
    }
    setPlaying(false);
    setLevels(EMPTY);
  }, []);

  useEffect(() => () => {
    cancelAnimationFrame(frame.current);
    player.current?.stop();
    player.current = null;
  }, []);

  const runClock = useCallback(() => {
    stopClock();
    let drawn = 0;
    const tick = () => {
      const engine = player.current;
      if (!engine) return;
      const at = engine.position();
      const now = performance.now();
      // the playhead is drawn briskly; the meters are read a little less often than the eye needs
      if (now - drawn > 45) {
        drawn = now;
        setPosition(at);
        setLevels(engine.levels());
      }
      if (!engine.playing || at >= engine.endAt) {
        const end = engine.endAt;
        engine.stop();
        player.current = null;
        setPlaying(false);
        setLevels(EMPTY);
        setPosition(end);
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, []);

  /** Playing, from wherever the playhead stands unless another place is named. */
  const play = useCallback(
    async (from = null) => {
      const song = live.current;
      if (!song) return;
      const at = Math.max(0, from ?? position);
      try {
        const gone = await loadMissing(song);
        setMissing(gone);
        player.current?.stop();
        const engine = new StudioPlayer(song);
        await engine.start(at);
        player.current = engine;
        setPlaying(true);
        setError("");
        runClock();
      } catch (err) {
        setError(err?.message || "The song could not be played.");
        setPlaying(false);
      }
    },
    [position, runClock]
  );

  const pause = useCallback(() => stop(), []);

  /** The playhead moved by hand: the song starts again from the place it was put. */
  const seek = useCallback(
    (seconds) => {
      const at = Math.max(0, Number(seconds) || 0);
      setPosition(at);
      if (player.current) play(at);
    },
    [play]
  );

  return { playing, position, levels, missing, error, play, pause, stop, seek };
}