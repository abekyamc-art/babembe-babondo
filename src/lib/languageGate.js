/**
 * The three languages this app speaks — and the red flag that keeps every other one out, for good.
 *
 * This is the same gate the app's own server reads a turn and a saved line with, written for the
 * phone, where the answer a voice is saying is read as it is heard: an answer that turns into Lingala,
 * French or any other language is stopped at that very word rather than heard out. It mirrors
 * base44/shared/languageGate.ts and is kept in step with it by hand.
 */

/** What the app says, out loud, when a line was not in one of its three languages. */
export const LANGUAGE_FALLBACK =
  "Lugha tatu pekee hapa: Kibembe, Kiswahili na Kiingereza. Only Kibembe, Kiswahili or English here.";

/** What the screen says beside it. */
export const LANGS_NOTICE = "Only Kibembe, Kiswahili or English here.";

// The scripts no English, Kiswahili or Kibembe line is ever written in.
const OTHER_SCRIPT =
  /[\u0370-\u03FF\u0400-\u04FF\u0530-\u058F\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0900-\u097F\u0A00-\u0A7F\u0B80-\u0BFF\u0C00-\u0C7F\u0D00-\u0D7F\u0E00-\u0E7F\u0F00-\u0FFF\u1000-\u109F\u10A0-\u10FF\u1200-\u137F\u13A0-\u13FF\u1400-\u167F\u1780-\u17FF\u3040-\u30FF\u31F0-\u31FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF]/;

// The forms that stand in another language alone — kept in step with base44/shared/languageGate.ts.
const OTHER_WORDS = new Set([
  "mbote",
  "nazali",
  "ozali",
  "azali",
  "ezali",
  "tozali",
  "bozali",
  "bazali",
  "eloko",
  "yango",
  "lokola",
  "ndenge",
  "lolenge",
  "boye",
  "boni",
  "malamu",
  "likambo",
  "makambo",
  "matondo",
  "lisusu",
  "liboso",
  "nsima",
  "mokili",
  "molayi",
  "mokuse",
  "noki",
  "kozala",
  "koloba",
  "kotika",
  "koyekola",
  "kolakisa",
  "koyebisa",
  "kozonga",
  "kofuta",
  "kokamwa",
  "kosepela",
  "nakosepela",
  "esengeli",
  "elingi",
  "bakisa",
  "kobanga",
  "kotuna",
  "koyanola",
  "balabala",
  "ndako",
  "mwasi",
  "mobali",
  "mpenza",
  "penza",
  "nzela",
  "bomengo",
  "etre",
  "avoir",
  "avec",
  "dans",
  "tres",
  "merci",
  "bonjour",
  "voila",
  "pourquoi",
  "parce",
  "toujours",
  "beaucoup",
  "aussi",
  "nous",
  "vous",
  "ils",
  "elles",
  "francais",
  "oui",
  "vraiment",
  "peut",
  "lingala",
  "kilingala",
  "kifaransa",
  "french",
  "portugais",
  "portuguese",
  "portugues",
  "voce",
  "obrigado",
  "obrigada",
  "espanol",
  "spanish",
  "gracias",
  "hola",
  "tambien",
  "kikongo",
  "kinyarwanda",
  "kirundi",
  "afrikaans",
  "german",
  "deutsch",
]);

/** The first form of another language in a text, or nothing at all when it holds none. */
export function redFlag(text) {
  const body = String(text ?? "");
  if (!body) return "";
  if (OTHER_SCRIPT.test(body)) return "another script";
  const said = body
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const words = said.split(/[^a-z0-9']+/);
  return words.find((word) => word && OTHER_WORDS.has(word)) || "";
}