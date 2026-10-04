import { GLOIRE_AI } from "@/lib/providerNames";

/**
 * The four talk AIs the home page's calls take turns on, and how long a turn lasts. Each one
 * answers on its own account, with its own key and its own knowledge, so a handoff is a change of
 * AI and never a change of voice on someone else's. GLOIRE AI stands first, on the account the
 * app already had; the three after it are the admin's own.
 */
export const TALK_IDS = ["gloire", "talk2", "talk3", "talk4"];

/** The AI every conversation opens on. */
export const FIRST_TALK = { id: "gloire", label: GLOIRE_AI, account: "" };

/** How many answers a talk AI gives before the coordinator signals the change. */
export const TALK_ANSWERS = 2;

/** The line the coordinator is handed: one signal, naming the AI whose turn comes next. */
export function signalLine(fromLabel) {
  const options = TALK_IDS.join(", ");
  return (
    `Signal only. ${fromLabel} has answered its two questions and is taking its break now. ` +
    `Which talk AI takes the next two questions? Answer with one id and nothing else: ${options}. ` +
    `Do not name ${fromLabel}: it is the one taking its break.\n` +
    `Ni zamu ya nani? Jibu kwa jina moja tu: ${options}.`
  );
}

/** One AI steps aside and the one the coordinator named is ready to carry the talk on. */
export function handoffNotice(from, next) {
  return `${from} has taken its two questions. ${next} is taking over now — keep talking.`;
}

/** Nothing was named, so nothing is guessed: the same AI keeps the conversation. */
export function noSignalNotice(from) {
  return `The handoff signal didn't come through — ${from} can carry on.`;
}