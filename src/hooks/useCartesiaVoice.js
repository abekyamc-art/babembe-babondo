import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { primedAudio, primeAudio, resumeAudioOnTouch } from "@/lib/audioUnlock";
import { claimMic, micMessage, primeMic } from "@/lib/micAccess";
import CartesiaCall from "@/lib/cartesiaCall";
import { readHeardTurn } from "@/lib/homeHearing";
import { SAY_AGAIN_KIBEMBE, isMisheard } from "@/lib/misheardSpeech";
import { CARTESIA_AI } from "@/lib/providerNames";

/**
 * The Cartesia voice on the line: the outside agent the home page's calls hand over to. It listens
 * and answers by itself, so there is nothing to ask on the app's behalf — the turns it reports are
 * the turns shown on screen, and each finished answer is handed to whoever is counting them.
 *
 * Three Cartesia accounts answer through it: Cartesia AI on the app's own account, Cartesia AI 1 on
 * the admin's second one and Cartesia AI 2 on their third, each with its own key and its own agent.
 * Whoever is on the call is the one its call is opened on, and the one named in anything the screen
 * says about it.
 */

const NO_REACH = (who) => `${who} couldn't be reached. Please try again.`;
const ENDED = (who) => `${who}'s call ended. Tap the phone to talk again.`;
const TOUCH_TO_HEAR = "Touch the screen to let the sound through.";

export default function useCartesiaVoice({ onTurn, onAnswered, onAnswerEnd, onEnded } = {}) {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const levelRef = useRef(0);
  // the Cartesia voice the call is open on, named on screen and in anything said about it
  const labelRef = useRef(CARTESIA_AI);

  const callRef = useRef(null);
  const activeRef = useRef(false);
  // a call is opening right now: a tap that lands on it never opens a second one
  const startingRef = useRef(false);
  const speakingRef = useRef(false);
  // the turn and the answer are always reported through the handlers as they stand right now
  const turnRef = useRef(onTurn);
  turnRef.current = onTurn;
  const answeredRef = useRef(onAnswered);
  answeredRef.current = onAnswered;
  // the end of an answer is reported the same way, so a call can move on the moment it is read out
  const answerEndRef = useRef(onAnswerEnd);
  answerEndRef.current = onAnswerEnd;
  // a call the service closed by itself is reported the same way, so the turn it leaves behind is
  // never lost
  const endedRef = useRef(onEnded);
  endedRef.current = onEnded;
  // the line he said last, so a correction on the next turn is read against it
  const lastAgentRef = useRef("");
  // while the phone is holding the sound back, this waits for the touch that starts it
  const offTouchRef = useRef(null);

  const backToListening = useCallback(() => {
    if (!activeRef.current) return;
    setStatus(speakingRef.current ? "speaking" : "listening");
  }, []);

  /** The call is gone: the screen goes back to its own rest. */
  const finish = useCallback(() => {
    activeRef.current = false;
    speakingRef.current = false;
    callRef.current = null;
    levelRef.current = 0;
    if (offTouchRef.current) {
      offTouchRef.current();
      offTouchRef.current = null;
    }
    setActive(false);
    setStatus("idle");
  }, []);

  /** The session the service closed itself, with the call already picked up. */
  const handleStatus = useCallback(
    (next) => {
      if (next !== "closed") return;
      if (!activeRef.current) return;
      finish();
      setNotice(ENDED(labelRef.current));
      // the call closed on its own: whoever is counting the turns decides whether the same AI waits
      // behind the next tap or the ring moves on
      endedRef.current?.();
    },
    [finish]
  );

  /** The person's own turn, written down and reported by the agent. */
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
      turnRef.current?.("user", said);
      // Cartesia AI hears, answers and speaks on its own account, and its own settings are left
      // exactly as they are — so no reading is handed to it. What the reading is still used for is
      // the app's own learning: a word, a sound or an answer the person puts right on this turn is
      // saved into the Word Bank, so the Kibembe they confirm is not lost with the call.
      readHeardTurn(said, lastAgentRef.current);
    },
    []
  );

  /**
   * The person puts the app's own writing of their turn right. Cartesia AI hears the person itself,
   * writes its own turn down and answers on its own account, and nothing of the app's is pushed into
   * its call — so what the correction is kept for here is the app's own record of the talk and the
   * app's own Word Bank, which the words they put right are read against exactly as any other turn
   * of theirs is.
   */
  const correct = useCallback((text) => {
    const said = String(text || "").trim();
    if (!said) return false;
    readHeardTurn(said, lastAgentRef.current);
    setNotice("Your words are saved — Cartesia AI answers from what it heard.");
    return true;
  }, []);

  /** His turn, as the agent itself wrote it down. */
  const handleAgentText = useCallback((text) => {
    const line = String(text || "").trim();
    if (line) lastAgentRef.current = line;
    turnRef.current?.("assistant", text);
  }, []);

  /** An answer is complete and read out: it is counted against the turn this AI is on. */
  const handleAnswered = useCallback(() => answeredRef.current?.(), []);

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

  /** His voice has drained — or the person spoke over it: the call listens again. */
  const handleAudioEnd = useCallback(() => {
    speakingRef.current = false;
    backToListening();
    // the answer has been read out in full: a change it asked for is sent here and now
    answerEndRef.current?.();
  }, [backToListening]);

  const handleError = useCallback((message) => setError(message), []);

  /**
   * The call opens here. The key itself never reaches the phone: the app's own server is asked for a
   * short-lived token, and that is what opens the agent's calling socket. Returns an empty string
   * when the call opened, or the reason it could not, so whoever asked for it can say so plainly.
   */
  const start = useCallback(async ({ account = "", label = CARTESIA_AI } = {}) => {
    // a call is opening or already open: a tap that lands on it never opens a second one
    if (activeRef.current || startingRef.current) return "";
    startingRef.current = true;
    // the Cartesia voice this call is opened on, which is the one every message below names
    labelRef.current = label || CARTESIA_AI;

    setError("");
    setNotice("");
    setStatus("connecting");

    // the microphone and the sound are asked for inside the tap that began the call, and the sound
    // the tap started is the one this call plays through: a call never closes it, so the voice
    // standing down can never take the sound away from the voice that follows it
    primeMic();
    const audio = primeAudio();

    let stream;
    try {
      stream = await claimMic();
    } catch (err) {
      startingRef.current = false;
      setStatus("idle");
      return micMessage(err);
    }

    let session;
    try {
      const res = await base44.functions.invoke("cartesiaSession", { account });
      session = res?.data || {};
    } catch (err) {
      session = {};
    }
    if (!session.token || !session.agent_id) {
      stream.getTracks().forEach((track) => track.stop());
      startingRef.current = false;
      setStatus("idle");
      return session.error || NO_REACH(labelRef.current);
    }

    const call = new CartesiaCall({
      onStatus: handleStatus,
      onUserText: handleUserText,
      onAgentText: handleAgentText,
      onThinking: handleThinking,
      onAgentAudioStart: handleAudioStart,
      onAgentAudioEnd: handleAudioEnd,
      onAnswered: handleAnswered,
      onError: handleError,
    });

    try {
      await call.open({ stream, token: session.token, agentId: session.agent_id, audio });
    } catch (err) {
      await call.stop();
      stream.getTracks().forEach((track) => track.stop());
      startingRef.current = false;
      setStatus("idle");
      return err?.message || NO_REACH(labelRef.current);
    }

    callRef.current = call;
    activeRef.current = true;
    startingRef.current = false;
    setActive(true);
    setStatus("listening");

    // the phone's hold on the sound: nothing above is heard until it is started, and a touch is
    // what starts it
    if (primedAudio()?.state !== "running") {
      setNotice(TOUCH_TO_HEAR);
      offTouchRef.current = resumeAudioOnTouch(() => setNotice(""));
    }
    return "";
  }, [
    handleAnswered,
    handleAgentText,
    handleAudioEnd,
    handleAudioStart,
    handleError,
    handleStatus,
    handleThinking,
    handleUserText,
  ]);

  const stop = useCallback(async () => {
    const call = callRef.current;
    finish();
    if (call) await call.stop();
  }, [finish]);

  // the microphone and the connection are never left open once the screen is gone
  useEffect(
    () => () => {
      callRef.current?.stop();
    },
    []
  );

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
    // the person's own words put in place of the writing of their turn
    correct,
  };
}