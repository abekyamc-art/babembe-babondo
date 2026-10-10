import { LIFE_SCENES, NUMBER_SCENES, PHRASE_SCENES, PROVERB_SCENES } from './examPictures';
import {
  BODY_PICTURES,
  GREETING_PICTURES,
  MATHS_PICTURES,
  NUMBER_PICTURES,
  PHRASE_PICTURES,
  PROVERB_PICTURES,
  WORD_FIX_PICTURES,
} from './examImages';

/**
 * GLOIRE AI — the picture puzzle: one picture shown twice, with differences standing in the lower copy
 * for the student to find.
 *
 * The pictures are the app's own: every scene the examination already draws on is used here too, in
 * turn, so two episodes beside each other are never built on the same picture, and the differences
 * themselves are put in different places each time. Nothing has to be drawn for a puzzle: the lower
 * copy carries a colour turned, a part brightened, softened or drained of its colour, or a thing added
 * that the upper copy does not have — and each of those stands in its own place, plainly tappable.
 *
 * A puzzle is worked out from the season and the episode alone, so the same episode is the same puzzle
 * every time it is met.
 */

/** Every picture the app already draws, each one a scene a puzzle can be built on. */
const PICTURES = [
  ...Object.values(LIFE_SCENES),
  ...Object.values(NUMBER_SCENES),
  ...Object.values(PHRASE_SCENES),
  ...Object.values(PROVERB_SCENES),
  ...Object.values(NUMBER_PICTURES),
  ...Object.values(GREETING_PICTURES),
  ...Object.values(PHRASE_PICTURES),
  ...Object.values(PROVERB_PICTURES),
  ...Object.values(BODY_PICTURES),
  ...Object.values(WORD_FIX_PICTURES),
  ...MATHS_PICTURES,
].filter((picture) => picture?.url);

/** Where a difference may stand: five across and four down, each a whole thumb's target on a phone. */
const CELLS = [];
for (let row = 0; row < 4; row += 1) {
  for (let col = 0; col < 5; col += 1) {
    CELLS.push({ x: col * 0.2 + 0.02, y: row * 0.25 + 0.02, w: 0.16, h: 0.21 });
  }
}

/** The five kinds of difference: one of each stands in every puzzle. */
const KINDS = ['added', 'hue', 'bright', 'blur', 'grey'];

/** The things a puzzle may add to the lower picture, named so they can be kept with the question. */
const THINGS = ['Bird', 'Flower2', 'Star', 'Sun', 'Fish', 'Key', 'Heart', 'Bell', 'Umbrella', 'Gift', 'Apple', 'Music'];

const COLOURS = ['#e4572e', '#17bebb', '#ffc914', '#7d53de', '#2e86ab', '#e36397'];

/** How many differences every puzzle holds. */
export const DIFFERENCE_COUNT = 5;

/** The places of one puzzle, spread over the picture and never twice the same. */
function cellsFor(seed) {
  const out = [];
  const start = seed % CELLS.length;
  for (let step = 0; step < CELLS.length && out.length < DIFFERENCE_COUNT; step += 1) {
    out.push(CELLS[(start + step * 7) % CELLS.length]);
  }
  return out;
}

/** One episode's puzzle: its own picture, and its own differences standing in it. */
export function differencePuzzle(seasonNo, episode) {
  const index = seasonNo * 1000 + episode;
  const picture = PICTURES[index % PICTURES.length];
  const differences = cellsFor(index).map((cell, at) => {
    const kind = KINDS[(at + index) % KINDS.length];
    return {
      id: `${index}:${at}`,
      kind,
      thing: kind === 'added' ? THINGS[(index + at) % THINGS.length] : '',
      colour: COLOURS[(index + at) % COLOURS.length],
      ...cell,
    };
  });
  return {
    id: `diff:${index}`,
    level: `Season ${seasonNo} · Episode ${episode}`,
    scene: picture.scene,
    alt: picture.alt || picture.scene,
    url: picture.url,
    differences,
    hearts: 3,
  };
}