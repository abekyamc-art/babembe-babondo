/**
 * The language the app is answering in: Kibembe, Kiswahili, or English.
 *
 * Kibembe stands unless the person plainly asks for another, and the language they ask for stands
 * from that moment on — turn after turn, and into every later call — until they ask for another one.
 * The rules below ride to every voice with the rest of the guide, so a mode change reaches the voice
 * that is answering and the reading behind it at the same moment.
 */

export const LANGS = ["kibembe", "swahili", "english"] as const;
export type Lang = (typeof LANGS)[number];

const NAMES: Record<Lang, string> = {
  kibembe: "Kibembe (Ebembe)",
  swahili: "Kiswahili",
  english: "English",
};

/** The language a saved value stands for. Kibembe stands when it is not one the app knows. */
export function langOf(value: any): Lang {
  const said = String(value ?? "").trim().toLowerCase();
  if (said === "swahili" || said === "kiswahili") return "swahili";
  if (said === "english" || said === "american" || said === "eng") return "english";
  return "kibembe";
}

/** The name of the language as it is written on the screen and in a rule. */
export function langName(value: any): string {
  return NAMES[langOf(value)];
}

// What a person plainly asks for a language with, in any of the three tongues. Each one names the
// language asked for in its own capture group, so the ask is read from their own words.
const ASKS: RegExp[] = [
  /\b(?:change|switch|set)\s+(?:the\s+)?mode\s*(?:to|:)?\s*(kibembe|ebembe|swahili|kiswahili|english)\b/i,
  /\b(?:ongea|zungumza|sema|jibu|andika)\s+(?:kwa\s+|in\s+)?(kibembe|ebembe|swahili|kiswahili|english)\b/i,
  /\b(?:speak|talk|answer|reply|respond|write)\s+(?:in\s+|to\s+me\s+in\s+)?(kibembe|ebembe|swahili|kiswahili|english)\b/i,
  /\b(?:in|kwa)\s+(kibembe|ebembe|swahili|kiswahili|english)\s+(?:only|tu|please|tafadhali)\b/i,
  /\b(?:language|mode|lugha)\s*(?:to|:)?\s*(kibembe|ebembe|swahili|kiswahili|english)\b/i,
];

/**
 * The language one turn plainly asks for, or nothing at all when it asks for none. Only a plain ask
 * counts: a turn that merely mentions a language is talk about it, not a request to change.
 */
export function langAsked(turn: any): Lang | "" {
  const said = String(turn ?? "").trim();
  if (!said || said.length > 200) return "";
  for (const shape of ASKS) {
    const hit = said.match(shape);
    if (hit) return langOf(hit[1]);
  }
  return "";
}

// What each language asks of the voice answering in it.
const RULES: Record<Lang, string> = {
  kibembe: [
    "- Answer in Kibembe (Ebembe) only, and keep answering in Kibembe until the person asks for another language.",
    "- Use only confirmed Kibembe forms from the Word Bank and the rule book, in the spelling they are written with. Never invent a word, and never answer a Kibembe word with Bemba/Chibemba, Lingala, or a word the app does not hold.",
    "- Where a needed Kibembe word is not confirmed, carry the talk with the clearest suitable Kiswahili or English word rather than inventing one, and never write or say that the word needs to be taught.",
  ],
  swahili: [
    "- Answer in clear, natural Kiswahili only, and keep answering in Kiswahili until the person asks for another language.",
    "- Kibembe words the person says are still Kibembe: keep them as they were said and take their meaning from the Word Bank. Do not turn them into Kiswahili words that merely sound like them.",
    "- Where the person plainly asks for a Kibembe word while answering in Kiswahili, give the confirmed Kibembe form with its Kiswahili meaning.",
  ],
  english: [
    "- Answer in clear, natural English only, and keep answering in English until the person asks for another language.",
    "- Kibembe words the person says are still Kibembe: keep them as they were said and take their meaning from the Word Bank. Do not translate them by ear.",
    "- Where the person asks for a Kibembe word while answering in English, give the confirmed Kibembe form with its English meaning instead of a guess.",
  ],
};

/** The rules of the language in force, as they ride to the voice answering. */
export function langLine(value: any): string {
  const lang = langOf(value);
  return [
    `LU GHA YA MAZUNGUMZO — THE LANGUAGE IN FORCE NOW: ${NAMES[lang]}`,
    "- This is the language the person is being answered in right now, and it was chosen by them. It stands turn after turn and into every later call until they ask for another one.",
    RULES[lang],
    '- Where the person plainly asks for another language in this same turn — "change mode", "ongea Kibembe", "ongea Kiswahili", "speak English", or the same in any of the three tongues — that language takes over from the very next word you say, and every turn after it, without asking them to confirm it.',
    "- The language you answer in never changes what is true: every Kibembe form, spelling, reading and meaning still comes from the Word Bank and the rule book, whichever language you are answering in.",
  ].join("\n");
}