import { lifeQuestionOf, shuffled } from "./examSeries";
import { SCENE_POOL } from "./examPool";
import { buildTopUp } from "./examTopUp";
import { marksOff, pairsOf } from "./examSets";

/**
 * GLOIRE AI — THE EXAMINATION: the seasons cut from the teaching sets of 12 October 2026.
 *
 * A set is asked in Kibembe and English, the two languages these seasons are put in: the Kibembe form is
 * given and its English meaning asked for, and the English meaning is given and the Kibembe asked for —
 * never anything else, and never the Kiswahili the lesson was taught under. Where a lesson taught
 * several Kibembe forms under the one meaning, the pair is asked from the Kibembe side alone, since a
 * paper cannot ask which of them stands for a meaning they all carry; every form taught is still asked,
 * and no form is ever left out.
 *
 * The two directions of a pair are laid half a list apart, so a paper is never handed the same word
 * twice, and each paper takes its own run of nine questions from that order — the tenth seat, the picture
 * puzzle, is put there by the examination's own paper builder. Where a set's own words come to their end
 * before a paper is full — every season of the examination runs a hundred episodes — the paper is topped
 * up from the examination's other confirmed words, asked in English as well, and on a phone that could
 * not read them from the examination's own written banks: a word that has already stood is never put in
 * front of a student again. A question asked is a question of the lesson, and every choice put up beside
 * it is another form of the same lesson.
 *
 * Nothing of a season is cut until the season is opened, so the sets the examination does not ask cost
 * it nothing.
 */

/**
 * The set's own questions in a paper. The tenth seat of every paper — the picture puzzle — is put there
 * by the examination's own paper builder, so a season hands it the nine questions the set itself asks and
 * nothing else.
 */
const SET_PER_PAPER = 9;

/** The picture a question with none of its own is studied on: one of the examination's own scenes. */
const sceneOf = (at) => SCENE_POOL[at % SCENE_POOL.length];

/**
 * The English a pair is asked by: the lesson's own English where it gave one, and where a pair was taught
 * under its Kiswahili name alone, the English name the season's own record carries beside it. The
 * Kiswahili the lesson was taught under is never asked with: these seasons are put in Kibembe and English.
 */
function englishOf(pair) {
  return marksOff(pair.en) || marksOff(pair.sw);
}

/** The two other forms of the same set, so no choice that was never taught is ever put up. */
function othersOf(pairs, pair, side) {
  const right = side === "kb" ? marksOff(pair.kb) : englishOf(pair);
  const out = [];
  for (const other of shuffled(pairs)) {
    const text = side === "kb" ? marksOff(other.kb) : englishOf(other);
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
  const mine = englishOf(pair);
  return pairs.filter((other) => englishOf(other) === mine).length === 1;
}

/** One question of a set: the pair in one direction, with the two wrong choices drawn from the set itself. */
function questionOf(setId, pair, at, way) {
  const askKibembe = way === "form";
  const row = {
    id: `set:${setId}:${at}:${way}`,
    direction: askKibembe ? "en_to_kb" : "kb_to_en",
    kb: marksOff(pair.kb),
    en: englishOf(pair),
    wrong: othersOf(pairsOf(setId), pair, askKibembe ? "kb" : "en"),
    practice: [{ en: englishOf(pair), kb: marksOff(pair.kb) }],
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
 * whole set has been round — with the tenth seat left to the season's own picture puzzle.
 *
 * A set's own words fill only the first papers of its season, and the season runs the hundred episodes
 * every season of the examination runs: a paper the set cannot fill from its own list is topped up from
 * the examination's other confirmed words, so no paper is left standing short, and no word the paper
 * already asks comes back beside itself.
 */
export function buildSetPaper(id, episode) {
  const list = order(id);
  const start = (episode - 1) * SET_PER_PAPER;
  const run = list.slice(start, start + SET_PER_PAPER);
  const filler = buildTopUp(
    SET_PER_PAPER - run.length,
    // the season's own order of the shared bank, so the two seasons of the sets never ask the same words
    `set:${id}`,
    episode,
    run.map((question) => question.kb || question.key),
    // these seasons are put in Kibembe and English, so the questions topping a paper up are asked in
    // English as well
    "en"
  );
  return [...run, ...filler];
}