import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import VoiceSocket from "@/lib/elevenLabsSocket";
import { primedAudio, primeAudio, resumeAudioOnTouch } from "@/lib/audioUnlock";
import { primeMic } from "@/lib/micAccess";
import { FIRST_TALK } from "@/lib/talkRotation";
import { openHearingNote, readHeardTurn } from "@/lib/homeHearing";
import { loadFreshMaterial, loadTurnPictures } from "@/lib/knowledge";
import { SAY_AGAIN_KIBEMBE, SAY_AGAIN_TURN, isMisheard, isRealTurn } from "@/lib/misheardSpeech";
import { saveLangMode } from "@/lib/langMode";
import { heardLanguage } from "@/lib/heardLanguage";
import { noteVoiceTurn } from "@/lib/kpiEvents";
import { LANGS_NOTICE } from "@/lib/languageGate";

/**
 * One of the older talk AIs on the home page's call. Each is opened on its own account — its own key,
 * its own agent, its own knowledge — so a handoff is a change of AI and never a voice speaking on
 * another AI's account. It hears the person itself and answers out loud, and every finished answer is
 * handed to whoever is counting them, so the handover on to the next AI follows the count the calls
 * have always used.
 *
 * A written question is put to it as well: sent into the call that is open, or answered on a short
 * session of its own when no call is running.
 */

const NO_REACH = "That voice couldn't be reached. Please try again.";
const TOUCH_TO_HEAR = "Tap the screen to let the sound through.";
const COULD_NOT_ASK = "That voice couldn't answer just now. Please try again.";
const TURN_NOT_DELIVERED = "That turn didn't reach the voice — say it again.";
// a written question that ends with no answer at all is said plainly: the words would otherwise sit
// on the screen with nothing after them, which reads as the app having gone quiet
const NO_WRITTEN_ANSWER = "That voice didn't answer — try again in a moment.";
// A written turn is answered by the app's own assistant, which is only reachable by a signed-in
// person: a guest is told plainly rather than left with a line nobody answered.
const UNAUTHORIZED = "Unauthorized";
const SIGN_IN_TO_ASK = "Sign in and I'll answer you in writing — the call still answers out loud.";
// A turn the app's own knowledge holds nothing of is answered as it stands: ordinary talk is not a
// mishearing, and asking for a knowledge match before answering is what left ordinary talk unanswered.

export default function useTalkVoice({ onTurn, onPictures, onDropTurn, onMedia } = {}) {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // the turn the app is not sure of: its writing stands on the screen, and nothing is put to the voice
  // until the person says the writing is right, or says the turn again
  const [check, setCheck] = useState(null);
  const levelRef = useRef(0);

  const socketRef = useRef(null);
  const activeRef = useRef(false);
  const speakingRef = useRef(false);
  // a call is opening right now: a tap that lands on it never opens a second one
  const startingRef = useRef(false);
  const offTouchRef = useRef(null);
  // The talk AI the call is open on, so the written turn and a call that ends on its own both name
  // the same one — the first talk AI until a call names another.
  const slotRef = useRef({ ...FIRST_TALK });
  // the line the AI said last, so a correction on the next turn is read against it
  const lastAgentRef = useRef("");
  // an answer given on the call that is open and one given to a written turn are charged through the
  // handler each was asked with, never through one another's
  const liveAnsweredRef = useRef(null);
  const writtenAnsweredRef = useRef(null);
  // the same for the end of an answer on the live call: a change it asked for is sent there
  const liveSpokeRef = useRef(null);
  // a call the service ended by itself is reported through here, so the turn it leaves behind is
  // never lost
  const endedRef = useRef(null);
  // a turn this voice took and never began answering is reported through here, so it can be handed
  // on to the next voice service instead of the person waiting on a line that has gone quiet
  const stuckRef = useRef(null);
  const turnRef = useRef(onTurn);
  turnRef.current = onTurn;
  // the turn held for the person's own word, kept in a ref because the handlers that read it were
  // handed to the call as it opened
  const checkRef = useRef(null);
  // a held turn the person has set aside is taken off the screen, so a writing nobody said does not
  // stand in the talk as though it were theirs
  const dropTurnRef = useRef(onDropTurn);
  dropTurnRef.current = onDropTurn;
  // What a turn asks of the app's own player, reported through here the moment the turn is read, so a
  // piece the app has chosen is standing in its own player before the voice is told anything of it.
  const mediaRef = useRef(onMedia);
  mediaRef.current = onMedia;
  // the pictures of an answer are handed over through here the moment they are found
  const picturesRef = useRef(onPictures);
  picturesRef.current = onPictures;
  // the person's own last turn, so the answer it brings is read against the admin's own pictures
  const lastUserRef = useRef("");
  // whether the reply being heard right now was cut for a language this app does not speak: such a turn
  // is reported as one that was not answered, so the app's own line that takes its place is never charged
  // for as though the person had been answered
  const blockedRef = useRef(false);
  // where the material looked up for a turn came from, waiting for the answer that stands on it
  const freshSourceRef = useRef(null);
  // the artist's own most watched videos found for a turn, waiting for the answer that names them
  const videosRef = useRef([]);
  // The several different people or artists found under names that look alike, waiting on the
  // person's answer: they stand on the answer that asks which one is meant, and ride back in with
  // the turn that chooses between them, so the one they chose is the one that is looked up.
  const askedRef = useRef([]);
  // ...the same names on their way to that answer
  const choicesRef = useRef([]);

  const push = useCallback(
    (role, text, pictures, source, choices, videos) =>
      turnRef.current?.(role, text, pictures, source, choices, videos),
    []
  );

  const backToListening = useCallback(() => {
    if (!activeRef.current) return;
    setStatus(speakingRef.current ? "speaking" : "listening");
  }, []);

  /** The call is gone: the screen goes back to its own rest. */
  const finish = useCallback(() => {
    activeRef.current = false;
    speakingRef.current = false;
    liveSpokeRef.current = null;
    socketRef.current = null;
    levelRef.current = 0;
    // a call that is gone holds nothing: the writing waiting on the person's own word goes with it
    checkRef.current = null;
    setCheck(null);
    if (offTouchRef.current) {
      offTouchRef.current();
      offTouchRef.current = null;
    }
    setActive(false);
    setStatus("idle");
  }, []);

  /** A session the service closed itself, with the call already picked up, is said plainly. */
  const handleStatus = useCallback(
    (next) => {
      if (next === "live") {
        setStatus("listening");
        return;
      }
      if (next !== "closed" && next !== "ended") return;
      if (!activeRef.current) return;
      const label = slotRef.current.label;
      finish();
      setNotice(`${label}'s call ended. Tap the phone to talk again.`);
      // the call ended on its own: whoever is counting the turns decides whether the same AI waits
      // behind the next tap or the ring moves on
      endedRef.current?.();
    },
    [finish]
  );

  /** The person's own turn, as the agent wrote it down. */
  const handleUserText = useCallback(
    (text) => {
      const said = String(text || "").trim();
      if (!said) return;
      // A breath of the room written down as words is not a turn of the person's: nothing is shown
      // and nothing is asked from it, and they are simply asked to say it again. This is the reading
      // the call falls back on where the app's own ears could not take the turn.
      if (!isRealTurn(said)) {
        setNotice(SAY_AGAIN_TURN);
        return;
      }
      // Sometimes the ears write a language nobody on this call speaks — a guess at some other
      // script altogether. Those are not the person's words and nothing is read from them: the turn
      // is asked for once more, and the Kibembe they really said is what comes back.
      if (isMisheard(said)) {
        setNotice(SAY_AGAIN_KIBEMBE);
        return;
      }
      setNotice("");
      lastUserRef.current = said;
      push("user", said);
      // a fresh turn is its own: whether the turn before it was cut for its language has nothing to do
      // with the answer coming for this one
      blockedRef.current = false;
      // The app's own reading of the turn rides with it: the confirmed Kibembe word or phrase the
      // sound belongs to is handed to the voice before it answers, so a sound the ears were unsure
      // of is answered from the app's own word bank and in Kibembe. A correction the person makes
      // is saved as the same turn is read. A reading that cannot be made leaves the turn to the
      // voice itself, which is already carrying the rules of the call.
      readHeardTurn(said, lastAgentRef.current).then(({ note, mode }) => {
        // the person may have plainly asked for another language: it stands from this turn on, in this
        // call and in every later one, and the reading rode back with the rule for it already
        if (mode) saveLangMode(mode);
        if (note) socketRef.current?.sendMemory(note);
      });
      // The app's own player is asked about the turn here as well. This is the path a turn takes where
      // the app's own ears could not write it down and the call's own service did: a piece asked for
      // there is put in the app's own player exactly as any other ask is — the piece really stands in
      // the player, the app's own line really stands on the screen, and the pieces the app holds out
      // really stand to be pressed — instead of a request for a song passing with nothing on the screen
      // at all. What the app has really done is told to the voice as it comes, never guessed at.
      Promise.resolve(mediaRef.current?.(said)).then((done) => {
        if (done?.spoken) socketRef.current?.sendMemory(done.spoken);
      });
    },
    [push]
  );

  /**
   * The app's own ears have written the person's turn down. What they come back with is what the
   * screen shows and what the AI is handed — never the room itself — so the Kibembe the person said
   * is the Kibembe that is answered, in the app's own spelling, whichever voice is on the call.
   *
   * The service behind every voice here knows no Kibembe at all and writes a Kibembe turn as the
   * English or Kiswahili words it nearly sounds like; the app's own ears are pointed at the person's
   * own saved words and expressions instead, so the letters come back as the app already holds them.
   */
  /**
   * The turn is put to the voice: what had to be looked up for it rides in first, then the words
   * themselves, then what the writing is — the app's own spelling of the person's own words, or their
   * own words where they put the writing right.
   */
  const handOn = useCallback(async (socket, said, language, wrong = "", ready = null) => {
    // A turn that asks about the world — who someone is, their songs, their history, a piece of
    // news, a story — is looked up before it is put to the voice, and what was found rides into
    // the call with the words. So the voice answers from what was really found, names where it
    // came from, and says plainly what could not be confirmed, instead of answering that it does
    // not know the person. Where the material has already been looked up alongside the reading of
    // the sound, it is used exactly as it stands: the words are then put to the voice without
    // waiting on a second lookup of the same turn.
    const fresh = ready || (await loadFreshMaterial(said, askedRef.current));
    // the names the person was offered are settled by this turn: what the lookup puts forward now
    // is what stands before them next
    const choices = Array.isArray(fresh.candidates) ? fresh.candidates : [];
    askedRef.current = choices.length >= 2 ? choices : [];
    choicesRef.current = askedRef.current;
    if (fresh.material) socket.sendMemory(fresh.material);
    // where that material came from is kept for the answer that stands on it, so the screen can
    // show the source of what the voice says
    if (fresh.material && fresh.source) freshSourceRef.current = fresh.source;
    // the artist's own videos found for this turn wait for the answer that names them, so the screen
    // can stand the same five under it — and a turn about nobody at all clears them
    videosRef.current = Array.isArray(fresh.videos) ? fresh.videos : [];
    // The ears write the turn down in the app's own spelling of the person's own words, and the
    // reader names no language for it: Kibembe is what is read here. So the note goes in as what
    // the writing is, never as a command, and the answer that feeds on it stays Kibembe.
    const heard = heardLanguage(language);
    socket.sendMemory(
      wrong
        ? `The app's own ears wrote this turn down wrongly, and the person has put their own words in place of the writing: "${said}" is what was said, and "${wrong}" is what the ears made of it. Answer their own words, in the language they are said in — never the earlier writing of them.`
        : heard
          ? `The person's turn was written down by the app's own ears, in the app's own spelling of their words, as ${heard}. Read their own words: if they are Kibembe, answer in Kibembe only; if they are ${heard}, answer in ${heard} only — never in a mix; where their words mix Kibembe and Kiswahili, answer in Kibembe only; where they plainly ask for a language, answer in that one only.`
          : "The person's turn was written down by the app's own ears, in the app's own spelling of the words they said. Kibembe is what is spoken here: read their own words and answer in Kibembe only, never in a mix — and where they plainly used Kiswahili or English, or plainly asked for a language, answer in that one only."
    );
    if (!socket.connected) return;
    socket.setReviewPending(false);
    if (!socket.sendText(said)) setNotice(TURN_NOT_DELIVERED);
  }, []);

  /**
   * The app's own ears have written the person's turn down, and this is where it is put to the voice.
   * The app's own reading of the turn rides in with the words, so a word the Word Bank holds is
   * answered from its own meaning — and the turn goes to the voice the moment it has ended, whatever
   * the reading found. Nothing is held back waiting on the person's own word: a turn held that way was
   * never answered at all, and the microphone stayed shut behind it.
   */
  const handleHeard = useCallback(
    async (text, language, socket) => {
      const said = String(text || "").trim();
      if (!said) return;
      // What the ears write for a breath of noise is not a turn of the person's: nothing is shown,
      // nothing is held and nothing is put to the voice — they are asked to say it again.
      if (!isRealTurn(said)) {
        setNotice(SAY_AGAIN_TURN);
        return;
      }
      // the turn is shown exactly as the app's own ears wrote it
      setNotice("");
      lastUserRef.current = said;
      push("user", said);
      // a fresh turn is its own: whether the turn before it was cut for its language has nothing to do
      // with the answer coming for this one
      blockedRef.current = false;
      // The two lookups this turn needs are made together, never one after the other: what the sound
      // is read to mean and what the question is asked about are independent of each other, and
      // running them in turn is what left an ordinary turn standing on the screen, still working,
      // for seconds before the voice ever heard a word of it. Neither lookup is dropped or cut
      // short — they simply no longer wait on each other, so the turn reaches the voice sooner.
      const [read, fresh, media] = await Promise.all([
        readHeardTurn(said, lastAgentRef.current),
        loadFreshMaterial(said, askedRef.current),
        // what the turn asks of the app's own player, if anything at all
        mediaRef.current ? mediaRef.current(said) : null,
      ]);
      if (!socket.connected || socketRef.current !== socket) return;
      // a language plainly asked for stands from here on, and the rule for it rides in with the reading
      if (read.mode) saveLangMode(read.mode);
      if (read.note) socket.sendMemory(read.note);
      // What the app has just done with its own player rides in before the words, so the answer stands
      // on what really happened: a piece is said to be standing in the player, never to be playing.
      if (media?.spoken) socket.sendMemory(media.spoken);
      await handOn(socket, said, language, "", fresh);
    },
    [handOn, push]
  );

  /**
   * The person has said the writing is right: the turn goes to the voice exactly as it stands, with
   * the app's own reading of it riding in before the words.
   */
  const acceptHeard = useCallback(async () => {
    const held = checkRef.current;
    const socket = socketRef.current;
    checkRef.current = null;
    setCheck(null);
    if (!held || !socket?.connected) return;
    await handOn(socket, held.text, held.language);
  }, [handOn]);

  /**
   * The person is saying the turn again: the writing is set aside — nothing is put to the voice, and
   * the line nobody said is taken off the screen — so what is answered is the turn they say next.
   */
  const againHeard = useCallback(() => {
    const held = checkRef.current;
    checkRef.current = null;
    setCheck(null);
    if (held) dropTurnRef.current?.(held.text);
    socketRef.current?.setReviewPending(false);
    setNotice("Say it again — I'm listening.");
  }, []);

  /**
   * The person puts the app's own writing of their turn right. What they really said is handed to the
   * voice holding the call as the turn it is answering — the ears' writing is named for what it was,
   * a writing, and the sound of the turn itself is never touched — and the words they put right are
   * read against the app's own Word Bank exactly as any other turn of theirs is.
   */
  /**
   * The app's own word about its own player, handed to the voice on the line. Only what the app has
   * really done is ever said here — the player itself reports when the sound has begun.
   */
  const tell = useCallback((note) => {
    const socket = socketRef.current;
    const said = String(note || "").trim();
    if (!socket?.connected || !said) return false;
    socket.sendMemory(said);
    return true;
  }, []);

  const correct = useCallback((text) => {
    const said = String(text || "").trim();
    const socket = socketRef.current;
    if (!said || !socket?.connected) return false;
    lastUserRef.current = said;
    const held = checkRef.current;
    if (held) {
      checkRef.current = null;
      setCheck(null);
      handOn(socket, said, held.language, held.text);
    } else {
      socket.sendMemory(`The person corrected their previous transcript to: "${said}". Answer these words rather than the earlier transcription.`);
      readHeardTurn(said, lastAgentRef.current).then(({ note, mode }) => {
        if (mode) saveLangMode(mode);
        if (note) socket.sendMemory(note);
      });
    }
    setNotice("The voice has your words now.");
    return true;
  }, [handOn]);

  /** The AI's turn, as the agent itself wrote it down. */
  const handleAgentText = useCallback(
    (text) => {
      const line = String(text || "").trim();
      if (line) lastAgentRef.current = line;
      // the source of the material this answer was given from, taken once, so it stands beneath
      // this answer alone and never beneath a later one
      const source = freshSourceRef.current;
      freshSourceRef.current = null;
      // the artist's own videos found for this answer: they stand under the words, and are cleared
      // with them so no later answer carries them
      const videos = videosRef.current;
      videosRef.current = [];
      // the names waiting on the person's choice stand on the answer that asks for it, and are
      // cleared with it so no later line carries them
      push("assistant", text, undefined, source, choicesRef.current, videos);
      choicesRef.current = [];
      // The words this answer is made of are read against the admin's pictures as the answer is
      // shown, and the pictures of the words it carries join it a moment later: the answer itself
      // is never held back while they are found, and most answers carry none.
      const asked = lastUserRef.current;
      if (!asked) return;
      loadTurnPictures(asked, line).then((pictures) => {
        if (pictures.length) picturesRef.current?.(text, pictures);
      });
    },
    [push]
  );

  const handleThinking = useCallback(
    (on) => {
      if (!activeRef.current) return;
      if (on) {
        if (!speakingRef.current) setStatus("thinking");
        return;
      }
      backToListening();
    },
    [backToListening]
  );

  /** The voice has begun: the working line gives way to the sound of it. */
  const handleAudioStart = useCallback(() => {
    if (!activeRef.current) return;
    speakingRef.current = true;
    setStatus("speaking");
  }, []);

  /** The voice has drained: the call listens again, and the answer ends for whoever counts them. */
  const handleAudioEnd = useCallback((cut) => {
    speakingRef.current = false;
    backToListening();
    // A line stopped for a language this app does not speak is not a voice turn: nothing was answered
    // for that turn, so nothing is counted for it and no change is carried on from it. The app's own
    // line that takes its place is measured like any other.
    if (cut === true) return;
    // A turn that was cut for its language gave no reply to what the person asked: the app's own line
    // that took its place is read out and the call moves on from it, but the turn itself is reported as
    // one that was not answered — and so it is never charged for.
    const blocked = blockedRef.current;
    blockedRef.current = false;
    // the voice has drained: one voice turn has been spoken out in full
    noteVoiceTurn();
    // an answer read out in full is reported, so a change it asked for is sent here and now
    liveSpokeRef.current?.(blocked);
  }, [backToListening]);

  /** An answer is complete and read out: it is counted against the turn this AI is on. */
  const handleAnswered = useCallback(() => liveAnsweredRef.current?.(), []);
  const handleError = useCallback((message) => setError(message), []);
  const handleReask = useCallback((message) => setNotice(message), []);

  /**
   * The answer turned into a language this app does not speak and was stopped: the app's own line
   * naming its three languages is what stands on the screen beside it.
   */
  const handleBlockedSpeech = useCallback(() => {
    blockedRef.current = true;
    setNotice(LANGS_NOTICE);
  }, []);

  /**
   * The call opens here, inside the tap that began it, on the talk AI it was asked for. Returns an
   * empty string when the call opened, or the reason it could not — said with the account that
   * refused it, so what to put right is never left to be guessed at.
   */
  const start = useCallback(
    async ({ account, label, session, onAnswered, onAnswerEnd, onEnded, onStuck } = {}) => {
      // a call is opening or already open: a tap that lands on it never opens a second one
      if (activeRef.current || startingRef.current) return "";
      startingRef.current = true;
      if (onAnswered) liveAnsweredRef.current = onAnswered;
      if (onAnswerEnd) liveSpokeRef.current = onAnswerEnd;
      if (onEnded) endedRef.current = onEnded;
      stuckRef.current = onStuck || null;
      // the AI this call is opened on, named on screen and used for every turn that follows it
      slotRef.current = {
        account: account === undefined ? FIRST_TALK.account : account,
        label: label || FIRST_TALK.label,
      };

      setError("");
      setNotice("");
      setStatus("connecting");

      // the microphone and the sound are asked for inside the tap itself, and the sound the tap
      // started is the one this call plays through: a call never closes it, so the voice standing
      // down can never take the sound away from the voice that follows it
      primeMic();
      const audio = primeAudio();

      const socket = new VoiceSocket({
        onStatus: handleStatus,
        onUserText: handleUserText,
        onHeard: handleHeard,
        onAgentText: handleAgentText,
        onThinking: handleThinking,
        onAgentAudioStart: handleAudioStart,
        onAgentAudioEnd: handleAudioEnd,
        onAgentAnswered: handleAnswered,
        onError: handleError,
        onReask: handleReask,
        onBlockedSpeech: handleBlockedSpeech,
        // the voice has kept a turn it never began answering: whoever is running the call is asked
        // here and now whether another voice service takes it
        onStuck: (text) => stuckRef.current?.(text) === true,
      });

      try {
        // The app's own ears hear the person for this call: the sound of a turn stays on the phone
        // until it has been written down, and what the voice is handed is those words — never the
        // room. That is what makes the Kibembe the person says come back in the app's own spelling:
        // the ears are pointed at their saved words and expressions, while a voice's own service,
        // which knows no Kibembe, writes the turn as the English or Kiswahili words it nearly
        // sounds like. Where the ears cannot read a turn — two turns running — the voice hears the
        // person itself, exactly as it did before.
        await socket.open({
          withMic: true,
          ears: true,
          account: slotRef.current.account,
          audio,
          // the session the app checked this voice with as it chose who takes the call
          checked: session,
        });
      } catch (err) {
        await socket.stop();
        startingRef.current = false;
        setStatus("idle");
        return err?.response?.data?.error || err?.message || NO_REACH;
      }

      socketRef.current = socket;
      activeRef.current = true;
      startingRef.current = false;
      setActive(true);
      setStatus("listening");

      // The rules of the call go in as it opens, before the person's first turn: how Kibembe is
      // heard and answered here, and that the app's own Word Bank is the only source of its words.
      // The bank itself stays on the server; only the rules ride into the call.
      openHearingNote().then((note) => {
        if (note) socket.sendMemory(note);
      });

      // the phone's hold on the sound: nothing the AI says is heard until it is started, and a touch
      // is what starts it
      if (primedAudio()?.state !== "running") {
        setNotice(TOUCH_TO_HEAR);
        offTouchRef.current = resumeAudioOnTouch(() => setNotice(""));
      }
      return "";
    },
    [
      handleAgentText,
      handleAnswered,
      handleAudioEnd,
      handleAudioStart,
      handleBlockedSpeech,
      handleHeard,
      handleError,
      handleReask,
      handleStatus,
      handleThinking,
      handleUserText,
    ]
  );

  const stop = useCallback(async () => {
    const socket = socketRef.current;
    // the call is orphaned before it is hung up, so its own end is never reported as a call that
    // ended on the person
    finish();
    if (socket) await socket.stop();
  }, [finish]);

  // the microphone and the connection are never left open once the screen is gone
  useEffect(
    () => () => {
      socketRef.current?.stop();
    },
    []
  );

  /**
   * A written question. Sent into the call that is open, it is answered in that same conversation by
   * whoever holds it. With no call running it is answered by the app's own assistant — the one the
   * Kibembe screen asks — so a written turn is always answered, is answered from what was looked up
   * for it, and comes back with the pictures the admin saved beside the words it is made of.
   */
  const ask = useCallback(
    async (text, onAnswered, { replay = false } = {}) => {
      const said = String(text || "").trim();
      if (!said) return;
      if (onAnswered) writtenAnsweredRef.current = onAnswered;
      // A turn handed over from a voice that went quiet is already standing on the screen as the
      // person's own: it is not written there a second time, it is only put to the new voice.
      if (!replay) push("user", said);

      const live = socketRef.current;
      if (live?.connected) {
        // A written turn is read for what it asks of the app's own player exactly as a spoken one is,
        // and the app's own note about its player rides in before the words — so the answer stands on
        // what the app has really done, and a piece is never said to be playing when it is only
        // standing in the player waiting for the person's own press.
        const media = mediaRef.current ? await mediaRef.current(said) : null;
        if (media?.spoken) live.sendMemory(media.spoken);
        // The call's own last line is handed over with a written turn exactly as it is with a spoken
        // one, so a person asking for that line again — "omo tenda bile?" — is given that very line
        // back rather than a fresh answer written for the ask.
        const read = await readHeardTurn(said, lastAgentRef.current);
        if (read.mode) saveLangMode(read.mode);
        if (read.note) live.sendMemory(read.note);
        live.sendText(said);
        return;
      }

      setError("");
      setNotice("");
      setStatus("thinking");
      // A written turn with no call running is put to the app's own player first, exactly as a spoken
      // one is: the app's own selection chooses the piece and stands it in the app's own player to be
      // heard here — never only named — and where the title is not one the app holds, the artist's own
      // pieces are held out to be chosen from. Where the app's own player answered the turn at all, that
      // answer is the answer: a plain play request is never written out again as ordinary talk, which is
      // what left a person who asked for a song told that the app cannot play music at all.
      let played = null;
      if (mediaRef.current) {
        try {
          played = await mediaRef.current(said);
        } catch (err) {
          // a piece that could not be stood never holds the answer back
        }
      }
      if (played?.line) {
        // the artist's own pieces the app holds out stand under its own line, each one to be pressed
        // and played here in the app rather than opened elsewhere
        push("assistant", played.line, [], null, [], Array.isArray(played.offer) ? played.offer : []);
        writtenAnsweredRef.current?.();
        setStatus(activeRef.current ? "listening" : "idle");
        return;
      }
      try {
        const res = await base44.functions.invoke("chatWithKibembeAssistant", {
          message: said,
          asked: askedRef.current,
          // the call's own last line rides with a written turn, so the person asking for it again is
          // given that very line back rather than a new answer written for the ask
          lastAgent: lastAgentRef.current,
        });
        const data = res?.data || {};
        if (data.error) {
          // The failure names the stage it belongs to, so what went wrong is never left to be guessed
          // at — and nothing of the saved knowledge and nothing of any key is ever logged here.
          console.error(
            'The written turn could not be answered:',
            data.stage || 'answer',
            data.error
          );
          setError(data.error === UNAUTHORIZED ? SIGN_IN_TO_ASK : data.error);
          return;
        }
        const reply = String(data.reply || "").trim();
        if (!reply) {
          setError(NO_WRITTEN_ANSWER);
          return;
        }
        // the several different people or artists the search found under names that look alike ride
        // with the answer that asks which one is meant
        const choices = Array.isArray(data.candidates) ? data.candidates : [];
        askedRef.current = choices.length >= 2 ? choices : [];
        push(
          "assistant",
          reply,
          Array.isArray(data.pictures) ? data.pictures : [],
          data.source || null,
          choices,
          // the artist's own most watched videos, when the question was about an artist: the answer
          // names them in its own words and the same five stand under it on the screen
          Array.isArray(data.videos) ? data.videos : []
        );
        writtenAnsweredRef.current?.();
      } catch (err) {
        setError(
          err?.response?.status === 401
            ? SIGN_IN_TO_ASK
            : err?.response?.data?.error || err?.message || COULD_NOT_ASK
        );
      } finally {
        setStatus(activeRef.current ? "listening" : "idle");
      }
    },
    [push]
  );

  // the meter the orb pulses with, read from the call that is open
  useEffect(() => {
    if (status !== "listening" && status !== "speaking" && status !== "thinking") {
      levelRef.current = 0;
      return undefined;
    }
    let raf = 0;
    const tick = () => {
      levelRef.current = socketRef.current?.level?.() || 0;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [status]);

  return {
    status,
    speaking: status === "speaking",
    thinking: status === "thinking",
    micActive: active,
    error,
    notice,
    levelRef,
    start,
    stop,
    ask,
    // the app's own word about its own player, where this voice can be told anything at all
    tell,
    // the person's own words put in place of the ears' writing of their turn
    correct,
    check,
    acceptHeard,
    againHeard,
  };
}