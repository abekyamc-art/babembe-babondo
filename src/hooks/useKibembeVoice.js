import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { primeAudio } from "@/lib/audioUnlock";
import { claimMic, micMessage, primeMic } from "@/lib/micAccess";
import RealtimeCall, { stageLabel } from "@/lib/realtimeCall";

/**
 * The voice panel's call. The person's voice goes out over a real Realtime connection and the turn
 * the service writes down is put to the very same Kibembe assistant the typed chat uses — the same
 * rules, the same Word Bank, the same answering. The answer that comes back is the verified one,
 * and the voice connection reads that line aloud. Nothing about the assistant is changed here.
 *
 * Only ever mounted while the panel is open, so the microphone is never held by a screen nobody is
 * looking at.
 */

const COULD_NOT_ASK = "The assistant could not be reached. Please try again.";
const NO_VOICE = "The answer came back, but the voice could not read it out.";
const TOUCH_TO_HEAR = "Tap the screen to let the sound through.";
const ENDED = "The voice call ended. Tap Start Call to begin again.";

export default function useKibembeVoice() {
  const [active, setActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [status, setStatus] = useState("idle");
  const [turns, setTurns] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const callRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const nudgeRef = useRef(null);
  const activeRef = useRef(false);
  const mutedRef = useRef(false);
  // turns are answered one after another, so a turn spoken while one is being answered is not lost
  const chainRef = useRef(Promise.resolve());

  const pushTurn = useCallback((role, text) => {
    setTurns((prev) => [...prev, { role, text }]);
  }, []);

  const backToListening = useCallback(() => {
    if (activeRef.current) setStatus(mutedRef.current ? "muted" : "listening");
  }, []);

  /**
   * The person's turn, as the voice service wrote it down: put to the Kibembe assistant, and the
   * answer it grounds in the Word Bank is the line that is read out loud.
   */
  const handleTurn = useCallback(
    async (said) => {
      if (!activeRef.current) return;
      pushTurn("user", said);
      setStatus("thinking");
      try {
        const res = await base44.functions.invoke("chatWithKibembeAssistant", { message: said });
        if (!activeRef.current) return;
        const data = res?.data || {};
        if (data.error) {
          setError(data.error);
          return;
        }
        const reply = String(data.reply || "").trim();
        if (!reply) return;
        pushTurn("assistant", reply);
        const call = callRef.current;
        if (!call) return;
        setStatus("speaking");
        const spoken = await call.speak(reply);
        if (!spoken) setNotice(NO_VOICE);
      } catch (err) {
        if (activeRef.current) setError(COULD_NOT_ASK);
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
      chainRef.current = chainRef.current.then(() => handleTurn(said)).catch(() => {});
    },
    [handleTurn]
  );

  const handleSpeaking = useCallback((on) => {
    if (!activeRef.current) return;
    setStatus(on ? "speaking" : mutedRef.current ? "muted" : "listening");
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

  const teardown = useCallback(() => {
    activeRef.current = false;
    callRef.current = null;
    mutedRef.current = false;

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

    setMuted(false);
    setActive(false);
    setStatus("idle");
  }, []);

  const handleEnded = useCallback(() => {
    if (!activeRef.current) return;
    teardown();
    setNotice(ENDED);
  }, [teardown]);

  const start = useCallback(async () => {
    if (activeRef.current) return;
    setError("");
    setNotice("");
    setStatus("connecting");

    // The speaker is opened inside the tap itself — the one moment a phone accepts it — so the
    // voice that comes back a moment later is allowed to be heard. Where the phone still holds it
    // back, the panel says so and the next touch is what starts it.
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
      setError(micMessage(err));
      setStatus("idle");
      return;
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
      return;
    }

    callRef.current = call;
    streamRef.current = stream;
    activeRef.current = true;
    mutedRef.current = false;
    setMuted(false);
    setActive(true);
    // only now, with the session open and its audio path ready, is the call called connected
    setStatus("listening");
  }, [handleAgentText, handleEnded, handleError, handlePlaybackBlocked, handleSpeaking, queueTurn]);

  const stop = useCallback(async () => {
    const call = callRef.current;
    teardown();
    if (call) await call.stop();
  }, [teardown]);

  /** Mute stops the microphone being heard; the answer already on its way is still said. */
  const toggleMute = useCallback(() => {
    if (!activeRef.current) return;
    const next = !mutedRef.current;
    mutedRef.current = next;
    callRef.current?.mute(next);
    setMuted(next);
    setStatus(next ? "muted" : "listening");
  }, []);

  // the microphone and the connection are never left open once the panel is gone
  useEffect(() => () => stop(), [stop]);

  return { active, muted, status, turns, error, notice, start, stop, toggleMute };
}