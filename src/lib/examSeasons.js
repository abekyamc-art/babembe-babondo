import { buildMedicalMix } from "./examBank";
import { buildExtraMix } from "./examExtras";
import { LIFE_WORD_ROWS, lifeQuestionOf, shuffled } from "./examSeries";

/**
 * The everyday words in one order for the whole season, shuffled once and then kept: every episode's
 * questions are cut from it where the episode before it left off, so no two episodes beside each other
 * ask the same word — a word only comes back once the whole list has been round.
 *
 * Every confirmed word stands in it twice, once in each direction of its pair, so a word is met with its
 * Kibembe asked for and with its meaning asked for as the season goes on.
 */
const LIFE_ORDER = shuffled(LIFE_WORD_ROWS);

/**
 * The examination's seasons and the hundred episodes of each one.
 *
 * A season is a whole run of episodes: the first of them stands open, and each one after it opens only
 * when the episode before it has been passed. Passing all hundred episodes of a season clears it, and
 * clearing it is what opens the season after it. Nothing else has to change to add a season: one entry
 * in the list below is a season, and its episodes are built from it.
 *
 * Nothing here is guessed at either. An episode's everyday questions come from lifeExamWords.js, its
 * numbers, greetings, phrases and proverbs from examExtras.js, and its health questions from the
 * confirmed medical list in examBank.js, each exactly as the admin's own knowledge document confirms it,
 * and the two wrong choices of every question are other confirmed forms — so no choice that was never
 * confirmed is ever put in front of a student. Every question also carries the one thing it turns on
 * apart from the rest of the line, and every question a picture to study it on.
 */

/** How many episodes stand inside a season, and how many questions every episode asks. */
export const EPISODES_PER_SEASON = 100;
export const QUESTIONS_PER_EPISODE = 10;

/**
 * The seasons themselves. Each one carries the pool its episodes are drawn from — the everyday words
 * with the numbers, the greetings, the phrases and the proverbs, the body and health terms, or both at
 * once.
 */
const SEASONS = [
  {
    no: 1,
    title: "The everyday language",
    blurb:
      "Greetings, sleep, home, the village and the road — with a number, a greeting, a phrase or a proverb in every paper",
    pool: "life",
  },
  {
    no: 2,
    title: "The body and health",
    blurb: "The confirmed terms of the body and health, system by system, with the everyday words beside them",
    pool: "health",
  },
  {
    no: 3,
    title: "The whole language",
    blurb: "Every confirmed word at once — the everyday language and the health terms together",
    pool: "both",
  },
];

/** The seasons of the examination, in their own order. */
export const EXAM_SEASONS = SEASONS;

/** One season, by the number it goes by. */
export function seasonByNo(no) {
  return EXAM_SEASONS.find((season) => season.no === no) || null;
}

/** How many questions an episode asks: ten, in every season and every episode alike. */
export function episodeSize() {
  return QUESTIONS_PER_EPISODE;
}

/**
 * How one episode's questions are shared between the everyday words, the mixed questions and the health
 * terms. Every paper asks ten, and every one of them carries a number, a greeting, a phrase or a proverb
 * — so the counting and the greetings of every day are met in season after season, beside the words and
 * the health terms the paper is mostly about.
 */
function partsOf(season, episode) {
  const size = QUESTIONS_PER_EPISODE;
  const extras = episode > 40 ? 3 : 2;

  if (season.pool === "life") {
    const medical = episode > 50 ? 3 : 0;
    return { life: size - extras - medical, extras, medical };
  }

  if (season.pool === "health") {
    return { life: 3, extras, medical: size - 3 - extras };
  }

  return { life: 3, extras, medical: size - 3 - extras };
}

/**
 * Where a part's run begins in its own list: every question the episodes before this one asked of it,
 * added up over the season. The everyday run steps on by the whole length of the paper — its mixed
 * questions and its health questions included — so the runs of the episodes beside each other never cross.
 */
const RUN = {
  life: (part) => part.life + part.extras + part.medical,
  medical: (part) => part.medical,
};

function runStart(season, episode, name) {
  let start = 0;
  for (let no = 1; no < episode; no += 1) start += RUN[name](partsOf(season, no));
  return start;
}

/**
 * One episode's everyday questions: an unbroken run of the season's own order of the confirmed words.
 * A word the paper already asks — its other direction standing close in the run — is stepped over, so
 * no paper asks the same word twice, and the next word of the run takes its place.
 */
function lifeQuestions(season, episode, count) {
  if (count <= 0) return [];
  const start = runStart(season, episode, "life");
  const out = [];
  const asked = new Set();
  for (let step = 0; step < LIFE_ORDER.length && out.length < count; step += 1) {
    const row = LIFE_ORDER[(start + step) % LIFE_ORDER.length];
    const word = form(row.kb);
    if (asked.has(word)) continue;
    asked.add(word);
    out.push(lifeQuestionOf(row));
  }
  return out;
}

const form = (text) => String(text || "").toLowerCase().replace(/[.?!\s]+$/, "");

/**
 * One episode's paper of ten: the everyday questions of that episode alone, taken from the season's own
 * orders so the papers beside each other never ask the same word — wherever in the season the episode
 * falls — then its mixed questions and its health questions, freshly ordered and shuffled together, so
 * no part of the language is ever met in the same place twice. The words an episode asks are its own: a
 * paper sat again asks those same words in a new order, and never the words of the episodes around it.
 */
export function buildEpisodePaper(seasonNo, episode) {
  const season = seasonByNo(seasonNo);
  if (!season) return [];
  const { life, extras, medical } = partsOf(season, episode);
  const everyday = lifeQuestions(season, episode, life);
  return shuffled([
    ...everyday,
    ...buildExtraMix(extras, episode, everyday.map((question) => question.key)),
    ...buildMedicalMix(medical, runStart(season, episode, "medical")),
  ]);
}