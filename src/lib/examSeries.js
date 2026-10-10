import { LIFE_ROWS } from "./lifeExamWords";

/**
 * The everyday Kibembe the examination is drawn from: the confirmed words of daily life, each one
 * standing exactly as the admin's own knowledge document confirms it, and the question built from it.
 *
 * The seasons and their hundred episodes stand in examSeasons.js; what lives here is only the pool
 * itself and the way one word of it is asked. The two wrong choices of every question are other
 * confirmed forms — so no choice that was never confirmed is ever put in front of a student.
 */

/** The same list, in a different order, so no paper repeats the last one. */
export function shuffled(list) {
  const out = [...list];
  for (let at = out.length - 1; at > 0; at -= 1) {
    const pick = Math.floor(Math.random() * (at + 1));
    [out[at], out[pick]] = [out[pick], out[at]];
  }
  return out;
}

/**
 * A run of `count` items taken from an order, beginning at `start` and carrying on from the top when it
 * reaches the end. It is how one episode's own words are cut from a season's order — beginning where the
 * episode before it left off, so the words of the papers beside each other never cross.
 */
export function runOf(order, start, count) {
  if (!order || !order.length || !count || count <= 0) return [];
  const from = ((start % order.length) + order.length) % order.length;
  return Array.from(
    { length: Math.min(count, order.length) },
    (_, step) => order[(from + step) % order.length]
  );
}

/** Every confirmed form of the everyday list, each in its own language. */
const KB_FORMS = LIFE_ROWS.map((row) => row.kb);
const EN_FORMS = LIFE_ROWS.map((row) => row.en);

/** Two other confirmed forms of one language, so a wrong choice is a confirmed form as well. */
function otherForms(pool, not, skip = []) {
  const out = [];
  for (const text of shuffled(pool)) {
    if (!text || text === not || skip.includes(text) || out.includes(text)) continue;
    out.push(text);
    if (out.length === 2) break;
  }
  return out;
}

/**
 * A confirmed word of every day asked the other way: the Kibembe form given and its meaning asked for
 * where the word itself stood with its meaning given and the Kibembe asked for, and the other way
 * round. The wrong choices are the word's own practice pairs first and the whole confirmed list after
 * them, so every choice put in front of a student is a confirmed form and never an invented one.
 */
function flipped(row) {
  const askedKibembe = row.direction === "kb_to_en";
  const pairs = Array.isArray(row.practice) ? row.practice : [];
  const near = pairs.map((pair) => (askedKibembe ? pair.kb : pair.en)).filter(Boolean);
  const pool = askedKibembe ? KB_FORMS : EN_FORMS;
  const not = askedKibembe ? row.kb : row.en;
  return {
    ...row,
    id: `${row.id}:other`,
    direction: askedKibembe ? "en_to_kb" : "kb_to_en",
    wrong: otherForms([...near, ...pool], not, [row.kb, row.en]),
  };
}

/**
 * Every word of every day, each asked both ways: the one order a season's episodes are cut from, so the
 * same word is met with its Kibembe asked for and with its meaning asked for as the season goes on, and
 * a word only comes back once the whole list has been round.
 *
 * One direction of every word stands in the first half of the order and the other direction in the second
 * half, so the two directions of one word are never near each other: no single paper is ever handed the
 * same word twice, and no paper has to step over a word and so take one of the next paper's.
 */
export function lifeWordOrder() {
  return [...shuffled(LIFE_ROWS), ...shuffled(LIFE_ROWS.map((row) => flipped(row)))];
}

/** One daily-life question, with the correct answer standing wherever the shuffle has put it. */
export function lifeQuestionOf(row) {
  const askKibembe = row.direction === "en_to_kb";
  const right = askKibembe ? row.kb : row.en;
  const options = shuffled([right, ...row.wrong]);

  return {
    id: row.id,
    prompt: askKibembe
      ? `What is the Kibembe word for “${row.en}”?`
      : `What does the Kibembe term “${row.kb}” mean?`,
    // the word the question turns on: the English word where the Kibembe is asked for, the Kibembe
    // where its meaning is asked for. It is written apart from the rest of the line so the card can
    // stand it in a pure colour of its own
    lead: askKibembe ? "What is the Kibembe word for “" : "What does the Kibembe term “",
    key: askKibembe ? row.en : row.kb,
    tail: askKibembe ? "”?" : "” mean?",
    explain: `${row.kb} = ${row.en}.`,
    options,
    correct: options.indexOf(right),
    practice: row.practice || [{ en: row.en, kb: row.kb }],
    image: row.image,
    hint: `Study the picture — ${row.image.scene} — before you answer.`,
  };
}