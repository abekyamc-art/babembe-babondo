import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { primedAudio, primeAudio, resumeAudioOnTouch } from "@/lib/audioUnlock";
import { claimMic, micMessage, primeMic } from "@/lib/micAccess";
import CartesiaCall from "@/lib/cartesiaCall";

/**
 * Cartesia AI on the line: the outside agent the home page's calls hand over to. It listens and
 * answers by itself, so there is nothing to ask on the app's behalf — the turns it reports are the
 * turns shown on screen, and each finished answer is handed to whoever is counting them.
 */

const NO_REACH = "Cartesia AI couldn't be reached. Please try again.";
const ENDED = "Cartesia AI's call ended. Tap the phone to talk again.";
const TOUCH_TO_HEAR = "Touch the screen to let the sound through.";

export default function useCartesiaVoice({ onTurn, onAnswered } = {}) {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const levelRef = useRef(0);

  const callRef = useRef(null);
  const activeRef = useRef(false);
  const speakingRef = useRef(false);
  // the turn and the answer are always reported through the handlers as they stand right now
  const turnRef = useRef(onTurn);
  turnRef.current = onTurn;
  const answeredRef = useRef(onAnswered);
  answeredRef.current = onAnswered;
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
      setNotice(ENDED);
    },
    [finish]
  );

  /** The person's own turn, written down and reported by the agent. */
  const handleUserText = useCallback(
    (text) => turnRef.current?.("user", text),
    []
  );

  /** His turn, as the agent itself wrote it down. */
  const handleAgentText = useCallback(
    (text) => turnRef.current?.("assistant", text),
    []
  );

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
  }, [backToListening]);

  const handleError = useCallback((message) => setError(message), []);

  /**
   * The call opens here. The key itself never reaches the phone: the app's own server is asked for a
   * short-lived token, and that is what opens the agent's calling socket. Returns an empty string
   * when the call opened, or the reason it could not, so whoever asked for it can say so plainly.
   */
  const start = useCallback(async () => {
    if (activeRef.current) return "";

    setError("");
    setNotice("");
    setStatus("connecting");

    // the microphone and the sound are asked for inside the tap that began the call
    primeMic();
    primeAudio();

    let stream;
    try {
      stream = await claimMic();
    } catch (err) {
      setStatus("idle");
      return micMessage(err);
    }

    let session;
    try {
      const res = await base44.functions.invoke("cartesiaSession", {});
      session = res?.data || {};
    } catch (err) {
      session = {};
    }
    if (!session.token || !session.agent_id) {
      stream.getTracks().forEach((track) => track.stop());
      setStatus("idle");
      return session.error || NO_REACH;
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
      await call.open({ stream, token: session.token, agentId: session.agent_id });
    } catch (err) {
      await call.stop();
      stream.getTracks().forEach((track) => track.stop());
      setStatus("idle");
      return err?.message || NO_REACH;
    }

    callRef.current = call;
    activeRef.current = true;
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
  };
}