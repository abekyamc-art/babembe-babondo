/**
 * The language the person makes a take in: Kibembe alone, a mix of all three, or Kiswahili
 * or English on its own. Kibembe and a mixed take rap on the saved Ebembe words.
 */

export const LANGUAGE_OPTIONS = [
  {
    id: "ebembe",
    label: "Kibembe",
    hint: "Kibembe pekee — kila neno linathibitishwa kutoka kwenye orodha yako ya maneno.",
  },
  {
    id: "mix",
    label: "Zote tatu",
    hint: "Kibembe, Kiswahili na English pamoja — Kibembe kinaongoza, Kiswahili na English zinaeleza maana.",
  },
  {
    id: "swahili",
    label: "Kiswahili",
    hint: "Kiswahili pekee — tafsiri ya kila mstari huandikwa kwa English.",
  },
  {
    id: "english",
    label: "English",
    hint: "English pekee — tafsiri ya kila mstari huandikwa kwa Kiswahili.",
  },
];

export const DEFAULT_LANGUAGE = "ebembe";

/** The language that was chosen; anything unrecognised is Kibembe. */
export function languageOf(id) {
  return LANGUAGE_OPTIONS.find((option) => option.id === id) || LANGUAGE_OPTIONS[0];
}

export function languageLabel(id) {
  return languageOf(id).label;
}

/** Whether a take in this language raps on the saved Ebembe words. */
export function usesStore(id) {
  return id === "ebembe" || id === "mix";
}