import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { primedAudio, primeAudio } from "@/lib/audioUnlock";
import { claimMic, micMessage, primeMic } from "@/lib/micAccess";
import { isMisheard } from "@/lib/misheardSpeech";
import RealtimeCall, { stageLabel } from "@/lib/realtimeCall";
import { noteVoiceTurn } from "@/lib/kpiEvents";
import { reviewAnswer } from "@/lib/sadikiReview";
import { SADIKI_AI } from "@/lib/providerNames";

/**
 * The Kibembe assistance screen's own assistant: the app's Kibembe assistant, answered from the
 * saved Word Bank on the server. A spoken turn goes out over a real Realtime connection and the words
 * the service writes down are put to `chatWithKibembeAssistant` — the same assistant the written
 * chat asks — and the answer that comes back is read by Sadiki AI before anything is shown or said.
 * A written turn is put to the same assistant, read in the same way, and answered on screen.
 */

const COULD_NOT_ASK = "The assistant could not be reached. Please try again.";
const NO_VOICE = "The answer came back, but the voice could not read it out.";
const TOUCH_TO_HEAR = "Tap the screen to let the sound through.";
const ENDED = "The call ended. Tap the phone to begin again.";
// Sadiki AI reads every answer before it is given: where he could not be asked at all, that is said
// plainly and the answer the assistant wrote stands as it is
const REVIEW_MISSED = `${SADIKI_AI} couldn't read that answer just now — it comes to you as the assistant wrote it.`;
// A spoken turn the ears wrote down in a script this app's people never speak — Ebembe come back as
// Chinese or Japanese words — is never answered here: it is refused, and the person is asked to say
// it again, so no answer is ever written from words nobody said.
const MISHEARD = "That turn came back in another language — say it again, please.";

export default function useOpenAiAssistant({ onTurn, onMisheard } = {}) {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("idle");
  const [turns, setTurns] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const levelRef = useRef(0);

  const callRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const nudgeRef = useRef(null);
  const activeRef = useRef(false);
  const analyserRef = useRef(null);
  const levelBufRef = useRef(null);
  const rafRef = useRef(0);
  // the answer is always charged through the handler as the allowance stands right now
  const answeredRef = useRef(null);
  // turns are answered one after another, so a turn taken while one is being answered is not lost
  const chainRef = useRef(Promise.resolve());
  // every turn is reported to whoever is keeping the whole conversation, so a call that hands over
  // to the next AI carries the talk so far with it
  const turnRef = useRef(onTurn);
  turnRef.current = onTurn;
  // a turn the ears could not write in this app's own script is handed over through here
  const misheardRef = useRef(onMisheard);
  misheardRef.current = onMisheard;

  // a turn carries the pictures the answer came with, where it came with any, so the screen can
  // stand each one at the word it belongs to and again below the answer
  const pushTurn = useCallback((role, text, pictures, source) => {
    // a turn carries the pictures the answer came with, and the source it was given from where it
    // was given from something looked up on the internet, so the screen can stand each picture at
    // the word it belongs to and show where the answer came from underneath it
    setTurns((prev) => [...prev, { role, text, pictures: pictures || [], source: source || null }]);
    turnRef.current?.(role, text);
  }, []);

  const backToListening = useCallback(() => {
    setStatus(activeRef.current ? "listening" : "idle");
  }, []);

  /**
   * One turn — written or heard — put to the Kibembe assistant. The answer it grounds in the saved
   * Word Bank is the line that comes back; where a call is open, that same line is read out loud.
   */
  const answer = useCallback(
    async (said) => {
      const line = String(said || "").trim();
      if (!line) return;
      pushTurn("user", line);
      setStatus("thinking");
      try {
        const res = await base44.functions.invoke("chatWithKibembeAssistant", { message: line });
        const data = res?.data || {};
        if (data.error) {
          setError(data.error);
          return;
        }
        const draft = String(data.reply || "").trim();
        if (!draft) return;
        // the pictures the admin saved beside the words this answer is made of ride with it
        const pictures = Array.isArray(data.pictures) ? data.pictures : [];
        // Sadiki AI reads the answer before the person is given it, and what stands is what he hands
        // back; where he could not be asked at all, the answer the assistant wrote stands instead
        const reviewed = await reviewAnswer(line, draft);
        const reply = reviewed || draft;
        if (!reviewed) setNotice(REVIEW_MISSED);
        pushTurn("assistant", reply, pictures, data.source || null);
        // the answer has been given, so it is counted against the allowance
        answeredRef.current?.();
        const call = callRef.current;
        if (!call) return;
        setStatus("speaking");
        const spoken = await call.speak(reply);
        if (!spoken) setNotice(NO_VOICE);
        // the answer has been read out in full: one voice turn, done
        else noteVoiceTurn();
      } catch (err) {
        setError(COULD_NOT_ASK);
      } finally {
        backToListening();
      }
    },
    [backToListening, pushTurn]
  );

  const queueTurn = useCallback(
    (text) => {
      const said = String(text || "").trim();
      if (!said) return;
      // Ebembe written down as Chinese or Japanese words is an answer to nothing: that turn is
      // handed over where a screen is waiting to take it, and refused plainly where it is not
      if (isMisheard(said)) {
        if (misheardRef.current) {
          misheardRef.current(said);
          return;
        }
        setError(MISHEARD);
        return;
      }
      chainRef.current = chainRef.current.then(() => answer(said)).catch(() => {});
    },
    [answer]
  );

  /** A written turn: put to the assistant in the same order as the spoken ones. */
  const ask = useCallback(
    async (text, onAnswered) => {
      const said = String(text || "").trim();
      if (!said) return;
      if (onAnswered) answeredRef.current = onAnswered;
      await answer(said);
    },
    [answer]
  );

  const handleSpeaking = useCallback((on) => {
    if (!activeRef.current) return;
    setStatus(on ? "speaking" : "listening");
  }, []);

  const handleAgentText = useCallback(() => {
    setNotice((was) => (was === NO_VOICE ? "" : was));
  }, []);

  /** A failure is named for the stage it happened at, so nothing is left to be guessed at. */
  const handleError = useCallback((stage, message) => {
    if (!activeRef.current) return;
    if (stage === "response") setNotice(message);
    else setError(`${stageLabel(stage)}: ${message}`);
  }, []);

  /** The phone held the sound back: the next touch is what starts it. */
  const handlePlaybackBlocked = useCallback(() => {
    if (!activeRef.current) return;
    setNotice(TOUCH_TO_HEAR);
    if (nudgeRef.current) return;
    const nudge = () => {
      document.removeEventListener("pointerdown", nudge);
      nudgeRef.current = null;
      callRef.current?.resumeAudio();
      setNotice("");
    };
    nudgeRef.current = nudge;
    document.addEventListener("pointerdown", nudge);
  }, []);

  /** The person's voice, drawn on the orb exactly as it is being spoken. */
  const watchLevel = useCallback((stream) => {
    const ctx = primedAudio();
    if (!ctx || !stream) return;
    try {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      analyserRef.current = analyser;
      levelBufRef.current = new Uint8Array(analyser.fftSize);
      const tick = () => {
        const node = analyserRef.current;
        const buf = levelBufRef.current;
        if (!node || !buf) return;
        node.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i += 1) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        levelRef.current = Math.min(1, Math.sqrt(sum / buf.length) * 3.5);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      // the orb keeps its own breathing when the microphone cannot be measured
    }
  }, []);

  const stopLevel = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    analyserRef.current = null;
    levelBufRef.current = null;
    levelRef.current = 0;
  }, []);

  const teardown = useCallback(() => {
    activeRef.current = false;
    callRef.current = null;
    stopLevel();

    const stream = streamRef.current;
    streamRef.current = null;
    if (stream) stream.getTracks().forEach((track) => track.stop());

    const audio = audioRef.current;
    audioRef.current = null;
    if (audio) {
      try {
        audio.pause();
      } catch (err) {
        // nothing playing
      }
      audio.srcObject = null;
    }

    if (nudgeRef.current) {
      document.removeEventListener("pointerdown", nudgeRef.current);
      nudgeRef.current = null;
    }

    setActive(false);
    setStatus("idle");
  }, [stopLevel]);

  const handleEnded = useCallback(() => {
    if (!activeRef.current) return;
    teardown();
    setNotice(ENDED);
  }, [teardown]);

  const start = useCallback(
    async ({ onAnswered } = {}) => {
      if (activeRef.current) return true;
      if (onAnswered) answeredRef.current = onAnswered;
      setError("");
      setNotice("");
      setStatus("connecting");

      // The speaker is opened inside the tap itself — the one moment a phone accepts it — so the
      // voice that comes back a moment later is allowed to be heard. Where the phone still holds it
      // back, the screen says so and the next touch is what starts it.
      const audio = new Audio();
      audio.autoplay = true;
      audio.setAttribute("playsinline", "");
      audioRef.current = audio;
      audio.play().catch(() => {});

      // ...and the microphone is asked for inside the same tap
      primeMic();
      primeAudio();

      let stream;
      try {
        stream = await claimMic();
      } catch (err) {
        audioRef.current = null;
        setError(micMessage(err));
        setStatus("idle");
        return false;
      }

      const call = new RealtimeCall({
        onUserText: queueTurn,
        onAgentText: handleAgentText,
        onSpeaking: handleSpeaking,
        onError: handleError,
        onPlaybackBlocked: handlePlaybackBlocked,
        onEnded: handleEnded,
      });

      try {
        await call.open({ stream, audioEl: audio });
      } catch (err) {
        await call.stop();
        stream.getTracks().forEach((track) => track.stop());
        audioRef.current = null;
        setError(
          err?.stage
            ? `${stageLabel(err.stage)}: ${err.message}`
            : err?.message || "The call could not start."
        );
        setStatus("idle");
        return false;
      }

      callRef.current = call;
      streamRef.current = stream;
      activeRef.current = true;
      watchLevel(stream);
      setActive(true);
      // only now, with the session open and its audio path ready, is the call called connected
      setStatus("listening");
      return true;
    },
    [handleAgentText, handleEnded, handleError, handlePlaybackBlocked, handleSpeaking, queueTurn, watchLevel]
  );

  const stop = useCallback(async () => {
    const call = callRef.current;
    teardown();
    if (call) await call.stop();
  }, [teardown]);

  // the microphone and the connection are never left open once the screen is gone
  useEffect(() => () => stop(), [stop]);

  return {
    status,
    speaking: status === "speaking",
    thinking: status === "thinking",
    micActive: active,
    turns,
    error,
    notice,
    levelRef,
    start,
    stop,
    ask,
  };
}