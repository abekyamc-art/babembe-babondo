import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { primedAudio, primeAudio, resumeAudioOnTouch } from "@/lib/audioUnlock";
import { claimMic, micMessage, primeMic } from "@/lib/micAccess";
import { IN_RATE, bytesToBase64, floatToPcm16, lift, resample, wavBytes } from "@/lib/pcmAudio";

/**
 * The voice panel's call. A spoken turn is heard by the app's own ears, put to the very same
 * Kibembe assistant the typed chat uses — the same rules, the same Word Bank, the same answering —
 * and the answer it writes is read back out loud. Nothing about the assistant is changed or
 * repeated here: this hook only carries a turn in and an answer out.
 *
 * Only ever mounted while the panel is open, so the microphone is never held by a screen nobody
 * is looking at.
 */

// a soft voice at arm's length is a turn as much as a loud one
const VOICE_LEVEL = 0.012;
// a turn runs until this much quiet has passed, and is never kept longer than one turn may run
const TURN_END_MS = 1000;
const TURN_MAX_MS = 30000;
// a tap, a cough or a door is not a turn
const MIN_TURN_S = 0.4;
// ears that hang are not waited on forever, and neither is a voice that will not play
const HEAR_MS = 15000;
const SPEAK_MAX_MS = 30000;
const START_WAIT_MS = 1500;

const COULD_NOT_ASK = "The assistant could not be reached. Please try again.";
const NO_VOICE = "The words came back, but they couldn't be read out loud.";
const DIDNT_CATCH = "Didn't catch that — say it again.";
const TOUCH_TO_HEAR = "Touch the screen and he'll start listening.";
const NO_SOUND = "This phone can't open the sound a call needs.";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function useKibembeVoice() {
  const [active, setActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [status, setStatus] = useState("idle");
  const [turns, setTurns] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const ctxRef = useRef(null);
  const streamRef = useRef(null);
  const nodesRef = useRef([]);
  const analyserRef = useRef(null);
  const levelBufRef = useRef(null);
  const rafRef = useRef(0);
  const audioRef = useRef(null);
  const offTouchRef = useRef(null);

  const activeRef = useRef(false);
  const mutedRef = useRef(false);
  const speakingRef = useRef(false);
  const captureRef = useRef(false);
  const framesRef = useRef([]);
  const lastVoiceRef = useRef(0);
  const captureFromRef = useRef(0);
  // one turn is read at a time
  const readingRef = useRef(false);

  const pushTurn = useCallback((role, text) => {
    setTurns((prev) => [...prev, { role, text }]);
  }, []);

  /** How loud the room is right now, as the call hears it. */
  const level = useCallback(() => {
    const analyser = analyserRef.current;
    const buf = levelBufRef.current;
    if (!analyser || !buf) return 0;
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i += 1) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    return Math.min(1, Math.sqrt(sum / buf.length) * 3.5);
  }, []);

  /**
   * The answer, said out loud. The words are already on the panel whatever this does, so a voice
   * that cannot be made or played is said plainly instead of losing the answer.
   */
  const speak = useCallback(async (text) => {
    speakingRef.current = true;
    setStatus("speaking");
    let url = "";
    try {
      const res = await base44.functions.invoke("kibembeVoice", { text });
      url = String(res?.data?.audio_url || "");
      if (!url) setNotice(NO_VOICE);
    } catch (err) {
      setNotice(NO_VOICE);
    }

    if (!url || !activeRef.current) {
      speakingRef.current = false;
      return;
    }

    await new Promise((resolve) => {
      const audio = new Audio(url);
      audioRef.current = audio;
      let timer = 0;
      const finish = () => {
        clearTimeout(timer);
        resolve();
      };
      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch(finish);
      timer = setTimeout(finish, SPEAK_MAX_MS);
    });

    const audio = audioRef.current;
    audioRef.current = null;
    if (audio) {
      try {
        audio.pause();
      } catch (err) {
        // already stopped
      }
    }
    speakingRef.current = false;
  }, []);

  /**
   * The person's turn, taken from what was captured and put to the assistant. The ears write it
   * down, the same Kibembe assistant the typed chat uses answers it, and the answer is read out.
   */
  const readTurn = useCallback(async () => {
    if (readingRef.current) return;
    captureRef.current = false;
    const frames = framesRef.current;
    framesRef.current = [];
    const total = frames.reduce((count, frame) => count + frame.length, 0);
    if (!total) return;

    const rate = ctxRef.current?.sampleRate || 48000;
    if (total < rate * MIN_TURN_S) return;

    readingRef.current = true;
    const joined = new Float32Array(total);
    let at = 0;
    frames.forEach((frame) => {
      joined.set(frame, at);
      at += frame.length;
    });
    const samples = floatToPcm16(lift(resample(joined, rate, IN_RATE)));

    setNotice("");
    setStatus("thinking");
    try {
      const heard = await Promise.race([
        base44.functions.invoke("helperListen", { audio: bytesToBase64(wavBytes(samples, IN_RATE)) }),
        wait(HEAR_MS).then(() => null),
      ]);
      if (!activeRef.current) return;
      const said = String(heard?.data?.text || "").trim();
      if (!said) {
        setNotice(DIDNT_CATCH);
        return;
      }
      pushTurn("user", said);

      // the very same assistant the written chat asks: its own rules, its own Word Bank, untouched
      const ans = await base44.functions.invoke("chatWithKibembeAssistant", { message: said });
      if (!activeRef.current) return;
      const data = ans?.data || {};
      if (data.error) {
        setError(data.error);
        return;
      }
      const reply = String(data.reply || "").trim();
      if (!reply) return;
      pushTurn("assistant", reply);
      await speak(reply);
    } catch (err) {
      if (activeRef.current) setError(COULD_NOT_ASK);
    } finally {
      readingRef.current = false;
      if (activeRef.current) setStatus(mutedRef.current ? "muted" : "listening");
    }
  }, [pushTurn, speak]);

  /**
   * The room is watched while nothing is being answered: a turn runs from the first voice heard
   * until a breath of quiet, and while the answer is playing nothing is captured — the phone's own
   * speaker is never taken for the person talking.
   */
  const loop = useCallback(() => {
    if (!activeRef.current) return;
    const now = performance.now();
    if (!speakingRef.current && !mutedRef.current && !readingRef.current) {
      const loud = level();
      if (!captureRef.current) {
        if (loud > VOICE_LEVEL) {
          captureRef.current = true;
          captureFromRef.current = now;
          lastVoiceRef.current = now;
          framesRef.current = [];
        }
      } else {
        if (loud > VOICE_LEVEL) lastVoiceRef.current = now;
        const quietFor = now - Math.max(lastVoiceRef.current, captureFromRef.current);
        if (quietFor >= TURN_END_MS || now - captureFromRef.current >= TURN_MAX_MS) readTurn();
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [level, readTurn]);

  const start = useCallback(async () => {
    if (activeRef.current) return;
    setError("");
    setNotice("");
    setStatus("connecting");

    // the microphone and the sound are asked for inside the tap itself — the one moment a phone
    // accepts that ask — and the call listens through what the tap opened
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

    let ctx = primedAudio();
    if (!ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      ctx = Ctor ? new Ctor() : null;
    }
    if (!ctx) {
      stream.getTracks().forEach((track) => track.stop());
      setError(NO_SOUND);
      setStatus("idle");
      return;
    }
    if (ctx.state === "suspended") {
      await Promise.race([ctx.resume().catch(() => {}), wait(START_WAIT_MS)]);
    }

    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    const processor = ctx.createScriptProcessor(2048, 1, 1);
    processor.onaudioprocess = (event) => {
      if (!activeRef.current || !captureRef.current) return;
      if (mutedRef.current || speakingRef.current || readingRef.current) return;
      // about half a minute of sound: one turn is never carried past what it may run
      if (framesRef.current.length >= 800) return;
      framesRef.current.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    };
    // the processor is kept alive without the microphone ever being played back
    const sink = ctx.createGain();
    sink.gain.value = 0;
    source.connect(analyser);
    source.connect(processor);
    processor.connect(sink);
    sink.connect(ctx.destination);

    ctxRef.current = ctx;
    streamRef.current = stream;
    analyserRef.current = analyser;
    levelBufRef.current = new Uint8Array(analyser.fftSize);
    nodesRef.current = [processor, source, analyser, sink];

    activeRef.current = true;
    mutedRef.current = false;
    speakingRef.current = false;
    readingRef.current = false;
    captureRef.current = false;
    framesRef.current = [];
    setMuted(false);
    setActive(true);
    setStatus("listening");
    rafRef.current = requestAnimationFrame(loop);

    // a phone still holding the sound back listens on the person's next touch, and is told so
    if (ctx.state !== "running") {
      setNotice(TOUCH_TO_HEAR);
      offTouchRef.current = resumeAudioOnTouch(() => setNotice(""));
    }
  }, [loop]);

  const stop = useCallback(() => {
    activeRef.current = false;
    captureRef.current = false;
    readingRef.current = false;
    speakingRef.current = false;
    framesRef.current = [];

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    if (offTouchRef.current) {
      offTouchRef.current();
      offTouchRef.current = null;
    }

    const audio = audioRef.current;
    audioRef.current = null;
    if (audio) {
      try {
        audio.pause();
      } catch (err) {
        // already stopped
      }
    }

    nodesRef.current.forEach((node) => {
      try {
        node.disconnect();
      } catch (err) {
        // already detached
      }
    });
    nodesRef.current = [];
    analyserRef.current = null;
    levelBufRef.current = null;

    const stream = streamRef.current;
    streamRef.current = null;
    if (stream) stream.getTracks().forEach((track) => track.stop());

    const ctx = ctxRef.current;
    ctxRef.current = null;
    if (ctx && ctx.state !== "closed") ctx.close().catch(() => {});

    setActive(false);
    setMuted(false);
    setStatus("idle");
  }, []);

  /** Mute stops the microphone being heard; the answer already on its way is still said. */
  const toggleMute = useCallback(() => {
    if (!activeRef.current) return;
    const next = !mutedRef.current;
    mutedRef.current = next;
    if (next) {
      captureRef.current = false;
      framesRef.current = [];
    }
    setMuted(next);
    setStatus(next ? "muted" : speakingRef.current ? "speaking" : "listening");
  }, []);

  // the microphone is never left listening once the panel is gone
  useEffect(() => () => stop(), [stop]);

  return { active, muted, status, turns, error, notice, start, stop, toggleMute };
}