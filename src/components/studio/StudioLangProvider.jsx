import React, { createContext, useContext, useMemo, useState } from "react";
import { readStudioLang, textFor, writeStudioLang } from "@/lib/studioI18n";

const LangContext = createContext(null);

/**
 * The studio's own language, held for every screen of it at once. A word written in both languages —
 * a track kind, a template, a preset — is read back through the same place, so nothing is left
 * sitting in one language while the rest of the studio moves to the other.
 */
export default function StudioLangProvider({ children }) {
  const [lang, setLang] = useState(() => readStudioLang());

  const value = useMemo(() => {
    const text = textFor(lang);
    return {
      lang,
      setLang: (next) => {
        writeStudioLang(next);
        setLang(next);
      },
      t: (key) => text[key] ?? textFor("sw")[key] ?? key,
      pick: (pair) => (pair ? pair[lang] || pair.sw || pair.en || "" : ""),
    };
  }, [lang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useStudioText() {
  const held = useContext(LangContext);
  if (held) return held;
  // a screen reached without the provider still answers, in the studio's own language
  const text = textFor(readStudioLang());
  return { lang: readStudioLang(), setLang: () => {}, t: (key) => text[key] ?? key, pick: (pair) => (pair ? pair.sw || pair.en : "") };
}