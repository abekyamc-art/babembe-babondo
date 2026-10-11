/**
 * GLOIRE AI — FIND THE DIFFERENCES: the pieces the cartoon episodes are drawn from.
 *
 * Every piece knows three things about itself: the box it takes in the picture, the colours it may be
 * turned to, and whether it stands in the sky or on the ground. Each colour a piece may be turned to is
 * different from the colour it is drawn in, so a turned piece is always seen. The recipe of an episode
 * only names pieces and the order they come in; the stage places them, and the level's own touch areas are
 * read from exactly where they were placed — never guessed at on a grid.
 *
 * The drawings themselves stand in toonDraws.jsx. This file holds nothing but data, so a whole season can
 * be measured — its boxes, its capacity, its differences — without drawing a single line.
 */

/** box: [width, height, anchor] — the anchor is how far down the box the piece's own (x, y) stands. */
export const KINDS = {
  // in the sky
  sun: { noun: "sun", article: "The", where: "in the sky", zone: "sky", box: [170, 170, 0.5], s: 1, tints: ["#ff8f3f", "#e0453f", "#f6f2e6"] },
  cloud: { noun: "cloud", article: "A", where: "in the sky", zone: "sky", box: [230, 120, 0.55], s: 0.62, tints: ["#bcd2e8", "#f2c9c9", "#cfd8e3"] },
  birds: { noun: "bird", article: "A", where: "in the sky", zone: "sky", box: [95, 50, 0.5], s: 1.3, tints: ["#e0453f", "#3f9d54", "#ffd23f"] },

  // on the ground
  backpack: { noun: "school bag", article: "The", zone: "ground", box: [105, 105, 0.45], s: 0.8, tints: ["#3f9d54", "#2f6fb0", "#ffd23f"] },
  basin: { noun: "basin", article: "The", zone: "ground", box: [140, 70, 0.35], s: 0.95, tints: ["#e0453f", "#3f9d54", "#ffd23f"] },
  basket: { noun: "basket", article: "The", zone: "ground", box: [105, 90, 0.5], s: 0.9, tints: ["#8e44ad", "#3f9d54", "#6cc0e5", "#e0453f"] },
  bicycle: { noun: "bicycle", article: "The", zone: "ground", box: [230, 160, 0.78], s: 0.9, tints: ["#e0453f", "#ffd23f", "#3f9d54"] },
  books: { noun: "books", article: "The", zone: "ground", box: [110, 60, 0.85], s: 1, tints: ["#3f9d54", "#8e44ad", "#ffd23f"] },
  bowl: { noun: "bowl", article: "The", zone: "ground", box: [130, 75, 0.6], s: 0.95, tints: ["#3f9d54", "#2f6fb0", "#8e44ad"] },
  bucket: { noun: "bucket", article: "The", zone: "ground", box: [85, 85, 0.55], s: 1, tints: ["#e0453f", "#3f9d54", "#ffd23f"] },
  canoe: { noun: "canoe", article: "The", zone: "ground", box: [350, 125, 0.75], s: 0.9, tints: ["#2f6fb0", "#e0453f", "#3f9d54"] },
  cart: { noun: "cart", article: "The", zone: "ground", box: [280, 155, 0.72], s: 0.85, tints: ["#2f6fb0", "#e0453f"] },
  chicken: { noun: "hen", article: "The", zone: "ground", box: [135, 100, 0.55], s: 0.9, tints: ["#f0a020", "#3f9d54", "#6cc0e5", "#e0453f"] },
  cloth: { noun: "cloth", article: "The", zone: "ground", box: [75, 85, 0.5], s: 1, tints: ["#2f6fb0", "#3f9d54", "#e0453f", "#ffd23f"] },
  crate: { noun: "crate", article: "The", zone: "ground", box: [110, 105, 0.5], s: 0.85, tints: ["#2f6fb0", "#e0453f", "#3f9d54"] },
  drum: { noun: "drum", article: "The", zone: "ground", box: [165, 195, 0.58], s: 0.95, tints: ["#8e44ad", "#ffd23f", "#e0453f", "#6cc0e5"] },
  fence: { noun: "fence", article: "The", zone: "ground", box: [280, 105, 0.85], s: 0.9, tints: ["#2f6fb0", "#e0453f"] },
  fish: { noun: "fish", article: "The", zone: "ground", box: [140, 85, 0.5], s: 1, tints: ["#ffd23f", "#e0453f", "#3f9d54"] },
  flower: { noun: "flower", article: "The", zone: "ground", box: [80, 100, 0.55], s: 1, tints: ["#ffd23f", "#8e44ad", "#2f6fb0", "#f0a020"] },
  globe: { noun: "globe", article: "The", zone: "ground", box: [85, 95, 0.55], s: 0.9, tints: ["#ffd23f", "#8e44ad", "#3f9d54"] },
  goat: { noun: "goat", article: "The", zone: "ground", box: [150, 110, 0.5], s: 0.9, tints: ["#8b5a2b", "#4b4b52", "#c58b52"] },
  hut: { noun: "hut", article: "The", zone: "ground", box: [240, 185, 0.95], s: 0.8, tints: ["#8b5a2b", "#3f9d54", "#2f6fb0", "#8e44ad"] },
  jerrycan: { noun: "jerrycan", article: "The", zone: "ground", box: [105, 115, 0.55], s: 0.9, tints: ["#3f9d54", "#2f6fb0", "#ffd23f"] },
  jug: { noun: "jug", article: "The", zone: "ground", box: [110, 125, 0.6], s: 0.95, tints: ["#3f9d54", "#2f6fb0", "#e0453f"] },
  lamp: { noun: "oil lamp", article: "The", zone: "ground", box: [110, 135, 0.62], s: 0.95, tints: ["#6cc0e5", "#e0453f"] },
  mat: { noun: "mat", article: "The", zone: "ground", box: [230, 95, 0.35], s: 0.9, tints: ["#2f6fb0", "#e0453f", "#8e44ad"] },
  motorbike: { noun: "motorbike", article: "The", zone: "ground", box: [240, 165, 0.78], s: 0.9, tints: ["#e0453f", "#3f9d54", "#ffd23f"] },
  palm: { noun: "palm", article: "The", zone: "ground", box: [240, 340, 0.84], s: 0.95, tints: ["#f0a020", "#ffd23f", "#e94f8a"] },
  person: { noun: "person", article: "The", zone: "ground", box: [145, 230, 0.6], s: 0.8, tints: ["#e0453f", "#ffd23f", "#3f9d54", "#8e44ad", "#f0a020"] },
  plant: { noun: "plant", article: "The", zone: "ground", box: [120, 115, 0.62], s: 0.9, tints: ["#ffd23f", "#e0453f", "#8e44ad"] },
  pot: { noun: "cooking pot", article: "The", zone: "ground", box: [200, 165, 0.63], s: 0.85, tints: ["#ffd23f", "#e0453f", "#3f9d54", "#cfd8e3"] },
  sack: { noun: "sack", article: "The", zone: "ground", box: [110, 110, 0.5], s: 0.85, tints: ["#2f6fb0", "#8e44ad", "#e0453f"] },
  scale: { noun: "market scale", article: "The", zone: "ground", box: [210, 135, 0.6], s: 0.8, tints: ["#ffd23f", "#3f9d54", "#e0453f"] },
  stool: { noun: "stool", article: "The", zone: "ground", box: [125, 75, 0.7], s: 0.95, tints: ["#2f6fb0", "#e0453f", "#ffd23f"] },
};

/** The box a placed piece stands in, in the picture's own 1000 × 560 grid. */
export function boxOf(kind, x, y, s) {
  const held = KINDS[kind];
  if (!held) return null;
  const [w, h, anchor] = held.box;
  return {
    x: x - (w * s) / 2,
    y: y - h * s * anchor,
    w: w * s,
    h: h * s,
  };
}

/** The name of every colour a piece may be turned to, so a difference reads as a colour and not as code. */
const COLOURS = {
  "#e0453f": "bright red",
  "#ffd23f": "bright yellow",
  "#2f6fb0": "deep blue",
  "#3f9d54": "green",
  "#8e44ad": "purple",
  "#f0a020": "orange",
  "#e94f8a": "pink",
  "#6cc0e5": "sky blue",
  "#8b5a2b": "brown",
  "#4b4b52": "charcoal grey",
  "#c58b52": "tan",
  "#cfd8e3": "pale grey",
  "#bcd2e8": "grey blue",
  "#f2c9c9": "pale pink",
  "#ff8f3f": "deep orange",
  "#f6f2e6": "cream white",
};

export function colourName(hex) {
  return COLOURS[hex] || "another colour";
}

/** What a difference is called: the piece that went, or the colour a piece was turned to. */
export function labelOf(kind, change) {
  const held = KINDS[kind] || {};
  const noun = held.noun || "thing";
  const article = held.article || "The";
  if (change.how === "hide") return `${article} ${noun}${held.where ? ` ${held.where}` : ""} has gone`;
  return `${article} ${noun} turned ${colourName(change.colour)}`;
}