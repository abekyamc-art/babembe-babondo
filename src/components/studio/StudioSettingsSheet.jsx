import React, { useEffect, useState } from "react";
import { HardDrive, Mic } from "lucide-react";
import StudioSheet from "@/components/studio/StudioSheet";
import { useStudioText } from "@/components/studio/StudioLangProvider";
import { STUDIO_LANGS } from "@/lib/studioI18n";
import { storedBytes } from "@/lib/studioStore";
import { formatSize } from "@/lib/studioTracks";
import { openInput } from "@/lib/studioRecorder";

/**
 * The studio's own settings: the language, what the microphone is allowed to do, and how much room the
 * recordings take. Nothing here is asked for on its own — the microphone is only ever opened when the
 * artist asks for it.
 */
export default function StudioSettingsSheet({ open, onClose }) {
  const { t, lang, setLang } = useStudioText();
  const [mic, setMic] = useState("unknown");
  const [bytes, setBytes] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "microphone" })
        .then((status) => {
          if (!alive) return;
          setMic(status.state);
          status.onchange = () => setMic(status.state);
        })
        .catch(() => setMic("unknown"));
    }
    storedBytes()
      .then((total) => {
        if (alive) setBytes(total);
      })
      .catch(() => setBytes(0));
    return () => {
      alive = false;
    };
  }, [open]);

  const ask = async () => {
    setBusy(true);
    try {
      const input = await openInput({});
      input.close();
      setMic("granted");
    } catch (err) {
      setMic("denied");
    } finally {
      setBusy(false);
    }
  };

  const micText = mic === "granted" ? t("granted") : mic === "denied" ? t("blocked") : t("notAsked");

  return (
    <StudioSheet open={open} onClose={onClose} title={t("settings")} tall>
      <div className="gs-field">
        <span className="gs-label">{t("language")}</span>
        <div className="gs-chips">
          {STUDIO_LANGS.map((one) => (
            <button key={one.id} type="button" className={`gs-chip${one.id === lang ? " is-on" : ""}`} onClick={() => setLang(one.id)}>
              {one.label}
            </button>
          ))}
        </div>
      </div>

      <div className="gs-field">
        <span className="gs-label">
          <Mic aria-hidden="true" /> {t("microphone")}
        </span>
        <p className="gs-note">{micText}</p>
        <p className="gs-note is-quiet">{t("micHint")}</p>
        <button type="button" className="gs-btn" onClick={ask} disabled={busy}>
          {t("askPermission")}
        </button>
      </div>

      <div className="gs-field">
        <span className="gs-label">{t("audioQuality")}</span>
        <p className="gs-note">
          44.1 kHz / 48 kHz — {t("wavNote")}
        </p>
        <p className="gs-note is-quiet">{t("aacNote")}</p>
      </div>

      <div className="gs-field">
        <span className="gs-label">
          <HardDrive aria-hidden="true" /> {t("usedOnDevice")}
        </span>
        <p className="gs-note">{formatSize(bytes)}</p>
        <p className="gs-note is-quiet">{t("storageHint")}</p>
      </div>

      <div className="gs-field">
        <span className="gs-label">{t("backup")}</span>
        <p className="gs-note">{t("backupHint")}</p>
        <p className="gs-note is-quiet">{t("cloudHint")}</p>
        <p className="gs-note is-quiet">{t("offlineHint")}</p>
      </div>
    </StudioSheet>
  );
}