import { GLOIRE_AI } from "@/lib/providerNames";

/**
 * The four talk AIs the home page's calls take turns on, and how long a turn lasts. Each one
 * answers on its own account, with its own key and its own knowledge, so a handoff is a change of
 * AI and never a change of voice on someone else's. GLOIRE AI stands first among the talk AIs
 * themselves, on the account the app already had; the three after it are the admin's own.
 */
export const TALK_IDS = ["gloire", "talk2", "talk3", "talk4"];

// the ids the coordinator may be asked to name, with anyone standing down left out of them

/** The AI every conversation opens on. */
export const FIRST_TALK = { id: "gloire", label: GLOIRE_AI, account: "" };

/** How many answers a talk AI gives before the coordinator signals the change. */
export const TALK_ANSWERS = 2;

/**
 * How many answers GLOIRE AI gives before the ring of voices moves on to the next one: eight
 * finished answers, and then it stands aside like any other voice. Every answer given spends one
 * credit.
 */
export const GLOIRE_ANSWERS = 8;

/**
 * How many answers the app's own OpenAI seat — AI 1, the voice every home call opens on, with GLOIRE
 * AI standing behind it — speaks before the ring of voices moves on to the next one. Every answer
 * given spends one credit.
 */
export const OPENAI_ANSWERS = 6;

/**
 * How many answers the Cartesia voice gives on a home call before the ring of voices moves on to the
 * next one. Every answer given spends one credit. The Cartesia voice is one seat on that ring with
 * three accounts standing behind it, so this is how long the seat holds the call, whichever of them
 * opened it.
 */
export const CARTESIA_ANSWERS = 7;

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
const COUNT_WORDS = { 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight" };

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
 * The artist's own set has ended, or the person has said stop: AI 1 hands the talk over to the voice
 * that speaks Base44 mode — not because it had taken its own number of questions, but because the
 * music it was playing is over. Where the next voice is waiting for the person's own tap, that is what
 * the line says; where it is already on the call, it is named as being on it now.
 */
export function musicHandoffNotice(from, next, waiting = false) {
  return waiting
    ? `${from} handed the call over. Tap the phone to talk with ${next}.`
    : `${from} handed the call over — ${next} is on the call now.`;
}

/**
 * The artist's own set was in Base44 AI's hands, and the person has opened a call of their own: the
 * voice that opens a call takes the talk back from Base44 AI, and the line says where it stands now
 * rather than leaving the change to be guessed at.
 */
export function base44GoneNotice(label) {
  return `${label} is on the call now — Base44 AI has stood down.`;
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

/**
 * A voice that could not take the call. The reason the voice itself gave is said just as it gave it —
 * an account that refused names itself and what is left to do about it — so a failure is never left
 * as a voice that simply did not answer. Where the call carries on, the voice really on the line is
 * named after the reason; where none could take it, the person's own tap is what tries again.
 */
export function refusedNotice(refused, live = "") {
  const why = String(refused?.why || "").trim();
  const reason = why || `${refused?.label || "That voice"} couldn't take the call.`;
  return live ? `${reason} ${live} is on the call.` : `${reason} Tap the phone and try again.`;
}