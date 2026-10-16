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
 * Every season of the ten stands here, so each one opens on a picture of its own and no season falls back
 * to a scene drawn by the app.
 */

const AT = "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/";

export const SEASON_COVERS = {
  // the village in the first light: the school lane and the drums before the day's work begins
  1: `${AT}548bee101_generated_d2484c8d.png`,
  2: `${AT}9c0c2e2e3_generated_62db5e08.png`,
  3: `${AT}dea8119f0_generated_81811349.png`,
  4: `${AT}4b089f49c_generated_e2736a99.png`,
  // the wide water: the landing at first light, nets over the drying racks and the riverside market
  5: `${AT}1a53432f5_generated_6472178c.png`,
  // the wood and the wild: the honey tree, the goat herd and the drums in their clearing
  6: `${AT}f449ef3c1_generated_7bdb2cfc.png`,
  // the town as it grows: the first shops with their shutters open and the market square behind them
  7: `${AT}324691287_generated_96a9c0d3.png`,
  // the dry season and its first rains: the deep well in the cracked earth and the clouds over the hills
  8: `${AT}58769daf7_generated_05266350.png`,
  // the year of festivals: the drums, the dancers and the long table at golden hour
  9: `${AT}851a30633_generated_7d1ba5a3.png`,
  // the mountain and its sky: the high pasture, the goat bells and the well at the top of the path
  10: `${AT}c74ac6985_generated_df7a25d1.png`,
};

/** The photograph a season opens on, or nothing where that season keeps the scene it already had. */
export function coverOf(no) {
  return SEASON_COVERS[no] || null;
}