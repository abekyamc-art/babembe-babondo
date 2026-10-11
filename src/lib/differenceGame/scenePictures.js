/**
 * GLOIRE AI — FIND THE DIFFERENCES: the picture scenes of the game.
 *
 * Thirty-one of the game's levels stand as 4K pictures rather than as the app's own drawings. A scene keeps
 * two addresses: the picture as it stands, and the copy drawn from it with only that level's own five
 * changes made. The two pictures are the same picture in every other line, colour and detail, so whichever
 * one the player looks at, the same five places differ — and the level's own touch areas, kept with the
 * level, are those very places, so nothing is ever marked on the picture itself.
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
    base: `${AT}4b87e388e_generated_fbd626c4.jpg`,
    changed: `${AT}653ca42e4_generated_d7b6be7a.jpg`,
  },
  crossing: {
    base: `${AT}e2822357f_generated_aa74694a.jpg`,
    changed: `${AT}658e03378_generated_48c8b008.jpg`,
  },
  feast: {
    base: `${AT}9599d9184_generated_00b2814d.jpg`,
    changed: `${AT}fbb662f56_generated_b159b94d.jpg`,
  },
  fireside: {
    base: `${AT}c2e472d2b_generated_97aab989.jpg`,
    changed: `${AT}0591d3648_generated_0ecb12d5.jpg`,
  },
  stage: {
    base: `${AT}589698710_generated_e620223f.jpg`,
    changed: `${AT}0f797f16a_generated_edd48156.jpg`,
  },
  fishing: {
    base: `${AT}d3d46e59b_generated_a66470f1.jpg`,
    changed: `${AT}dab829fc4_generated_59ca7a38.jpg`,
  },
  garden: {
    base: `${AT}1cabeeb5b_generated_b15390bd.jpg`,
    changed: `${AT}befb1be63_generated_54e8b507.jpg`,
  },
  well: {
    base: `${AT}e95c98364_generated_be8b14dd.jpg`,
    changed: `${AT}8d33f02bd_generated_75051566.jpg`,
  },
  drummakers: {
    base: `${AT}e9eefe827_generated_60c1487b.jpg`,
    changed: `${AT}b3f9643ae_generated_5bd04019.jpg`,
  },
  schoolyard: {
    base: `${AT}773f76424_generated_1b2f2e51.jpg`,
    changed: `${AT}8595c1f10_generated_6023baf4.jpg`,
  },
  harvest: {
    base: `${AT}e694af49d_generated_3ee6f2e9.jpg`,
    changed: `${AT}7e64708b6_generated_0334367e.jpg`,
  },
  kitchen: {
    base: `${AT}1d29fdcaa_generated_2f3a0136.jpg`,
    changed: `${AT}a2ce38747_generated_e89e0e57.jpg`,
  },
  canoes: {
    base: `${AT}1b695c9df_generated_f2a80fd7.jpg`,
    changed: `${AT}0d72d62f9_generated_85d820e8.jpg`,
  },
  grove: {
    base: `${AT}6542b4ab6_generated_dba7ca7a.jpg`,
    changed: `${AT}6aceaf444_generated_25c251ab.jpg`,
  },
  herders: {
    base: `${AT}d08bab6fd_generated_6734f4bc.jpg`,
    changed: `${AT}18a469c60_generated_aa323c32.jpg`,
  },
  chapel: {
    base: `${AT}96689fd5f_generated_a26c211f.jpg`,
    changed: `${AT}f3da12893_generated_1ea61364.jpg`,
  },
  pottery: {
    base: `${AT}891f595d2_generated_442d103c.jpg`,
    changed: `${AT}5c7b4a267_generated_3bb4924d.jpg`,
  },
  tailor: {
    base: `${AT}6f78faaa2_generated_73733208.jpg`,
    changed: `${AT}2284bd21b_generated_f5f1a584.jpg`,
  },
  carpenter: {
    base: `${AT}1dce6ed0d_generated_04d4d80f.jpg`,
    changed: `${AT}d9e40f6df_generated_4420f2bc.jpg`,
  },
  washing: {
    base: `${AT}fd85b4af0_generated_db7341bd.jpg`,
    changed: `${AT}aaf82f0ac_generated_b7f55fda.jpg`,
  },
  weddingdance: {
    base: `${AT}e5249ee06_generated_d532d50e.jpg`,
    changed: `${AT}e4c74756c_generated_bf358cb7.jpg`,
  },
  palms: {
    base: `${AT}884767a0d_generated_cca05191.jpg`,
    changed: `${AT}45be89be8_generated_bbe9d38a.jpg`,
  },
  weavers: {
    base: `${AT}209861a86_generated_ae4e4ff0.jpg`,
    changed: `${AT}813b62704_generated_f12dc4d5.jpg`,
  },
  taxistand: {
    base: `${AT}6c9dfc079_generated_5015186d.jpg`,
    changed: `${AT}bc5b03e00_generated_73533f9d.jpg`,
  },
  honey: {
    base: `${AT}e0029d9b0_generated_21d20221.jpg`,
    changed: `${AT}8bf790f85_generated_7eed656f.jpg`,
  },
  rainclouds: {
    base: `${AT}8990d3e68_generated_7dc417cf.jpg`,
    changed: `${AT}e159b429d_generated_f6a4b14d.jpg`,
  },
  eveningclass: {
    base: `${AT}cdfae662b_generated_d559b362.jpg`,
    changed: `${AT}4b0cd427a_generated_73d27818.jpg`,
  },
  boatyard: {
    base: `${AT}bfc6d9038_generated_324fba05.jpg`,
    changed: `${AT}07a818e96_generated_abc30fdc.jpg`,
  },
  festival: {
    base: `${AT}46bbced1e_generated_4cd40167.jpg`,
    changed: `${AT}8ff4094e5_generated_2bce7359.jpg`,
  },
  sunrise: {
    base: `${AT}a23d27d4d_generated_a9182171.jpg`,
    changed: `${AT}34b50c622_generated_2a7bb79b.jpg`,
  },
};

/** The two pictures of a scene, or nothing where that scene is one of the app's own drawings. */
export function picturesOf(scene) {
  return SCENE_PICTURES[scene] || null;
}