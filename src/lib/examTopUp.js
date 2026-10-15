import { SCENE_POOL, currentQueues } from "./examPool";
import { buildExtraMix } from "./examExtras";
import { buildMedicalMix } from "./examBank";

/**
 * GLOIRE AI — THE EXAMINATION: what a paper is topped up with.
 *
 * Three of the examination's seasons are written from lists of their own: the terms of the adult body,
 * and the two sets of the teaching day of 12 October 2026. Each of those lists fills only the first
 * papers of its season, and every season of the examination runs a hundred episodes. Rather than leaving
 * a paper standing short, or asking one of the season's own words a second time, the papers past the
 * list's own end are topped up from the examination's other confirmed words — the words of every day and
 * the terms of the body and health the app's own knowledge document holds — and, on a phone that could
 * not read the document, from the examination's own written banks of confirmed health terms and of the
 * numbers, the greetings, the phrases and the proverbs.
 *
 * The top-up walks the whole confirmed bank, in an order of its own for each season taken from the
 * season's own name: a season meets the bank in its own order, the seasons do not ask the same words in
 * the same places, and inside one season no word comes back until the whole bank has been round.
 */

/** How many questions of a paper a season's own list fills, and how far the top-up steps for each paper. */
const PER_PAPER = 9;

const form = (text) => String(text || "").toLowerCase().replace(/[.?!\s]+$/, "");

/** A fixed order drawn from a seed: a season's own order of the bank, the same every time it is opened. */
function seeded(seedText) {
  let hash = 2166136261;
  for (let at = 0; at < seedText.length; at += 1) {
    hash ^= seedText.charCodeAt(at);
    hash = Math.imul(hash, 16777619);
  }
  return () => {
    hash ^= hash << 13;
    hash >>>= 0;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    hash >>>= 0;
    return hash / 4294967296;
  };
}

function arranged(list, seedText) {
  const rand = seeded(seedText);
  const out = [...list];
  for (let at = out.length - 1; at > 0; at -= 1) {
    const pick = Math.floor(rand() * (at + 1));
    [out[at], out[pick]] = [out[pick], out[at]];
  }
  return out;
}

/**
 * The bank every season's top-up is drawn from: the confirmed words of every day and the confirmed terms
 * of the body and health, each season reading them in its own order. Nothing is drawn before the
 * document has been read, so a season opened early asks the examination's written banks instead.
 */
const ORDERS = new Map();

function bankOrder(seasonKey) {
  const held = ORDERS.get(seasonKey);
  if (held?.length) return held;
  const queues = currentQueues();
  const bank = [...(queues?.everyday || []), ...(queues?.medical || [])];
  if (!bank.length) return [];
  const order = arranged(bank, seasonKey);
  ORDERS.set(seasonKey, order);
  return order;
}

/**
 * The forms a question turns on, so the same word is never asked twice in one paper: the form the line
 * quotes, the form the question keys on, and both sides of the pair it practices.
 */
function keysOf(question) {
  const pair = question.practice?.[0] || {};
  return [form(question.kb), form(question.key), form(pair.kb), form(pair.en)].filter(Boolean);
}

/** A question with no picture of its own is studied on one of the examination's own scenes. */
function withScenes(list, seed) {
  list.forEach((question, slot) => {
    if (question.image?.url) return;
    const scene = SCENE_POOL[(seed + slot) % SCENE_POOL.length];
    question.image = scene;
    question.hint = `Study the picture — ${scene.scene} — before you answer.`;
  });
  return list;
}

/**
 * `count` questions for one season's paper, taken from the season's own order of the confirmed bank where
 * its own list has left off — so the papers beside each other ask different words, and a word only comes
 * back once the whole bank has been round. `avoid` carries the forms the paper already asks, so none of
 * the season's own words comes back beside itself.
 */
export function buildTopUp(count, seasonKey, episode, avoid = [], lang = "") {
  if (!count || count <= 0) return [];
  const asked = new Set((avoid || []).map(form));
  const out = [];
  const bank = bankOrder(seasonKey);
  const start = (episode - 1) * PER_PAPER;

  const take = (question) => {
    const keys = keysOf(question);
    if (keys.some((key) => asked.has(key))) return;
    keys.forEach((key) => asked.add(key));
    out.push(question);
  };

  for (let step = 0; step < bank.length && out.length < count; step += 1) {
    take(bank[(start + step) % bank.length]);
  }

  // a phone that could not read the document takes the examination's own written banks instead: the
  // confirmed terms of the body and health, and the numbers, the greetings, the phrases and the proverbs
  if (out.length < count) {
    const written = [
      ...buildMedicalMix(count, start),
      ...buildExtraMix(count, start, [...asked], lang),
    ];
    for (const question of written) {
      if (out.length >= count) break;
      take(question);
    }
  }

  return withScenes(out.slice(0, count), start);
}