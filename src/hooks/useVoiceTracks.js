import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { mixTake, playBuffer, wavBlob } from "@/lib/rapAudio";
import { clipToBuffer, NO_MIC, startClipRecording } from "@/lib/clipRecorder";
import { detectPitch, snapToKey, shiftPitch } from "@/lib/pitchShift";
import { saveBlob, slug } from "@/lib/rapLines";
import {
  MAX_START,
  MAX_TRACKS,
  addAmbience,
  mixSeconds,
  nameForTrack,
  newTrack,
  renderTracks,
  sourceOf,
} from "@/lib/voiceTracks";

/**
 * The studio's own voice tracks.
 *
 * A person records straight into a lane, brings in a file, or has a cloned voice sing the lines;
 * each lane is then cut, turned up or down, and moved into the key. The whole thing is played and
 * kept as one sound over the beat the studio has. Everything is done on the phone.
 */
export default function useVoiceTracks({ settings, beat, title, onKeepMix }) {
  const [tracks, setTracks] = useState([]);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  // the piece taken hold of on the timeline, and the room the whole mix is heard in
  const [selectedId, setSelectedId] = useState(null);
  const [ambience, setAmbience] = useState(0.3);

  const micRef = useRef(null);
  const timerRef = useRef(0);
  const startedRef = useRef(0);
  const stopRef = useRef(null);

  const add = useCallback((track) => setTracks((prev) => (prev.length >= MAX_TRACKS ? prev : [...prev, track])), []);

  const patch = useCallback((id, changes) => {
    setTracks((prev) => prev.map((track) => (track.id === id ? { ...track, ...changes } : track)));
  }, []);

  /** The piece the timeline's own controls stand for. */
  const select = useCallback((id) => setSelectedId(id || null), []);

  /** Where the clip stands on the line, whether it was carried there by hand or nudged along. */
  const setStart = useCallback(
    (id, seconds) =>
      patch(id, {
        start: Math.max(0, Math.min(MAX_START, Math.round((Number(seconds) || 0) * 10) / 10)),
      }),
    [patch]
  );

  /** The nudge: the clip moved front or back by a tenth of a second, or by a whole one. */
  const nudge = useCallback(
    (id, delta) => {
      const track = tracks.find((one) => one.id === id);
      if (track) setStart(id, Math.max(0, Number(track.start || 0) + delta));
    },
    [setStart, tracks]
  );

  /** A lane folded down to its own line, so a session of many voices still reads at one look. */
  const toggleCollapsed = useCallback(
    (id) => {
      const track = tracks.find((one) => one.id === id);
      if (track) patch(id, { collapsed: !track.collapsed });
    },
    [patch, tracks]
  );

  /** A file the person already has, brought into a lane of its own. */
  const importFile = useCallback(
    async (file) => {
      setError("");
      setNote("");
      if (tracks.length >= MAX_TRACKS) {
        setError(`Studio inabeba sauti ${MAX_TRACKS} pekee. Ondoa moja kwanza.`);
        return;
      }
      setBusy("import");
      try {
        const buffer = await clipToBuffer(file);
        add(newTrack({ name: file.name.replace(/\.[^.]+$/, "").slice(0, 32), buffer, blob: file, kind: "import" }));
        setNote(`${file.name} imeingia kwenye studio.`);
      } catch (err) {
        setError("Faili hili la sauti halikuweza kusomwa. Jaribu faili jingine.");
      }
      setBusy("");
    },
    [add, tracks.length]
  );

  /** A vocal a cloned voice sang, brought into a lane of its own. */
  const addSung = useCallback(
    (buffer, name) => {
      if (tracks.length >= MAX_TRACKS) {
        setError(`Studio inabeba sauti ${MAX_TRACKS} pekee. Ondoa moja kwanza.`);
        return;
      }
      add(newTrack({ name: name.slice(0, 32) || "Sauti iliyoimbwa", buffer, kind: "clone" }));
      setNote(`${name} imeingia kwenye studio — unaweza kuikata na kuisawazisha.`);
    },
    [add, tracks.length]
  );

  const stopRecording = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = 0;
    }
    const mic = micRef.current;
    micRef.current = null;
    setRecording(false);
    if (!mic) return;

    try {
      const blob = await mic.stop();
      setBusy("read");
      const buffer = await clipToBuffer(blob);
      add(newTrack({ name: nameForTrack(tracks.length + 1), buffer, blob, kind: "record" }));
      setNote("Rekodi yako imeingia kwenye lane yake.");
    } catch (err) {
      setError("Rekodi haikuweza kusomwa. Jaribu tena.");
    }
    setBusy("");
  }, [add, tracks.length]);

  const startRecording = useCallback(async () => {
    if (recording || busy) return;
    setError("");
    setNote("");
    if (tracks.length >= MAX_TRACKS) {
      setError(`Studio inabeba sauti ${MAX_TRACKS} pekee. Ondoa moja kwanza.`);
      return;
    }
    try {
      micRef.current = await startClipRecording();
    } catch (err) {
      setError(NO_MIC);
      return;
    }
    setRecording(true);
    setSeconds(0);
    startedRef.current = Date.now();
    timerRef.current = window.setInterval(() => {
      setSeconds((Date.now() - startedRef.current) / 1000);
    }, 200);
  }, [busy, recording, tracks.length]);

  /** The mic and the timer are never left running once the screen is gone. */
  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      micRef.current?.cancel();
      stopRef.current?.();
    },
    []
  );

  const remove = useCallback((id) => {
    setTracks((prev) => prev.filter((track) => track.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  }, []);

  const clearTracks = useCallback(() => {
    setTracks([]);
    setSelectedId(null);
    setError("");
    setNote("");
  }, []);

  /** The pitch the lane was moved to: the clip is played again at that pitch, and the same length. */
  const setPitch = useCallback(
    async (id, semitones) => {
      const track = tracks.find((one) => one.id === id);
      if (!track) return;
      const value = Math.max(-7, Math.min(7, Math.round(semitones)));
      if (value === 0) {
        patch(id, { semitones: 0, shifted: null, tuned: false });
        return;
      }
      setBusy("pitch");
      try {
        const moved = shiftPitch(track.buffer, value);
        patch(id, { semitones: value, shifted: moved, trimEnd: Math.min(track.trimEnd, moved.duration) });
      } catch (err) {
        setError("Sauti haikuweza kupinduliwa. Jaribu tena.");
      }
      setBusy("");
    },
    [patch, tracks]
  );

  /**
   * The automatic setting: the lane's own pitch is measured, and the clip is carried to the nearest
   * note of the key that was picked. A clip already in the key is left exactly as it is.
   */
  const autoTune = useCallback(
    async (id, rootPc, modeId) => {
      const track = tracks.find((one) => one.id === id);
      if (!track) return;
      setBusy("tune");
      setError("");
      try {
        const source = sourceOf(track);
        const heard = detectPitch(source);
        const snapped = heard ? snapToKey(heard, rootPc, modeId) : null;
        if (!snapped || snapped.semitones === 0) {
          patch(id, { tuned: true, semitones: 0, shifted: null });
          setNote("Sauti hii iko kwenye key uliyochagua tayari — hakuna kilichobadilishwa.");
        } else {
          const moved = shiftPitch(track.buffer, snapped.semitones);
          patch(id, {
            semitones: snapped.semitones,
            shifted: moved,
            tuned: true,
            trimEnd: Math.min(track.trimEnd, moved.duration),
          });
          setNote(`${track.name} imepelekwa kwenye noti ${snapped.label} (semitones ${snapped.semitones}).`);
        }
      } catch (err) {
        setError("Sauti haikuweza kupimwa. Jaribu tena.");
      }
      setBusy("");
    },
    [patch, tracks]
  );

  /** The voice tracks over the beat, as one sound: what is played, and what is kept. */
  const buildMix = useCallback(async () => {
    // a studio with nothing to hear stays silent: no lanes at all, or every lane muted, makes no sound
    if (!tracks.some((track) => !track.muted && track.buffer)) return null;
    const span = mixSeconds(tracks, settings?.seconds || 8);
    const vocals = await renderTracks(tracks, span);
    const vocalBytes = await wavBlob(vocals).arrayBuffer();
    const mixed = await mixTake({
      vocalBytes,
      vocalKind: "voice",
      beatKind: settings?.beat || "none",
      beatBytes: beat?.bytes || null,
      bpm: settings?.bpm || 112,
      seconds: vocals.duration,
    });
    // the room is laid over the whole mix, so what is heard is what is kept and what is downloaded
    return addAmbience(mixed, ambience);
  }, [ambience, beat, settings, tracks]);

  const stopMix = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
  }, []);

  const playMix = useCallback(async () => {
    if (playing || busy) return;
    setError("");
    setNote("");
    setBusy("mix");
    try {
      const mixed = await buildMix();
      if (!mixed) {
        setNote("Bado hakuna sauti inayosikika — rekodi au pakia sauti kwanza.");
        return;
      }
      stopRef.current = playBuffer(mixed, { onEnd: () => setPlaying(false) });
      setPlaying(true);
    } catch (err) {
      setError("Mchanganyiko haukuweza kupigwa. Jaribu tena.");
    }
    setBusy("");
  }, [buildMix, busy, playing]);

  /** The mix, kept with the takes: the same sound everyone hears, uploaded once. */
  const saveMix = useCallback(async () => {
    if (busy || !onKeepMix) return;
    setError("");
    setNote("");
    setBusy("keep");
    try {
      const mixed = await buildMix();
      if (!mixed) {
        setNote("Bado hakuna sauti inayosikika — rekodi au pakia sauti kwanza.");
        setBusy("");
        return;
      }
      const name = `${slug(title || "Take yangu")}-sauti.wav`;
      const file = new File([wavBlob(mixed)], name, { type: "audio/wav" });
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      const kept = await onKeepMix({ audio_url: file_url, seconds: mixed.duration });
      setNote(
        kept
          ? "Mchanganyiko wako umehifadhiwa kwenye takes zako."
          : "Mchanganyiko ulipigwa, lakini haukuweza kuhifadhiwa."
      );
    } catch (err) {
      setError("Mchanganyiko haukuweza kuhifadhiwa. Unaweza kuupakua kama faili.");
    }
    setBusy("");
  }, [buildMix, busy, onKeepMix, title]);

  const downloadMix = useCallback(async () => {
    setBusy("mix");
    try {
      const mixed = await buildMix();
      if (mixed) saveBlob(wavBlob(mixed), `${slug(title || "Take yangu")}-sauti.wav`);
      else setNote("Bado hakuna sauti inayosikika — rekodi au pakia sauti kwanza.");
    } catch (err) {
      setError("Mchanganyiko haukuweza kuandaliwa. Jaribu tena.");
    }
    setBusy("");
  }, [buildMix, title]);

  return {
    tracks,
    recording,
    seconds,
    playing,
    busy,
    error,
    note,
    max: MAX_TRACKS,
    selectedId,
    ambience,
    patch,
    select,
    setStart,
    nudge,
    toggleCollapsed,
    setAmbience,
    remove,
    clearTracks,
    startRecording,
    stopRecording,
    importFile,
    addSung,
    setPitch,
    autoTune,
    playMix,
    stopMix,
    saveMix,
    downloadMix,
  };
}