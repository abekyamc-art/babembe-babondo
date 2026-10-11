import { LEVELS } from "./differenceGame/levels";
import { picturesOf } from "./differenceGame/scenePictures";
import { PHOTO_PUZZLE_UPDATES } from "./differenceGame/photoPuzzleUpdates";
import { requiredPlaces } from "./differenceGame/places";

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
 * How many differences a paper asks for at most: the five places a picture is read for. A picture that
 * truly holds fewer than five — the reading of its pair found no more — has its paper ask for the places
 * it really holds, so a paper never asks for a place that cannot be seen or touched.
 */
export const DIFFERENCE_COUNT = 5;

/**
 * The levels the exam draws from: the ones that stand as a real pair of photographs whose places were read
 * off the pictures themselves — never one of the app's own drawings, whose places were set by hand, and
 * never a picture whose places have not yet been read.
 */
const PUZZLES = LEVELS.filter((level) => PHOTO_PUZZLE_UPDATES[level.scene] && picturesOf(level.scene));

export function differencePuzzle(seasonNo, episode) {
  const index = seasonNo * 1000 + episode;
  const drawn = PUZZLES[index % PUZZLES.length];
  return {
    id: `diff:${drawn.id}:${index}`,
    level: `Season ${seasonNo} · Episode ${episode}`,
    scene: drawn.scene,
    alt: `${drawn.title} — ${drawn.about}.`,
    differences: requiredPlaces(drawn)
      .slice(0, DIFFERENCE_COUNT)
      .map((difference) => ({ ...difference })),

    hearts: 3,
  };
}