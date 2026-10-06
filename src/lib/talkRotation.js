import { GLOIRE_AI } from "@/lib/providerNames";

/**
 * The four talk AIs the home page's calls take turns on, and how long a turn lasts. Each one
 * answers on its own account, with its own key and its own knowledge, so a handoff is a change of
 * AI and never a change of voice on someone else's. GLOIRE AI stands first, on the account the
 * app already had; the three after it are the admin's own.
 */
export const TALK_IDS = ["gloire", "talk2", "talk3", "talk4"];

// the ids the coordinator may be asked to name, with anyone standing down left out of them

/** The AI every conversation opens on. */
export const FIRST_TALK = { id: "gloire", label: GLOIRE_AI, account: "" };

/** How many answers a talk AI gives before the coordinator signals the change. */
export const TALK_ANSWERS = 2;

/**
 * How many answers Cartesia AI gives on a home call before the ring of voices moves on to the next
 * one. Every answer given spends one credit.
 */
export const CARTESIA_ANSWERS = 7;

/**
 * How many answers Cartesia AI 1 gives on a home call — the admin's own second Cartesia account,
 * which takes the call straight after Cartesia AI and answers five before standing aside.
 */
export const CARTESIA_AI1_ANSWERS = 5;

/**
 * How many answers Cartesia AI 2 gives on a home call — the admin's own third Cartesia account, which
 * takes the call straight after Cartesia AI 1 and answers five before standing aside.
 */
export const CARTESIA_AI2_ANSWERS = 5;

/**
 * AI 2 stands down for a month and comes back on its own. From today until November 6, 2026 the
 * ring of a home call passes over it — no signal names it and no turn is handed to it — and on that
 * date it takes its place in the ring again with nothing to change anywhere.
 */
export const AI2_ID = "talk2";
export const AI2_BACK_ON = "2026-11-06";

/** Whether AI 2 is still standing down: true before its return date, false from that date on. */
export function ai2Resting() {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
  return today < AI2_BACK_ON;
}

/** The line the coordinator is handed: one signal, naming the AI whose turn comes next. */
export function signalLine(fromLabel) {
  // an AI that is standing down is never offered to the signal, so it can never be named
  const options = TALK_IDS.filter((id) => !(id === AI2_ID && ai2Resting())).join(", ");
  return (
    `Signal only. ${fromLabel} has answered its two questions and is taking its break now. ` +
    `Which talk AI takes the next two questions? Answer with one id and nothing else: ${options}. ` +
    `Do not name ${fromLabel}: it is the one taking its break.\n` +
    `Ni zamu ya nani? Jibu kwa jina moja tu: ${options}.`
  );
}

// the number of answers a notice names, written the way the notice says it
const COUNT_WORDS = { 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven" };

/** One AI steps aside after its own answers, and the next one is ready to carry the talk on. */
export function handoffNotice(from, next, answers = TALK_ANSWERS) {
  const count = COUNT_WORDS[answers] || String(answers);
  return `${from} has taken its ${count} questions. ${next} is taking over now — keep talking.`;
}

/**
 * One AI has taken its turn and the next one is waiting: the person's own tap on the phone is what
 * opens it, with the microphone, so the call never speaks on into an empty room.
 */
export function resumeNotice(from, next, answers = TALK_ANSWERS) {
  const count = COUNT_WORDS[answers] || String(answers);
  return `${from} has taken its ${count} questions. Tap the phone to talk with ${next}.`;
}

/**
 * The call ended by itself in the middle of a turn: the same AI still owes its answers, so it is the
 * one waiting behind the person's tap rather than the ring starting over.
 */
export function waitNotice(label) {
  return `${label} is waiting. Tap the phone to carry on.`;
}

/** Nothing was named, so nothing is guessed: the same AI keeps the conversation. */
export function noSignalNotice(from) {
  return `The handoff signal didn't come through — ${from} can carry on.`;
}

/** An AI that never began answering: the question it was holding goes to the one after it. */
export function stuckNotice(from, next) {
  return `${from} didn't answer — ${next} is taking your question now.`;
}