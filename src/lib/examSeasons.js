import { buildAnimalPaper } from "./animalPapers";
import { buildMedicalMix } from "./examBank";
import { buildExtraMix } from "./examExtras";
import { buildNumberPaper } from "./examNumbers";
import { lifeQuestionOf, lifeWordOrder, shuffled } from "./examSeries";
import { buildCalculationPaper, challengeAt } from '@/lib/challengeQuestions';
import { buildPeoplePaper, peopleEpisodes } from '@/lib/peopleChallenges';
import { SCENE_POOL, currentQueues, poolShare } from './examPool';
import { buildSetPaper } from './examSetPapers';
import { buildTopUp } from './examTopUp';
import { buildTopicPaper } from './examTopicPapers';
import { THEME_SEASONS } from './examThemes';
import { differencePuzzle } from './diffPuzzles';

/**
 * The everyday words in one order for the whole season, shuffled once and then kept: every episode's
 * questions are cut from it where the episode before it left off, so no two episodes beside each other
 * ask the same word — a word only comes back once the whole list has been round.
 *
 * Every confirmed word stands in it twice, once in each direction of its pair, so a word is met with its
 * Kibembe asked for and with its meaning asked for as the season goes on.
 */
const LIFE_ORDER = lifeWordOrder();

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

/** How many terms of the adult body stand before the picture puzzle on one of the anatomy papers. */
export const ANATOMY_PER_PAPER = QUESTIONS_PER_EPISODE - 1;

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
  { no: 4, title: 'Calculation champions', blurb: 'Addition, subtraction, multiplication and division — new calculations in every episode', pool: 'math' },
  {
    no: 5,
    title: 'People and culture',
    blurb:
      'The people of Tanzania, the Congo and the world — artists, comedians, athletes and presidents, with the leaders, the capital cities and the everyday facts that stand beside them',
    pool: 'people',
    episodes: peopleEpisodes(),
  },
  { no: 6, title: 'Everyday problem solving', blurb: 'Adding, taking away, multiplying and sharing — a plain calculation in every question', pool: 'logic' },
  {
    no: 7,
    title: 'The numbers and the counting',
    blurb: 'Three figures added up, one taken away, a product — and the Kibembe name of the number asked beside every calculation',
    pool: 'numbers',
  },
  {
    no: 8,
    title: 'The names of the world',
    blurb:
      'The animals Gloire taught on 12 October 2026 — each one asked both ways, the taught plurals beside them, and a number, a greeting, a phrase or a proverb in every paper',
    pool: 'animals',
    study: 'animals',
  },
  {
    no: 9,
    title: 'The anatomy',
    blurb:
      "The confirmed terms of the adult body, one after another, on a season of their own — and, once the body's own list has been asked through, the examination's other confirmed words beside them",
    pool: 'anatomy',
  },
  // The two seasons of the teaching sets of 12 October 2026 — the words Gloire taught by voice, which
  // the seasons already standing had no room for. Each runs the hundred episodes every season of the
  // examination runs: the lesson the season before it cannot hold stands here, every pair of both sets is
  // asked, in Kibembe and English, and the papers past the set's own end are topped up from the
  // examination's other confirmed words. Their own pages are written from the same record, so the lesson
  // can be read before it is asked. They wait on the season before them like every other season, and the
  // one after them waits on them.
  {
    no: 10,
    title: 'Watu, mahali na kazi',
    blurb:
      'Who we are, where we live, the work we need and do, and the time that has passed — the voice-captured set of 12 October 2026, every pair asked both ways in Kibembe and English',
    pool: 'set',
    set: 'watu',
    study: 'watu',
  },
  {
    no: 11,
    title: 'Chakula, mboga na matunda',
    blurb:
      'The food lesson of the same day — the greens, the kitchen foods and spices, the fruit and the drinks — every pair asked both ways in Kibembe and English',
    pool: 'set',
    set: 'chakula',
    study: 'chakula',
  },
  // The nine seasons of ideas, twelve to twenty. Each one runs the hundred episodes every season of the
  // examination runs, and each episode of it carries an idea of its own, so a season is never the same
  // paper asked a hundred times. They wait on the season before them like every other season, and their
  // papers are cut from the examination's own confirmed words exactly as the word seasons are.
  ...THEME_SEASONS,
];

/** The seasons of the examination, in their own order. */
export const EXAM_SEASONS = SEASONS;

/**
 * The last season that may be held back from a person, held at nothing at all: every season of the
 * examination now stands open to everyone alike — the whole eleven-season run is listed, taken and prized
 * the same for a student as for an admin — and the season a person is on still waits on the seasons before
 * it exactly as it did. The mark is kept as the one place a season's visibility is decided, so a season
 * can be held back again by moving it here and nowhere else.
 */
export const LAST_STUDENT_SEASON = Infinity;

/** Whether a season is shown to a person: every season of the examination is shown to every person. */
export function seasonShown(no, admin) {
  return admin === true || no <= LAST_STUDENT_SEASON;
}

/** One season, by the number it goes by. */
export function seasonByNo(no) {
  return EXAM_SEASONS.find((season) => season.no === no) || null;
}

/** How many questions an episode asks: ten, in every season and every episode alike. */
export function episodeSize() {
  return QUESTIONS_PER_EPISODE;
}

export function episodesInSeason(no) {
  return seasonByNo(no)?.episodes || EPISODES_PER_SEASON;
}

/**
 * How one episode's questions are shared between the everyday words, the mixed questions and the health
 * terms. Every paper asks ten, and every one of them carries a number, a greeting, a phrase or a proverb
 * — so the counting and the greetings of every day are met in season after season, beside the words and
 * the health terms the paper is mostly about.
 */
function partsOf(season, episode) {
  const size = QUESTIONS_PER_EPISODE;

  if (season.pool === "life") {
    const extras = episode > 40 ? 3 : 2;
    const medical = episode > 50 ? 3 : 0;
    return { life: size - extras - medical, extras, medical };
  }

  // The health papers and the whole-language papers ask the same share of each part in every episode:
  // the everyday words, the mixed questions, and the health terms — whose confirmed list is the smallest
  // of the three — no more often than it must be, so no term comes back in the papers beside each other.
  return { life: 3, extras: 3, medical: size - 6 };
}

/**
 * Where a part's run begins in its own list: every question the episodes before this one asked of it,
 * added up over the season. The everyday run steps on by the whole length of the paper — its mixed
 * questions and its health questions included — so the runs of the episodes beside each other never cross.
 */
const RUN = {
  life: (part) => part.life + part.extras + part.medical,
  extras: (part) => part.extras,
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
 * The last question of every episode: one picture shown twice, with differences standing in the lower
 * copy for the student to find. It is the same question the whole examination ends on, and it is drawn
 * from the app's own pictures in turn, so an episode beside this one is never given the same picture.
 */
function differenceQuestion(seasonNo, episode) {
  const puzzle = differencePuzzle(seasonNo, episode);
  return {
    id: `difference:${seasonNo}:${episode}`,
    kind: 'difference',
    focus: 'Find the differences',
    prompt: `Find the ${puzzle.differences.length} differences between the two pictures.`,
    lead: 'Find the ',
    key: `${puzzle.differences.length} differences`,
    tail: ' between the two pictures.',
    kb: '',
    options: ['Found every difference'],
    correct: 0,
    explain: 'Every difference stood where the rings are marked.',
    practice: [],
    image: null,
    hint: 'Look closely — nothing is marked. Tap each place where the lower picture differs from the one above it.',
    puzzle,
  };
}

/**
 * One episode's paper of ten — its own questions, and the picture puzzle standing last, where the
 * examination's own question of pictures always stands.
 */
export function buildEpisodePaper(seasonNo, episode) {
  const paper = paperOf(seasonNo, episode);
  if (!paper.length) return paper;
  const puzzle = differenceQuestion(seasonNo, episode);
  // A paper that already asks its whole ten has its last place given to the picture puzzle, where the
  // examination's own question of pictures always stands. A paper cut a question short — the newest
  // papers of the season of people — has the puzzle stood at its end instead, so every episode of the
  // examination asks ten questions either way.
  if (paper.length >= QUESTIONS_PER_EPISODE) paper[paper.length - 1] = puzzle;
  else paper.push(puzzle);
  return paper;
}

/** The seasons whose papers are confirmed words, and the number of episodes they ask between them. */
const WORD_POOLS = ['life', 'health', 'both'];
const WORD_EPISODES = 300;

/**
 * How many of a paper's ten questions are confirmed words. It is worked out from what the knowledge
 * document holds: every word paper of the examination is given as many word questions as the document
 * can cover without ever asking one of them twice. A paper whose words run out is filled with a
 * challenge question instead — a word that has already stood is never handed to a student again.
 */
function wordShare() {
  const held = poolShare();
  return Math.max(4, Math.min(QUESTIONS_PER_EPISODE, Math.floor(held / WORD_EPISODES)));
}

/** What one word paper is made of: its words of every day, its body and health term, and its challenges. */
function poolParts() {
  const words = wordShare();
  const medical = Math.min(1, words);
  const extras = Math.min(3, Math.max(0, words - medical - 1));
  return { life: words - medical - extras, extras, medical, challenge: QUESTIONS_PER_EPISODE - words };
}

/**
 * Where each paper's own run of the confirmed words begins: the words every paper before it — in the
 * season before this one as well — has already asked, added up. So the runs follow one another without
 * ever crossing, and a word stands in one paper only.
 */
let spread = { share: 0, table: null };

function spreadOf() {
  const share = wordShare();
  if (spread.table && spread.share === share) return spread.table;
  const table = {};
  const parts = poolParts();
  let everyday = 0;
  let medical = 0;
  let papers = 0;
  for (const season of EXAM_SEASONS) {
    if (!WORD_POOLS.includes(season.pool)) continue;
    for (let episode = 1; episode <= episodesInSeason(season.no); episode += 1) {
      table[`${season.no}:${episode}`] = {
        everyday,
        medical,
        scene: papers * QUESTIONS_PER_EPISODE,
      };
      everyday += parts.life + parts.extras;
      medical += parts.medical;
      papers += 1;
    }
  }
  spread = { share, table };
  return table;
}

/**
 * A paper's own run of a queue: the questions standing at it, in their own order. A run that reaches the
 * end of the list takes up at its head again, so a bank shorter than the season asks its own terms again
 * once the whole list has been round rather than putting a calculation where a word of the language stands.
 */
function take(queue, start, count) {
  if (!queue || !queue.length) return [];
  return Array.from({ length: count }, (_, step) => queue[(start + step) % queue.length]);
}

/** Every question of a paper that carries no picture of its own is studied on a scene of its own in it. */
function withScenes(paper, seed) {
  paper.forEach((question, slot) => {
    if (question.image?.url) return;
    const scene = SCENE_POOL[(seed + slot) % SCENE_POOL.length];
    question.image = scene;
    question.hint = `Study the picture — ${scene.scene} — before you answer.`;
  });
  return paper;
}

/** One word paper: its own run of the words of every day and of the body, and its own calculations. */
function poolPaper(season, episode, queues) {
  const parts = poolParts();
  const at = spreadOf()[`${season.no}:${episode}`];
  const paper = [
    ...take(queues.everyday, at.everyday, parts.life + parts.extras),
    ...take(queues.medical, at.medical, parts.medical),
    ...Array.from({ length: parts.challenge }, (_, step) =>
      challengeAt(700000 + at.scene + step, true)
    ),
  ];
  return shuffled(withScenes(paper, at.scene));
}

/**
 * The anatomy season's own paper: the terms of the adult body — its bank's own run of nine, beginning
 * where the episode before it left off, so the terms of the papers beside each other never cross — with
 * the picture puzzle standing last, where every paper of the examination ends.
 *
 * The body's own list fills the first papers of the season, and the season runs the hundred episodes
 * every season of the examination runs: a paper past the end of that list is topped up from the
 * examination's other confirmed words rather than asking a term of the body a second time.
 */
function anatomyPaper(episode, queues) {
  const start = (episode - 1) * ANATOMY_PER_PAPER;
  const own = queues.anatomy.slice(start, start + ANATOMY_PER_PAPER);
  const paper = [
    ...own,
    ...buildTopUp(
      ANATOMY_PER_PAPER - own.length,
      'anatomy',
      episode,
      own.map((question) => question.kb || question.key)
    ),
  ];
  return withScenes(paper, (episode - 1) * QUESTIONS_PER_EPISODE);
}

/**
 * One episode's paper of ten: the everyday questions of that episode alone, taken from the season's own
 * orders so the papers beside each other never ask the same word — wherever in the season the episode
 * falls — then its mixed questions and its health questions, freshly ordered and shuffled together, so
 * no part of the language is ever met in the same place twice. The words an episode asks are its own: a
 * paper sat again asks those same words in a new order, and never the words of the episodes around it.
 */
function paperOf(seasonNo, episode) {
  const season = seasonByNo(seasonNo);
  if (!season || episode < 1 || episode > episodesInSeason(seasonNo)) return [];
  // the confirmed words of the app's own knowledge document, once they have been read: every paper takes
  // its own run of them, so a word stands in one paper and never comes back
  const queues = currentQueues();
  if (queues && WORD_POOLS.includes(season.pool)) return poolPaper(season, episode, queues);
  // the anatomy season asks the terms of the adult body itself, and falls back to the written lists of
  // the examination only when the document could not be read and holds no anatomy at all
  if (season.pool === 'anatomy' && queues?.anatomy?.length) return anatomyPaper(episode, queues);
  if (season.pool === 'math') return buildCalculationPaper(episode);
  // The season of people: the first episodes keep the people's own portraits, and every question of the
  // bank that carries no picture of its own is studied on a scene of its own — the rule every other paper
  // of the examination is held to, so no question of the season stands without a picture to study it on.
  if (season.pool === 'people') {
    return withScenes(buildPeoplePaper(episode), (episode - 1) * QUESTIONS_PER_EPISODE);
  }
  if (season.pool === 'logic') return buildCalculationPaper(episode, true);
  // the season of the numbers: the calculations and the names of the counting itself
  if (season.pool === 'numbers') return buildNumberPaper(episode);
  // the season of the names of the world: the animals of today's own set, with the other confirmed
  // topics of the language standing beside them
  if (season.pool === 'animals') return buildAnimalPaper(episode);
  // the two seasons of the teaching sets of 12 October 2026: a paper is cut from its own set's words —
  // nine of them, in the run the season has left off at — and what its own set cannot fill is filled
  // from the examination's own confirmed extras
  if (season.pool === 'set') return buildSetPaper(season.set, episode);
  // the seasons of ideas: the confirmed words in the season's own order, with the episode's own idea over
  // every question of the paper
  if (season.pool === 'topic') return buildTopicPaper(season.no, episode);
  // a season still waiting for its own list of words writes no paper at all
  if (season.pool === 'waiting') return [];
  const { life, extras, medical } = partsOf(season, episode);
  const everyday = lifeQuestions(season, episode, life);
  return shuffled([
    ...everyday,
    ...buildExtraMix(extras, runStart(season, episode, "extras"), everyday.map((question) => question.key)),
    ...buildMedicalMix(medical, runStart(season, episode, "medical")),
  ]);
}