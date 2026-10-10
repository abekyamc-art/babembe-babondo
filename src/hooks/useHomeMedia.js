import { useCallback, useRef, useState } from "react";
import { looksLikeMediaTurn, mediaLines, readMediaTurn } from "@/lib/homeMedia";

/**
 * The app's own player, on a home call.
 *
 * A play request is read by the app's own selection and the piece it chose stands here, in the app's
 * own player, for the person to press play on. Pausing it, starting it again, moving on to the
 * artist's next piece and taking it out are all done here too, on what already stands in the player.
 *
 * Two things are never guessed at. A piece is never said to be playing before the player itself
 * reports that it has started — the voice is told only what the app has really done, and it is told
 * plainly that a piece standing in the player has not started. And the call goes quiet only where the
 * person asked to listen on, and only once the sound has really begun: taking the voice away never
 * touches the player.
 */
export default function useHomeMedia({ onTell, onEndVoice } = {}) {
  const [item, setItem] = useState(null);
  const [queue, setQueue] = useState([]);
  // the app's own line about its own player
  const [note, setNote] = useState("");
  // the player has been brought in: only then can it be paused or started again
  const [inPlace, setInPlace] = useState(false);
  // the piece is really playing, as the player itself reported it
  const [started, setStarted] = useState(false);
  // the person asked to listen on without more talk
  const [quiet, setQuiet] = useState(false);

  const playerRef = useRef(null);
  const itemRef = useRef(null);
  const queueRef = useRef([]);
  const quietRef = useRef(false);
  const startedRef = useRef(false);
  const readingRef = useRef(false);
  // the voice on the line, where one can be told anything at all, and the call's own end
  const tellRef = useRef(onTell);
  const endRef = useRef(onEndVoice);
  tellRef.current = onTell;
  endRef.current = onEndVoice;

  /** The app's own line about its own player, on the screen and — where it can be told — to the voice. */
  const say = useCallback((step, data = {}) => {
    const lines = mediaLines(step, data);
    setNote(lines.line);
    if (lines.spoken) tellRef.current?.(lines.spoken);
    return lines;
  }, []);

  /** A piece stands in the player, not started. */
  const stand = useCallback((chosen, others) => {
    const next = { name: chosen.name, url: chosen.url };
    itemRef.current = next;
    queueRef.current = Array.isArray(others) ? others : [];
    startedRef.current = false;
    quietRef.current = false;
    setItem(next);
    setQueue(queueRef.current);
    setInPlace(false);
    setStarted(false);
    setQuiet(false);
  }, []);

  /** The player and the piece with it are put away. */
  const clear = useCallback(() => {
    itemRef.current = null;
    queueRef.current = [];
    startedRef.current = false;
    quietRef.current = false;
    setItem(null);
    setQueue([]);
    setInPlace(false);
    setStarted(false);
    setQuiet(false);
  }, []);

  /**
   * One turn, read for what the app's own player should do: the piece the person asked for, or the
   * player paused, started again, moved on or taken out. What the voice is told is the app's own
   * doing, and it is told before it answers, so its answer stands on what really happened.
   */
  const read = useCallback(
    async (said) => {
      if (!looksLikeMediaTurn(said) || readingRef.current) return null;
      readingRef.current = true;
      try {
        const result = await readMediaTurn(said);
        if (!result) return null;

        if (result.intent === "play" || result.intent === "listen") {
          if (result.chosen?.url) {
            stand(result.chosen, result.others);
            if (result.intent === "listen") {
              quietRef.current = true;
              setQuiet(true);
              return say("quiet", { name: result.chosen.name });
            }
            return say("standing", { name: result.chosen.name });
          }
          const names = (Array.isArray(result.candidates) ? result.candidates : [])
            .map((one) => one?.name)
            .filter(Boolean);
          if (names.length >= 2) return say("ambiguous", { names });
          return say("none", { channel: result.channel, names });
        }

        if (result.intent === "next") {
          const rest = queueRef.current;
          if (!rest.length) return say("last");
          const [head, ...tail] = rest;
          itemRef.current = head;
          queueRef.current = tail;
          startedRef.current = false;
          setItem(head);
          setQueue(tail);
          setInPlace(false);
          setStarted(false);
          return say("next", { name: head.name });
        }

        if (result.intent === "pause") {
          if (!playerRef.current?.pause?.()) return say("unready");
          return say("pause");
        }

        if (result.intent === "resume") {
          if (!playerRef.current?.play?.()) return say("unready");
          return say("resume");
        }

        if (result.intent === "stop") {
          // the piece goes out of the player and stays standing, so it can be pressed again
          playerRef.current?.stop?.();
          startedRef.current = false;
          setInPlace(false);
          setStarted(false);
          return say("stop");
        }

        return null;
      } catch (err) {
        return null;
      } finally {
        readingRef.current = false;
      }
    },
    [say, stand]
  );

  /** The person has brought the player in: it can be paused and started again from here on. */
  const onStart = useCallback(() => setInPlace(true), []);

  /**
   * The player itself reports that the sound has really begun. Only now is it said to be playing, and
   * only now — and only where the person asked to listen on — does the voice go quiet.
   */
  const onPlaying = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    setStarted(true);
    if (quietRef.current) {
      say("quietDone", { name: itemRef.current?.name || "" }, false);
      endRef.current?.();
      return;
    }
    say("started", { name: itemRef.current?.name || "" });
  }, [say]);

  /** The next of the artist's own pieces, pressed on the screen. */
  const onNext = useCallback(() => {
    const rest = queueRef.current;
    if (!rest.length) return say("last");
    const [head, ...tail] = rest;
    itemRef.current = head;
    queueRef.current = tail;
    startedRef.current = false;
    setItem(head);
    setQueue(tail);
    setInPlace(false);
    setStarted(false);
    return say("next", { name: head.name });
  }, [say]);

  /** The player is closed by hand: the app's own doing, so nothing is claimed about it. */
  const onClose = useCallback(() => clear(), [clear]);

  return {
    item,
    others: queue.length,
    note,
    inPlace,
    started,
    quiet,
    playerRef,
    read,
    onStart,
    onPlaying,
    onNext,
    onClose,
  };
}