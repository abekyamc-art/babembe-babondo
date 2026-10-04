/**
 * The two outside voices the app answers with, exactly as they are named on screen: the
 * original account standing behind the outside agent, and the second, separate account that
 * speaks for Base44 mode. Every screen that names a voice reads its name from here, so the
 * two are always called the same thing.
 */
export const GLOIRE_AI = "GLOIRE AI";
export const MBEMBE_AI = "Mbembe AI";

/** The outside voice behind a mode: the original account in agent mode, the second one in Base44 mode. */
export function providerName(mode) {
  return mode === "base44" ? MBEMBE_AI : GLOIRE_AI;
}