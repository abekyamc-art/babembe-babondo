/**
 * The voices the app answers with, exactly as they are named on screen: the original account
 * standing behind the outside agent, the second, separate account that speaks for Base44 mode,
 * Mbondo's own, and Sadiki's own. Every screen that names a voice — and every screen whose colour
 * follows it — reads from here, so a provider is always called and coloured the same thing.
 */
export const GLOIRE_AI = "GLOIRE AI";
export const MBEMBE_AI = "Mbembe AI";
export const MBONDO_AI = "Mbondo AI";
export const SADIKI_AI = "Sadiki AI";

const NAMES = { agent: GLOIRE_AI, base44: MBEMBE_AI, mbondo: MBONDO_AI, sadiki: SADIKI_AI };
const CLASSES = {
  agent: "mode-agent",
  base44: "mode-base44",
  mbondo: "mode-mbondo",
  sadiki: "mode-sadiki",
};

/**
 * The app's own Kibembe assistant — the one answered from the saved Word Bank. It answers on the
 * Kibembe assistance screen, with Sadiki AI reading its answers, and its colour class keeps the home
 * screen's palette its own.
 */
export const KIBEMBE_ASSISTANT = "Kibembe Assistant";
export const KIBEMBE_CLASS = "mode-kibembe";

/**
 * The outside agent the home page's calls hand over to: Cartesia AI answers from its own account,
 * listening and writing its own answers, and takes every other turn on the call.
 */
export const CARTESIA_AI = "Cartesia AI";

/**
 * The admin's own second Cartesia account, with its own key and its own agent: it is the first
 * account standing behind the Cartesia voice, and a call opens on it when the app's own account
 * cannot take it. Named on screen as Cartesia AI 1.
 */
export const CARTESIA_AI1 = "Cartesia AI 1";

/**
 * The admin's own third Cartesia account, with its own key and its own agent: it is the last account
 * standing behind the Cartesia voice, and a call opens on it when neither of the two ahead of it can
 * take it. Named on screen as Cartesia AI 2.
 */
export const CARTESIA_AI2 = "Cartesia AI 2";

/** What the provider behind a mode is called on screen. */
export function providerName(mode) {
  return NAMES[mode] || GLOIRE_AI;
}

/** The screen's own colour class for a mode, so the whole page follows whoever answers. */
export function providerClass(mode) {
  return CLASSES[mode] || CLASSES.agent;
}