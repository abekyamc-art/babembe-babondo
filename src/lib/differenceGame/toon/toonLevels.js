/**
 * GLOIRE AI — FIND THE DIFFERENCES: the cartoon episodes, built from their recipes.
 *
 * A recipe names pieces and nothing else. This file places them on the stage of their own setting, works
 * out which of them change — how many is read from where the episode stands in its own season, so the
 * seasons grow harder as a player goes — and turns each changed piece into a difference whose touch area
 * is that piece's own box. Nothing is guessed at: a difference always stands exactly on the piece it
 * belongs to, and two neighbours that would be touched as one place are marked as standing together.
 *
 * Every episode of the four seasons is built here in one pass, and each one keeps its own copy of its
 * scene, so the same picture is never built twice and no episode is a copy of another.
 */
import { KINDS, boxOf, labelOf } from "./toonParts.js";
import { slotsFor } from "./toonStage.js";
import season1 from "./recipesS1.js";
import season2 from "./recipesS2.js";
import season3 from "./recipesS3.js";
import season4 from "./recipesS4.js";

/** Where each season's cartoon episodes stand, counting from the first, and the recipes they are drawn from. */
const SEASON_STARTS = [
  { first: 40, recipes: season1 },
  { first: 52, recipes: season2 },
  { first: 103, recipes: season3 },
  { first: 154, recipes: season4 },
];

/** What an episode asks of the player, read from where it stands in its own season. */
const TIERS = [
  { upTo: 17, required: 5, extras: 2, seconds: 90, name: "Easy" },
  { upTo: 34, required: 7, extras: 2, seconds: 80, name: "Normal" },
  { upTo: 51, required: 10, extras: 1, seconds: 70, name: "Hard" },
];

export const TOON_SCENES = {};
export const TOON_LEVELS = [];

/** A steady rank for every piece, so an episode always changes the same ones and its differences are spread out. */
const rank = (i, id) => (i * 7919 + id * 104729) % 1013;

/** The pieces of one recipe, each on the first free place of its own kind. */
function place(setting, tone, names) {
  const stage = slotsFor(setting);
  const free = { sky: [...stage.sky], ground: [...stage.ground] };
  const items = [];
  names.forEach((raw, i) => {
    // a night episode is never drawn with the sun in it, whatever its recipe says
    const name = (tone === "night" && raw.trim() === "sun" ? "cloud" : raw).trim();
    const piece = KINDS[name];
    if (!piece) return;
    const slot = free[piece.zone].shift();
    if (!slot) return;
    items.push({ key: `p${i}`, kind: name, x: slot.x, y: slot.y, s: +(slot.s * piece.s).toFixed(3) });
  });
  return items;
}

/** Whether two places stand well apart, so one cannot be taken for the other. */
const apart = (a, b) => a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;

function build(id, recipe, position) {
  const [title, setting, tone, list] = recipe;
  const tier = TIERS.find((held) => position <= held.upTo) || TIERS[2];
  const items = place(setting, tone, list.split(","));
  const wanted = Math.min(items.length, tier.required + tier.extras);

  const picked = items
    .map((item, i) => ({ i, rank: rank(i, id) }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, wanted)
    .map((row) => row.i)
    .sort((a, b) => a - b);

  const differences = picked.map((i, n) => {
    const item = items[i];
    const piece = KINDS[item.kind];
    const hide = (i + id) % 2 === 0;
    const change = hide
      ? { how: "hide" }
      : { how: "turn", colour: piece.tints[(id + n) % piece.tints.length] };
    item.change = change;
    const box = boxOf(item.kind, item.x, item.y, item.s);
    return {
      id: item.key,
      x: +Math.max(0, box.x / 1000).toFixed(4),
      y: +Math.max(0, box.y / 560).toFixed(4),
      w: +(Math.min(1000, box.w) / 1000).toFixed(4),
      h: +(Math.min(560, box.h) / 560).toFixed(4),
      label: labelOf(item.kind, change),
      ...(n < tier.required ? {} : { extra: true }),
    };
  });

  // a place standing under another is marked as standing together with it, so a player touching the
  // crowded part of a busy scene is always credited with the place they were looking at
  differences.forEach((held, a) =>
    differences.forEach((other, b) => {
      if (a < b && !apart(held, other)) {
        const mark = `together ${a}:${b}`;
        held.group = held.group || mark;
        other.group = other.group || mark;
      }
    })
  );

  return {
    level: {
      id,
      title,
      scene: `toon-${id}`,
      difficulty: tier.name,
      seconds: tier.seconds,
      mistakes: 3,
      about: `A cartoon scene: ${title.toLowerCase()}`,
      differences,
    },
    spec: {
      setting,
      tone,
      label: `${title}: a cartoon scene carrying ${differences.length} changes`,
      items,
    },
  };
}

SEASON_STARTS.forEach((held) => {
  held.recipes.forEach((recipe, n) => {
    const id = held.first + n;
    const { level, spec } = build(id, recipe, n + 1);
    TOON_LEVELS.push(level);
    TOON_SCENES[level.scene] = spec;
  });
});

TOON_LEVELS.sort((a, b) => a.id - b.id);

/** One cartoon episode's own scene, or nothing where the name is not an episode of the game. */
export function toonSpecOf(scene) {
  return TOON_SCENES[scene] || null;
}