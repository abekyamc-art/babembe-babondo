import { LEVELS } from "./differenceGame/levels";

/**
 * GLOIRE AI — the picture puzzle of one episode: one drawn scene shown twice, the lower copy carrying
 * the differences, for the student to tap each place he finds.
 *
 * The two pictures are the app's own drawings — the very same scenes, and the very same places, the Find
 * the Differences game is played on — so they stand on the card the moment the question opens, they never
 * come up blank, and every difference is exactly where the drawing changes rather than a place guessed at
 * on a grid laid over a picture.
 *
 * The puzzles are used in turn: the episode after this one is given the puzzle after this one, so two
 * episodes beside each other are never the same puzzle. A puzzle is worked out from the season and the
 * episode alone, so the same episode is the same puzzle every time it is met.
 */

/** How many differences every puzzle holds. */
export const DIFFERENCE_COUNT = LEVELS[0].differences.length;

/** The levels the exam draws from: the ones whose scene holds exactly the five places a paper asks for. */
const PUZZLES = LEVELS.filter((level) => level.differences.length === DIFFERENCE_COUNT);

export function differencePuzzle(seasonNo, episode) {
  const index = seasonNo * 1000 + episode;
  const drawn = PUZZLES[index % PUZZLES.length];
  return {
    id: `diff:${drawn.id}:${index}`,
    level: `Season ${seasonNo} · Episode ${episode}`,
    scene: drawn.scene,
    alt: `${drawn.title} — ${drawn.about}.`,
    differences: drawn.differences.map((difference) => ({ ...difference })),
    hearts: 3,
  };
}