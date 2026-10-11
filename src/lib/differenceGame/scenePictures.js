/**
 * GLOIRE AI — FIND THE DIFFERENCES: the picture scenes of the game.
 *
 * Six of the game's levels stand as 4K pictures rather than as the app's own drawings. A scene keeps two
 * addresses: the picture as it stands, and the copy drawn from it with only that level's own five changes
 * made. The two pictures are the same picture in every other line, colour and detail, so whichever one the
 * player looks at, the same five places differ — and the level's own touch areas, kept with the level, are
 * those very places, so nothing is ever marked on the picture itself.
 *
 * The pictures were drawn once by the game's own scene drawer (base44/functions/differenceScenes), and their
 * places were read from the drawn pair by a vision reading of it: every touch area stands where the picture
 * really changes, never at a place guessed at on a grid. The addresses are kept here, so a level's two
 * pictures are on screen the moment it opens and nothing is drawn while it is played.
 */
export const SCENE_PICTURES = {
  lake: {
    base: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/9a616b926_generated_8050bbd3.jpg",
    changed: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/782946997_generated_582027ba.jpg",
  },
  pitch: {
    base: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/4b87e388e_generated_fbd626c4.jpg",
    changed: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/653ca42e4_generated_d7b6be7a.jpg",
  },
  crossing: {
    base: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/e2822357f_generated_aa74694a.jpg",
    changed: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/658e03378_generated_48c8b008.jpg",
  },
  feast: {
    base: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/9599d9184_generated_00b2814d.jpg",
    changed: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/fbb662f56_generated_b159b94d.jpg",
  },
  fireside: {
    base: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/c2e472d2b_generated_97aab989.jpg",
    changed: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/0591d3648_generated_0ecb12d5.jpg",
  },
  stage: {
    base: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/589698710_generated_e620223f.jpg",
    changed: "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/0f797f16a_generated_edd48156.jpg",
  },
};

/** The two pictures of a scene, or nothing where that scene is one of the app's own drawings. */
export function picturesOf(scene) {
  return SCENE_PICTURES[scene] || null;
}