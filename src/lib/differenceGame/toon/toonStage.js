/**
 * GLOIRE AI — FIND THE DIFFERENCES: the stage every cartoon episode is laid out on.
 *
 * A setting is the kind of place an episode stands in — a meadow, a river bank, a village yard, a
 * schoolyard, a hillside or a shore — and each one puts its own rows of places at its own heights, so two
 * episodes never stand the same way even when they share a setting. A tone is the light the episode is
 * played in, from dawn to night, and it colours the sky, the ground and the water.
 *
 * The places are the stage's own: sky places stand in the air, ground places stand back to front, and a
 * piece is put on the first place of its own kind that is still free. Because the places are fixed and
 * apart, a piece's box — and so the level's own touch area — always stands where the piece is drawn.
 */

/** The light an episode is played in. */
export const TONES = {
  dawn: { sky: ["#ffd9a8", "#fff4e4"], ground: "#a7d06d", shade: "#8cb851", water: "#93bfd8", wall: "#e2c391", far: "#d8b18a" },
  day: { sky: ["#bfe6ff", "#f2fbff"], ground: "#9ed36a", shade: "#8ec55c", water: "#6cc0e5", wall: "#e7cfa4", far: "#c9dcc4" },
  noon: { sky: ["#9fd6ff", "#eaf8ff"], ground: "#a8dd6f", shade: "#96cb5d", water: "#63bbe4", wall: "#ecd6ab", far: "#d3e4cd" },
  dusk: { sky: ["#f2a878", "#ffe0c2"], ground: "#8dbb5f", shade: "#78a34e", water: "#7fa8c4", wall: "#cfa87c", far: "#c29a83" },
  cloudy: { sky: ["#dbe4ec", "#f5f8fb"], ground: "#93c162", shade: "#82ad55", water: "#a9bccb", wall: "#d8c9ac", far: "#bfc9cd" },
  night: { sky: ["#1f2c56", "#4a5f96"], ground: "#5f7f4e", shade: "#4f6b41", water: "#4a6a8a", wall: "#8f7f6a", far: "#39496e" },
};

/** Each setting's own heights: the horizon, then the three rows a piece may stand in. */
export const SETTINGS = {
  meadow: { horizon: 330, back: 366, mid: 448, front: 518 },
  riverbank: { horizon: 326, back: 356, mid: 440, front: 518 },
  village: { horizon: 336, back: 372, mid: 452, front: 520 },
  schoolyard: { horizon: 326, back: 364, mid: 446, front: 516 },
  hillside: { horizon: 300, back: 336, mid: 424, front: 508 },
  shore: { horizon: 322, back: 350, mid: 436, front: 516 },
};

/** How many places stand in each row, and where across the picture they stand. */
const ROWS = [
  { x: [130, 350, 570, 800], dy: [0, 12, 2, 10], s: 0.72 },
  { x: [215, 500, 785], dy: [0, 10, 4], s: 0.86 },
  { x: [175, 470, 775], dy: [0, 8, 2], s: 1 },
];

const SKY_PLACES = [
  { x: 158, y: -12, s: 1 },
  { x: 412, y: -38, s: 0.86 },
  { x: 662, y: -2, s: 0.94 },
  { x: 878, y: 24, s: 0.8 },
];

/** The free places of one setting: the ones in the sky, and the ones on the ground, back row first. */
export function slotsFor(setting) {
  const held = SETTINGS[setting] || SETTINGS.meadow;
  return {
    sky: SKY_PLACES.map((place) => ({ x: place.x, y: 118 + place.y, s: place.s })),
    ground: ROWS.flatMap((row) =>
      row.x.map((x, i) => ({ x, y: held[row === ROWS[0] ? "back" : row === ROWS[1] ? "mid" : "front"] + row.dy[i], s: row.s }))
    ),
  };
}