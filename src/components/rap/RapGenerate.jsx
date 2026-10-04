import React from "react";
import { Sparkles } from "lucide-react";
import { usesStore } from "@/lib/rapLanguage";

/** The studio's one control: Base44 AI chooses the words, settles the angle, writes the bars and
 *  performs them, so a take goes from the settings straight to its sound. */
export default function RapGenerate({ language, hasWords, hasLines, busy, ready, onGenerate }) {
  const blocked = usesStore(language) && !hasWords;
  const off = !ready || blocked || !!busy;

  return (
    <section className="rap-generate">
      <button type="button" className="rap-cta rap-cta-ghost" disabled={off} onClick={onGenerate}>
        <Sparkles className="mr-2 inline h-4 w-4 align-[-3px]" />
        {hasLines ? "Tunga take mpya" : "Base44 AI itunge na kuimba"}
      </button>
      {blocked ? (
        <p className="rap-note">
          Ongeza maneno ya Kibembe kwenye knowledge kwanza, kisha gusa kitufe hapo juu.
        </p>
      ) : (
        <p className="rap-hint">
          Mguso mmoja: Base44 AI huchagua maneno, huandika mistari, kisha kuimba take nzima kwa sauti uliyochagua.
        </p>
      )}
    </section>
  );
}