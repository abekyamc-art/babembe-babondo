import { shuffled } from './examSeries';
import { buildExtraMix } from './examExtras';
import { SCENE_POOL } from './examPool';
import { ANIMAL_PLURALS, ANIMAL_ROWS, animalName } from './examAnimals';

/**
 * GLOIRE AI — THE EXAMINATION: the season of the names of the world.
 *
 * The season asks the animals Gloire taught on 12 October 2026, and no animal that was not spoken that
 * day. An animal is asked both ways round — its Kibembe for the name, and the name for its Kibembe —
 * and the three whose singular and plural were both spoken are asked as a plural, in both directions,
 * so the pair is met together rather than worked out from a pattern.
 *
 * Every choice put up is a form of that same lesson, so nothing unspoken is ever handed to a student,
 * and an animal stands only once in one paper. The rest of the paper carries other confirmed topics of
 * the language — a number, a greeting, a phrase and a proverb — and the picture puzzle is put last by
 * the season itself, where every paper of the examination ends.
 */

/** How one paper is shared: the animals of the lesson first, the other confirmed topics after them. */
const ANIMALS_PER_PAPER = 6;
const EXTRAS_PER_PAPER = 4;

const form = (text) => String(text || '').toLowerCase().replace(/[.?!\s]+$/, '');

/** The picture a question is studied on: one of the examination's own scenes, and none of them a clue. */
const sceneOf = (index) => SCENE_POOL[index % SCENE_POOL.length];

/** One question, with the correct answer standing wherever the shuffle has put it. */
function animalAsk({ id, focus, lead, key, tail, right, wrong, explain, kb, pair, picture }) {
  const options = shuffled([right, ...wrong]);
  return {
    id,
    focus,
    lead,
    key: String(key),
    tail,
    prompt: `${lead}${key}${tail}`,
    // the Kibembe form standing in the line, so the reading says it as it sounds
    kb: kb || '',
    options,
    correct: options.indexOf(right),
    explain,
    practice: pair ? [pair] : [],
    image: picture,
    hint: picture ? `Study the picture — ${picture.scene} — before you answer.` : '',
  };
}

/** Two other forms of the same lesson, so no choice that was never spoken is ever put up. */
function others(row, pick, pool = ANIMAL_ROWS) {
  const out = [];
  for (const other of shuffled(pool)) {
    const text = pick(other);
    if (!text || text === pick(row) || out.includes(text)) continue;
    out.push(text);
    if (out.length === 2) break;
  }
  return out;
}

/** The Kibembe name is given and what the animal is called is asked for. */
function meaningQuestion(row, index) {
  return animalAsk({
    id: `animal:${form(row.kb)}:meaning`,
    focus: 'Animals',
    lead: 'What does the Kibembe animal name “',
    key: row.kb,
    tail: '” mean?',
    right: animalName(row),
    wrong: others(row, animalName),
    explain: `${row.kb} — ${animalName(row)}.`,
    kb: row.kb,
    pair: { en: animalName(row), kb: row.kb },
    picture: sceneOf(index),
  });
}

/** The animal's name is given and the Kibembe it was spoken as is asked for: the same pair the other way. */
function formQuestion(row, index) {
  return animalAsk({
    id: `animal:${form(row.kb)}:form`,
    focus: 'Animals',
    lead: 'Which Kibembe animal name means “',
    key: animalName(row),
    tail: '”?',
    right: row.kb,
    wrong: others(row, (other) => other.kb),
    explain: `${animalName(row)} — ${row.kb}.`,
    pair: { en: animalName(row), kb: row.kb },
    picture: sceneOf(index),
  });
}

/** The singular is given and the plural spoken with it is asked for. */
function pluralQuestion(row, index) {
  return animalAsk({
    id: `animal:${form(row.kb)}:plural`,
    focus: 'Animals · singular and plural',
    lead: 'What is the plural of the Kibembe animal name “',
    key: row.kb,
    tail: '”?',
    right: row.plural,
    wrong: others(row, (other) => other.plural, ANIMAL_PLURALS),
    explain: `${row.kb} → ${row.plural} — ${animalName(row)}, the pair taught together.`,
    kb: row.kb,
    pair: { en: animalName(row), kb: row.kb },
    picture: sceneOf(index),
  });
}

/** The plural is given and the animal it belongs to is asked for, in the singular. */
function singularQuestion(row, index) {
  return animalAsk({
    id: `animal:${form(row.kb)}:singular`,
    focus: 'Animals · singular and plural',
    lead: '“',
    key: row.plural,
    tail: '” is the plural of which Kibembe animal name?',
    right: row.kb,
    wrong: others(row, (other) => other.kb, ANIMAL_PLURALS),
    explain: `${row.plural} — the plural of ${row.kb} (${animalName(row)}).`,
    kb: row.plural,
    pair: { en: animalName(row), kb: row.kb },
    picture: sceneOf(index),
  });
}

/** How each way of asking is built. */
const OF = {
  meaning: meaningQuestion,
  form: formQuestion,
  plural: pluralQuestion,
  singular: singularQuestion,
};

/**
 * Every question the season can ask of the lesson, in one order: every animal asked one way, then every
 * animal asked the other, then the taught pairs as a plural and back again. A paper cuts its own run
 * from this order, so the papers beside each other ask different animals.
 */
const ANIMAL_ORDER = [
  ...shuffled(ANIMAL_ROWS).map((row) => ({ row, way: 'meaning' })),
  ...shuffled(ANIMAL_ROWS).map((row) => ({ row, way: 'form' })),
  ...shuffled(ANIMAL_PLURALS).map((row) => ({ row, way: 'plural' })),
  ...shuffled(ANIMAL_PLURALS).map((row) => ({ row, way: 'singular' })),
];

/**
 * One episode's paper: the animals of the lesson, each standing once, with the numbers, the greetings,
 * the phrases and the proverbs of every day beside them. The paper is ten questions long, the last of
 * which the season itself replaces with the picture puzzle.
 */
export function buildAnimalPaper(episode) {
  const start = (episode - 1) * ANIMALS_PER_PAPER;
  const paper = [];
  const asked = new Set();

  for (let step = 0; step < ANIMAL_ORDER.length && paper.length < ANIMALS_PER_PAPER; step += 1) {
    const at = (start + step) % ANIMAL_ORDER.length;
    const { row, way } = ANIMAL_ORDER[at];
    const animal = form(row.kb);
    // an animal the paper already asks is stepped over, so no paper asks the same one twice
    if (asked.has(animal)) continue;
    asked.add(animal);
    paper.push(OF[way](row, at));
  }

  const extras = buildExtraMix(EXTRAS_PER_PAPER, (episode - 1) * EXTRAS_PER_PAPER, [...asked]);
  return shuffled([...paper, ...extras]);
}