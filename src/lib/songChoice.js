/**
 * The person's answer to the app's own question about the artist's own pieces.
 *
 * When more than one of the artist's pieces answers a request equally well, the app chooses none of
 * them and puts the question to the person instead, naming the pieces it offered. This is the reading
 * of their answer, and it is read in the shape the question was asked in: the person hears those
 * pieces by name, so answering with the part of a name that tells one of them from the others, or with
 * the place it stood at — "the second one", "number two", "ya pili", "the last one" — is an answer.
 *
 * Nothing is ever invented here, and no piece is ever picked out of a guess. Where the turn names no
 * one piece of the question — the words it carries stand in all of them, or in none of them — the
 * person is asking for the artist's own work as a whole, and the most watched of the pieces the
 * question offered answers, exactly as it does when no piece is named at all. A turn about something
 * else entirely answers nothing, and the app's own selection reads it as it always did.
 */

// The order words a person answers "which one?" with, in English and in Kiswahili, and the figure that
// stands for the same place. `last` is the place at the end of the question, whatever its length.
const ORDINALS = {
  first: 0, one: 0, kwanza: 0, moja: 0,
  second: 1, two: 1, pili: 1, mbili: 1,
  third: 2, three: 2, tatu: 2,
  fourth: 3, four: 3, nne: 3,
  fifth: 4, five: 4, tano: 4,
  "1": 0, "2": 1, "3": 2, "4": 3, "5": 4,
};
const LAST = -1;

// The words that make a place a real answer rather than a word that merely passed by in a sentence:
// "the second one", "number two", "ya pili".
const PLACE_ASK =
  /\b(first|second|third|fourth|fifth|kwanza|pili|tatu|nne|tano|last|number|namba|no\.?|option|choice|choose|chagua)\b/i;

// the words a bare answer is allowed to carry around its own place — "the first", "number two, please"
const FILLER = new Set([
  "the", "a", "an", "please", "tafadhali", "yes", "sawa", "ok", "okay", "choose", "choice",
  "option", "number", "no", "namba", "let", "me",
]);

/**
 * The words of a turn and of a piece's own name, read the same way on both sides. Nothing is taken out
 * of a name here — not the "official video" nor the "lyrics" it ends with: what tells one of the
 * artist's pieces from another is as often one of those words as the title itself, and the question was
 * asked in those very names.
 */
function words(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((word) => word.length > 2 || ORDINALS[word] !== undefined || word === "one");
}

/** Which place in the question a turn names, or nothing at all. */
function placeOf(turn) {
  const said = words(turn);
  const at = said.find((word) => ORDINALS[word] !== undefined);
  if (PLACE_ASK.test(turn)) {
    // "the last one" is the end of the question, however many pieces it offered
    if (said.includes("last")) return LAST;
    return at !== undefined ? ORDINALS[at] : null;
  }
  // a bare answer — "one", "2", "the first" — names a place on its own
  const bare = said.filter((word) => !FILLER.has(word));
  if (bare.length === 1 && ORDINALS[bare[0]] !== undefined) return ORDINALS[bare[0]];
  return null;
}

/**
 * The one piece of those the app offered that the person's turn answers with, or nothing at all.
 */
export function choiceFromOffer(said, offered) {
  const list = (Array.isArray(offered) ? offered : []).filter((one) => one?.url);
  const turn = String(said || "").trim();
  if (!list.length || !turn) return null;

  const place = placeOf(turn);
  if (place === LAST) return list[list.length - 1];
  if (place !== null && place >= 0 && place < list.length) return list[place];

  const own = list.map((one) => words(one.name));
  const said_words = words(turn);
  const held = (set) => set.filter((word) => said_words.includes(word)).length;

  // the words that belong to some of the offered pieces and not to others: what names one of them
  const telling = said_words.filter((word) => {
    const carriers = own.filter((set) => set.includes(word)).length;
    return carriers > 0 && carriers < own.length;
  });

  // The piece named: of the pieces one of those words belongs to, the one whose own name is said most
  // completely is the one meant — and only where one of them is said more completely than the rest.
  if (telling.length) {
    const named = list
      .map((one, at) => ({
        one,
        share: own[at].length ? held(own[at]) / own[at].length : 0,
        tells: own[at].some((word) => telling.includes(word)),
      }))
      .filter((row) => row.tells)
      .sort((a, b) => b.share - a.share);
    if (named.length === 1 || named[1].share < named[0].share) return named[0].one;
  }

  // The turn names no one piece of the question: the most watched of the pieces it offered answers it,
  // exactly as the artist's own work answers a request that names no piece of its own.
  if (said_words.filter((word) => own.some((set) => set.includes(word))).length >= 2) return list[0];
  return null;
}