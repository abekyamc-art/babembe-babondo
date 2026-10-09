import React, { useState } from "react";
import { AlertTriangle, Download, Loader2, Share2 } from "lucide-react";
import { useStudioText } from "@/components/studio/StudioLangProvider";
import { bufferToWav, captureProject, loadMissing, renderProject } from "@/lib/studioEngine";
import { extensionFor } from "@/lib/studioRecorder";
import { formatClock, projectDuration } from "@/lib/studioTracks";

const slug = (text) => String(text || "track").trim().replace(/[^\w-]+/g, "_").slice(0, 40) || "track";

/** A tap that saves a file to the phone, and one that hands it to whatever the phone shares with. */
function download(file) {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * The finished song. WAV is rendered on the phone — the real mixdown, made by the same chain that was
 * listened to — and the phone's own format is recorded as the mix plays. MP3 needs a native encoder and
 * says so rather than quietly handing back something else.
 */
export default function ExportPanel({ project, onSaved }) {
  const { t } = useStudioText();
  const [rate, setRate] = useState(44100);
  const [scope, setScope] = useState("song");
  const [busy, setBusy] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);

  const length = projectDuration(project);
  const tracks = project?.tracks || [];
  const base = slug(project?.title);

  const renderWav = async ({ trackId = null, name = "" } = {}) => {
    setBusy(trackId ? `stem:${trackId}` : "wav");
    setError("");
    try {
      const gone = await loadMissing(project);
      if (gone.length) setError(t("missingAudio"));
      const buffer = await renderProject({ project, sampleRate: rate, trackId });
      const made = {
        blob: bufferToWav(buffer),
        name: `${base}${name ? `_${name}` : ""}_${Math.round(rate / 1000)}k.wav`,
        mime: "audio/wav",
      };
      setFile(made);
      onSaved?.(made);
      return made;
    } catch (err) {
      setError(t("exportFailed"));
      return null;
    } finally {
      setBusy("");
    }
  };

  const captureDevice = async () => {
    setBusy("device");
    setError("");
    setProgress(0);
    try {
      await loadMissing(project);
      const run = await captureProject({ project });
      const timer = window.setInterval(() => {
        setProgress(Math.min(99, Math.round((run.elapsed() / Math.max(1, run.span)) * 100)));
      }, 250);
      await new Promise((resolve) => window.setTimeout(resolve, Math.ceil(run.span * 1000) + 400));
      window.clearInterval(timer);
      setProgress(100);
      const blob = await run.stop();
      const made = { blob, name: `${base}.${extensionFor(run.mime)}`, mime: run.mime };
      setFile(made);
      onSaved?.(made);
    } catch (err) {
      setError(t("exportFailed"));
    } finally {
      setBusy("");
      setProgress(0);
    }
  };

  const share = async () => {
    if (!file) return;
    const shareFile = new File([file.blob], file.name, { type: file.mime || "audio/wav" });
    if (navigator.canShare?.({ files: [shareFile] })) {
      try {
        await navigator.share({ files: [shareFile], title: project?.title || "Song" });
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }
    setError(t("shareUnavailable"));
  };

  return (
    <section className="gs-panel">
      <div className="gs-panel-head">
        <span className="gs-label">{t("exportTab")}</span>
        <span className="gs-chip is-tiny">
          {t("songLength")} {formatClock(length)}
        </span>
      </div>

      <div className="gs-field">
        <span className="gs-label">{t("quality")}</span>
        <div className="gs-chips">
          {[44100, 48000].map((one) => (
            <button key={one} type="button" className={`gs-chip${one === rate ? " is-on" : ""}`} onClick={() => setRate(one)}>
              {one === 44100 ? t("draft") : t("high")} · {one / 1000}k
            </button>
          ))}
        </div>
      </div>

      <div className="gs-field">
        <span className="gs-label">{t("format")}</span>
        <div className="gs-chips">
          <button type="button" className="gs-chip is-on">
            {t("studioWav")}
          </button>
          <button type="button" className="gs-chip" disabled>
            MP3 · {t("needsNative")}
          </button>
        </div>
      </div>

      <div className="gs-field">
        <span className="gs-label">{t("scope")}</span>
        <div className="gs-chips">
          {["song", "stems"].map((one) => (
            <button key={one} type="button" className={`gs-chip${scope === one ? " is-on" : ""}`} onClick={() => setScope(one)}>
              {one === "song" ? t("fullSong") : t("stems")}
            </button>
          ))}
        </div>
      </div>

      {busy === "device" ? (
        <div className="gs-progress" role="status" aria-live="polite">
          <span>{t("capturing")}</span>
          <span className="gs-progress-bar">
            <span className="gs-progress-fill" style={{ width: `${progress}%` }} />
          </span>
          <span>{progress}%</span>
        </div>
      ) : null}

      {busy === "wav" ? (
        <p className="gs-note">
          <Loader2 className="gs-spin" aria-hidden="true" /> {t("rendering")}
        </p>
      ) : null}

      {error ? (
        <p className="gs-warn">
          <AlertTriangle aria-hidden="true" /> {error}
        </p>
      ) : null}

      {file ? (
        <div className="gs-export-actions">
          <span className="gs-chip is-tiny is-go">{t("exportDone")}</span>
          <button type="button" className="gs-btn is-primary" onClick={() => download(file)}>
            <Download aria-hidden="true" /> {t("saveToDevice")}
          </button>
          <button type="button" className="gs-btn" onClick={share}>
            <Share2 aria-hidden="true" /> {t("shareSheet")}
          </button>
          <span className="gs-file-name">{file.name}</span>
        </div>
      ) : (
        <div className="gs-export-actions">
          <button type="button" className="gs-btn is-primary" onClick={() => renderWav()} disabled={!!busy}>
            <Download aria-hidden="true" /> {t("render")} WAV
          </button>
          <button type="button" className="gs-btn" onClick={captureDevice} disabled={!!busy}>
            {t("captureDevice")}
          </button>
        </div>
      )}

      {scope === "stems" ? (
        <div className="gs-field">
          <span className="gs-label">{t("stems")}</span>
          <ul className="gs-stems">
            {tracks.map((track) => (
              <li key={track.id}>
                <span className="gs-stem-name" style={{ "--gs-track": track.color }}>
                  {track.name}
                </span>
                <button
                  type="button"
                  className="gs-btn is-tiny"
                  disabled={!!busy}
                  onClick={() => renderWav({ trackId: track.id, name: slug(track.name) })}
                >
                  {busy === `stem:${track.id}` ? <Loader2 className="gs-spin" aria-hidden="true" /> : null} WAV
                </button>
              </li>
            ))}
          </ul>
          <p className="gs-note is-quiet">{t("stemsNote")}</p>
        </div>
      ) : null}

      <p className="gs-note is-quiet">
        {t("wavNote")} {t("aacNote")} {t("mp3Note")}
      </p>
    </section>
  );
}