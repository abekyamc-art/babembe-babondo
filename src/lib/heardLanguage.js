/**
 * The names of the languages the people of this app speak, so the language the ears marked a turn
 * with reaches whoever answers as a name rather than a code. A language this list does not hold is
 * passed on exactly as the ears wrote it, never renamed to something it may not be.
 */
const NAMES = {
  swa: "Kiswahili",
  swh: "Kiswahili",
  sw: "Kiswahili",
  eng: "English",
  en: "English",
  fra: "French",
  fre: "French",
  fr: "French",
  lin: "Lingala",
  kon: "Kikongo",
  lug: "Luganda",
  kin: "Kinyarwanda",
  run: "Kirundi",
  amh: "Amharic",
  hau: "Hausa",
  yor: "Yoruba",
  zul: "isiZulu",
  xho: "isiXhosa",
  som: "Somali",
  ara: "Arabic",
  por: "Portuguese",
};

/** The language one turn was spoken in, as a name when it is one the app knows. */
export function heardLanguage(code) {
  const key = String(code || "").trim().toLowerCase();
  if (!key) return "";
  return NAMES[key] || key;
}