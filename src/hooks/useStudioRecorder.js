import { useCallback, useEffect, useRef, useState } from "react";
import { audioGraph } from "@/lib/rapAudio";
import { holdBuffer, peakOf, scheduleClicks } from "@/lib/studioEngine";
import { appendRecoveryChunk, deleteRecovery, listRecoveries, putAudio, putRecovery } from "@/lib/studioStore";
import { openInput, writeRecording, inputMessage } from "@/lib/studioRecorder";
import { uid } from "@/lib/studioTracks";

const DRAW_MS = 70;

/**
 * Recording: the microphone, the count-in, the metronome, the level, and the writing down of what is
 * sung. Every couple of seconds the recording so far is put aside in the phone's store, so an
 * interruption — a call, a locked screen, a browser closed by accident — costs the last moment of the
 * take and never the take itself.
 */
export default function useStudioRecorder({ projectId, onFinished }) {
  const [state, setState] = useState("idle");
  const [count, setCount] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState({ rms: 0, peak: 0 });
  const [error, setError] = useState("");
  const [gain, setGain] = useState(1);
  const [monitor, setMonitor] = useState(false);
  const [pending, setPending] = useState([]);

  const input = useRef(null);
  const writer = useRef(null);
  const recovery = useRef("");
  const timers = useRef([]);
  const frame = useRef(0);
  const metronome = useRef(0);
  const startedAt = useRef(0);
  const recordingTrack = useRef("");
  const finished = useRef(onFinished);
  finished.current = onFinished;

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  const stopDrawing = () => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
  };

  /** A recording that never finished, found again when the song is opened. */
  const lookForRecovery = useCallback(async () => {
    try {
      const rows = await listRecoveries();
      setPending((rows || []).filter((row) => !row.project_id || row.project_id === projectId));
    } catch (err) {
      setPending([]);
    }
  }, [projectId]);

  useEffect(() => {
    lookForRecovery();
    return () => {
      clearTimers();
      stopDrawing();
      window.clearInterval(metronome.current);
      writer.current?.cancel();
      input.current?.close();
    };
  }, [lookForRecovery]);

  const openMicrophone = useCallback(async () => {
    if (input.current) {
      input.current.setGain(gain);
      input.current.setMonitor(monitor);
      return input.current;
    }
    const opened = await openInput({ gain, monitor });
    input.current = opened;
    return opened;
  }, [gain, monitor]);

  const closeMicrophone = useCallback(() => {
    input.current?.close();
    input.current = null;
  }, []);

  useEffect(() => {
    input.current?.setGain(gain);
  }, [gain]);

  useEffect(() => {
    input.current?.setMonitor(monitor);
  }, [monitor]);

  /** The level and the clock, drawn while a take is being made. */
  const drawWhileRecording = useCallback(() => {
    stopDrawing();
    let drawn = 0;
    const tick = () => {
      const now = performance.now();
      if (now - drawn > DRAW_MS) {
        drawn = now;
        setSeconds((Date.now() - startedAt.current) / 1000);
        setLevel(input.current?.level() || { rms: 0, peak: 0 });
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(
    async ({ trackId, bpm, signature, countInBars = 1, metronomeOn = true }) => {
      if (state === "counting" || state === "recording" || state === "saving") return false;
      setError("");
      setState("counting");
      try {
        const opened = await openMicrophone();
        const ctx = audioGraph();
        const perBar = Number(String(signature).split("/")[0]) || 4;
        const bars = Math.max(0, Math.round(countInBars));
        const beats = bars * perBar;
        const beatSeconds = 60 / Math.max(30, Number(bpm) || 90);

        if (metronomeOn && beats) {
          scheduleClicks(ctx, ctx.destination, { bpm, signature, beats });
          for (let i = 0; i < beats; i += 1) {
            timers.current.push(window.setTimeout(() => setCount(beats - i), i * beatSeconds * 1000));
          }
          await new Promise((resolve) => {
            timers.current.push(window.setTimeout(resolve, beats * beatSeconds * 1000));
          });
          setCount(0);
        }

        const id = uid("rec");
        recovery.current = id;
        const writing = writeRecording(opened.writeStream, {
          onChunk: (chunk) => {
            appendRecoveryChunk(id, chunk).catch(() => null);
          },
        });
        await putRecovery({
          id,
          project_id: projectId,
          track_id: trackId,
          mime: writing.mime,
          started_at: new Date().toISOString(),
          chunks: [],
          bytes: 0,
        }).catch(() => null);

        writer.current = writing;
        recordingTrack.current = trackId || "";
        startedAt.current = Date.now();
        setSeconds(0);
        setState("recording");
        drawWhileRecording();

        if (metronomeOn) {
          const click = () => scheduleClicks(ctx, ctx.destination, { bpm, signature, beats: perBar });
          click();
          metronome.current = window.setInterval(click, perBar * beatSeconds * 1000);
        }
        return true;
      } catch (err) {
        setState("error");
        setError(inputMessage(err));
        return false;
      }
    },
    [drawWhileRecording, openMicrophone, projectId, state]
  );

  /** The take, kept: the sound is stored under its own key, and the shape of it is read once here so
   *  the clip drawn on the timeline is the take itself and not a guess at it. */
  const finish = useCallback(async () => {
    const writing = writer.current;
    if (!writing) return null;
    setState("saving");
    stopDrawing();
    window.clearInterval(metronome.current);
    metronome.current = 0;

    const blob = await writing.stop();
    writer.current = null;
    const length = writing.seconds();
    const id = recovery.current;
    recovery.current = "";

    const sourceKey = uid("aud");
    let peak = 0;
    let duration = length;
    try {
      const ctx = audioGraph();
      const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
      holdBuffer(sourceKey, buffer);
      peak = peakOf(buffer);
      duration = buffer.duration || length;
    } catch (err) {
      peak = 0;
    }

    const take = {
      id: uid("take"),
      name: "",
      track_id: recordingTrack.current,
      source_key: sourceKey,
      seconds: Math.round(duration * 10) / 10,
      peak: Math.round(peak * 1000) / 1000,
      created_at: new Date().toISOString(),
    };

    try {
      await putAudio({
        id: sourceKey,
        project_id: projectId,
        name: `Take ${new Date().toLocaleTimeString()}`,
        mime: writing.mime,
        size: blob.size,
        created_at: take.created_at,
        blob,
      });
      if (id) await deleteRecovery(id).catch(() => null);
    } catch (err) {
      setError("storage");
    }

    setSeconds(0);
    setState("idle");
    finished.current?.(take);
    return take;
  }, [projectId]);

  const cancel = useCallback(() => {
    writer.current?.cancel();
    writer.current = null;
    window.clearInterval(metronome.current);
    metronome.current = 0;
    stopDrawing();
    if (recovery.current) deleteRecovery(recovery.current).catch(() => null);
    recovery.current = "";
    setState("idle");
    setSeconds(0);
    setCount(0);
  }, []);

  /** An interrupted recording, brought back onto the timeline as a take of its own. */
  const keepRecovery = useCallback(async (row) => {
    const blob = new Blob(row.chunks || [], { type: row.mime || "audio/webm" });
    const sourceKey = uid("aud");
    let peak = 0;
    let seconds = 0;
    try {
      const ctx = audioGraph();
      const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
      holdBuffer(sourceKey, buffer);
      peak = peakOf(buffer);
      seconds = buffer.duration || 0;
    } catch (err) {
      seconds = 0;
    }
    await putAudio({
      id: sourceKey,
      project_id: projectId,
      name: "Recovered take",
      mime: row.mime || "",
      size: blob.size,
      created_at: new Date().toISOString(),
      blob,
    });
    await deleteRecovery(row.id).catch(() => null);
    setPending((list) => list.filter((one) => one.id !== row.id));
    return {
      id: uid("take"),
      name: "Recovered",
      track_id: row.track_id || "",
      source_key: sourceKey,
      seconds: Math.round(seconds * 10) / 10,
      peak: Math.round(peak * 1000) / 1000,
      created_at: new Date().toISOString(),
    };
  }, [projectId]);

  const discardRecovery = useCallback(async (row) => {
    await deleteRecovery(row.id).catch(() => null);
    setPending((list) => list.filter((one) => one.id !== row.id));
  }, []);

  return {
    state,
    count,
    seconds,
    level,
    error,
    gain,
    monitor,
    pending,
    setGain,
    setMonitor,
    start,
    finish,
    cancel,
    closeMicrophone,
    keepRecovery,
    discardRecovery,
    recording: state === "recording",
  };
}