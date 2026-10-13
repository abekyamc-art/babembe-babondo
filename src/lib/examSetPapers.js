import { lifeQuestionOf, shuffled } from "./examSeries";
import { buildExtraMix } from "./examExtras";
import { SCENE_POOL } from "./examPool";
import { marksOff, pairsOf, taughtMeaning } from "./examSets";

/**
 * GLOIRE AI — THE EXAMINATION: the seasons cut from the teaching sets of 12 October 2026.
 *
 * A set is asked the way the app's own words of every day are asked: the Kibembe form is given and its
 * meaning asked for, and the meaning is given and the Kibembe asked for — never anything else. Where a
 * lesson taught several Kibembe forms under the one meaning, the pair is asked from the Kibembe side
 * alone, since a paper cannot ask which of them stands for a meaning they all carry; every form taught
 * is still asked, and no form is ever left out.
 *
 * The two directions of a pair are laid half a list apart, so a paper is never handed the same word
 * twice, and each paper takes its own run of nine questions from that order — the tenth is the picture
 * puzzle's, which the season itself puts last. Where a set's own words come to their end before a paper
 * is full, the paper is filled from the examination's own confirmed extras: a word that has already
 * stood is never put in front of a student again. A question asked is a question of the lesson, and
 * every choice put up beside it is another form of the same lesson.
 *
 * Nothing of a season is cut until the season is opened, so the sets the examination does not ask cost
 * it nothing.
 */

/** The set's own questions in a paper, and the paper the season is handed — the tenth seat is the puzzle's. */
const SET_PER_PAPER = 9;
const PAPER = SET_PER_PAPER + 1;

/** The picture a question with none of its own is studied on: one of the examination's own scenes. */
const sceneOf = (at) => SCENE_POOL[at % SCENE_POOL.length];

/** The two other forms of the same set, so no choice that was never taught is ever put up. */
function othersOf(pairs, pair, side) {
  const right = side === "kb" ? marksOff(pair.kb) : taughtMeaning(pair);
  const out = [];
  for (const other of shuffled(pairs)) {
    const text = side === "kb" ? marksOff(other.kb) : taughtMeaning(other);
    if (!text || text === right || out.includes(text)) continue;
    out.push(text);
    if (out.length === 2) break;
  }
  return out;
}

/**
 * Whether a pair is asked both ways. A meaning the lesson gave to several forms cannot be asked back
 * for the Kibembe — any of those forms answers it — so such a pair is asked from the Kibembe side, and
 * from that side alone.
 */
function bothWays(pairs, pair) {
  const mine = taughtMeaning(pair);
  return pairs.filter((other) => taughtMeaning(other) === mine).length === 1;
}

/** One question of a set: the pair in one direction, with the two wrong choices drawn from the set itself. */
function questionOf(setId, pair, at, way) {
  const askKibembe = way === "form";
  const row = {
    id: `set:${setId}:${at}:${way}`,
    direction: askKibembe ? "en_to_kb" : "kb_to_en",
    kb: marksOff(pair.kb),
    en: taughtMeaning(pair),
    wrong: othersOf(pairsOf(setId), pair, askKibembe ? "kb" : "en"),
    practice: [{ en: taughtMeaning(pair), kb: marksOff(pair.kb) }],
    image: sceneOf(at),
  };
  const question = lifeQuestionOf(row);
  // the part of the lesson the question belongs to, shown over it as the paper's own label
  return { ...question, focus: pair.label };
}

/** Every question a set can ask, in the one order its papers are cut from. */
function orderOf(id) {
  const pairs = pairsOf(id);
  if (!pairs.length) return [];
  const meanings = pairs.map((pair, at) => questionOf(id, pair, at, "mean"));
  const forms = pairs.flatMap((pair, at) =>
    bothWays(pairs, pair) ? [questionOf(id, pair, at, "form")] : []
  );
  return [...shuffled(meanings), ...shuffled(forms)];
}

/** The orders already cut, so a set is cut once and a paper is never reshuffled under a student. */
const ORDERS = new Map();

function order(id) {
  if (!ORDERS.has(id)) ORDERS.set(id, orderOf(id));
  return ORDERS.get(id);
}

/** How many episodes a set's own questions fill: nine of them to a paper. */
export function setEpisodes(id) {
  return Math.max(1, Math.ceil(order(id).length / SET_PER_PAPER));
}

/**
 * One episode's paper of a set: its own run of nine questions, beginning where the paper before it left
 * off — so the papers beside each other never ask the same word and a word only comes back once the
 * whole set has been round — and the tenth question standing where the season's own picture puzzle is
 * put. Where the set's questions come to their end, the paper is filled from the examination's own
 * confirmed extras rather than from a word of the set that has already been asked.
 */
export function buildSetPaper(id, episode) {
  const list = order(id);
  if (!list.length) return [];
  const start = (episode - 1) * SET_PER_PAPER;
  const run = list.slice(start, start + SET_PER_PAPER);
  if (!run.length) return [];
  const filler = buildExtraMix(
    PAPER - run.length,
    start,
    run.map((question) => question.key)
  );
  return [...run, ...filler].slice(0, PAPER);
}