import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { primedAudio, primeAudio } from "@/lib/audioUnlock";
import { claimMic, micMessage, primeMic } from "@/lib/micAccess";
import { isMisheard, isRealTurn, SAY_AGAIN_TURN } from "@/lib/misheardSpeech";
import RealtimeCall, { stageLabel } from "@/lib/realtimeCall";
import { noteVoiceTurn } from "@/lib/kpiEvents";

/**
 * The Kibembe assistance screen's own assistant: the app's Kibembe assistant, answered from the
 * saved Word Bank on the server. A spoken turn goes out over a real Realtime connection and the words
 * the service writes down are put to `chatWithKibembeAssistant` — the same assistant the written
 * chat asks — and the answer that comes back is the answer that is given, exactly as the assistant
 * wrote it. A written turn is put to the same assistant and answered on screen the same way.
 */

const COULD_NOT_ASK = "The assistant could not be reached. Please try again.";
const NO_VOICE = "The answer came back, but the voice could not read it out.";
const TOUCH_TO_HEAR = "Tap the screen to let the sound through.";
const ENDED = "The call ended. Tap the phone to begin again.";
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
  // the app's own last answer, kept so a person asking for it again is given that very line back
  // rather than a new answer written for the ask
  const lastAgentRef = useRef("");
  // the several different people or artists the app put before the person, waiting on their answer:
  // they stand on the answer that asks which one is meant, and ride back in with their own turn, so
  // the one they chose is the one that is looked up
  const askedRef = useRef([]);
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
  const pushTurn = useCallback((role, text, pictures, source, choices) => {
    // a turn carries the pictures the answer came with, and the source it was given from where it
    // was given from something looked up on the internet, so the screen can stand each picture at
    // the word it belongs to and show where the answer came from underneath it — and, where several
    // people were found under names that look alike, the names themselves
    setTurns((prev) => [
      ...prev,
      {
        role,
        text,
        pictures: pictures || [],
        source: source || null,
        choices: choices || [],
      },
    ]);
    // the answer just given is kept here as well, so the person asking for it again gets that line
    if (role === "assistant") lastAgentRef.current = text;
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
        const res = await base44.functions.invoke("chatWithKibembeAssistant", {
          message: line,
          asked: askedRef.current,
          // the app's own last answer rides with the turn, so a person asking for it again is given
          // that very line back
          lastAgent: lastAgentRef.current,
        });
        const data = res?.data || {};
        if (data.error) {
          setError(data.error);
          return;
        }
        const draft = String(data.reply || "").trim();
        if (!draft) return;
        // the pictures the admin saved beside the words this answer is made of ride with it
        const pictures = Array.isArray(data.pictures) ? data.pictures : [];
        // the several different people or artists found under names that look alike: they stand on
        // this answer for the person to choose between, and ride back in with the turn that chooses
        const choices = Array.isArray(data.candidates) ? data.candidates : [];
        askedRef.current = choices.length >= 2 ? choices : [];
        // The answer the assistant wrote is the answer that is given: nothing reads it over first, so
        // nothing of it is re-worded, shortened or held back on its way to the screen.
        pushTurn("assistant", draft, pictures, data.source || null, choices);
        // the answer has been given, so it is counted against the allowance
        answeredRef.current?.();
        const call = callRef.current;
        if (!call) return;
        setStatus("speaking");
        const spoken = await call.speak(draft);
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
      // Nothing is answered from a breath of the room written down as words: a capture that carried
      // no turn of speech is dropped here, and the person is simply asked to say it again. This is
      // the same guard every spoken turn of the app passes through, so the same noise never becomes
      // a question here either.
      if (!isRealTurn(said)) {
        setNotice(SAY_AGAIN_TURN);
        return;
      }
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