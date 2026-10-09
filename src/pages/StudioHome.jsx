import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, HardDrive, Library, Loader2, Plus, Settings, Sparkles, Trash2, Upload } from "lucide-react";
import StudioShell from "@/components/studio/StudioShell";
import StudioSheet from "@/components/studio/StudioSheet";
import HomeProjectRow from "@/components/studio/HomeProjectRow";
import NewProjectSheet from "@/components/studio/NewProjectSheet";
import ProjectActionsSheet from "@/components/studio/ProjectActionsSheet";
import StudioSettingsSheet from "@/components/studio/StudioSettingsSheet";
import BeatLibrarySheet from "@/components/studio/BeatLibrarySheet";
import { useStudioText } from "@/components/studio/StudioLangProvider";
import useStudioProjects from "@/hooks/useStudioProjects";
import { TEMPLATE_NAMES, TEMPLATES, newClip, newProject, newTrack } from "@/lib/studioTracks";
import { keepSource, readPickedFile, readSavedBeat } from "@/lib/studioImport";

/**
 * The studio's front door: every song being worked on, the two ways to begin a new one — from a template
 * or from audio already on the phone — the beats the app has made, and the bin nothing is ever lost in.
 */
export default function StudioHome() {
  const navigate = useNavigate();
  const { t, pick } = useStudioText();
  const { projects, sizes, loading, error, reload, create, update, duplicate, remove } = useStudioProjects();

  const [newOpen, setNewOpen] = useState(false);
  const [templateId, setTemplateId] = useState("blank");
  const [actions, setActions] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [beatsOpen, setBeatsOpen] = useState(false);
  const [binOpen, setBinOpen] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const fileInput = useRef(null);

  const working = projects.filter((one) => !one.trashed_at && !one.archived);
  const archived = projects.filter((one) => !one.trashed_at && one.archived);
  const binned = projects.filter((one) => one.trashed_at);

  const begin = async (fields) => {
    setBusy("create");
    try {
      const template = TEMPLATES.find((one) => one.id === fields.template) || TEMPLATES[0];
      const made = await create(newProject({ ...fields, template }));
      setNewOpen(false);
      navigate(`/studio/${made.id}`);
    } catch (err) {
      setNote(t("exportFailed"));
    } finally {
      setBusy("");
    }
  };

  /** Audio already on the phone, turning itself into a song with its own track. */
  const importFile = async (file) => {
    if (!file) return;
    setBusy("import");
    setNote("");
    try {
      const picked = readPickedFile(file);
      const made = await create(newProject({ title: picked.name, bpm: 96, key_root: "A", key_scale: "minor", time_signature: "4/4", template: TEMPLATES[0] }));
      const source = await keepSource({ projectId: made.id, blob: picked.blob, name: picked.name });
      const track = newTrack("import", 0, picked.name);
      track.clips = [newClip({ sourceKey: source.sourceKey, name: picked.name, duration: source.seconds })];
      await update(made.id, { tracks: [track], duration: source.seconds, last_saved_at: new Date().toISOString() });
      navigate(`/studio/${made.id}`);
    } catch (err) {
      setNote(t("importFailed"));
    } finally {
      setBusy("");
    }
  };

  /** A beat out of the app's own library, brought in as the first track of a new song. */
  const useBeat = async (beat) => {
    setBusy("beat");
    setNote("");
    try {
      const read = await readSavedBeat(beat);
      const made = await create(newProject({ title: beat.name || "Beat", bpm: beat.bpm || 96, key_root: "A", key_scale: "minor", time_signature: "4/4", template: TEMPLATES[0] }));
      const source = await keepSource({ projectId: made.id, blob: read.blob, name: read.name });
      const track = newTrack("beat", 0, read.name);
      track.clips = [newClip({ sourceKey: source.sourceKey, name: read.name, duration: source.seconds, looping: true })];
      await update(made.id, { tracks: [track], duration: source.seconds, last_saved_at: new Date().toISOString() });
      setBeatsOpen(false);
      navigate(`/studio/${made.id}`);
    } catch (err) {
      setNote(t("importFailed"));
    } finally {
      setBusy("");
    }
  };

  const act = async (run) => {
    try {
      await run();
      setActions(null);
      reload();
    } catch (err) {
      setNote(t("exportFailed"));
    }
  };

  return (
    <StudioShell
      eyebrow={t("studio")}
      title={t("home")}
      onBack={() => navigate("/")}
      right={
        <div className="gs-top-tools">
          <button type="button" className="gs-icon" onClick={() => setSettingsOpen(true)} aria-label={t("settings")}>
            <Settings />
          </button>
        </div>
      }
    >
      <section className="gs-hero-cards">
        <button type="button" className="gs-hero is-primary" onClick={() => { setTemplateId("blank"); setNewOpen(true); }}>
          <Plus aria-hidden="true" />
          <span>{t("newProject")}</span>
        </button>
        <button type="button" className="gs-hero" onClick={() => fileInput.current?.click()} disabled={busy === "import"}>
          {busy === "import" ? <Loader2 className="gs-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
          <span>{t("importAudio")}</span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="audio/*,video/mp4"
          className="gs-hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            importFile(file);
          }}
        />
      </section>

      <section className="gs-block">
        <div className="gs-block-head">
          <span className="gs-label">
            <Sparkles aria-hidden="true" /> {t("templates")}
          </span>
        </div>
        <div className="gs-chips">
          {TEMPLATES.map((one) => (
            <button
              key={one.id}
              type="button"
              className="gs-chip"
              onClick={() => {
                setTemplateId(one.id);
                setNewOpen(true);
              }}
            >
              {pick(TEMPLATE_NAMES[one.id])}
            </button>
          ))}
        </div>
      </section>

      <section className="gs-block">
        <button type="button" className="gs-row-btn" onClick={() => setBeatsOpen(true)}>
          <Library aria-hidden="true" />
          <span>{t("beatLibrary")}</span>
        </button>
        <button type="button" className="gs-row-btn" onClick={() => setArchivedOpen(true)}>
          <Archive aria-hidden="true" />
          <span>
            {t("archivedProjects")} · {archived.length}
          </span>
        </button>
        <button type="button" className="gs-row-btn" onClick={() => setBinOpen(true)}>
          <Trash2 aria-hidden="true" />
          <span>
            {t("trash")} · {binned.length}
          </span>
        </button>
      </section>

      <section className="gs-block">
        <div className="gs-block-head">
          <span className="gs-label">{t("recent")}</span>
          <span className="gs-chip is-tiny">
            <HardDrive aria-hidden="true" /> {working.length}
          </span>
        </div>

        {loading ? (
          <p className="gs-note">
            <Loader2 className="gs-spin" aria-hidden="true" /> {t("loading")}
          </p>
        ) : null}

        {working.length ? (
          working.map((project) => (
            <HomeProjectRow
              key={project.id}
              project={project}
              size={sizes[project.id] || 0}
              onOpen={() => navigate(`/studio/${project.id}`)}
              onMenu={() => setActions(project)}
            />
          ))
        ) : (
          !loading && (
            <div className="gs-empty">
              <p className="gs-empty-title">{t("noProjects")}</p>
              <p className="gs-note is-quiet">{t("noProjectsHint")}</p>
            </div>
          )
        )}

        {error ? <p className="gs-warn">{error}</p> : null}
        {note ? <p className="gs-warn">{note}</p> : null}
      </section>

      <NewProjectSheet open={newOpen} templateId={templateId} busy={busy === "create"} onClose={() => setNewOpen(false)} onCreate={begin} />
      <StudioSettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <BeatLibrarySheet open={beatsOpen} busy={busy === "beat"} onClose={() => setBeatsOpen(false)} onUse={useBeat} />

      {actions ? (
        <ProjectActionsSheet
          project={actions}
          onClose={() => setActions(null)}
          onOpen={() => navigate(`/studio/${actions.id}`)}
          onDuplicate={() => act(async () => duplicate(actions))}
          onArchive={() => act(async () => update(actions.id, { archived: !actions.archived }))}
          onTrash={() => act(async () => update(actions.id, { trashed_at: new Date().toISOString() }))}
          onRestore={() => act(async () => update(actions.id, { trashed_at: "" }))}
          onPurge={() => act(async () => remove(actions))}
        />
      ) : null}

      <StudioSheet open={binOpen} onClose={() => setBinOpen(false)} title={t("trash")} tall>
        {binned.length ? (
          binned.map((project) => (
            <HomeProjectRow
              key={project.id}
              project={project}
              size={sizes[project.id] || 0}
              onOpen={() => setActions(project)}
              onMenu={() => setActions(project)}
            />
          ))
        ) : (
          <p className="gs-note is-quiet">{t("noProjects")}</p>
        )}
      </StudioSheet>

      <StudioSheet open={archivedOpen} onClose={() => setArchivedOpen(false)} title={t("archivedProjects")} tall>
        {archived.length ? (
          archived.map((project) => (
            <HomeProjectRow
              key={project.id}
              project={project}
              archived
              size={sizes[project.id] || 0}
              onOpen={() => setActions(project)}
              onMenu={() => setActions(project)}
            />
          ))
        ) : (
          <p className="gs-note is-quiet">{t("noProjects")}</p>
        )}
      </StudioSheet>
    </StudioShell>
  );
}