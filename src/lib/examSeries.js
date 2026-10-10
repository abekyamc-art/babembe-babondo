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
    explain: `${row.kb} = ${row.en}.`,
    options,
    correct: options.indexOf(right),
    practice: row.practice || [{ en: row.en, kb: row.kb }],
    image: row.image,
    hint: `Study the picture — ${row.image.scene} — before you answer.`,
  };
}