/**
 * The season trophies of the examination: one drawn 4K gold cup for each season, every cup on that
 * season's own idea. The pictures are drawn once and their addresses are kept here, so the prize shelf
 * is opened instantly and draws nothing while a student is looking at it.
 *
 * The cups are kept for every season the examination is numbered for, so a season added later already
 * has its own trophy waiting for it. A season whose own cup has not been drawn yet stands under the
 * plain cup below, and takes its own drawn cup the moment one is kept here for it.
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
  10: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/e9221f733_generated_image.png",
  11: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/4fe9f7023_generated_image.png",
  12: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/765c9f86d_generated_image.png",
  13: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/fa57a695a_generated_image.png",
  14: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/0b34df0ec_generated_image.png",
  15: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/481b35d12_generated_image.png",
  16: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/d304a3d28_generated_image.png",
  17: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/3f24bc779_generated_image.png",
  18: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/aa43c4aff_generated_image.png",
  19: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/fb08532c5_generated_image.png",
  20: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/d1f9e4f12_generated_image.png",
  21: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/d64dd556d_generated_image.png",
  22: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/7a69be0b2_generated_image.png",
  23: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/3257bccc6_generated_image.png",
  24: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/99322068c_generated_image.png",
  25: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/372896bdf_generated_image.png",
};

/** The trophy drawn for a season, or nothing where no cup has been drawn for it yet. */
export function trophyOf(season) {
  return TROPHIES[season] || null;
}

/**
 * The plain cup a season stands under while its own trophy has not been drawn: one polished gold cup
 * with a single laurel band, so every season of the shelf shows a cup of the same set even before its
 * own has been drawn.
 */
const WAITING_CUP =
  "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/58cf42ffa_generated_image.png";

/** The cup a season stands under until its own trophy is drawn. */
export function waitingCup() {
  return WAITING_CUP;
}

/**
 * The one cover that holds every prize: the whole collection of cups drawn together, so the prize shelf
 * opens on a single picture of everything it gives rather than on one season's cup.
 */
const COVER =
  "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/0a2d0361c_generated_image.png";

/** The picture of the whole prize collection — the cover every prize of the examination stands behind. */
export function prizeCover() {
  return COVER;
}