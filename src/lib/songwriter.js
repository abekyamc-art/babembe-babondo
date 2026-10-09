/**
 * The songwriter: one request written out as a whole song — its parts, its verses, its hook and the
 * voice that answers behind the lead — in whichever language the request itself asks for. The words
 * come from the server, so nothing is written on the phone; the phone only shows them and sings them
 * back over the beat.
 */

import { base44 } from "@/api/base44Client";
import { languageLabel } from "@/lib/rapLanguage";

const UNAVAILABLE = "Wimbo haukuweza kuandikwa. Jaribu tena.";

/**
 * The song written for one request. Kibembe and a mixed song stand on the saved Word Bank, so a
 * song whose lines carry a word the store does not hold comes back with those lines left out.
 */
export async function writeSong({ prompt, bpm }) {
  const res = await base44.functions.invoke("rapLyrics", { action: "song", prompt, bpm });
  const data = res?.data || {};
  if (data.error) throw new Error(data.error);
  if (!data.sections?.length) throw new Error(UNAVAILABLE);
  return {
    title: data.title || "Wimbo",
    language: data.language || "ebembe",
    sections: data.sections,
    wordsUsed: data.words_used || [],
    dropped: Number(data.dropped) || 0,
  };
}

/** The song's lines one after another, each with the part it is sung in and who carries it. */
export function songLines(song) {
  return (song?.sections || []).flatMap((section) =>
    (section.lines || []).map((line) => ({
      section: section.name,
      ebembe: line.text,
      swahili: line.meaning || "",
      kind: line.kind === "back" ? "back" : "lead",
    }))
  );
}

/** The song as a text file: its parts, its lead lines and the voice behind them. */
export function songText(song) {
  const parts = (song?.sections || [])
    .map(
      (section) =>
        `[${section.name}]\n` +
        (section.lines || [])
          .map(
            (line) =>
              `${line.kind === "back" ? "  (back) " : ""}${line.text}\n    ${line.meaning || ""}`
          )
          .join("\n")
    )
    .join("\n\n");
  const words = song?.wordsUsed?.length
    ? `\n\nManeno yaliyotumika:\n${song.wordsUsed.map((word) => `- ${word}`).join("\n")}`
    : "";
  return `${song?.title || "Wimbo"} · ${languageLabel(song?.language)}\n\n${parts}${words}\n`;
}