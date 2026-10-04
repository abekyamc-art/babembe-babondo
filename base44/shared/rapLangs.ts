/**
 * The language a take is made in. Kibembe and a mixed take draw their Ebembe words from the
 * saved word store; Kiswahili and English take their words from the writer itself.
 */

export type RapLang = "ebembe" | "swahili" | "english" | "mix";

const LANGS: RapLang[] = ["ebembe", "swahili", "english", "mix"];

/** The language that was asked for; anything unrecognised is a Kibembe take. */
export function rapLang(value: any): RapLang {
  return LANGS.includes(value) ? (value as RapLang) : "ebembe";
}

export const LANG_NAME: Record<RapLang, string> = {
  ebembe: "Ebembe (Kibembe)",
  swahili: "Kiswahili",
  english: "English",
  mix: "Ebembe mixed with Kiswahili and English",
};

/** Whether a take leans on the saved Ebembe words at all. */
export function usesStore(language: RapLang): boolean {
  return language === "ebembe" || language === "mix";
}