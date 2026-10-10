import { DIFF_PICTURES } from './diffPictures';

/**
 * GLOIRE AI — the picture puzzle of one episode: one drawn scene shown twice, the lower copy carrying
 * the differences, for the student to tap each place he finds.
 *
 * The puzzles are drawn pictures, and they are used in turn: the episode after this one is given the
 * puzzle after this one, so two episodes beside each other are never the same puzzle, and a puzzle is
 * never handed to an episode twice in a row. A puzzle is worked out from the season and the episode
 * alone, so the same episode is the same puzzle every time it is met.
 */

/** Where a difference may stand: five columns across and four rows down, each a thumb's whole target. */
const CELL = (col, row) => ({ x: col * 0.2 + 0.02, y: row * 0.25 + 0.02, w: 0.16, h: 0.21 });

/** How many differences every puzzle holds. */
export const DIFFERENCE_COUNT = 5;

export function differencePuzzle(seasonNo, episode) {
  const index = seasonNo * 1000 + episode;
  const drawn = DIFF_PICTURES[index % DIFF_PICTURES.length];
  return {
    id: `diff:${drawn.id}:${index}`,
    level: `Season ${seasonNo} · Episode ${episode}`,
    scene: drawn.scene,
    alt: drawn.alt,
    top: drawn.top,
    bottom: drawn.bottom,
    differences: drawn.cells.map((cell, at) => ({
      id: `${drawn.id}:${at}`,
      ...CELL(cell[0], cell[1]),
    })),
    hearts: 3,
  };
}