import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import OpenAiTalkCall from "@/lib/openAiTalkCall";
import { primedAudio, primeAudio, resumeAudioOnTouch } from "@/lib/audioUnlock";
import { claimMic, micMessage, primeMic } from "@/lib/micAccess";
import { readHeardTurn } from "@/lib/homeHearing";
import { noteVoiceTurn } from "@/lib/kpiEvents";
import { OPENAI_AI } from "@/lib/providerNames";

/**
 * AI 1 — the app's own OpenAI seat, and the first voice a home call is given.
 *
 * It is one seat with one account: the app's own OpenAI key, a session made for this call alone, and
 * the whole of the app's rules written into that session as it is made. The seat hears the person
 * itself and answers on its own account, so nothing is put to it turn by turn: it is opened inside
 * the person's own tap, it holds the call until its own number of answers has been read out, and the
 * count is handed to whoever is counting them — the same count every other voice of the ring is
 * measured by.
 *
 * The key itself never reaches the phone: a short-lived credential is made on the server, and where
 * the app has already checked this seat as the call was being decided who takes it, that very
 * session is the one the call opens on.
 */

const NO_REACH = "AI 1 couldn't be reached. Please try again.";
const TOUCH_TO_HEAR = "Tap the screen to let the sound through.";

export default function useOpenAiVoice({ onTurn, onPictures, onAnswered, onAnswerEnd, onMedia } = {}) {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const levelRef = useRef(0);

  const callRef = useRef(null);
  const activeRef = useRef(false);
  const speakingRef = useRef(false);
  // a call is opening right now: a tap that lands on it never opens a second one
  const startingRef = useRef(false);
  const offTouchRef = useRef(null);
  // the voice this call is opened on, named on screen exactly as the ring names it
  const labelRef = useRef(OPENAI_AI);
  // the line AI 1 said last, so a correction on a later turn is read against it
  const lastAgentRef = useRef("");
  // the handler the finished answers of this call are counted through, and the one that carries the
  // change on once the last of them has been read out
  const liveAnsweredRef = useRef(onAnswered);
  liveAnsweredRef.current = onAnswered;
  const liveSpokeRef = useRef(onAnswerEnd);
  liveSpokeRef.current = onAnswerEnd;
  // a call the service ended by itself is reported through here, so the turn it leaves behind is
  // never lost
  const endedRef = useRef(null);
  // the whole talk is reported to whoever is keeping it, so a hand-off carries the conversation on
  // with it and nothing said before the change is lost from the screen
  const turnRef = useRef(onTurn);
  turnRef.current = onTurn;
  // the pictures of an answer are handed over through here the moment they are found
  const picturesRef = useRef(onPictures);
  picturesRef.current = onPictures;
  // what a turn asks of the app's own player is answered by the app itself, whichever voice is on
  // the call
  const mediaRef = useRef(onMedia);
  mediaRef.current = onMedia;

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
    callRef.current = null;
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
      if (next !== "ended") return;
      if (!activeRef.current) return;
      const label = labelRef.current;
      finish();
      setNotice(`${label}'s call ended. Tap the phone to talk again.`);
      // the call ended on its own: whoever is counting the turns decides whether the same voice waits
      // behind the next tap or the ring moves on
      endedRef.current?.();
    },
    [finish]
  );

  /** The person's own turn, as the session itself wrote it down. */
  const handleUserText = useCallback(
    (text) => {
      const said = String(text || "").trim();
      if (!said) return;
      setNotice("");
      // the turn stands on the screen exactly as the session wrote it, which is the app's own spelling
      // of the person's words: the reader is pointed at the saved ones before it listens
      push("user", said);
      // what the turn asks of the app's own player is answered by the app itself, here and now
      mediaRef.current?.(said);
      // The app's own knowledge is searched for the turn that has just ended — the whole approved
      // document and the confirmed Word Bank, the same search every voice of the ring is handed — and
      // it is put in front of the seat before the answer is begun, so AI 1 answers from the app's own
      // knowledge rather than from its own memory. A search that finds nothing, or that cannot be
      // made at all, never leaves the person unanswered: the seat answers on its own with what it has.
      if (activeRef.current) setStatus("thinking");
      readHeardTurn(said, lastAgentRef.current).then(({ note }) => {
        callRef.current?.answer?.(note || "", said);
      });
    },
    [push]
  );

  /** The answer, as the session itself wrote it down: the words it has just spoken. */
  const handleAgentText = useCallback(
    (text) => {
      const line = String(text || "").trim();
      if (!line) return;
      lastAgentRef.current = line;
      push("assistant", line);
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

  /** One answer has been given and read out: it is counted against this voice's own turn. */
  const handleAnswered = useCallback(() => liveAnsweredRef.current?.(), []);
  const handleError = useCallback((message) => setError(String(message || "")), []);

  /**
   * The call opens here, inside the tap that began it. Returns whether it opened, and where it could
   * not, the reason it gave — said plainly rather than as a tap that went nowhere.
   */
  const start = useCallback(async ({ label = OPENAI_AI, checked, onEnded } = {}) => {
    labelRef.current = label || OPENAI_AI;
    endedRef.current = onEnded || null;
    // a call is opening or already open: a tap that lands on it never opens a second one
    if (activeRef.current || startingRef.current) return { ok: true, why: "" };
    startingRef.current = true;

    setError("");
    setNotice("");
    setStatus("connecting");

    // the sound the tap started is the one this call plays through, and a call never closes it — so
    // the voice standing down can never take the sound away from the voice that follows it
    primeAudio();
    primeMic();

    let stream;
    try {
      stream = await claimMic();
    } catch (err) {
      startingRef.current = false;
      setStatus("idle");
      return { ok: false, why: micMessage(err) };
    }

    // the session the app checked this seat with as it decided who takes the call: the call opens on
    // that very session, and only a seat that was never checked is asked for one of its own
    let session = checked?.session || null;
    if (!session?.client_secret) {
      try {
        const res = await base44.functions.invoke("openAiTalkSession", {});
        session = res?.data || {};
      } catch (err) {
        session = { error: err?.response?.data?.error || NO_REACH };
      }
    }
    if (!session?.client_secret) {
      stream.getTracks().forEach((track) => track.stop());
      startingRef.current = false;
      setStatus("idle");
      return { ok: false, why: session?.error || NO_REACH };
    }

    const call = new OpenAiTalkCall({
      onStatus: handleStatus,
      onUserText: handleUserText,
      onAgentText: handleAgentText,
      onThinking: handleThinking,
      onAgentAudioStart: handleAudioStart,
      onAgentAudioEnd: handleAudioEnd,
      onAnswered: handleAnswered,
      onError: handleError,
      onPlaybackBlocked: () => setNotice(TOUCH_TO_HEAR),
    });

    try {
      await call.open({ clientSecret: session.client_secret, stream });
    } catch (err) {
      await call.stop();
      startingRef.current = false;
      setStatus("idle");
      return { ok: false, why: err?.message || NO_REACH };
    }

    callRef.current = call;
    activeRef.current = true;
    startingRef.current = false;
    setActive(true);
    setStatus("listening");

    // the phone's hold on the sound: nothing AI 1 says is heard until it is started, and a touch is
    // what starts it
    if (primedAudio()?.state !== "running") {
      setNotice(TOUCH_TO_HEAR);
      offTouchRef.current = resumeAudioOnTouch(() => setNotice(""));
    }
    return { ok: true, why: "" };
  }, [handleAnswered, handleAgentText, handleAudioEnd, handleAudioStart, handleError, handleStatus, handleThinking, handleUserText]);

  const stop = useCallback(async () => {
    const call = callRef.current;
    // the call is orphaned before it is hung up, so its own end is never reported as a call that
    // ended on the person
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

  // the meter the orb pulses with, read from the voice coming back
  useEffect(() => {
    if (status !== "listening" && status !== "speaking" && status !== "thinking") {
      levelRef.current = 0;
      return undefined;
    }
    let raf = 0;
    const tick = () => {
      levelRef.current = callRef.current?.level?.() || 0;
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
    // the app's own player answers the turn, and nothing of the player is said to a voice that hears
    // the person itself: where the app's own word about it is needed, the screen says it
    tell: () => false,
    // nothing is held for the person's own word on this seat: the session writes the turn down with
    // the app's own reader and answers it at once
    check: null,
    acceptHeard: () => {},
    againHeard: () => {},
  };
}