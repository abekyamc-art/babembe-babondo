import React from "react";
import { Sparkles } from "lucide-react";
import { usesStore } from "@/lib/rapLanguage";

/** The studio's one control: Base44 AI chooses the words, settles the angle and writes the bars
 *  itself, so a take goes from the settings straight to the finished lines. */
export default function RapGenerate({ language, hasWords, hasLines, busy, ready, onGenerate }) {
  const blocked = usesStore(language) && !hasWords;
  const off = !ready || blocked || !!busy;

  return (
    <section className="rap-generate">
      <button type="button" className="rap-cta rap-cta-ghost" disabled={off} onClick={onGenerate}>
        <Sparkles className="mr-2 inline h-4 w-4 align-[-3px]" />
        {hasLines ? "Tunga rap mpya" : "Base44 AI itunge rap"}
      </button>
      {blocked ? (
        <p className="rap-note">
          Ongeza maneno ya Kibembe kwenye knowledge kwanza, kisha gusa kitufe hapo juu.
        </p>
      ) : (
        <p className="rap-hint">
          Base44 AI huchagua maneno na wazo lenyewe, kisha huandika mistari kwa lugha uliyochagua.
        </p>
      )}
    </section>
  );
}