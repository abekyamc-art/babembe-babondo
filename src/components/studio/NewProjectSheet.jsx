import React, { useEffect, useState } from "react";
import StudioSheet from "@/components/studio/StudioSheet";
import { useStudioText } from "@/components/studio/StudioLangProvider";
import { KEYS, TEMPLATES, TEMPLATE_NAMES, TIME_SIGNATURES } from "@/lib/studioTracks";

/**
 * A song's first decisions, all in one sheet: what it is called, how fast it runs, what key it is in,
 * and which template it starts from. Nothing else is asked for — the studio opens on the timeline.
 */
export default function NewProjectSheet({ open, onClose, onCreate, templateId = "blank", busy = false }) {
  const { t, pick } = useStudioText();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [bpm, setBpm] = useState(90);
  const [keyRoot, setKeyRoot] = useState("A");
  const [scale, setScale] = useState("minor");
  const [signature, setSignature] = useState("4/4");
  const [template, setTemplate] = useState(templateId);

  useEffect(() => {
    if (!open) return;
    const found = TEMPLATES.find((one) => one.id === templateId) || TEMPLATES[0];
    setTemplate(found.id);
    setBpm(found.bpm);
    setKeyRoot(found.key_root);
    setScale(found.key_scale);
    setTitle("");
    setArtist("");
  }, [open, templateId]);

  const choose = (id) => {
    const found = TEMPLATES.find((one) => one.id === id);
    setTemplate(id);
    if (found) {
      setBpm(found.bpm);
      setKeyRoot(found.key_root);
      setScale(found.key_scale);
    }
  };

  const submit = () => {
    onCreate({
      title: title.trim(),
      artist: artist.trim(),
      bpm,
      key_root: keyRoot,
      key_scale: scale,
      time_signature: signature,
      template,
    });
  };

  return (
    <StudioSheet open={open} onClose={onClose} title={t("newProject")} tall>
      <label className="gs-field">
        <span className="gs-label">{t("songTitle")}</span>
        <input
          className="gs-input"
          value={title}
          placeholder={pick(TEMPLATE_NAMES[template]) || t("songTitle")}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>

      <label className="gs-field">
        <span className="gs-label">{t("artist")}</span>
        <input className="gs-input" value={artist} onChange={(event) => setArtist(event.target.value)} />
      </label>

      <div className="gs-field">
        <span className="gs-label">{t("template")}</span>
        <div className="gs-chips">
          {TEMPLATES.map((one) => (
            <button
              key={one.id}
              type="button"
              className={`gs-chip${one.id === template ? " is-on" : ""}`}
              onClick={() => choose(one.id)}
            >
              {pick(TEMPLATE_NAMES[one.id])}
            </button>
          ))}
        </div>
      </div>

      <div className="gs-field">
        <span className="gs-label">{t("tempo")}</span>
        <div className="gs-stepper">
          <button type="button" className="gs-icon is-sm" onClick={() => setBpm((v) => Math.max(40, v - 1))} aria-label="-">
            −
          </button>
          <input
            className="gs-number"
            type="number"
            min="40"
            max="240"
            value={bpm}
            onChange={(event) => setBpm(Math.min(240, Math.max(40, Number(event.target.value) || 90)))}
          />
          <button type="button" className="gs-icon is-sm" onClick={() => setBpm((v) => Math.min(240, v + 1))} aria-label="+">
            +
          </button>
        </div>
      </div>

      <div className="gs-two">
        <div className="gs-field">
          <span className="gs-label">{t("key")}</span>
          <div className="gs-chips">
            {KEYS.map((one) => (
              <button
                key={one}
                type="button"
                className={`gs-chip is-tiny${one === keyRoot ? " is-on" : ""}`}
                onClick={() => setKeyRoot(one)}
              >
                {one}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="gs-two">
        <div className="gs-field">
          <span className="gs-label">{t("scale")}</span>
          <div className="gs-chips">
            {["minor", "major"].map((one) => (
              <button
                key={one}
                type="button"
                className={`gs-chip${one === scale ? " is-on" : ""}`}
                onClick={() => setScale(one)}
              >
                {t(one)}
              </button>
            ))}
          </div>
        </div>
        <div className="gs-field">
          <span className="gs-label">{t("timeSig")}</span>
          <div className="gs-chips">
            {TIME_SIGNATURES.map((one) => (
              <button
                key={one}
                type="button"
                className={`gs-chip${one === signature ? " is-on" : ""}`}
                onClick={() => setSignature(one)}
              >
                {one}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button type="button" className="gs-btn is-primary is-wide" onClick={submit} disabled={busy}>
        {busy ? t("saving") : t("create")}
      </button>
    </StudioSheet>
  );
}