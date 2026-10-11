/**
 * GLOIRE AI — FIND THE DIFFERENCES
 * Created by CEO Gloire Sadiki Asende.
 *
 * Every level here is a real level. Its scene is the app's own — either one of its drawings, nothing copied
 * from anywhere, or one of its own drawn 4K pictures — and its differences are the exact places where the
 * second copy of that scene changes: a thing taken away, a colour turned, a face lost.
 *
 * A difference carries the place it stands in the picture as a share of the picture's own width and
 * height, so its touch area is the same on every phone: x and y are its top-left corner, w and h its
 * size. No two touch areas overlap, so a touch can only ever mean one difference.
 */

/** The scene is drawn on this grid, whatever size the phone shows it at. */
export const PANEL = { width: 1000, height: 560 };

/** How many hints a level gives freely. */
export const HINTS_PER_LEVEL = 1;

/** One mistake takes 100 points of nothing — it only ends a run when the three are spent. */
export const POINTS = { found: 100, clean: 300, perSecond: 5, hint: 50 };

export const LEVELS = [
  {
    id: 1,
    title: "The village home",
    scene: "village",
    difficulty: "Easy",
    seconds: 90,
    mistakes: 3,
    about: "The morning sun, the hut and the cooking fire",
    differences: [
      { id: "sun-face", x: 0.075, y: 0.055, w: 0.145, h: 0.235, label: "The sun lost its smile" },
      { id: "pot-steam", x: 0.16, y: 0.57, w: 0.092, h: 0.215, label: "The steam has gone from the pot" },
      { id: "door-color", x: 0.462, y: 0.583, w: 0.106, h: 0.19, label: "The door changed colour" },
      { id: "tree-fruit", x: 0.795, y: 0.553, w: 0.137, h: 0.175, label: "The fruit has gone from the tree" },
      { id: "bucket", x: 0.742, y: 0.828, w: 0.108, h: 0.148, label: "The water bucket is missing" },
    ],
  },
  {
    id: 2,
    title: "The market day",
    scene: "market",
    difficulty: "Easy",
    seconds: 90,
    mistakes: 3,
    about: "The stall, the fruit and the vendor's table",
    differences: [
      { id: "cloth-band", x: 0.4, y: 0.66, w: 0.2, h: 0.15, label: "The band on the cloth changed colour" },
      { id: "watermelon", x: 0.2, y: 0.475, w: 0.13, h: 0.16, label: "The watermelon has gone" },
      { id: "tomatoes", x: 0.378, y: 0.495, w: 0.125, h: 0.14, label: "The tomatoes changed colour" },
      { id: "shirt", x: 0.875, y: 0.65, w: 0.105, h: 0.145, label: "The vendor's shirt changed colour" },
      { id: "crate", x: 0.712, y: 0.787, w: 0.117, h: 0.19, label: "The crate has gone from the ground" },
    ],
  },
  {
    id: 3,
    title: "The classroom",
    scene: "classroom",
    difficulty: "Easy",
    seconds: 90,
    mistakes: 3,
    about: "The blackboard, the clock and the desks",
    differences: [
      { id: "chalk-letter", x: 0.205, y: 0.205, w: 0.115, h: 0.18, label: "A letter has been rubbed off the board" },
      { id: "clock-hands", x: 0.475, y: 0.145, w: 0.145, h: 0.21, label: "The clock shows a different time" },
      { id: "window-birds", x: 0.705, y: 0.185, w: 0.155, h: 0.15, label: "The birds have flown away" },
      { id: "book-top", x: 0.12, y: 0.59, w: 0.145, h: 0.13, label: "The top book changed colour" },
      { id: "backpack", x: 0.012, y: 0.8, w: 0.115, h: 0.185, label: "The backpack is missing" },
    ],
  },
  {
    id: 4,
    title: "The lake at dawn",
    scene: "lake",
    difficulty: "Easy",
    seconds: 90,
    mistakes: 3,
    about: "The pirogues, the fishing nets and the rising sun on the water",
    differences: [
      { id: "lake-1", x: 0, y: 0, w: 0.125, h: 0.1667, label: "The grey cloud has gone from the sky" },
      { id: "lake-2", x: 0.875, y: 0.4167, w: 0.125, h: 0.1667, label: "The paddle turned bright blue" },
      { id: "lake-3", x: 0, y: 0.75, w: 0.125, h: 0.1667, label: "A basket has gone from the shore" },
      { id: "lake-4", x: 0.4375, y: 0.4167, w: 0.125, h: 0.1667, label: "The fisherman's shirt turned red" },
      { id: "lake-5", x: 0.875, y: 0.8333, w: 0.125, h: 0.1667, label: "A papyrus plant has grown on the shore" },
    ],
  },
  {
    id: 5,
    title: "The football ground",
    scene: "pitch",
    difficulty: "Medium",
    seconds: 80,
    mistakes: 3,
    about: "The bamboo goal, the dust pitch and the children watching",
    differences: [
      { id: "pitch-1", x: 0.4375, y: 0.5278, w: 0.125, h: 0.1667, label: "The ball turned orange" },
      { id: "pitch-2", x: 0.1042, y: 0, w: 0.125, h: 0.1667, label: "A cloud has gone from the sky" },
      { id: "pitch-3", x: 0, y: 0.5278, w: 0.125, h: 0.1667, label: "A wooden bench has appeared" },
      { id: "pitch-4", x: 0.7708, y: 0.4167, w: 0.125, h: 0.1667, label: "A child's shirt turned green" },
      { id: "pitch-5", x: 0.2153, y: 0.5278, w: 0.125, h: 0.1667, label: "The bucket has gone from beside the goal" },
    ],
  },
  {
    id: 6,
    title: "The river crossing",
    scene: "crossing",
    difficulty: "Medium",
    seconds: 75,
    mistakes: 3,
    about: "The log bridge, the women crossing and the goats on the bank",
    differences: [
      { id: "crossing-1", x: 0.4375, y: 0.3056, w: 0.125, h: 0.1667, label: "The basin on the woman's head turned yellow" },
      { id: "crossing-2", x: 0.2153, y: 0.5278, w: 0.125, h: 0.1667, label: "A blue shirt has gone from the stones" },
      { id: "crossing-3", x: 0.875, y: 0.4167, w: 0.125, h: 0.1667, label: "One of the goats has gone" },
      { id: "crossing-4", x: 0.1042, y: 0.0833, w: 0.125, h: 0.1667, label: "A tall palm tree has appeared" },
      { id: "crossing-5", x: 0.6597, y: 0.6389, w: 0.125, h: 0.1667, label: "A white bird stands at the water" },
    ],
  },
  {
    id: 7,
    title: "The wedding feast",
    scene: "feast",
    difficulty: "Hard",
    seconds: 70,
    mistakes: 3,
    about: "The drums, the long table and the cooking fire",
    differences: [
      { id: "feast-1", x: 0.1042, y: 0.4167, w: 0.125, h: 0.1667, label: "The cloth on the drum turned purple" },
      { id: "feast-2", x: 0.4375, y: 0.3056, w: 0.125, h: 0.1667, label: "The jug has gone from the table" },
      { id: "feast-3", x: 0.6597, y: 0.1944, w: 0.125, h: 0.1667, label: "A string of cloth has gone from the decorations" },
      { id: "feast-4", x: 0, y: 0.75, w: 0.125, h: 0.1667, label: "A child in a blue dress has appeared" },
      { id: "feast-5", x: 0.7708, y: 0.5278, w: 0.125, h: 0.1667, label: "The cooking pot turned silver" },
    ],
  },
  {
    id: 8,
    title: "The evening fire",
    scene: "fireside",
    difficulty: "Hard",
    seconds: 65,
    mistakes: 3,
    about: "The storyteller, the drum and the stars over the village",
    differences: [
      { id: "fireside-1", x: 0.4375, y: 0.0833, w: 0.125, h: 0.1667, label: "The moon has gone from the sky" },
      { id: "fireside-2", x: 0.1042, y: 0.0833, w: 0.125, h: 0.1667, label: "A shooting star crosses the sky" },
      { id: "fireside-3", x: 0.2153, y: 0.4167, w: 0.125, h: 0.1667, label: "The storyteller's drum turned red" },
      { id: "fireside-4", x: 0.7708, y: 0.3056, w: 0.125, h: 0.1667, label: "The guitar player put on a yellow hat" },
      { id: "fireside-5", x: 0.2153, y: 0.8333, w: 0.125, h: 0.1667, label: "The clay pot has gone from the fire" },
    ],
  },
  {
    id: 9,
    title: "The music stage",
    scene: "stage",
    difficulty: "Hard",
    seconds: 60,
    mistakes: 3,
    about: "The singer, the drummers and the crowd before the stage",
    differences: [
      { id: "stage-1", x: 0.4375, y: 0.4167, w: 0.125, h: 0.1667, label: "The microphone stand turned gold" },
      { id: "stage-2", x: 0.1042, y: 0.4167, w: 0.125, h: 0.1667, label: "The speaker turned bright green" },
      { id: "stage-3", x: 0.1042, y: 0.1944, w: 0.125, h: 0.1667, label: "The flag on the speaker has gone" },
      { id: "stage-4", x: 0.6597, y: 0.4167, w: 0.125, h: 0.1667, label: "The drummer put on a red cap" },
      { id: "stage-5", x: 0.7708, y: 0.6389, w: 0.125, h: 0.1667, label: "A water bottle stands on the stage" },
    ],
  },
];

/** How many cards the level map shows: the levels that stand, and the ones still to come. */
export const LEVEL_SLOTS = 12;

export function levelById(id) {
  return LEVELS.find((level) => level.id === id) || null;
}

export function nextLevel(id) {
  return levelById(id + 1);
}

/** The last level that stands today. */
export const LAST_LEVEL = LEVELS[LEVELS.length - 1].id;

/** One short word of praise after a level is won, with its meaning under it. */
export const PRAISE = [
  { kb: "Hongera!", en: "Congratulations!" },
  { kb: "Ole sawa! Umefanya vizuri!", en: "Well done! You did great!" },
];

export function praiseFor(id) {
  return PRAISE[(id - 1) % PRAISE.length];
}