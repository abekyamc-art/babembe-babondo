import React from "react";
import { X } from "lucide-react";
import { useStudioText } from "@/components/studio/StudioLangProvider";

/** Everything the studio asks for arrives from the bottom of the screen, where a thumb already is. */
export default function StudioSheet({ open, title, onClose, children, tall = false }) {
  const { t } = useStudioText();
  if (!open) return null;

  return (
    <div className="gs-sheet-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="gs-sheet-dim" aria-label={t("close")} onClick={onClose} />
      <div className={`gs-sheet${tall ? " is-tall" : ""}`}>
        <div className="gs-sheet-grip" aria-hidden="true" />
        <div className="gs-sheet-head">
          <span className="gs-sheet-title">{title}</span>
          <button type="button" className="gs-icon is-sm" onClick={onClose} aria-label={t("close")}>
            <X />
          </button>
        </div>
        <div className="gs-sheet-body">{children}</div>
      </div>
    </div>
  );
}