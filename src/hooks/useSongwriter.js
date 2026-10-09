import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { audioGraph, mixTake, wavBlob } from "@/lib/rapAudio";
import { scheduleBeat, timeLabel } from "@/lib/rapBeat";
import { saveBlob, slug } from "@/lib/rapLines";
import { songLines, writeSong } from "@/lib/songwriter";

/**
 * The songwriter, and the person's own voice on it.
 *
 * One request is written out as a whole song — its parts, its verses, its hook and the back-vocal
 * lines behind the lead — in the language the request itself asks for. Nothing is sung for them:
 * the studio plays the beat they chose, they perform the song into the microphone themselves, and
 * what they sang is laid over that beat and kept as their own file.
 */

// a recording shorter than this is a tap, not a song
const MIN_SECONDS = 4;
// what is said when the microphone cannot be opened at all
const NO_MIC = "Kipaza sauti hakipatikani. Ruhusu kipaza sauti kwenye browser, kisha jaribu tena.";

export default function useSongwriter({ settings, beat, user, onKeep }) {
  const [prompt, setPrompt] = useState("");
  const [song, setSong] = useState(null);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [take, setTake] = useState(null);
  const [kept, setKept] = useState(false);
  const [busy, setBusy] = useState("");

  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(0);
  // the beat under the performance, and the way it is stopped
  const offBeatRef = useRef(null);
  const startedRef = useRef(0);
  const spanRef = useRef(30);

  /** The beat the person performs to. The studio's own beat is written for exactly the span they
   *  perform, so it stops with them; their own beat simply loops until they do. */
  const openBeat = useCallback(
    async (span) => {
      const ctx = audioGraph();
      if (settings.beat === "none") return () => {};
      if (settings.beat === "app") {
        scheduleBeat(ctx, ctx.destination, { bpm: settings.bpm, seconds: span });
        return () => {};
      }
      if (!beat?.bytes) return () => {};
      const sample = await ctx.decodeAudioData(beat.bytes.slice(0));
      const src = ctx.createBufferSource();
      src.buffer = sample;
      src.loop = true;
      src.connect(ctx.destination);
      src.start();
      return () => {
        try {
          src.stop();
        } catch (err) {
          // the beat already ended with the performance
        }
      };
    },
    [beat, settings.beat, settings.bpm]
  );

  const closeBeat = useCallback(() => {
    const off = offBeatRef.current;
    offBeatRef.current = null;
    if (off) off();
  }, []);

  /** What they sang, laid over the beat that was playing: one file, kept on the phone. */
  const build = useCallback(
    async (blob) => {
      setBusy("mix");
      try {
        const bytes = await blob.arrayBuffer();
        const heard = await audioGraph().decodeAudioData(bytes.slice(0));
        const length = heard.duration;
        if (!length || length < MIN_SECONDS) {
          setError("Rekodi ni fupi mno — imba mistari kadhaa, kisha simamisha.");
          return;
        }
        const mixed = await mixTake({
          vocalBytes: bytes,
          vocalKind: "voice",
          beatKind: settings.beat,
          beatBytes: beat?.bytes || null,
          bpm: settings.bpm,
          seconds: length,
        });
        setTake({ buffer: mixed, seconds: length });
        setNote(`Rekodi yako iko tayari · ${timeLabel(length)}.`);
      } catch (err) {
        setError("Rekodi haikuweza kusomwa. Jaribu tena.");
      } finally {
        setBusy("");
      }
    },
    [beat, settings.beat, settings.bpm]
  );

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = 0;
    }
    const rec = recRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    else setRecording(false);
  }, []);

  /** The performance: the beat opens first, then the recording starts on it, and it ends with the
   *  span the person chose in the studio. */
  const startRecording = useCallback(async () => {
    if (!user || recording || busy) return;
    setError("");
    setNote("");
    setKept(false);
    setTake(null);

    const span = Math.max(MIN_SECONDS, Number(settings.seconds) || 30);
    spanRef.current = span;

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
          channelCount: 1,
        },
      });
    } catch (err) {
      setError(NO_MIC);
      return;
    }
    streamRef.current = stream;

    try {
      offBeatRef.current = await openBeat(span);
    } catch (err) {
      // a beat that cannot be opened is no reason the voice cannot be recorded: they perform
      // without it, and the beat is laid under them when the take is mixed
      offBeatRef.current = null;
    }

    const chunks = [];
    chunksRef.current = chunks;
    const rec = new MediaRecorder(stream);
    recRef.current = rec;
    rec.ondataavailable = (event) => {
      if (event.data?.size) chunks.push(event.data);
    };
    rec.onstop = () => {
      closeBeat();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recRef.current = null;
      setRecording(false);
      build(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
    };

    rec.start();
    setRecording(true);
    setSeconds(0);
    startedRef.current = Date.now();
    timerRef.current = window.setInterval(() => {
      const at = (Date.now() - startedRef.current) / 1000;
      setSeconds(at);
      if (at >= spanRef.current) stopRecording();
    }, 200);
  }, [build, busy, closeBeat, openBeat, recording, settings.seconds, stopRecording, user]);

  // the microphone and the beat are never left running once the screen is gone
  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      const rec = recRef.current;
      if (rec && rec.state !== "inactive") {
        try {
          rec.stop();
        } catch (err) {
          // the recording already ended
        }
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const off = offBeatRef.current;
      offBeatRef.current = null;
      if (off) off();
    },
    []
  );

  /** The song written for the request, in the language the request itself asks for. */
  const write = useCallback(async () => {
    if (writing || !user) return;
    setWriting(true);
    setError("");
    setNote("");
    setKept(false);
    setTake(null);
    try {
      const made = await writeSong({ prompt: prompt.trim(), bpm: settings.bpm });
      setSong(made);
      if (made.dropped) {
        setNote(
          `Wimbo umeandikwa — mistari ${made.dropped} imeachwa kwa kuwa na neno la Kibembe lisilothibitishwa.`
        );
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Wimbo haukuweza kuandikwa. Jaribu tena.");
    } finally {
      setWriting(false);
    }
  }, [prompt, settings.bpm, user, writing]);

  const title = song?.title || prompt.trim().slice(0, 40) || "Wimbo wangu";

  const downloadTake = useCallback(() => {
    if (!take) return;
    saveBlob(wavBlob(take.buffer), `${slug(title)}-sauti-yako.wav`);
  }, [take, title]);

  /** Their own performance, kept with the takes: the same file everyone hears, uploaded once. */
  const keepTrack = useCallback(async () => {
    if (!take || busy || kept) return;
    setBusy("keep");
    setError("");
    try {
      const name = `${slug(title)}-sauti-yako.wav`;
      const file = new File([wavBlob(take.buffer)], name, { type: "audio/wav" });
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      const saved = await onKeep?.({
        title,
        language: song?.language || settings.language,
        lines: songLines(song),
        wordsUsed: song?.wordsUsed || [],
        seconds: take.seconds,
        audio_url: file_url,
      });
      if (saved) {
        setKept(true);
        setNote("Rekodi yako imehifadhiwa kwenye takes zako.");
      } else {
        setError("Rekodi haikuweza kuhifadhiwa — unaweza kuipakua kama faili.");
      }
    } catch (err) {
      setError("Rekodi haikuweza kuhifadhiwa — unaweza kuipakua kama faili.");
    } finally {
      setBusy("");
    }
  }, [busy, kept, onKeep, settings.language, song, take, title]);

  return {
    prompt,
    setPrompt,
    song,
    writing,
    recording,
    seconds,
    take,
    kept,
    busy,
    error,
    note,
    write,
    startRecording,
    stopRecording,
    downloadTake,
    keepTrack,
  };
}