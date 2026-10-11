/**
 * GLOIRE AI — FIND THE DIFFERENCES: the picture scenes of the game.
 *
 * Thirty-three of the game's levels stand as 4K pictures rather than as the app's own drawings. A scene keeps
 * two addresses: the picture as it stands, and the copy drawn from it with only that level's own changes
 * made. The two pictures are the same picture in every other line, colour and detail, so whichever one the
 * player looks at, the same places differ — and the level's own touch areas, kept with the level, are those
 * very places, so nothing is ever marked on the picture itself.
 *
 * The pictures were drawn by the game's own scene drawer (base44/functions/differenceScenes), and their
 * places were read from each drawn pair by a vision reading of it: every touch area stands where the picture
 * really changes, never at a place guessed at on a grid. The addresses are kept here, so a level's two
 * pictures are on screen the moment it opens and nothing is drawn while it is played.
 */
const AT = "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/";

export const SCENE_PICTURES = {
  lake: {
    base: `${AT}9a616b926_generated_8050bbd3.jpg`,
    changed: `${AT}782946997_generated_582027ba.jpg`,
  },
  pitch: {
    base: `${AT}a32b15357_generated_a234c723.jpg`,
    changed: `${AT}7b6541202_generated_4a270cd3.jpg`,
  },
  crossing: {
    base: `${AT}2e26436b1_generated_58d7f6f6.jpg`,
    changed: `${AT}4035eec5c_generated_b32f946d.jpg`,
  },
  feast: {
    base: `${AT}137cf1d6f_generated_a6243f7f.jpg`,
    changed: `${AT}27623df28_generated_ddf5776e.jpg`,
  },
  fireside: {
    base: `${AT}6c600296d_generated_1b3bf421.jpg`,
    changed: `${AT}1ebcd5071_generated_2b5dc715.jpg`,
  },
  stage: {
    base: `${AT}ecd1ce12d_generated_d5a657b0.jpg`,
    changed: `${AT}c4d7854d6_generated_dbf041b9.jpg`,
  },
  fishing: {
    base: `${AT}d3d46e59b_generated_a66470f1.jpg`,
    changed: `${AT}dab829fc4_generated_59ca7a38.jpg`,
  },
  garden: {
    base: `${AT}0ba4ab8fc_generated_b4832250.jpg`,
    changed: `${AT}261b53eef_generated_f7e9ed26.jpg`,
  },
  well: {
    base: `${AT}e95c98364_generated_be8b14dd.jpg`,
    changed: `${AT}8d33f02bd_generated_75051566.jpg`,
  },
  drummakers: {
    base: `${AT}e9eefe827_generated_60c1487b.jpg`,
    changed: `${AT}3ed8cd5d9_generated_5b6bb95b.jpg`,
  },
  schoolyard: {
    base: `${AT}773f76424_generated_1b2f2e51.jpg`,
    changed: `${AT}8595c1f10_generated_6023baf4.jpg`,
  },
  harvest: {
    base: `${AT}e694af49d_generated_3ee6f2e9.jpg`,
    changed: `${AT}7bb2d33db_generated_05b0519f.jpg`,
  },
  kitchen: {
    base: `${AT}1d29fdcaa_generated_2f3a0136.jpg`,
    changed: `${AT}a2ce38747_generated_e89e0e57.jpg`,
  },
  canoes: {
    base: `${AT}1b695c9df_generated_f2a80fd7.jpg`,
    changed: `${AT}452999d56_generated_82f30d95.jpg`,
  },
  grove: {
    base: `${AT}6542b4ab6_generated_dba7ca7a.jpg`,
    changed: `${AT}6aceaf444_generated_25c251ab.jpg`,
  },
  herders: {
    base: `${AT}d08bab6fd_generated_6734f4bc.jpg`,
    changed: `${AT}130990f17_generated_0fc1aa9a.jpg`,
  },
  chapel: {
    base: `${AT}96689fd5f_generated_a26c211f.jpg`,
    changed: `${AT}f3da12893_generated_1ea61364.jpg`,
  },
  pottery: {
    base: `${AT}891f595d2_generated_442d103c.jpg`,
    changed: `${AT}3c330a466_generated_34aa2b4b.jpg`,
  },
  tailor: {
    base: `${AT}6f78faaa2_generated_73733208.jpg`,
    changed: `${AT}2284bd21b_generated_f5f1a584.jpg`,
  },
  carpenter: {
    base: `${AT}1dce6ed0d_generated_04d4d80f.jpg`,
    changed: `${AT}7d7bdd8a5_generated_3820dc4a.jpg`,
  },
  washing: {
    base: `${AT}fd85b4af0_generated_db7341bd.jpg`,
    changed: `${AT}aaf82f0ac_generated_b7f55fda.jpg`,
  },
  weddingdance: {
    base: `${AT}e5249ee06_generated_d532d50e.jpg`,
    changed: `${AT}2bf679a1e_generated_456689c3.jpg`,
  },
  palms: {
    base: `${AT}884767a0d_generated_cca05191.jpg`,
    changed: `${AT}45be89be8_generated_bbe9d38a.jpg`,
  },
  weavers: {
    base: `${AT}209861a86_generated_ae4e4ff0.jpg`,
    changed: `${AT}d5dc40958_generated_9316ddcc.jpg`,
  },
  taxistand: {
    base: `${AT}6c9dfc079_generated_5015186d.jpg`,
    changed: `${AT}bc5b03e00_generated_73533f9d.jpg`,
  },
  honey: {
    base: `${AT}e0029d9b0_generated_21d20221.jpg`,
    changed: `${AT}98ed177f2_generated_a9600e7e.jpg`,
  },
  rainclouds: {
    base: `${AT}8990d3e68_generated_7dc417cf.jpg`,
    changed: `${AT}e159b429d_generated_f6a4b14d.jpg`,
  },
  eveningclass: {
    base: `${AT}cdfae662b_generated_d559b362.jpg`,
    changed: `${AT}e8b852cce_generated_89f5a17c.jpg`,
  },
  boatyard: {
    base: `${AT}bfc6d9038_generated_324fba05.jpg`,
    changed: `${AT}07a818e96_generated_abc30fdc.jpg`,
  },
  festival: {
    base: `${AT}059541799_generated_64dc3874.jpg`,
    changed: `${AT}e92ed133d_generated_c65f8a3e.jpg`,
  },
  sunrise: {
    base: `${AT}a23d27d4d_generated_a9182171.jpg`,
    changed: `${AT}34b50c622_generated_2a7bb79b.jpg`,
  },
  mangotree: {
    base: `${AT}7ba05c28a_generated_42df1f81.jpg`,
    changed: `${AT}702a18da8_generated_f133e510.jpg`,
  },
  schoolwalk: {
    base: `${AT}43e6c952b_generated_9fceed15.jpg`,
    changed: `${AT}eb3485fed_generated_df02aa07.jpg`,
  },
};

/** The two pictures of a scene, or nothing where that scene is one of the app's own drawings. */
export function picturesOf(scene) {
  return SCENE_PICTURES[scene] || null;
}