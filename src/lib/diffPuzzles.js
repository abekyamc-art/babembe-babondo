import { LEVELS } from "./differenceGame/levels";
import { picturesOf } from "./differenceGame/scenePictures";

/**
 * GLOIRE AI — the picture puzzle of one episode: one drawn scene shown twice, the lower copy carrying
 * the differences, for the student to tap each place he finds.
 *
 * The two pictures are the app's own drawn pairs — the very same pictures, and the very same places, the
 * Find the Differences game is played on — so they stand on the card the moment the question opens, they
 * never come up blank, and every difference is exactly where the picture changes rather than a place
 * guessed at on a grid laid over a picture.
 *
 * The puzzles are used in turn: the episode after this one is given the puzzle after this one, so two
 * episodes beside each other are never the same puzzle. A puzzle is worked out from the season and the
 * episode alone, so the same episode is the same puzzle every time it is met.
 */

/**
 * How many differences every puzzle of a paper holds: the five places the drawn picture pairs were drawn
 * with. It stands on its own rather than being read off a level of the game, so giving a level of the game
 * more places to find never changes what a paper asks for — a paper's pictures hold only their own five.
 */
export const DIFFERENCE_COUNT = 5;

/**
 * The levels the exam draws from: the ones whose picture holds exactly the five places a paper asks for,
 * and that stand as a drawn pair — so the exam's puzzle is always a real pair of photographs whose places
 * were read from the pictures themselves, never one of the app's own drawings, whose places were set by
 * hand instead.
 */
const PUZZLES = LEVELS.filter(
  (level) => level.differences.length === DIFFERENCE_COUNT && picturesOf(level.scene)
);

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