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
 *
 * What the app holds of an artist is a set: the piece the person asked for and the artist's own pieces
 * behind it, brought in and started by the app itself, with the player moving on to each one as it
 * plays out. The moment the set has really begun, the AI caller's own call is over: it is hung up and
 * the talk is handed to the voice that speaks Base44 mode, which takes the person on from there while
 * the set plays on in the app's own player. When the last of the pieces has played out — or the person
 * says stop — the music turn is over and the player is put away.
 */
export default function useHomeMedia({ onTell, onEndVoice, onHandoff } = {}) {
  const [item, setItem] = useState(null);
  const [queue, setQueue] = useState([]);
  // The piece standing belongs to the artist's own set: the app starts it by itself, and the pieces
  // still waiting behind it are brought in one after the other as each one plays out.
  const [auto, setAuto] = useState(false);
  // the app's own line about its own player
  const [note, setNote] = useState("");
  // the player has been brought in: only then can it be paused or started again
  const [inPlace, setInPlace] = useState(false);
  // the piece is really playing, as the player itself reported it
  const [started, setStarted] = useState(false);
  // the person asked to listen on without more talk
  const [quiet, setQuiet] = useState(false);
  // The artist's own set has really begun and the talk is in Base44 AI's hands: it is the one handling
  // the set now. It stands until a call of the person's own takes the talk back.
  const [ready, setReady] = useState(false);

  const playerRef = useRef(null);
  const itemRef = useRef(null);
  const queueRef = useRef([]);
  const quietRef = useRef(false);
  const startedRef = useRef(false);
  const readingRef = useRef(false);
  // the piece standing was asked for as the artist's own set
  const autoRef = useRef(false);
  // the artist's own set has been handed to Base44 AI: it is handed over once, however many pieces of
  // it follow the one that began it
  const handedRef = useRef(false);
  // the voice on the line, where one can be told anything at all, and the call's own end
  const tellRef = useRef(onTell);
  const endRef = useRef(onEndVoice);
  // the music turn is over: the artist's set has ended, or the person has said stop
  const handoffRef = useRef(onHandoff);
  tellRef.current = onTell;
  endRef.current = onEndVoice;
  handoffRef.current = onHandoff;

  /**
   * The app's own line about its own player, on the screen and — where it can be told — to the voice.
   * A line about something the voice on the line is not to be told is written on the screen alone: the
   * piece that has just begun is said to the voice taking the call, never to the one leaving it.
   */
  const say = useCallback((step, data = {}, toVoice = true) => {
    const lines = mediaLines(step, data);
    setNote(lines.line);
    if (toVoice && lines.spoken) tellRef.current?.(lines.spoken);
    return lines;
  }, []);

  /**
   * A piece stands in the player. Where it was asked for as the artist's own set, the app brings it in
   * and starts it by itself, with the artist's other pieces waiting behind it; where it was not, it
   * waits for the person's own press exactly as it always has.
   */
  const stand = useCallback((chosen, others, played = false) => {
    const next = { name: chosen.name, url: chosen.url };
    itemRef.current = next;
    queueRef.current = Array.isArray(others) ? others : [];
    startedRef.current = false;
    quietRef.current = false;
    autoRef.current = played === true;
    // a set the app has just put in its own player has not been handed to anyone yet
    handedRef.current = false;
    setItem(next);
    setQueue(queueRef.current);
    setInPlace(false);
    setStarted(false);
    setQuiet(false);
    setAuto(autoRef.current);
  }, []);

  /** The player and the piece with it are put away. */
  const clear = useCallback(() => {
    itemRef.current = null;
    queueRef.current = [];
    startedRef.current = false;
    quietRef.current = false;
    autoRef.current = false;
    handedRef.current = false;
    setItem(null);
    setQueue([]);
    setInPlace(false);
    setStarted(false);
    setQuiet(false);
    setAuto(false);
  }, []);

  /**
   * The next of the artist's own pieces, wherever the ask for it came from: the player moved on by the
   * person's own word, or by the piece before it playing out. Returns whether there was one to move to.
   */
  const step = useCallback(() => {
    const rest = queueRef.current;
    if (!rest.length) return false;
    const [head, ...tail] = rest;
    itemRef.current = head;
    queueRef.current = tail;
    startedRef.current = false;
    setItem(head);
    setQueue(tail);
    setInPlace(false);
    setStarted(false);
    say("next", { name: head.name, auto: autoRef.current });
    return true;
  }, [say]);

  /**
   * The artist's own set is over — the last of the pieces has played out, or the person has said stop:
   * the player is put away and the app says so in its own words. Nothing is handed anywhere here: the
   * talk went to Base44 AI the moment the set really began, so a set that has played out leaves the
   * call exactly where it stands. A person who asked to listen on has already had the voice taken away
   * as well — and a set that was never really begun, and so was never handed to anyone, gives the talk
   * to the voice that speaks Base44 mode right here, exactly as it always did.
   */
  const finishSet = useCallback(
    (line = "setDone") => {
      const listening = quietRef.current;
      // the set standing in the player was handed to Base44 AI when it really began
      const handed = handedRef.current;
      clear();
      say(line);
      if (!listening && !handed) handoffRef.current?.();
    },
    [clear, say]
  );

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
            // the artist's own set: the piece asked for, and the artist's own pieces behind it
            const behind = (Array.isArray(result.others) ? result.others : []).filter(
              (one) => one?.url
            );
            stand(result.chosen, behind, true);
            if (result.intent === "listen") {
              quietRef.current = true;
              setQuiet(true);
              return say("quiet", { name: result.chosen.name });
            }
            return say("set", { name: result.chosen.name, count: behind.length });
          }
          const names = (Array.isArray(result.candidates) ? result.candidates : [])
            .map((one) => one?.name)
            .filter(Boolean);
          if (names.length >= 2) return say("ambiguous", { names });
          return say("none", { channel: result.channel, names });
        }

        if (result.intent === "next") {
          // Nothing of the app's own is standing in the player, so the turn is not about the music at
          // all: the voice holding the call answers it exactly as it always did.
          if (!itemRef.current) return null;
          if (step()) return null;
          // nothing is left behind the piece standing: the artist's own set is over
          return finishSet();
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
          // Nothing of the app's own is standing in the player, so a stop is not about the music: the
          // voice holding the call answers it, and the talk keeps the voice it has.
          if (!itemRef.current) return null;
          // The person has said stop: the music turn ends here, and the talk moves on from AI 1 to the
          // voice that speaks Base44 mode rather than the piece being left standing over the call.
          return finishSet("stop");
        }

        return null;
      } catch (err) {
        return null;
      } finally {
        readingRef.current = false;
      }
    },
    [finishSet, say, stand, step]
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
    const name = itemRef.current?.name || "";
    // The artist's own set has really begun, and that is where the AI caller's own call ends: the talk
    // is handed to the voice that speaks Base44 mode, which takes the person on from there. The set
    // plays on in the app's own player while Base44 AI answers them and finds whatever else they ask
    // for. The app's own line about its player is not said to the voice leaving the call: it is said to
    // the voice that takes it, once that voice is on the line.
    if (autoRef.current && !handedRef.current) {
      handedRef.current = true;
      setReady(true);
      const said = say("started", { name }, false).spoken;
      Promise.resolve(handoffRef.current?.())
        .then(() => {
          if (said) tellRef.current?.(said);
        })
        .catch(() => {
          // a change that could not be finished never takes the piece or the talk with it
        });
      return;
    }
    say("started", { name });
  }, [say]);

  /** The next of the artist's own pieces, pressed on the screen. */
  const onNext = useCallback(() => {
    if (step()) return true;
    return say("last");
  }, [say, step]);

  /**
   * The player itself reports that the piece standing in it has played out. The artist's own set moves
   * on to the piece behind it by itself — under Base44 AI, which took the talk the moment the set
   * began; where none is left, the music turn is over and the player is put away.
   */
  const onTrackEnd = useCallback(() => {
    if (step()) return;
    finishSet();
  }, [finishSet, step]);

  /** The player is closed by hand: the app's own doing, so nothing is claimed about it. */
  const onClose = useCallback(() => clear(), [clear]);

  /**
   * A call of the person's own has been opened over the artist's own set, so the talk is theirs again:
   * Base44 AI has stood down. The set still playing is never handed over a second time — only a set the
   * app puts in its own player afresh goes to Base44 AI again.
   */
  const reset = useCallback(() => setReady(false), []);

  return {
    item,
    // the artist's own pieces still waiting behind the one standing, in the order they play
    queue,
    others: queue.length,
    note,
    inPlace,
    started,
    quiet,
    // the artist's own set is in Base44 AI's hands, which is what the screen says once a call of the
    // person's own has taken the talk back
    ready,
    reset,
    // the piece standing was asked for as the artist's own set: it is brought in and started by the
    // app, and the player moves on to the piece behind it when it plays out
    autoStart: auto,
    playerRef,
    read,
    onStart,
    onPlaying,
    onTrackEnd,
    onNext,
    onClose,
  };
}