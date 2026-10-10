/**
 * The three languages this app speaks — and the red flag that keeps every other one out, for good.
 *
 * Kibembe (Ebembe), Kiswahili and English are the only languages of this app. Everything else is a red
 * flag: Lingala, French, Portuguese, and every other tongue of the world, and every script that is not
 * the Latin one. None of them is ever answered in, translated into, written or spoken, and a line that
 * carries one is thrown away whole rather than trimmed — a Kibembe sentence with one Lingala or French
 * word inside it is not a Kibembe sentence.
 *
 * The list below is deliberately narrow: only forms that stand in another language alone are flagged,
 * so Kibembe, Kiswahili and English are never taken for something else. It is a fixed list, changed
 * only in this app's own code: there is no setting that lets another language in.
 *
 * Two bars stand on it. A person's own turn, and a line the app holds and is about to speak, are held
 * to the higher one — a whole turn or line in another language carries several of these forms, while a
 * single one may be a word of the three the ears wrote down in another spelling, and the app never
 * refuses a person's own words, nor throws away the admin's saved line, over one form alone. What a
 * voice says of its own accord is held to the lower one: one form of another language inside an answer
 * is already drift, and that answer is stopped.
 *
 * This list is mirrored in src/lib/languageGate.js, which is what a call reads a spoken answer with as
 * it is heard. The two are kept in step by hand.
 */

/** The app's own line for a turn, or an answer, that is not in one of its three languages. */
export const LANGUAGE_FALLBACK =
  "Lugha tatu pekee hapa: Kibembe, Kiswahili na Kiingereza. Only Kibembe, Kiswahili or English here.";

// A whole turn in another language carries several of these forms; one form alone may be a word of the
// three the ears wrote down in another spelling.
const WHOLE_TURN_HITS = 2;

// The scripts no English, Kiswahili or Kibembe line is ever written in: a line wearing one of these is
// another language of the world, whole.
const OTHER_SCRIPT =
  /[\u0370-\u03FF\u0400-\u04FF\u0530-\u058F\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0900-\u097F\u0A00-\u0A7F\u0B80-\u0BFF\u0C00-\u0C7F\u0D00-\u0D7F\u0E00-\u0E7F\u0F00-\u0FFF\u1000-\u109F\u10A0-\u10FF\u1200-\u137F\u13A0-\u13FF\u1400-\u167F\u1780-\u17FF\u3040-\u30FF\u31F0-\u31FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF]/;

// The forms that stand in another language alone. Nothing of Kibembe, Kiswahili or English is in here:
// a form that belongs to one of the three would refuse a turn that is already being spoken in them.
const OTHER_WORDS = new Set([
  // Lingala — the language a Kibembe answer drifts into, and the forms that belong to it alone
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

  // French — the other language that turns up in this part of the world
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

  // The other languages of the world that are asked for, or that an answer may drift into
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

/** Every form of another language in a text, as its own letters hold them. */
function flaggedForms(text: any): string[] {
  const body = String(text ?? "");
  if (!body) return [];
  if (OTHER_SCRIPT.test(body)) return ["another script"];
  const said = body
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const found: string[] = [];
  said.split(/[^a-z0-9']+/).forEach((word) => {
    if (word && !found.includes(word) && OTHER_WORDS.has(word)) found.push(word);
  });
  return found;
}

/** The red flag in what a voice says: one form of another language is already drift, and is returned. */
export function redFlag(text: any): string {
  return flaggedForms(text)[0] || "";
}

/** The red flag in a person's own turn, or in a line the app holds: a whole one, never one form. */
export function strongFlag(text: any): string {
  const found = flaggedForms(text);
  return found.length >= WHOLE_TURN_HITS ? found.join(", ") : "";
}