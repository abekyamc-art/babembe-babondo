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
 * The app's own Kibembe assistant — the one answered from the saved Word Bank. It is the assistant
 * the home screen now speaks with, and its colour class keeps that screen's palette its own, apart
 * from the four voices the Kibembe screen switches between.
 */
export const KIBEMBE_ASSISTANT = "Kibembe Assistant";
export const KIBEMBE_CLASS = "mode-kibembe";

/** What the provider behind a mode is called on screen. */
export function providerName(mode) {
  return NAMES[mode] || GLOIRE_AI;
}

/** The screen's own colour class for a mode, so the whole page follows whoever answers. */
export function providerClass(mode) {
  return CLASSES[mode] || CLASSES.agent;
}