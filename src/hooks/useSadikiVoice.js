import { useCallback, useEffect, useRef, useState } from "react";
import VoiceSocket from "@/lib/elevenLabsSocket";
import { primedAudio, primeAudio, resumeAudioOnTouch } from "@/lib/audioUnlock";
import { primeMic } from "@/lib/micAccess";
import { SADIKI_AI } from "@/lib/providerNames";

/**
 * Sadiki AI on the home page's call.
 *
 * He answers on his own account — his own key, his own agent — so the home screen's calls hand over
 * to him and never to a voice speaking on another AI's account. He hears the person himself and
 * answers out loud, and every finished answer is handed to whoever is counting them, so the handover
 * back to Cartesia AI follows the count the calls have always used.
 *
 * A written question is put to him as well: sent into the call that is open, or answered on a short
 * session of his own when no call is running.
 */

const ACCOUNT = "fourth";

const NO_REACH = `${SADIKI_AI} couldn't be reached. Please try again.`;
const ENDED = `${SADIKI_AI}'s call ended. Tap the phone to talk again.`;
const TOUCH_TO_HEAR = "Tap the screen to let the sound through.";
const COULD_NOT_ASK = `${SADIKI_AI} couldn't answer just now. Please try again.`;

export default function useSadikiVoice({ onTurn } = {}) {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const levelRef = useRef(0);

  const socketRef = useRef(null);
  const writtenRef = useRef(null);
  const activeRef = useRef(false);
  const speakingRef = useRef(false);
  const offTouchRef = useRef(null);
  // an answer given on the call that is open and one given to a written turn are charged through the
  // handler each was asked with, never through one another's
  const liveAnsweredRef = useRef(null);
  const writtenAnsweredRef = useRef(null);
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
      finish();
      setNotice(ENDED);
    },
    [finish]
  );

  /** The person's own turn, as the agent wrote it down. */
  const handleUserText = useCallback(
    (text) => {
      const said = String(text || "").trim();
      if (said) push("user", said);
    },
    [push]
  );

  /** His turn, as the agent itself wrote it down. */
  const handleAgentText = useCallback((text) => push("assistant", text), [push]);

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

  /** His voice has begun: the working line gives way to the sound of it. */
  const handleAudioStart = useCallback(() => {
    if (!activeRef.current) return;
    speakingRef.current = true;
    setStatus("speaking");
  }, []);

  /** His voice has drained: the call listens again. */
  const handleAudioEnd = useCallback(() => {
    speakingRef.current = false;
    backToListening();
  }, [backToListening]);

  /** An answer is complete and read out: it is counted against the turn this AI is on. */
  const handleAnswered = useCallback(() => liveAnsweredRef.current?.(), []);
  const handleError = useCallback((message) => setError(message), []);
  const handleReask = useCallback((message) => setNotice(message), []);

  /**
   * The call opens here, inside the tap that began it. Returns an empty string when the call opened,
   * or the reason it could not — said with the account that refused it, so what to put right is never
   * left to be guessed at.
   */
  const start = useCallback(
    async ({ onAnswered } = {}) => {
      if (activeRef.current) return "";
      if (onAnswered) liveAnsweredRef.current = onAnswered;

      setError("");
      setNotice("");
      setStatus("connecting");

      // the microphone and the sound are asked for inside the tap itself
      primeMic();
      primeAudio();

      const socket = new VoiceSocket({
        onStatus: handleStatus,
        onUserText: handleUserText,
        onAgentText: handleAgentText,
        onThinking: handleThinking,
        onAgentAudioStart: handleAudioStart,
        onAgentAudioEnd: handleAudioEnd,
        onAgentAnswered: handleAnswered,
        onError: handleError,
        onReask: handleReask,
      });

      try {
        await socket.open({ withMic: true, account: ACCOUNT });
      } catch (err) {
        await socket.stop();
        setStatus("idle");
        return err?.response?.data?.error || err?.message || NO_REACH;
      }

      socketRef.current = socket;
      activeRef.current = true;
      setActive(true);
      setStatus("listening");

      // the phone's hold on the sound: nothing he says is heard until it is started, and a touch is
      // what starts it
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
   * conversation; with no call running, Sadiki answers it on a short session of his own — opened for
   * this one turn and hung up the moment the answer lands.
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
          push("assistant", reply);
          writtenAnsweredRef.current?.();
          settle();
        },
        onStatus: (next) => {
          if (next === "closed" || next === "ended") settle();
        },
        onError: (message) => {
          setError(message);
          settle();
        },
      });

      writtenRef.current = socket;
      try {
        await socket.open({ withMic: false, silent: true, laterTurn: true, account: ACCOUNT });
        if (!socket.sendText(said)) throw new Error(COULD_NOT_ASK);
        await answered;
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
  };
}