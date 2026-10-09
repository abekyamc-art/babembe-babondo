import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Download, Library, Loader2, Music2, Plus, SlidersHorizontal, Sparkles, Upload } from "lucide-react";
import StudioShell from "@/components/studio/StudioShell";
import StudioTransport from "@/components/studio/StudioTransport";
import StudioTimeline from "@/components/studio/StudioTimeline";
import RecordPanel from "@/components/studio/RecordPanel";
import TakesList from "@/components/studio/TakesList";
import MixerPanel from "@/components/studio/MixerPanel";
import EffectsPanel from "@/components/studio/EffectsPanel";
import ExportPanel from "@/components/studio/ExportPanel";
import AddTrackSheet from "@/components/studio/AddTrackSheet";
import TrackSheet from "@/components/studio/TrackSheet";
import ClipInspector from "@/components/studio/ClipInspector";
import BeatLibrarySheet from "@/components/studio/BeatLibrarySheet";
import StudioRapSheet from "@/components/studio/StudioRapSheet";
import { useStudioText } from "@/components/studio/StudioLangProvider";
import useStudioProject from "@/hooks/useStudioProject";
import useStudioPlayback from "@/hooks/useStudioPlayback";
import useStudioRecorder from "@/hooks/useStudioRecorder";
import { heldBuffer, loadMissing } from "@/lib/studioEngine";
import { FX_BY_ID, defaultParams, presetChain } from "@/lib/studioEffects";
import { keepSource, readPickedFile, readSavedBeat } from "@/lib/studioImport";
import { deleteAudio } from "@/lib/studioStore";
import {
  formatClock,
  duplicateClip,
  newClip,
  newTrack,
  projectDuration,
  removeClip,
  snapTo,
  splitClip,
  uid,
  withClip,
} from "@/lib/studioTracks";

const TABS = [
  { id: "studio", labelKey: "record", Icon: Music2 },
  { id: "mixer", labelKey: "mixer", Icon: SlidersHorizontal },
  { id: "fx", labelKey: "effects", Icon: Sparkles },
  { id: "export", labelKey: "exportTab", Icon: Download },
];

/**
 * The studio itself. The transport and the timeline stand at the top and never leave; everything the
 * artist works with sits under them in one of four panes, so a lane can be shaped, a mix balanced, a
 * preset tried and the song exported without any of it being thrown away on the way.
 */
export default function StudioProject() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useStudioText();
  const { project, loading, error, saving, savedAt, edit, undo, redo, canUndo, canRedo } = useStudioProject(id);
  const playback = useStudioPlayback(project);
  const recorder = useStudioRecorder({ projectId: id });

  const [tab, setTab] = useState("studio");
  const [snap, setSnap] = useState("beat");
  const [zoom, setZoom] = useState(76);
  const [metro, setMetro] = useState(true);
  const [countIn, setCountIn] = useState(1);
  const [selected, setSelected] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [openTrack, setOpenTrack] = useState(null);
  const [clipOpen, setClipOpen] = useState(false);
  const [beatsOpen, setBeatsOpen] = useState(false);
  const [rapOpen, setRapOpen] = useState(false);
  const [buffers, setBuffers] = useState({});
  const [missing, setMissing] = useState([]);
  const [note, setNote] = useState("");
  const [importing, setImporting] = useState(false);
  const fileInput = useRef(null);
  const recordStart = useRef(0);

  const tracks = project?.tracks || [];
  const armed = tracks.find((one) => one.armed) || null;
  const selectedTrack = tracks.find((one) => one.id === selected?.trackId) || null;
  const selectedClip = selectedTrack?.clips?.find((one) => one.id === selected?.clipId) || null;
  const fxTrack = tracks.find((one) => one.id === (selected?.trackId || armed?.id)) || null;
  const length = projectDuration(project);
  const trackOpenNow = tracks.find((one) => one.id === openTrack) || null;

  const keyString = useMemo(() => {
    const keys = new Set();
    tracks.forEach((track) => (track.clips || []).forEach((clip) => clip.source_key && keys.add(clip.source_key)));
    return [...keys].join("|");
  }, [tracks]);

  // every recording the song stands on is decoded once, so the timeline can draw all of them
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!project) return;
      const gone = await loadMissing(project).catch(() => []);
      if (!alive) return;
      setMissing(gone);
      const held = {};
      keyString.split("|").filter(Boolean).forEach((key) => {
        const buffer = heldBuffer(key);
        if (buffer) held[key] = buffer;
      });
      setBuffers(held);
    })();
    return () => {
      alive = false;
    };
  }, [keyString, project]);

  const snapValue = (seconds) => (snap ? snapTo(seconds, project?.bpm, snap) : Math.max(0, seconds));

  const patchTrack = (trackId, changes, now = false) =>
    edit((prev) => ({ ...prev, tracks: prev.tracks.map((one) => (one.id === trackId ? { ...one, ...changes } : one)) }), { now });

  const addTrack = (kind) => {
    const track = newTrack(kind, tracks.length);
    if (!armed) track.armed = true;
    edit((prev) => ({ ...prev, tracks: [...prev.tracks, track] }), { now: true });
    setAddOpen(false);
    setSelected({ trackId: track.id, clipId: "" });
  };

  const deleteTrack = (trackId) => {
    edit((prev) => ({ ...prev, tracks: prev.tracks.filter((one) => one.id !== trackId) }), { now: true });
    setOpenTrack(null);
    if (selected?.trackId === trackId) setSelected(null);
  };

  const patchClip = (changes, now = false) =>
    edit((prev) => ({ ...prev, tracks: prev.tracks.map((one) => (one.id === selectedTrack.id ? withClip(one, selectedClip.id, changes) : one)) }), { now });

  const importAudio = async (file) => {
    if (!file) return;
    setImporting(true);
    setNote("");
    try {
      const picked = readPickedFile(file);
      const source = await keepSource({ projectId: id, blob: picked.blob, name: picked.name });
      const track = newTrack("import", tracks.length, picked.name);
      track.clips = [newClip({ sourceKey: source.sourceKey, name: picked.name, duration: source.seconds })];
      edit((prev) => ({ ...prev, tracks: [...prev.tracks, track] }), { now: true });
    } catch (err) {
      setNote(t("importFailed"));
    } finally {
      setImporting(false);
    }
  };

  const useBeat = async (beat) => {
    setImporting(true);
    setNote("");
    try {
      const read = await readSavedBeat(beat);
      const source = await keepSource({ projectId: id, blob: read.blob, name: read.name });
      const clip = newClip({ sourceKey: source.sourceKey, name: read.name, start: snapValue(playback.position), duration: source.seconds, looping: true });
      const held = tracks.find((one) => one.kind === "beat");
      if (held) {
        edit((prev) => ({ ...prev, tracks: prev.tracks.map((one) => (one.id === held.id ? { ...one, clips: [...one.clips, clip] } : one)) }), { now: true });
      } else {
        const track = newTrack("beat", tracks.length, read.name);
        track.clips = [clip];
        edit((prev) => ({ ...prev, tracks: [...prev.tracks, track] }), { now: true });
      }
      setBeatsOpen(false);
    } catch (err) {
      setNote(t("importFailed"));
    } finally {
      setImporting(false);
    }
  };

  const startRecord = async () => {
    if (recorder.recording) {
      await finishTake();
      return;
    }
    if (!armed) {
      setNote(t("armFirst"));
      return;
    }
    setNote("");
    if (playback.playing) playback.stop();
    recordStart.current = playback.position;
    const ok = await recorder.start({
      trackId: armed.id,
      bpm: project.bpm,
      signature: project.time_signature,
      countInBars: countIn,
      metronomeOn: metro,
    });
    // the song plays under the take, so a new layer comes in on the beat it was written for
    if (ok) playback.play(recordStart.current);
  };

  const finishTake = async () => {
    const take = await recorder.finish();
    playback.stop();
    if (!take) return;
    const trackId = take.track_id || armed?.id || tracks[0]?.id;
    const track = tracks.find((one) => one.id === trackId);
    const clip = newClip({
      sourceKey: take.source_key,
      name: take.name || `${track?.name || t("take")} ${formatClock(take.seconds)}`,
      start: recordStart.current,
      duration: take.seconds,
      takeId: take.id,
    });
    edit(
      (prev) => ({
        ...prev,
        takes: [{ ...take, track_id: trackId }, ...(prev.takes || [])],
        tracks: prev.tracks.map((one) => (one.id === trackId ? { ...one, clips: [...one.clips, clip] } : one)),
      }),
      { now: true }
    );
    setSelected({ trackId, clipId: clip.id });
  };

  const useTake = (take) => {
    const trackId = take.track_id || armed?.id || tracks[0]?.id;
    if (!trackId) {
      setNote(t("addTrack"));
      return;
    }
    const clip = newClip({
      sourceKey: take.source_key,
      name: take.name || t("take"),
      start: snapValue(playback.position),
      duration: take.seconds,
      takeId: take.id,
    });
    edit(
      (prev) => ({
        ...prev,
        takes: (prev.takes || []).map((one) => (one.id === take.id ? { ...one, track_id: trackId } : one)),
        tracks: prev.tracks.map((one) => (one.id === trackId ? { ...one, clips: [...one.clips, clip] } : one)),
      }),
      { now: true }
    );
    setSelected({ trackId, clipId: clip.id });
  };

  const renameTake = (takeId, name) =>
    edit((prev) => ({ ...prev, takes: (prev.takes || []).map((one) => (one.id === takeId ? { ...one, name } : one)) }));

  const deleteTake = (take) => {
    const used = tracks.some((track) => (track.clips || []).some((clip) => clip.source_key === take.source_key));
    edit((prev) => ({ ...prev, takes: (prev.takes || []).filter((one) => one.id !== take.id) }), { now: true });
    if (!used) deleteAudio(take.source_key).catch(() => null);
  };

  const keepRecovered = async (row) => {
    const take = await recorder.keepRecovery(row);
    const trackId = take.track_id || armed?.id || tracks[0]?.id;
    const clip = newClip({ sourceKey: take.source_key, name: take.name, start: 0, duration: take.seconds, takeId: take.id });
    edit(
      (prev) => ({
        ...prev,
        takes: [{ ...take, track_id: trackId }, ...(prev.takes || [])],
        tracks: prev.tracks.map((one) => (one.id === trackId ? { ...one, clips: [...one.clips, clip] } : one)),
      }),
      { now: true }
    );
  };

  const toggleLoop = () => {
    if (project.loop_on) {
      edit((prev) => ({ ...prev, loop_on: false }), { now: true });
      return;
    }
    const clip = selectedClip || armed?.clips?.[0];
    if (!clip) {
      setNote(t("loopNeedsClip"));
      return;
    }
    edit((prev) => ({ ...prev, loop_on: true, loop_start: clip.start, loop_end: clip.start + clip.duration }), { now: true });
  };

  const applyPreset = (presetId) => {
    if (!fxTrack) {
      setNote(t("noTrack"));
      return;
    }
    const chain = presetChain(presetId);
    if (chain) patchTrack(fxTrack.id, { fx: chain }, true);
  };

  const addFx = (type) => {
    if (!fxTrack) return;
    const slot = {
      id: uid("fx"),
      type,
      order: (fxTrack.fx || []).length,
      on: true,
      bypass: false,
      wet: FX_BY_ID[type]?.insert ? 1 : FX_BY_ID[type]?.wet ?? 0.3,
      amount: 1,
      params: defaultParams(type),
    };
    patchTrack(fxTrack.id, { fx: [...(fxTrack.fx || []), slot] }, true);
  };

  const patchFx = (slotId, changes) =>
    patchTrack(fxTrack.id, { fx: (fxTrack.fx || []).map((one) => (one.id === slotId ? { ...one, ...changes } : one)) });

  const moveFx = (slotId, direction) => {
    const list = [...(fxTrack.fx || [])];
    const at = list.findIndex((one) => one.id === slotId);
    const to = at + direction;
    if (at < 0 || to < 0 || to >= list.length) return;
    [list[at], list[to]] = [list[to], list[at]];
    patchTrack(fxTrack.id, { fx: list.map((one, index) => ({ ...one, order: index })) }, true);
  };

  const setStrength = (amount) => {
    if (!fxTrack) return;
    patchTrack(fxTrack.id, { fx: (fxTrack.fx || []).map((one) => ({ ...one, amount })) });
  };

  const removeFx = (slotId) =>
    patchTrack(fxTrack.id, { fx: (fxTrack.fx || []).filter((one) => one.id !== slotId).map((one, index) => ({ ...one, order: index })) }, true);

  const quickMix = () =>
    edit(
      (prev) => ({
        ...prev,
        buses: { vocal: { volume: 1, muted: false }, music: { volume: 0.9, muted: false } },
        master: { ...(prev.master || {}), volume: 0.9, limiter: true },
        tracks: prev.tracks.map((track) => ({
          ...track,
          pan: 0,
          volume: track.kind === "beat" ? 0.7 : track.kind === "vocal" || track.kind === "adlib" ? 1 : 0.85,
        })),
      }),
      { now: true }
    );

  const quickMaster = () =>
    edit(
      (prev) => ({
        ...prev,
        master: { ...(prev.master || {}), volume: 0.95, comp: true, limiter: true, ceiling: -1, eq_low: 0.5, eq_high: 1 },
      }),
      { now: true }
    );

  if (loading) {
    return (
      <StudioShell eyebrow={t("studio")} title={t("loading")} onBack={() => navigate("/studio")}>
        <p className="gs-note">
          <Loader2 className="gs-spin" aria-hidden="true" /> {t("loading")}
        </p>
      </StudioShell>
    );
  }

  if (!project) {
    return (
      <StudioShell eyebrow={t("studio")} title={t("noProjects")} onBack={() => navigate("/studio")}>
        <p className="gs-warn">
          <AlertTriangle aria-hidden="true" /> {error || t("noProjects")}
        </p>
      </StudioShell>
    );
  }

  return (
    <StudioShell eyebrow={t("studio")} title={project.title} onBack={() => navigate("/studio")} fill>
      <StudioTransport
        project={project}
        position={playback.position}
        length={length}
        playing={playback.playing}
        recording={recorder.recording}
        armed={armed}
        saving={saving}
        savedAt={savedAt}
        snap={snap}
        zoom={zoom}
        metro={metro}
        countIn={countIn}
        loopOn={!!project.loop_on}
        onSnap={setSnap}
        onZoom={setZoom}
        onMetro={setMetro}
        onCountIn={setCountIn}
        onLoop={toggleLoop}
        onPlay={() => playback.play()}
        onStop={() => playback.stop()}
        onRecord={startRecord}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onBpm={(bpm) => edit((prev) => ({ ...prev, bpm }))}
      />

      {note ? <p className="gs-warn">{note}</p> : null}
      {missing.length ? (
        <p className="gs-warn">
          <AlertTriangle aria-hidden="true" /> {t("missingAudio")}
        </p>
      ) : null}

      <StudioTimeline
        project={project}
        buffers={buffers}
        pxPerSec={zoom}
        position={playback.position}
        playing={playback.playing}
        selectedClip={selected}
        trackLevels={playback.levels?.tracks || {}}
        onSeek={(seconds) => playback.seek(snapValue(seconds))}
        onSelectClip={(trackId, clipId) => setSelected({ trackId, clipId })}
        onSelectTrack={(trackId) => setSelected({ trackId, clipId: "" })}
        onMoveClip={(trackId, clipId, start) => {
          const at = snapValue(start);
          edit((prev) => ({
            ...prev,
            tracks: prev.tracks.map((one) => (one.id === trackId ? withClip(one, clipId, { start: at }) : one)),
          }), { now: true });
        }}
        onToggleTrack={(trackId, field, value) => patchTrack(trackId, { [field]: value }, field === "armed")}
        onOpenTrack={(trackId) => setOpenTrack(trackId)}
        onFxTrack={(trackId) => {
          setSelected({ trackId, clipId: "" });
          setTab("fx");
        }}
        onAddTrack={() => setAddOpen(true)}
      />

      <div className="gs-deck">
        <div className="gs-deck-tabs" role="tablist" aria-label={t("studio")}>
          {TABS.map(({ id: key, labelKey, Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`gs-deck-tab${tab === key ? " is-on" : ""}`}
              onClick={() => setTab(key)}
            >
              <Icon aria-hidden="true" />
              <span>{t(labelKey)}</span>
            </button>
          ))}
        </div>

        <div className="gs-deck-body">
          <div hidden={tab !== "studio"}>
            {recorder.pending.map((row) => (
              <div key={row.id} className="gs-warn is-recovery">
                <span>
                  <AlertTriangle aria-hidden="true" /> {t("recovered")} ·{" "}
                  {row.started_at ? new Date(row.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
                <span className="gs-note is-quiet">{t("recoveredHint")}</span>
                <div className="gs-chips">
                  <button type="button" className="gs-chip is-go" onClick={() => keepRecovered(row)}>
                    {t("useOnTimeline")}
                  </button>
                  <button type="button" className="gs-chip" onClick={() => recorder.discardRecovery(row)}>
                    {t("discard")}
                  </button>
                </div>
              </div>
            ))}

            <RecordPanel
              recorder={recorder}
              armedTrack={armed}
              position={playback.position}
              countIn={countIn}
              onCountIn={setCountIn}
              metro={metro}
              onMetro={setMetro}
            />

            <section className="gs-panel">
              <div className="gs-chips">
                <button type="button" className="gs-chip" onClick={() => fileInput.current?.click()} disabled={importing}>
                  <Upload aria-hidden="true" /> {t("importAudio")}
                </button>
                <button type="button" className="gs-chip" onClick={() => setBeatsOpen(true)} disabled={importing}>
                  <Library aria-hidden="true" /> {t("beatLibrary")}
                </button>
                <button
                  type="button"
                  className="gs-chip"
                  onClick={() => {
                    playback.stop();
                    setRapOpen(true);
                  }}
                  disabled={recorder.recording}
                >
                  <Music2 aria-hidden="true" /> {t("rapTitle")}
                </button>
                <button type="button" className="gs-chip" onClick={() => setAddOpen(true)}>
                  <Plus aria-hidden="true" /> {t("addTrack")}
                </button>
                <button type="button" className="gs-chip" onClick={() => playback.stop()}>
                  {t("stop")}
                </button>
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="audio/*,video/mp4"
                className="gs-hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  importAudio(file);
                }}
              />
            </section>

            <TakesList
              takes={project.takes || []}
              recording={recorder.recording}
              onUse={useTake}
              onRename={renameTake}
              onDelete={deleteTake}
            />
          </div>

          <div hidden={tab !== "mixer"}>
            <MixerPanel
              project={project}
              levels={playback.levels}
              selectedTrack={selected?.trackId || ""}
              onSelectTrack={(trackId) => setSelected({ trackId, clipId: "" })}
              onPatchTrack={(trackId, changes) => patchTrack(trackId, changes)}
              onPatchBus={(key, changes) =>
                edit((prev) => ({ ...prev, buses: { ...prev.buses, [key]: { ...(prev.buses?.[key] || {}), ...changes } } }))
              }
              onPatchMaster={(changes) => edit((prev) => ({ ...prev, master: { ...prev.master, ...changes } }))}
              onQuickMix={quickMix}
              onQuickMaster={quickMaster}
            />
          </div>

          <div hidden={tab !== "fx"}>
            <EffectsPanel
              track={fxTrack}
              tracks={tracks}
              onSelectTrack={(trackId) => setSelected({ trackId, clipId: "" })}
              onApplyPreset={applyPreset}
              onAddFx={addFx}
              onPatchFx={patchFx}
              onMoveFx={moveFx}
              onRemoveFx={removeFx}
              onStrength={setStrength}
            />
          </div>

          <div hidden={tab !== "export"}>
            <ExportPanel project={project} />
          </div>
        </div>
      </div>

      <AddTrackSheet open={addOpen} count={tracks.length} onClose={() => setAddOpen(false)} onAdd={addTrack} />
      <TrackSheet
        open={!!trackOpenNow}
        track={trackOpenNow}
        onClose={() => setOpenTrack(null)}
        onPatch={(changes) => patchTrack(openTrack, changes)}
        onOpenFx={() => {
          setSelected({ trackId: openTrack, clipId: "" });
          setOpenTrack(null);
          setTab("fx");
        }}
        onDelete={() => deleteTrack(openTrack)}
      />
      <ClipInspector
        clip={clipOpen ? selectedClip : null}
        track={selectedTrack}
        snap={snap ? (seconds) => snapTo(seconds, project.bpm, snap) : null}
        position={playback.position}
        onClose={() => setClipOpen(false)}
        onPatch={(changes) => patchClip(changes, true)}
        onSplit={() => {
          if (!selectedClip) return;
          edit((prev) => ({ ...prev, tracks: prev.tracks.map((one) => (one.id === selectedTrack.id ? splitClip(one, selectedClip.id, playback.position) : one)) }), { now: true });
          setClipOpen(false);
        }}
        onDuplicate={() => {
          if (!selectedClip) return;
          edit((prev) => ({ ...prev, tracks: prev.tracks.map((one) => (one.id === selectedTrack.id ? duplicateClip(one, selectedClip.id) : one)) }), { now: true });
          setClipOpen(false);
        }}
        onDelete={() => {
          if (!selectedClip) return;
          edit((prev) => ({ ...prev, tracks: prev.tracks.map((one) => (one.id === selectedTrack.id ? removeClip(one, selectedClip.id) : one)) }), { now: true });
          setClipOpen(false);
          setSelected({ trackId: selectedTrack.id, clipId: "" });
        }}
      />
      <BeatLibrarySheet open={beatsOpen} busy={importing} onClose={() => setBeatsOpen(false)} onUse={useBeat} />
      <StudioRapSheet open={rapOpen} onClose={() => setRapOpen(false)} />

      {selectedClip && !clipOpen ? (
        <button type="button" className="gs-clip-open" onClick={() => setClipOpen(true)}>
          {t("edit")} · {selectedClip.name || selectedTrack?.name}
        </button>
      ) : null}
    </StudioShell>
  );
}