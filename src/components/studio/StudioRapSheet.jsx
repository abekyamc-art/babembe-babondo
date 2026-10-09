import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import StudioLangSwitch from "@/components/studio/StudioLangSwitch";
import { useStudioText } from "@/components/studio/StudioLangProvider";
import RapStudioPanel from "@/components/rap/RapStudioPanel";

/**
 * The rap session, opened from inside Gloire Studio: the words, the beat, the voice over it and the
 * takes stand over the whole screen, and the song's own timeline waits untouched underneath.
 */
export default function StudioRapSheet({ open, onClose }) {
  const { t } = useStudioText();
  if (!open) return null;

  return createPortal(
    <div className="gs-rap-wrap" role="dialog" aria-modal="true" aria-label={t("rapTitle")}>
      <header className="gs-top">
        <button type="button" className="gs-icon" onClick={onClose} aria-label={t("back")}>
          <X />
        </button>
        <div className="gs-top-text">
          <span className="gs-eyebrow">{t("studio")}</span>
          <h1 className="gs-title">{t("rapTitle")}</h1>
        </div>
        <div className="gs-top-right">
          <StudioLangSwitch />
        </div>
      </header>
      <p className="gs-rap-note">{t("rapSub")}</p>
      <div className="gs-rap-body">
        <RapStudioPanel />
      </div>
    </div>,
    document.body
  );
}