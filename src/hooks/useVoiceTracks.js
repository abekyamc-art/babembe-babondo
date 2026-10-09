import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  // where the playhead stands, in seconds, so pausing and carrying on is read on the line itself
  const [position, setPosition] = useState(0);
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
  // the place the playhead stands at, read by the controls without waiting for a re-render
  const positionRef = useRef(0);
  // the place the playhead was last drawn at, so the screen is not redrawn for every frame
  const shownRef = useRef(0);
  // the mix as it was last built, so play after a pause carries on instead of rendering it again
  const mixRef = useRef(null);

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

  /**
   * What the mix is made of, as it stands. A mix already built for exactly this session is used
   * again, so the transport never renders the whole thing afresh merely to carry on playing.
   */
  const mixKey = useMemo(
    () =>
      JSON.stringify([
        ambience,
        beat?.name || "",
        settings?.beat || "",
        settings?.bpm || 112,
        settings?.seconds || 8,
        tracks.map((track) => [
          track.id,
          track.start,
          track.trimStart,
          track.trimEnd,
          track.volume,
          track.semitones,
          track.muted,
          track.solo,
        ]),
      ]),
    [ambience, beat, settings, tracks]
  );

  /** How long the session runs as the lanes stand now: the ruler and the playhead read against it. */
  const mixLength = useMemo(() => mixSeconds(tracks, settings?.seconds || 8), [tracks, settings]);

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

  /** The mix built once and kept, so playing again after a pause is instant. */
  const renderMix = useCallback(async () => {
    if (mixRef.current?.key === mixKey) return mixRef.current.buffer;
    const mixed = await buildMix();
    mixRef.current = mixed ? { key: mixKey, buffer: mixed } : null;
    return mixed;
  }, [buildMix, mixKey]);

  /** The mix played from wherever the playhead stands, so play carries on from a pause. */
  const startFrom = useCallback(
    async (from) => {
      setBusy("mix");
      try {
        const mixed = await renderMix();
        if (!mixed) {
          setNote("Bado hakuna sauti inayosikika — rekodi au pakia sauti kwanza.");
        } else {
          const at = Math.max(0, Math.min(mixed.duration - 0.05, Number(from) || 0));
          positionRef.current = at;
          setPosition(at);
          stopRef.current = playBuffer(mixed, {
            offset: at,
            onTime: (seconds) => {
              positionRef.current = seconds;
              // the playhead is drawn ten times a second rather than sixty: it reads the same on the
              // line, and the studio is not redrawn sixty times a second while it plays
              if (Math.abs(seconds - shownRef.current) >= 0.1) {
                shownRef.current = seconds;
                setPosition(seconds);
              }
            },
            onEnd: () => {
              stopRef.current = null;
              setPlaying(false);
              positionRef.current = 0;
              setPosition(0);
            },
          });
          setPlaying(true);
        }
      } catch (err) {
        setError("Mchanganyiko haukuweza kupigwa. Jaribu tena.");
      }
      setBusy("");
    },
    [renderMix]
  );

  const playMix = useCallback(() => {
    if (playing || busy) return;
    setError("");
    setNote("");
    const end = mixRef.current?.buffer.duration || mixLength;
    const at = positionRef.current;
    startFrom(at > 0.05 && at < end - 0.15 ? at : 0);
  }, [busy, mixLength, playing, startFrom]);

  /** Pause: the sound stops where it stands and the playhead keeps its place to carry on from. */
  const pauseMix = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
    // the playhead is put exactly where the sound was held, so the place is read on the line itself
    shownRef.current = positionRef.current;
    setPosition(positionRef.current);
  }, []);

  /** Stop: the sound stops and the playhead goes back to the head of the session. */
  const stopMix = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
    positionRef.current = 0;
    setPosition(0);
  }, []);

  /** Anywhere on the line: the playhead is sent there, and carried on from there if it was playing. */
  const seek = useCallback(
    (seconds) => {
      const at = Math.max(0, Math.min(mixLength, Number(seconds) || 0));
      positionRef.current = at;
      setPosition(at);
      if (playing) {
        stopRef.current?.();
        stopRef.current = null;
        setPlaying(false);
        startFrom(at);
      }
    },
    [mixLength, playing, startFrom]
  );

  /** The mix, kept with the takes: the same sound everyone hears, uploaded once. */
  const saveMix = useCallback(async () => {
    if (busy || !onKeepMix) return;
    setError("");
    setNote("");
    setBusy("keep");
    try {
      const mixed = await renderMix();
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
  }, [busy, onKeepMix, renderMix, title]);

  const downloadMix = useCallback(async () => {
    setBusy("mix");
    try {
      const mixed = await renderMix();
      if (mixed) saveBlob(wavBlob(mixed), `${slug(title || "Take yangu")}-sauti.wav`);
      else setNote("Bado hakuna sauti inayosikika — rekodi au pakia sauti kwanza.");
    } catch (err) {
      setError("Mchanganyiko haukuweza kuandaliwa. Jaribu tena.");
    }
    setBusy("");
  }, [renderMix, title]);

  return {
    tracks,
    recording,
    seconds,
    playing,
    position,
    mixLength,
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
    pauseMix,
    stopMix,
    seek,
    saveMix,
    downloadMix,
  };
}