import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { primedAudio, primeAudio } from "@/lib/audioUnlock";
import { noteVoiceTurn } from "@/lib/kpiEvents";
import { claimMic, dropMic, micMessage, primeMic } from "@/lib/micAccess";
import { isMisheard, isRealTurn, SAY_AGAIN_KIBEMBE, SAY_AGAIN_TURN } from "@/lib/misheardSpeech";
import { recordTurn } from "@/lib/voiceTurn";
// the app's own ears, the same reader every voice feature of the app listens through
import { hearClip } from "@/lib/voiceBank";

/**
 * The companion's own call: the microphone opened on the very conversation the written chat stands on.
 *
 * The person speaks, the app's own ears write the turn down, and that turn is put to Gloire AI's own
 * agent — the same conversation, the same tools and the same law of truth as the writing below it. The
 * answer the companion writes is the answer that is given: it is read out in the app's own voice, in
 * the order it was written, and the call begins listening again the moment that voice stops.
 *
 * Nothing is invented on the way through: a turn the ears could not write down as words is asked for
 * again, a turn that came back in a script nobody here speaks is refused, and an answer whose voice
 * could not be made is said plainly rather than passed off as spoken.
 */

// how long the call waits for the person to begin a turn before it says nobody spoke
const OPEN_MS = 12000;
// how long the companion's answer must stand still before it is read out, so a half-written line is
// never spoken over
const SETTLE_MS = 900;

const NO_TURN = "Didn't hear anything — tap Start Call and say it again.";
const COULD_NOT_HEAR = "That turn couldn't be heard — say it again.";
const COULD_NOT_ASK = "The companion couldn't be reached — say it again.";
const NO_VOICE = "The answer came back, but the voice could not read it out.";
const NO_RECORDER = "This phone can't record a turn — type your message below instead.";

export default function useCompanionCall({ messages, send }) {
  const [status, setStatus] = useState("idle");
  const [micActive, setMicActive] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const activeRef = useRef(false);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const levelRef = useRef(0);
  const analyserRef = useRef(null);
  const levelBufRef = useRef(null);
  const rafRef = useRef(0);
  // the conversation as it stands, read when an answer is waited on
  const messagesRef = useRef(messages);
  // the turn waiting on the companion's answer, and the answer that stood when it was sent
  const waitingRef = useRef(null);
  const settleRef = useRef(0);

  useEffect(() => {
    messagesRef.current = messages;
    const waiting = waitingRef.current;
    if (!waiting) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || !String(last.content || "").trim()) return;
    // the answer that was already on the screen belongs to the turn before this one
    if (last.id && last.id === waiting.after) return;
    // the answer is written as it streams, so it is waited on until it stops moving
    clearTimeout(settleRef.current);
    settleRef.current = setTimeout(() => {
      const newest = [...messagesRef.current]
        .reverse()
        .find((one) => one.role === "assistant" && String(one.content || "").trim());
      const held = waitingRef.current;
      if (!newest || !held) return;
      waitingRef.current = null;
      held.resolve(String(newest.content));
    }, SETTLE_MS);
  }, [messages]);

  /** The person's voice, measured so a turn is opened by speech and closed by its own quiet. */
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
      // a microphone that cannot be measured is still heard; only its meter is missing
    }
  }, []);

  const stopLevel = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    analyserRef.current = null;
    levelBufRef.current = null;
    levelRef.current = 0;
  }, []);

  const stop = useCallback(() => {
    activeRef.current = false;
    clearTimeout(settleRef.current);
    settleRef.current = 0;
    // a turn still waiting on an answer is let go, so the listening that follows it unwinds
    waitingRef.current?.resolve("");
    waitingRef.current = null;

    const stream = streamRef.current;
    streamRef.current = null;
    if (stream) stream.getTracks().forEach((track) => track.stop());
    dropMic();

    const audio = audioRef.current;
    audioRef.current = null;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      try {
        audio.pause();
      } catch (err) {
        // nothing was playing
      }
      audio.removeAttribute("src");
    }

    stopLevel();
    setMicActive(false);
    setStatus("idle");
  }, [stopLevel]);

  /** The answer the companion has just written, read out in the app's own voice. */
  const speak = useCallback(async (line) => {
    const audio = audioRef.current;
    if (!audio) return;
    let url = "";
    try {
      const res = await base44.functions.invoke("kibembeVoice", { text: line });
      url = String(res?.data?.audio_url || "");
    } catch (err) {
      url = "";
    }
    if (!url) {
      setNotice(NO_VOICE);
      return;
    }
    if (!activeRef.current) return;

    setStatus("speaking");
    const done = new Promise((resolve) => {
      audio.onended = resolve;
      audio.onerror = resolve;
    });
    audio.src = url;
    try {
      await audio.play();
    } catch (err) {
      audio.onended = null;
      audio.onerror = null;
      // the phone held the sound back: the answer is on the screen and the next tap lets it through
      setNotice("Tap the screen to let the answer be heard.");
      return;
    }
    await done;
    audio.onended = null;
    audio.onerror = null;
    // the answer has been read out in full: one voice turn, done
    noteVoiceTurn();
  }, []);

  /** One heard turn put to the companion, and its own answer read out. */
  const ask = useCallback(
    async (text) => {
      setStatus("thinking");
      const newest = [...messagesRef.current].reverse().find((one) => one.role === "assistant");
      const answered = new Promise((resolve) => {
        waitingRef.current = { resolve, after: newest?.id || "" };
      });
      try {
        await send(text);
      } catch (err) {
        waitingRef.current = null;
        setError(COULD_NOT_ASK);
        return;
      }
      const reply = await answered;
      if (!activeRef.current || !reply) return;
      await speak(reply);
    },
    [send, speak]
  );

  /** The call itself: one turn after another, from the microphone to the companion and back. */
  const listen = useCallback(
    async (stream) => {
      while (activeRef.current) {
        setStatus("listening");
        const turn = await recordTurn({ stream, level: () => levelRef.current, openMs: OPEN_MS });
        if (!activeRef.current) return;

        if (!turn.blob) {
          if (turn.broken) {
            setError(NO_RECORDER);
            stop();
            return;
          }
          // nothing was said at all: the call is over, and the person is told plainly
          stop();
          setNotice(NO_TURN);
          return;
        }

        setStatus("thinking");
        let heard = "";
        try {
          heard = await hearClip(turn.blob);
        } catch (err) {
          if (!activeRef.current) return;
          setError(COULD_NOT_HEAR);
          continue;
        }
        if (!activeRef.current) return;

        // a breath of the room written down as words is no turn, and a turn that came back in a
        // script nobody here speaks is not the person's words: both are asked for again
        if (!isRealTurn(heard)) {
          setNotice(SAY_AGAIN_TURN);
          continue;
        }
        if (isMisheard(heard)) {
          setNotice(SAY_AGAIN_KIBEMBE);
          continue;
        }

        await ask(heard);
        if (!activeRef.current) return;
      }
    },
    [ask, stop]
  );

  const start = useCallback(async () => {
    if (activeRef.current) return true;
    setError("");
    setNotice("");
    setStatus("connecting");

    // the speaker is opened inside the tap itself, so the answer that comes back a moment later is
    // allowed to be heard
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
      dropMic();
      audioRef.current = null;
      setError(micMessage(err));
      setStatus("idle");
      return false;
    }

    streamRef.current = stream;
    activeRef.current = true;
    watchLevel(stream);
    setMicActive(true);
    setStatus("listening");
    listen(stream);
    return true;
  }, [listen, watchLevel]);

  // the microphone is never left listening once the screen is gone
  useEffect(() => () => stop(), [stop]);

  return {
    status,
    speaking: status === "speaking",
    thinking: status === "thinking",
    micActive,
    error,
    notice,
    start,
    stop,
  };
}