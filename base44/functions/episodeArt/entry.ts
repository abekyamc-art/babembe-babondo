import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { geminiImage, DRAW_BIG } from '../../shared/gemini.ts';
import { photoPuzzleAreas } from '../../shared/photoPuzzleAreas.ts';
import { replicateImage } from '../../shared/replicate.ts';

/**
 * GLOIRE AI — FIND THE DIFFERENCES: one episode drawn as its own cartoon picture.
 *
 * An episode used to be assembled from the same pieces as its neighbours, so two episodes a season apart
 * could stand as the same picture. Here one episode is drawn for itself: the scene it carries is written
 * out in the app's own words — the place it stands in, the light it is played in, the things it holds and
 * the clothes its people wear — and the picture is drawn from that alone. Nothing is shared with the
 * episode beside it, so no two episodes carry the same picture.
 *
 * The second picture is then drawn from the first with only this episode's own changes made: a thing
 * taken out, a thing turned to another colour, a thing come into the scene. Every change is told in its
 * own sentence, one after another, and the drawing is asked to leave everything else exactly as it is, so
 * the two pictures are the same picture but for those places.
 *
 * What really changed is never assumed from what was asked for: the two drawn pictures are read back
 * against each other, and each change's touch area is measured on the place where the picture truly
 * differs. An episode whose pair comes back with fewer places than it asks for is not installed at all —
 * it is left to be drawn again, so no episode is ever played with a place missing.
 *
 * One episode is drawn per call, and only an admin may ask for it: a whole season is drawn by asking
 * again and again, a little at a time, which is what keeps the accounts' own allowances from being spent
 * in one breath.
 */

/** The first and last episode drawn as a cartoon of its own. */
const FIRST = 40;
const LAST = 510;

/** Where each season's episodes open, so an episode's season and its place in it are read from its number. */
const SEASON_STARTS = [40, 52, 103, 154, 205, 256, 307, 358, 409, 460];

/** What an episode asks of the player, read from where it stands in its own season. */
const TIERS = [
  { upTo: 17, required: 5 },
  { upTo: 34, required: 7 },
  { upTo: 51, required: 10 },
];

/** The light an episode is played in, in the words the picture is asked for in. */
const LIGHT = {
  dawn: 'at first light, with the sun low and the air soft',
  cloudy: 'under a wide grey cloudy sky',
  day: 'in bright clear daylight',
  dusk: 'at sunset, with warm light across everything',
  noon: 'at high noon, with short hard shadows',
  night: 'at night, under a deep blue sky full of stars and a big moon',
};

/** The places an episode may stand in: a list to each setting the seasons are played in. */
const PLACES = {
  village: [
    'the village square with mud houses around it',
    'a family compound yard with washing on the line',
    'the lane beside the small chapel',
    'the crossroads where the market road meets the path',
    'a red-earth street of houses with a shop veranda',
    'the roadside garage where an old car stands being mended',
    'the bus stop where a minibus waits under the big tree',
    'the barber stand in the shade of the mango tree',
    'the yard with the water drum and the cooking fire',
    'the shop counter with crates of drinks and a bicycle leaning on it',
    'the narrow lane behind the market with stacked crates',
    'the compound gate where a bicycle and a cart stand',
  ],
  hillside: [
    'a hilltop footpath above the valley',
    'the terraced slope where the gardens stand',
    'the rocky hill where the goats climb',
    'the quarry road with stones along the side',
    'the ridge trail with tall grass and a bridge of logs',
    'the hill road where a bicycle leans on the bank',
    'the slope above the village with the roofs below it',
    'the path winding up past the thorn fence',
  ],
  meadow: [
    'a wide open meadow with tall grass',
    'a flower field beyond the village',
    'the grassy edge of the football field',
    'a grass clearing with a cooking fire and a mat',
    'the meadow beside the reeds, with a stream running through',
    'the soft grass under the acacia trees',
    'the field where the maize has just been cut',
    'the flat green field beside the path to the well',
  ],
  riverbank: [
    'the landing stage where the pirogues are tied',
    'the ferry crossing with its wooden landing',
    'the drying racks along the bank',
    'the fishing jetty with nets spread out',
    'the sandy bank with pirogues pulled up on it',
    'the bamboo bridge over the stream',
    'the bank where the women wash, with flat stones',
    'the reed bank where the ducks and the fish are',
  ],
  schoolyard: [
    'the schoolyard at break time',
    'the path to school with banana plants along the side',
    'the veranda of the classrooms with the shutters open',
    'the field behind the school where the children play',
    'the school wall where the wooden benches stand',
    'the yard where the school drum and the flag pole stand',
    'the path where the children walk home with their bags',
  ],
  shore: [
    'the lake shore with its pale sand',
    'the sandy beach where the pirogues lie',
    'the rocky shore with the fish racks',
    'the fish-drying ground beside the water',
    'the shore where the canoes come in at dawn',
    'the water edge where the white egrets stand',
    'the sand spit where the nets are mended',
  ],
};

/** The clothes a scene's people wear, so one episode never wears what another wears. */
const WEAR = [
  'the women in bright yellow wraps and the men in blue shirts',
  'the people in green dresses and a red cap',
  'the women in orange wraps with purple headscarves',
  'the people in white shirts and bright red trousers',
  'the women in blue and white cloth and the children in yellow tops',
  'the people in purple wraps and green shirts',
  'the women in pink dresses with bright blue headscarves',
  'the people in red and yellow patterned cloth',
  'the women in sky-blue wraps and the men in orange shirts',
  'the people in green and white cloth with straw hats',
  'the women in maroon dresses and the men in khaki shirts',
  'the people in bright blue and orange cloth',
  'the women in lemon-yellow wraps and the men in white shirts',
  'the people in bright green shirts and yellow caps',
];

/** The one look every episode is drawn in, so the whole game stands as one set of cartoons. */
const LOOK =
  'Drawn as a hand-painted 2D cartoon illustration in a warm African picture-book style: clean bold dark ' +
  'outlines, flat cheerful colours, simple rounded shapes, soft shading, rounded hills and tall green ' +
  'trees, seen in a wide 16:9 landscape view. No text, no letters, no numbers, no writing, no words on ' +
  'anything, no logo, no watermark, no border, no frame.';

/** Every piece an episode may carry, with the words its own change is told in. */
const PIECES = {
  sun: 'the sun',
  cloud: 'a cloud',
  birds: 'the birds',
  backpack: 'the school bag',
  basin: 'the basin',
  basket: 'the basket',
  bicycle: 'the bicycle',
  books: 'the books',
  bowl: 'the bowl',
  bucket: 'the bucket',
  canoe: 'the canoe',
  cart: 'the cart',
  chicken: 'the hen',
  cloth: 'the cloth',
  crate: 'the crate',
  drum: 'the drum',
  fence: 'the fence',
  fish: 'the fish',
  flower: 'the flower',
  globe: 'the globe',
  goat: 'the goat',
  hut: 'the hut',
  jerrycan: 'the jerrycan',
  jug: 'the jug',
  lamp: 'the oil lamp',
  mat: 'the mat',
  motorbike: 'the motorbike',
  palm: 'the palm tree',
  person: 'the person',
  plant: 'the plant',
  pot: 'the cooking pot',
  sack: 'the sack',
  scale: 'the market scale',
  stool: 'the stool',
};

/** The pieces that come in twos and threes, so their change is told in the plural. */
const MANY = new Set(['birds', 'books']);

/** The bright colours a piece may be turned to. */
const COLOURS = ['bright red', 'bright yellow', 'bright green', 'bright blue', 'bright orange', 'bright purple'];

/** The simple things that may come into a scene, each one clear enough to see on a phone. */
const ADDED = [
  'a brown hen',
  'a grey cat',
  'a wooden stool',
  'a yellow bucket',
  'a clay water pot',
  'a small black dog',
  'a white goat',
  'a green plant in a pot',
  'a red jerrycan',
  'a woven basket',
];

/** How many things an episode carries, at most, so a brief never grows into a wall of words. */
const MOST_PIECES = 24;

/** The pieces that stand in the sky, so a piece's place is told rightly when its colour is planned. */
const SKY = new Set(['sun', 'cloud', 'birds']);

const title = (words) => words.charAt(0).toUpperCase() + words.slice(1);
const word = (howMany) => ['one', 'two', 'three', 'four', 'five', 'six'][howMany - 1] || String(howMany);

/** The things a scene carries, told the way a person would say them: "a sun, two birds, a canoe". */
function listed(pieces) {
  const counts = new Map();
  pieces.forEach((kind) => counts.set(kind, (counts.get(kind) || 0) + 1));
  return [...counts.entries()]
    .map(([kind, howMany]) => {
      const noun = PIECES[kind];
      if (howMany === 1) return noun;
      const bare = noun.replace(/^(the|a) /, '');
      return `${word(howMany)} ${MANY.has(kind) ? bare : `${bare}s`}`;
    })
    .join(', ');
}

/** The brief one call carries, kept narrow: only the episode's own number, name, setting, light and pieces. */
function briefOf(body) {
  const level = Number(body?.level);
  if (!Number.isInteger(level) || level < FIRST || level > LAST) {
    throw new Error('No episode of the cartoon seasons was named.');
  }
  const named = String(body?.title ?? '').trim();
  if (!named || named.length > 64 || !/^[\p{L}\p{N}\s'’,.!?&()-]+$/u.test(named)) {
    throw new Error('The episode was named in words the drawing cannot be asked for.');
  }
  const setting = String(body?.setting ?? '').trim();
  if (!PLACES[setting]) throw new Error('The episode stands in no place the game knows.');
  const tone = String(body?.tone ?? '').trim();
  if (!LIGHT[tone]) throw new Error('The episode stands in no light the game knows.');
  const carried = Array.isArray(body?.pieces) ? body.pieces : [];
  const pieces = carried
    .map((piece) => String(piece).trim().toLowerCase())
    .filter((piece) => PIECES[piece])
    .slice(0, MOST_PIECES);
  if (!pieces.length) throw new Error('The episode carries nothing to draw.');
  return { level, named, setting, tone, pieces };
}

/** A steady rank for every piece, so one episode always carries the same changes and they stand apart. */
const rank = (i, id) => (i * 7919 + id * 104729) % 1013;

/**
 * The changes this episode's second picture carries: each one a piece of the scene taken out, turned to
 * another colour, or brought into it — told in the words the drawing is asked for in, and in the words
 * the player is shown.
 */
function changesOf(level, pieces, required) {
  const wanted = Math.min(pieces.length, required + 3);
  return pieces
    .map((kind, i) => ({ i, kind, rank: rank(i, level) }))
    .sort((one, other) => one.rank - other.rank)
    .slice(0, wanted)
    .map((held, n) => {
      const noun = PIECES[held.kind];
      const how = (held.i + level + n) % 3;
      if (how === 2) {
        const thing = ADDED[(level + n) % ADDED.length];
        return {
          label: `${title(thing)} has appeared in the picture`,
          instruction: `add ${thing} standing in a clear empty spot on the ground, at the same scale as the rest`,
        };
      }
      if (how === 1) {
        const colour = COLOURS[(level + n) % COLOURS.length];
        return {
          label: `${title(noun)} turned ${colour}`,
          instruction: `${noun} is now ${colour}, and everything else about it stays the same`,
        };
      }
      return {
        label: MANY.has(held.kind)
          ? `${title(noun)} have gone from the picture`
          : `${title(noun)} has gone from the picture`,
        instruction: `take ${noun} out of the picture completely, leaving what stood behind it in its place`,
      };
    });
}

/** The scene this episode is drawn from, in the app's own words. */
function scenePrompt(brief, place) {
  return (
    `${brief.named}. ${title(place)}, ${LIGHT[brief.tone]}. ` +
    `Only these things stand in the picture: ${listed(brief.pieces)}. ` +
    `${title(WEAR[brief.level % WEAR.length])}. ${LOOK}`
  );
}

/** The second picture: this very picture, changed in the episode's own places and nowhere else. */
function changedPrompt(changes) {
  const told = changes.map((change, i) => `(${i + 1}) ${change.instruction}`).join(' ');
  return (
    'Keep this cartoon picture exactly as it is — the same place, the same people and animals, the same ' +
    'art style, the same linework, the same colours, the same framing and the same detail — and change ' +
    `only these places: ${told} Everything else stays identical, so the two pictures differ in exactly ` +
    'those places and nowhere else. ' +
    LOOK
  );
}

/**
 * One picture, drawn on the episode's own account — or, when that account cannot answer, on the next
 * account this app draws on, and the next after that, until one draws it. An account that has run out of
 * allowance is skipped rather than waited on, because several episodes are drawn in a run.
 *
 * When none of the app's own accounts can draw it, the owner's own Replicate account draws it instead,
 * and that drawing is paid out of that account's own allowance rather than the app's credits. When
 * neither can draw it, both answers are named, so the reason an episode is waiting is never hidden.
 */
async function drawn(base44, group, prompt, reference_urls = []) {
  let onOwn = '';
  try {
    return await geminiImage({
      base44,
      group,
      model: DRAW_BIG,
      prompt,
      reference_urls,
      aspect: '16:9',
      imageSize: '2K',
      least: 1000,
    });
  } catch (error: any) {
    onOwn = error?.message || 'The app\u2019s own accounts did not answer.';
    console.error('An episode picture was not drawn on the app\u2019s own accounts:', onOwn);
  }

  try {
    return await replicateImage({ base44, prompt, reference_url: reference_urls[0] || null });
  } catch (error: any) {
    throw new Error(
      `The app's own accounts could not draw it (${String(onOwn).slice(0, 150)}), and the Replicate account could not either (${String(error?.message || '').slice(0, 150)}).`
    );
  }
}

export default async function episodeArt(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Only an admin may draw the episodes.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const brief = briefOf(body);

    const season = SEASON_STARTS.filter((at) => at <= brief.level).length;
    const position = brief.level - SEASON_STARTS[season - 1] + 1;
    const tier = TIERS.find((held) => position <= held.upTo) || TIERS[2];

    const already = await base44.asServiceRole.entities.EpisodeArt.filter(
      { level_id: brief.level },
      { limit: 1 }
    );
    if (already.items[0] && body?.redraw !== true) {
      return Response.json({ level: brief.level, drawn: false, art: already.items[0] });
    }

    const place = PLACES[brief.setting][(brief.level - 1) % PLACES[brief.setting].length];
    const changes = changesOf(brief.level, brief.pieces, tier.required);
    const asked = new Set(changes.slice(0, tier.required).map((change) => change.label));

    const base = await drawn(base44, 'episodebase', scenePrompt(brief, place), []);
    const changed = await drawn(
      base44,
      'episodecopy',
      changedPrompt(changes),
      [base]
    );

    // what really changed is read back off the two drawn pictures, never taken from what was asked for
    const found = await photoPuzzleAreas(base44, base, changed, changes);

    const places = (Array.isArray(found) ? found : [])
      .filter((held) => [held?.x, held?.y, held?.w, held?.h].every(Number.isFinite) && held.w > 0 && held.h > 0)
      .map((held, i) => {
        const x = Math.min(Math.max(0, held.x / 1000), 0.99);
        const y = Math.min(Math.max(0, held.y / 1000), 0.99);
        return {
          id: `ep${brief.level}-${i + 1}`,
          x: Math.round(x * 10000) / 10000,
          y: Math.round(y * 10000) / 10000,
          w: Math.min(Math.round((held.w / 1000) * 10000) / 10000, 1 - x),
          h: Math.min(Math.round((held.h / 1000) * 10000) / 10000, 1 - y),
          label: String(held.label || 'A place in the picture changed'),
          extra: !asked.has(String(held.label || '')),
        };
      });

    if (places.length < tier.required) {
      return Response.json(
        {
          error: `The pair came back with ${places.length} clear places, and the episode asks for ${tier.required}. It was not installed — ask again and it will be drawn anew.`,
          level: brief.level,
          base,
          changed,
        },
        { status: 422 }
      );
    }

    // where the reading named the places in its own words, the episode's own number still stands as what
    // it asks for: the first places are the ones that pass it, and every place beyond them waits as a spare
    const asked4 = places.filter((held) => !held.extra).length;
    if (asked4 < tier.required) {
      places.forEach((held, i) => {
        held.extra = i >= tier.required;
      });
    }

    const record = {
      level_id: brief.level,
      season,
      title: brief.named,
      base_url: base,
      changed_url: changed,
      differences: places,
      place,
      made_at: new Date().toISOString(),
      note: `${places.length} places read back off the drawn pair; ${tier.required} of them pass the episode.`,
    };

    const art = already.items[0]
      ? await base44.asServiceRole.entities.EpisodeArt.update(already.items[0].id, record)
      : await base44.asServiceRole.entities.EpisodeArt.create(record);

    return Response.json({
      level: brief.level,
      season,
      title: brief.named,
      place,
      drawn: true,
      required: tier.required,
      places: places.length,
      art,
    });
  } catch (error) {
    return Response.json({ error: error?.message || 'The episode could not be drawn.' }, { status: 500 });
  }
}