import { useCallback, useEffect, useRef, useState } from "react";
import VoiceSocket from "@/lib/elevenLabsSocket";
import { primedAudio, primeAudio, resumeAudioOnTouch } from "@/lib/audioUnlock";
import { primeMic } from "@/lib/micAccess";
import { FIRST_TALK } from "@/lib/talkRotation";
import { openHearingNote, readHeardTurn } from "@/lib/homeHearing";
import { SAY_AGAIN_KIBEMBE, isMisheard } from "@/lib/misheardSpeech";
import { heardLanguage } from "@/lib/heardLanguage";
import { noteVoiceTurn } from "@/lib/kpiEvents";

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

export default function useTalkVoice({ onTurn } = {}) {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const levelRef = useRef(0);

  const socketRef = useRef(null);
  const writtenRef = useRef(null);
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
  const turnRef = useRef(onTurn);
  turnRef.current = onTurn;

  const push = useCallback((role, text) => turnRef.current?.(role, text), []);

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
      // Sometimes the ears write a language nobody on this call speaks — a guess at some other
      // script altogether. Those are not the person's words and nothing is read from them: the turn
      // is asked for once more, and the Kibembe they really said is what comes back.
      if (isMisheard(said)) {
        setNotice(SAY_AGAIN_KIBEMBE);
        return;
      }
      setNotice("");
      push("user", said);
      // The app's own reading of the turn rides with it: the confirmed Kibembe word or phrase the
      // sound belongs to is handed to the voice before it answers, so a sound the ears were unsure
      // of is answered from the app's own word bank and in Kibembe. A correction the person makes
      // is saved as the same turn is read. A reading that cannot be made leaves the turn to the
      // voice itself, which is already carrying the rules of the call.
      readHeardTurn(said, lastAgentRef.current).then((note) => {
        if (note) socketRef.current?.sendMemory(note);
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
  const handleHeard = useCallback(
    (text, language, socket) => {
      const said = String(text || "").trim();
      if (!said) return;
      // the turn is shown exactly as the app's own ears wrote it, and the app's own reading of it
      // rides with it, so a word the Word Bank holds is answered from its own meaning
      handleUserText(said);
      if (!socket.sendText(said)) {
        setNotice(TURN_NOT_DELIVERED);
        return;
      }
      // The ears write the turn down in the app's own spelling of the person's own words, and the
      // reader names no language for it: Kibembe is what is read here. So the note goes in as what
      // the writing is, never as a command, and the answer that feeds on it stays Kibembe.
      const heard = heardLanguage(language);
      socket.sendMemory(
        heard
          ? `The person's turn was written down by the app's own ears, in the app's own spelling of their words, as ${heard}. Read their own words: if they are Kibembe, answer in Kibembe only; if they are ${heard}, answer in ${heard} only — never in a mix; where their words mix Kibembe and Kiswahili, answer in Kibembe only; where they plainly ask for a language, answer in that one only.`
          : "The person's turn was written down by the app's own ears, in the app's own spelling of the words they said. Kibembe is what is spoken here: read their own words and answer in Kibembe only, never in a mix — and where they plainly used Kiswahili or English, or plainly asked for a language, answer in that one only."
      );
    },
    [handleUserText]
  );

  /**
   * The person puts the app's own writing of their turn right. What they really said is handed to the
   * voice holding the call as the turn it is answering — the ears' writing is named for what it was,
   * a writing, and the sound of the turn itself is never touched — and the words they put right are
   * read against the app's own Word Bank exactly as any other turn of theirs is.
   */
  const correct = useCallback((text) => {
    const said = String(text || "").trim();
    const socket = socketRef.current;
    if (!said || !socket?.connected) return false;
    socket.sendMemory(
      "The app's own ears wrote the person's turn down wrongly. Their own words were: " +
        `"${said}". That turn is the one you answer: answer these words, in the language they are ` +
        "said in, and not the earlier writing of them."
    );
    readHeardTurn(said, lastAgentRef.current).then((note) => {
      if (note) socket.sendMemory(note);
    });
    setNotice("The voice has your words now.");
    return true;
  }, []);

  /** The AI's turn, as the agent itself wrote it down. */
  const handleAgentText = useCallback(
    (text) => {
      const line = String(text || "").trim();
      if (line) lastAgentRef.current = line;
      push("assistant", text);
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
  const handleAudioEnd = useCallback(() => {
    speakingRef.current = false;
    backToListening();
    // the voice has drained: one voice turn has been spoken out in full
    noteVoiceTurn();
    // an answer read out in full is reported, so a change it asked for is sent here and now
    liveSpokeRef.current?.();
  }, [backToListening]);

  /** An answer is complete and read out: it is counted against the turn this AI is on. */
  const handleAnswered = useCallback(() => liveAnsweredRef.current?.(), []);
  const handleError = useCallback((message) => setError(message), []);
  const handleReask = useCallback((message) => setNotice(message), []);

  /**
   * The call opens here, inside the tap that began it, on the talk AI it was asked for. Returns an
   * empty string when the call opened, or the reason it could not — said with the account that
   * refused it, so what to put right is never left to be guessed at.
   */
  const start = useCallback(
    async ({ account, label, onAnswered, onAnswerEnd, onEnded } = {}) => {
      // a call is opening or already open: a tap that lands on it never opens a second one
      if (activeRef.current || startingRef.current) return "";
      startingRef.current = true;
      if (onAnswered) liveAnsweredRef.current = onAnswered;
      if (onAnswerEnd) liveSpokeRef.current = onAnswerEnd;
      if (onEnded) endedRef.current = onEnded;
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
      });

      try {
        // The app's own ears hear the person for this call: the sound of a turn stays on the phone
        // until it has been written down, and what the voice is handed is those words — never the
        // room. That is what makes the Kibembe the person says come back in the app's own spelling:
        // the ears are pointed at their saved words and expressions, while a voice's own service,
        // which knows no Kibembe, writes the turn as the English or Kiswahili words it nearly
        // sounds like. Where the ears cannot read a turn — two turns running — the voice hears the
        // person itself, exactly as it did before.
        await socket.open({ withMic: true, ears: true, account: slotRef.current.account, audio });
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
      writtenRef.current?.stop();
    },
    []
  );

  /**
   * A written question. It is sent into the call that is open, so it is answered in the same
   * conversation; with no call running, the talk AI answers it on a short session of its own — opened
   * for this one turn and hung up the moment the answer lands.
   */
  const ask = useCallback(
    async (text, onAnswered) => {
      const said = String(text || "").trim();
      if (!said) return;
      if (onAnswered) writtenAnsweredRef.current = onAnswered;
      push("user", said);

      const live = socketRef.current;
      if (live?.connected) {
        live.sendText(said);
        return;
      }

      setError("");
      setStatus("thinking");

      let done = false;
      // what the written turn ends in: the answer itself, or the plain fact that none came
      let replied = false;
      let failed = false;
      let settle = () => {};
      const answered = new Promise((resolve) => {
        settle = () => {
          if (done) return;
          done = true;
          resolve();
        };
      });

      const socket = new VoiceSocket({
        onAgentText: (reply) => {
          replied = true;
          push("assistant", reply);
          writtenAnsweredRef.current?.();
          settle();
        },
        onStatus: (next) => {
          if (next === "closed" || next === "ended") settle();
        },
        onError: (message) => {
          failed = true;
          setError(message);
          settle();
        },
        onReask: (message) => {
          if (message) setNotice(message);
        },
      });

      writtenRef.current = socket;
      try {
        await socket.open({
          withMic: false,
          silent: true,
          laterTurn: true,
          account: slotRef.current.account,
        });
        if (!socket.sendText(said)) throw new Error(COULD_NOT_ASK);
        await answered;
        if (!replied && !failed) setError(NO_WRITTEN_ANSWER);
      } catch (err) {
        setError(err?.response?.data?.error || err?.message || COULD_NOT_ASK);
      } finally {
        if (writtenRef.current === socket) writtenRef.current = null;
        await socket.stop();
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
    // the person's own words put in place of the ears' writing of their turn
    correct,
  };
}