/**
 * GLOIRE AI — FIND THE DIFFERENCES: the seasons' own covers.
 *
 * Each season of the game stands on a cover of its own, so no two seasons open on the same picture. They
 * are real photographs of the world the seasons are played in — a village home at sunrise, a drum circle at
 * golden hour, a river at dawn, a green hillside with a herd of goats — drawn in 4K (16:9, at least 3000
 * pixels a side) by the game's own scene drawer (base44/functions/seasonCovers) and kept at their own
 * addresses here, so the season menu opens with its pictures already standing and draws nothing while a
 * player is looking at it.
 *
 * Season 1 keeps the picture its cover already had: the first scene of the season drawn by the app itself.
 * A season named here opens on its photograph instead.
 */

const AT = "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/";

export const SEASON_COVERS = {
  2: `${AT}9c0c2e2e3_generated_62db5e08.png`,
  3: `${AT}dea8119f0_generated_81811349.png`,
  4: `${AT}4b089f49c_generated_e2736a99.png`,
};

/** The photograph a season opens on, or nothing where that season keeps the scene it already had. */
export function coverOf(no) {
  return SEASON_COVERS[no] || null;
}