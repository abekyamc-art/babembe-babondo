import { LIFE_ROWS } from "./lifeExamWords";
import { buildMedicalMix } from "./examBank";
import { lifeQuestionOf, shuffled } from "./examSeries";

/**
 * The examination's seasons and the hundred episodes of each one.
 *
 * A season is a whole run of episodes: the first of them stands open, and each one after it opens only
 * when the episode before it has been passed. Passing all hundred episodes of a season clears it, and
 * clearing it is what opens the season after it. Nothing else has to change to add a season: one entry
 * in the list below is a season, and its episodes are built from it.
 *
 * Nothing here is guessed at either. An episode's everyday questions come from lifeExamWords.js and its
 * health questions from the confirmed medical list in examBank.js, each exactly as the admin's own
 * knowledge document confirms it, and the two wrong choices of every question are other confirmed forms
 * — so no choice that was never confirmed is ever put in front of a student.
 */

/** How many episodes stand inside a season. */
export const EPISODES_PER_SEASON = 100;

/**
 * The seasons themselves. Each one carries the pool its episodes are drawn from — the everyday words,
 * the body and health terms, or both at once — and the length its first episode asks.
 *
 * The episodes of a season grow a little longer as the season goes on, and in the later episodes of a
 * season the other pool joins in, so a student never meets one part of the language alone for long.
 */
const SEASONS = [
  {
    no: 1,
    title: "The everyday words",
    blurb: "Greetings, sleep, home, the village and the road — the Kibembe of every day",
    pool: "life",
    base: 5,
  },
  {
    no: 2,
    title: "The body and health",
    blurb: "The confirmed terms of the body and health, system by system",
    pool: "health",
    base: 5,
  },
  {
    no: 3,
    title: "The whole language",
    blurb: "Every confirmed word at once — the everyday language and the health terms together",
    pool: "both",
    base: 6,
  },
];

/** The seasons of the examination, in their own order. */
export const EXAM_SEASONS = SEASONS;

/** One season, by the number it goes by. */
export function seasonByNo(no) {
  return EXAM_SEASONS.find((season) => season.no === no) || null;
}

/**
 * How many questions an episode asks: its season's own first length, one question more for every
 * twenty-five episodes behind it — so a season opens gently and asks the most of its last episodes.
 */
export function episodeSize(season, episode) {
  const base = season?.base || 5;
  const at = Math.min(EPISODES_PER_SEASON, Math.max(1, episode || 1));
  return base + Math.floor((at - 1) / 25);
}

/** How one episode's questions are shared between the everyday words and the health terms. */
function partsOf(season, episode) {
  const size = episodeSize(season, episode);

  if (season.pool === "life") {
    // the everyday words alone to begin with, and a third of the paper given to the health terms from
    // the second half of the season on
    const medical = episode > 50 ? Math.max(1, Math.round(size / 3)) : 0;
    return { life: size - medical, medical };
  }

  if (season.pool === "health") {
    const life = episode > 40 ? Math.max(1, Math.round(size / 3)) : 0;
    return { life, medical: size - life };
  }

  return { life: Math.ceil(size / 2), medical: Math.floor(size / 2) };
}

/** One episode's everyday questions, drawn from the confirmed daily-life words. */
function lifeQuestions(count) {
  if (count <= 0) return [];
  return shuffled(LIFE_ROWS).slice(0, count).map(lifeQuestionOf);
}

/**
 * One episode's paper: its everyday questions and its health questions, freshly ordered and shuffled
 * together, so neither part is ever met in the same place twice. A paper is drawn anew each time an
 * episode is taken, so an episode may be sat again and again without ever meeting the same sheet.
 */
export function buildEpisodePaper(seasonNo, episode) {
  const season = seasonByNo(seasonNo);
  if (!season) return [];
  const { life, medical } = partsOf(season, episode);
  return shuffled([...lifeQuestions(life), ...buildMedicalMix(medical)]);
}