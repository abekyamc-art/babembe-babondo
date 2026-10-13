/**
 * GLOIRE AI — THE EXAMINATION: the seasons' own covers.
 *
 * Every season of the examination stands on a cover of its own, so no two seasons open on the same
 * picture. They are real photographs of the life each season's papers are about — the village morning,
 * the health post, the riverside market, the trader's own stall, the music of the people, the family at
 * work, the healer's knowledge of the body — drawn in 4K (16:9, at least 3000 pixels a side) by the
 * examination's own cover drawer (base44/functions/examSeasonCovers) and kept at their own addresses
 * here, so the season list opens with its pictures already standing and draws nothing while a student
 * is looking at it.
 */

const AT = "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/";

const COVERS = {
  1: `${AT}8a8faf890_generated_1b6d5a5b.png`,
  2: `${AT}aece2dd96_generated_0c1e28bb.png`,
  3: `${AT}ae2571d7d_generated_c2715365.png`,
  4: `${AT}8cf0938ab_generated_268ae5ab.png`,
  5: `${AT}443855ea1_generated_95648344.png`,
  6: `${AT}66982fea4_generated_9988bd75.png`,
  7: `${AT}549549a7b_generated_aabcb98a.png`,
  8: `${AT}9d93a3bf1_generated_da3dbffe.png`,
  9: `${AT}7de657042_generated_99107c2c.png`,
  // the food lesson of 12 October 2026: the market photographed under its thatch at golden hour, the
  // vegetables, the greens and the fruit of the season standing in their baskets
  11: `${AT}c70b15ba0_generated_4c9e1fd1.png`,
};

/** The photograph a season opens on, or nothing where no cover has been drawn for it yet. */
export function examCoverOf(no) {
  return COVERS[no] || null;
}