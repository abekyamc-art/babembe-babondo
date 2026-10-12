import { useCallback, useRef, useState } from "react";
import { looksLikeMediaTurn, mediaLines, readMediaTurn } from "@/lib/homeMedia";
import { choiceFromOffer, confirmsPiece } from "@/lib/songChoice";

/**
 * The app's own player, on a home call.
 *
 * A play request is read by the app's own selection and the piece it chose stands here, in the app's
 * own player, and is started by the app itself. Pausing it, starting it again, moving on to the
 * artist's next piece and taking it out are all done here too, on what already stands in the player.
 *
 * Two things are never guessed at. A piece is never said to be playing before the player itself
 * reports that it has started — the voice is told only what the app has really done, and it is told
 * plainly that a piece standing in the player has not started. And a call is never ended before the
 * sound has really begun: the moment the player reports that the artist's own set has started, the
 * voice is taken off the line and the set plays on in the app's own player. A piece played in the
 * written chat ends no call, because none is on the line.
 *
 * What the app holds of an artist is a set: the piece the person asked for and the artist's own pieces
 * behind it, brought in and started by the app itself, with the player moving on to each one as it
 * plays out. When the last of the pieces has played out — or the person says stop — the music turn is
 * over and the player is put away.
 *
 * Where more than one of the artist's pieces answers a request equally well, none of them is chosen:
 * the app puts the question to the person, and their next turn answers it — by naming one of the
 * pieces it offered, or by giving its place in the question. Only then does a piece stand in the player
 * and the call end with it.
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
  // The pieces the app's own question offered, while that question stands, and the one piece it named
  // to the person as the piece it was asking about: the person's next turn answers the question — by
  // naming a piece, by giving its place in the question, or by simply saying yes to the one the app
  // asked about — and the piece they answer with is the one the app puts in its own player and starts.
  const offerRef = useRef(null);
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
    // a piece stands in the player, so a question the app had put to the person is answered
    offerRef.current = null;
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
    // the player is put away, so no question the app had put to the person still stands
    offerRef.current = null;
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
      if (readingRef.current) return null;
      // The person's answer to a question the app has already put to them stands before anything else:
      // that question named the pieces it offered, and a turn that names one of them — or gives its
      // place in the question — is that answer. So is a plain yes to the one piece the app named as the
      // piece it was asking about, and that yes plays it. The question is over either way, save where
      // the app could put no single piece to the person: there it is asked again below, in the shape it
      // can be answered in. A turn that answers none of it is read by the app's own selection exactly as
      // it always was.
      const asked = offerRef.current;
      offerRef.current = null;
      const offered = Array.isArray(asked?.list) ? asked.list.filter((one) => one?.url) : [];
      const answer = choiceFromOffer(said, offered);
      if (answer?.url) {
        const behind = offered.filter((one) => one.url && one.url !== answer.url);
        stand({ name: answer.name || "", url: answer.url }, behind, true);
        return say("set", { name: answer.name, count: behind.length });
      }
      // The person's plain yes, and the question the app put to them holds one piece: that piece is the
      // one they mean and the app plays it. Where the app could put no single piece to them, it cannot
      // tell which of them the yes is for: none is chosen, and the question is asked again in the shape
      // it can be answered in — by name, or by the piece's place in the question.
      if (offered.length && confirmsPiece(said)) {
        const one = asked?.one?.url ? asked.one : offered.length === 1 ? offered[0] : null;
        if (one?.url) {
          const behind = offered.filter((item) => item.url && item.url !== one.url);
          stand({ name: one.name || "", url: one.url }, behind, true);
          return say("set", { name: one.name, count: behind.length });
        }
        offerRef.current = { list: offered.slice(0, 3), one: null };
        return say("which", { names: offered.map((item) => item.name).filter(Boolean).slice(0, 3) });
      }
      // A yes while a piece of the artist's own stands in the app's own player, waiting for the person's
      // own press: their yes is what starts it, and the player itself reports when the sound has begun.
      if (
        confirmsPiece(said) &&
        autoRef.current &&
        !startedRef.current &&
        playerRef.current?.play?.()
      ) {
        return say("go", { name: itemRef.current?.name });
      }
      if (!looksLikeMediaTurn(said)) return null;
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
          // The pieces the app offers — the ones answering the request equally well, or the artist's
          // own pieces where the title named answers none of them — stand as the question the app puts
          // to the person, and as what their next turn may answer with.
          const offered = (Array.isArray(result.candidates) ? result.candidates : []).filter(
            (one) => one?.url
          );
          const names = offered.map((one) => one.name).filter(Boolean);
          // More than one of the artist's pieces answers the title equally well: the app cannot tell
          // them apart, so it chooses none of them and puts the question of which one is meant.
          if (result.clash === true && names.length >= 2) {
            offerRef.current = { list: offered.slice(0, 3), one: null };
            return say("ambiguous", { names: names.slice(0, 3) });
          }
          // None of the artist's own pieces answers the title: where the app holds pieces of theirs, the
          // one it holds first stands as the piece it asks the person about — a plain yes to it plays it,
          // and naming any of the others plays that one. Where the app holds none, it only says what it
          // has and the person is left to name a piece.
          const first = offered[0] || null;
          offerRef.current = names.length ? { list: offered.slice(0, 3), one: first } : null;
          return say("none", { channel: result.channel, names, name: first?.name || "" });
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

  /**
   * A piece of the artist's own, picked by hand from the list standing under an answer rather than
   * asked for in words: it is stood in the app's own player and started by the app, with the artist's
   * other listed pieces waiting behind it, exactly as a piece asked for by name is. The app's own line
   * says only what it has done — the player itself reports when the sound has really begun.
   */
  const play = useCallback(
    (chosen, listed = []) => {
      if (!chosen?.url) return false;
      const behind = (Array.isArray(listed) ? listed : []).filter(
        (one) => one?.url && one.url !== chosen.url
      );
      stand({ name: chosen.name || "", url: chosen.url }, behind, true);
      say("set", { name: chosen.name, count: behind.length });
      return true;
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
    const name = itemRef.current?.name || "";
    // A piece standing in the player without having been asked for as the artist's own set has taken no
    // call with it: the app says only that it is playing.
    if (!autoRef.current) return say("started", { name });
    // The set the app itself brought in has really begun, and the music turn owns the talk from here: a
    // set that plays out reopens nothing behind it.
    handedRef.current = true;
    // Whether a call was really on the line for the app to end: a piece played in the written chat has
    // no call to end, and the app claims no such thing.
    const ending = endRef.current?.() !== false;
    if (!ending) return say("started", { name });
    // The call is over the moment the sound has really begun — the person asked to listen on, or simply
    // asked for the piece — and the set plays on in the app's own player, moving on to each of the
    // artist's pieces behind it by itself. Nothing is said to a voice here: there is none left to tell,
    // and the app's own words stand on the screen.
    return say(quietRef.current ? "quietDone" : "hangup", { name }, false);
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
    // a piece of the artist's own picked from the list under an answer, played in the app itself
    play,
    onStart,
    onPlaying,
    onTrackEnd,
    onNext,
    onClose,
  };
}