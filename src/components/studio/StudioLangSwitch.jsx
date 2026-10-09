import React from "react";
import { STUDIO_LANGS } from "@/lib/studioI18n";
import { useStudioText } from "@/components/studio/StudioLangProvider";

/** Kiswahili or English, in one tap — the whole studio moves with it. */
export default function StudioLangSwitch() {
  const { lang, setLang } = useStudioText();
  return (
    <div className="gs-langs" role="group" aria-label="Language">
      {STUDIO_LANGS.map((one) => (
        <button
          key={one.id}
          type="button"
          className={`gs-lang${one.id === lang ? " is-on" : ""}`}
          aria-pressed={one.id === lang}
          onClick={() => setLang(one.id)}
        >
          {one.id === "sw" ? "SW" : "EN"}
        </button>
      ))}
    </div>
  );
}