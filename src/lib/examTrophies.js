/**
 * The season trophies of the examination: one drawn 4K gold cup for each season, every cup on that
 * season's own idea. The pictures are drawn once and their addresses are kept here, so the prize shelf
 * is opened instantly and draws nothing while a student is looking at it.
 *
 * The cups are kept for every season the examination is numbered for, so a season added later already
 * has its own trophy waiting for it.
 */
const TROPHIES = {
  1: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/16257d7e2_generated_0be8315f.png",
  2: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/6cd9c1d35_generated_9961ee1e.png",
  3: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/88967dd28_generated_bfeec23a.png",
  4: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/e651b2e9b_generated_4cf8f698.png",
  5: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/6ca3d380e_generated_1ae0bece.png",
  6: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/327fed6d3_generated_135ccfbd.png",
  7: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/2e00d1cae_generated_23f0358d.png",
  8: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/3c936ce59_generated_0de29327.png",
  9: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/ea2d46315_generated_f48c425f.png",
};

/** The trophy drawn for a season, or nothing where no cup has been drawn for it yet. */
export function trophyOf(season) {
  return TROPHIES[season] || null;
}