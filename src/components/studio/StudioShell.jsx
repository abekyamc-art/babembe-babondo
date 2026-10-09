import React from "react";
import { ArrowLeft } from "lucide-react";
import StudioLangSwitch from "@/components/studio/StudioLangSwitch";
import { useStudioText } from "@/components/studio/StudioLangProvider";

/**
 * The room every studio screen stands in: charcoal, one row at the top for the way back and the
 * language, and the screen's own work filling everything under it.
 */
export default function StudioShell({ eyebrow, title, onBack, right = null, children, below = null, fill = false }) {
  const { t } = useStudioText();

  return (
    <div className="gs-app">
      <header className="gs-top">
        <button type="button" className="gs-icon" onClick={onBack} aria-label={t("back")}>
          <ArrowLeft />
        </button>
        <div className="gs-top-text">
          <span className="gs-eyebrow">{eyebrow}</span>
          <h1 className="gs-title">{title}</h1>
        </div>
        <div className="gs-top-right">{right || <StudioLangSwitch />}</div>
      </header>
      <div className={`gs-body${fill ? " is-fill" : ""}`}>{children}</div>
      {below}
    </div>
  );
}