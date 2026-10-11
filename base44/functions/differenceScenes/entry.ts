import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import OpenAI from 'npm:openai@6.45.0';

/**
 * The new picture scenes of GLOIRE AI — FIND THE DIFFERENCES, drawn as 4K pictures.
 *
 * A scene is drawn twice: the first picture stands as it is, and the second is drawn from it with only the
 * scene's own five changes made, so the two pictures are the same picture in every other line, colour and
 * detail — whichever the player looks at, the same five places differ.
 *
 * Every change is then found in the drawn pair by a vision reading of the two pictures: the reading is
 * asked where each change stands in nine equal parts of the picture — a kind of answer a picture reader
 * gives surely, unlike a box measured in pixels — and the change's own touch area is worked out from that
 * part and from where inside the part it stands. So a level's differences stand where the picture really
 * changes, and every touch area is a comfortable eighth of the picture across and a sixth of it down.
 *
 * The address of a drawn pair may be handed back in, and the places are then read again on that same pair
 * without drawing anything — which is what puts a scene's places right without paying for its pictures twice.
 *
 * The scenes are drawn once and their addresses and boxes are kept in
 * src/lib/differenceGame/scenePictures.js, so the game opens with every level's pictures already standing.
 */

/** The one look every scene is drawn in, so the whole game stands as one set of pictures. */
const LOOK =
  'photorealistic ultra-detailed 4K photograph, wide 16:9 view, rich natural colour, sharp focus, ' +
  'warm soft daylight, fine texture in the ground, the cloth and the leaves, no text, no letters, ' +
  'no numbers, no writing, no logos, no watermark, no border, no frame';

/** Each new level's own scene: its look, and the five places its second picture differs. */
const SCENES = {
  4: {
    name: 'lake',
    look:
      'Lake Tanganyika at dawn: three wooden pirogues with fishermen pulling in nets, calm water with soft ' +
      'mist, distant green hills, a warm rising sun low over the water, a small rocky shore at the left ' +
      'with two woven baskets, birds in the sky',
    changes: [
      'in the top-left of the sky, one grey cloud is gone',
      'on the right, the paddle in the front pirogue has changed colour to bright blue',
      'in the bottom-left of the shore, one woven basket has disappeared',
      'the fisherman in the middle of the picture now wears a bright red shirt',
      'in the bottom-right corner of the shore, a tall green papyrus plant has appeared',
    ],
  },
  5: {
    name: 'pitch',
    look:
      'A village football ground in Congo in the late afternoon: boys playing a kickabout, a white goal ' +
      'frame built of bamboo, red dust pitch, tall green palm trees and a low fence behind, a crowd of ' +
      'children watching along the right, blue sky with white clouds',
    changes: [
      'the football in the middle of the pitch has changed colour from white to orange',
      'in the top-left of the sky, one white cloud is gone',
      'on the left of the pitch, a low wooden bench has appeared',
      'the tallest child on the right of the crowd now wears a bright green shirt',
      'in the bottom-right corner, the metal bucket beside the goal post is gone',
    ],
  },
  6: {
    name: 'crossing',
    look:
      'A river crossing in a Kibembe village: a footbridge of wooden logs over a clear stream, women ' +
      'carrying basins and bundles on their heads walking across, clothes spread on flat stones to dry on ' +
      'the left bank, two goats grazing on the right bank, dense green vegetation, soft morning light',
    changes: [
      'the basin on the head of the woman in the middle is now bright yellow',
      'on the left bank, one blue shirt has gone from the stones',
      'on the right bank, one of the two goats has disappeared',
      'in the top-left corner, a tall palm tree has appeared',
      'in the bottom-right corner, a white bird stands at the edge of the water',
    ],
  },
  7: {
    name: 'feast',
    look:
      'A village wedding feast in a courtyard: a long table laid with white and orange cloth and plates of ' +
      'food, a big cooking pot over a fire at the right, drummers playing tall drums at the left, women ' +
      'dancing in bright wraps, strings of coloured cloth and balloons hung overhead, warm afternoon light',
    changes: [
      'the cloth wrapped round the tall drum on the left has changed from green to purple',
      'in the middle of the table, the tall jug of water has gone',
      'in the top-right, one string of coloured cloth is missing from the decorations',
      'in the bottom-left corner, a smiling child in a blue dress has appeared',
      'at the right, the big cooking pot is now silver instead of black',
    ],
  },
  8: {
    name: 'fireside',
    look:
      'An evening storytelling gathering in a village: a bright fire in the middle, an old storyteller with ' +
      'a drum seated at the left, children sitting on the ground around the fire, a man playing a guitar at ' +
      'the right, mud houses and dark trees behind, a deep blue night sky full of stars and a big moon, warm ' +
      'firelight on every face',
    changes: [
      'the big moon in the top-right of the sky has gone',
      'a bright shooting star now crosses the top-left of the sky',
      'the storyteller’s drum on the left is now red',
      'the guitar player on the right now wears a yellow hat',
      'in the bottom-left corner, the clay pot beside the fire has gone',
    ],
  },
  9: {
    name: 'stage',
    look:
      'A village music show at night: a low stage of planks with a singer at a microphone, two drummers and ' +
      'a guitarist behind, two big black speakers at the sides, a crowd of dancing people in front, ' +
      'colourful stage lights, a banner of plain cloth hung above the stage with nothing written on it, a ' +
      'dark evening sky',
    changes: [
      'the microphone stand in the middle of the stage is now gold instead of silver',
      'the speaker on the left has changed colour to bright green',
      'the small flag on top of the left speaker has disappeared',
      'the drummer on the right now wears a red cap',
      'in the bottom-right corner, a water bottle stands on the stage floor',
    ],
  },
};

/** A share of the picture, kept to four places. */
const share = (n) => Math.round(Math.max(0, Math.min(1, n)) * 10000) / 10000;

/** Which of three a word names: the left or the top is nought, the right or the bottom is two. */
const third = (word, fallback) => {
  const held = String(word || '').toLowerCase().trim();
  if (held.startsWith('l') || held.startsWith('t') || held.startsWith('u')) return 0;
  if (held.startsWith('r') || held.startsWith('b') || held.startsWith('d')) return 2;
  if (held.startsWith('m') || held.startsWith('c')) return 1;
  return fallback;
};

/** How much of the picture one touch area covers: an eighth across, a sixth down. */
const ACROSS = 1 / 8;
const DOWN = 1 / 6;

export default async function differenceScenes(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Only an admin may draw the scenes.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const level = Number(body?.level);
    const scene = SCENES[level];
    if (!scene) return Response.json({ error: 'No scene was named.' }, { status: 400 });

    const { baseURL, token, headers } = base44.asServiceRole.aiGateway.connection();
    const client = new OpenAI({ baseURL, apiKey: token, defaultHeaders: headers, maxRetries: 0 });

    const listed = scene.changes.map((change, i) => `(${i + 1}) ${change}`).join(' ');
    let baseUrl = typeof body?.base === 'string' ? body.base : '';
    let changedUrl = typeof body?.changed === 'string' ? body.changed : '';
    let credits = 0;

    // a pair already drawn is read again as it stands; only a scene without one is drawn here
    if (!baseUrl || !changedUrl) {
      const first = await client.images.generate({
        model: 'seedream_5_0_lite',
        prompt: `${scene.look}. ${LOOK}`,
        n: 1,
        response_format: 'url',
        aspect_ratio: '16:9',
        resolution: '4K',
        output_format: 'jpeg',
        quality: 'auto',
      });
      baseUrl = first.data?.[0]?.url || '';
      if (!baseUrl) throw new Error('The first picture could not be drawn.');

      const second = await client.images.generate({
        model: 'seedream_5_0_lite',
        prompt:
          'Keep this picture exactly as it is — the same scene, the same people, the same animals, the same ' +
          'ground, the same sky, the same light, the same framing and the same detail — and change only these ' +
          `five places: ${listed} Everything else must stay identical, so the two pictures differ in exactly ` +
          'those five places and in nothing else.',
        reference_image_urls: [baseUrl],
        n: 1,
        response_format: 'url',
        aspect_ratio: '16:9',
        resolution: '4K',
        output_format: 'jpeg',
        quality: 'auto',
      });
      changedUrl = second.data?.[0]?.url || '';
      if (!changedUrl) throw new Error('The second picture could not be drawn.');

      credits = (first.usage?.base44_credits || 0) + (second.usage?.base44_credits || 0);
    }

    const located = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt:
        'Two pictures of the same scene stand here. The second picture differs from the first in exactly ' +
        `five places, listed here: ${listed} Look closely at both pictures, find each of those five places in ` +
        'the second picture, and say where each one stands. Think of the picture as divided into nine equal ' +
        'parts: three columns — left, middle, right — and three rows — top, middle, bottom. For every change ' +
        'give three things: the column it stands in, the row it stands in, and where inside that part it ' +
        'stands — towards the left of the part, its middle or its right, and towards the top of the part, its ' +
        'middle or its bottom. Also give a label of no more than six words naming what changed. Answer for ' +
        'all five changes, in the order they are listed.',
      file_urls: [baseUrl, changedUrl],
      response_json_schema: {
        type: 'object',
        properties: {
          differences: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                column: { type: 'string' },
                row: { type: 'string' },
                across: { type: 'string' },
                down: { type: 'string' },
              },
              required: ['label', 'column', 'row', 'across', 'down'],
            },
          },
        },
        required: ['differences'],
      },
    });

    const rows = Array.isArray(located?.differences) ? located.differences.slice(0, scene.changes.length) : [];
    const differences = rows.map((row, i) => {
      const partX = third(row.column, 1);
      const partY = third(row.row, 1);
      const inX = third(row.across, 1);
      const inY = third(row.down, 1);
      // the middle of the ninth the change stands in, moved by where inside it the reading places it
      const middleX = (partX + 0.5) / 3 + (inX - 1) / 9;
      const middleY = (partY + 0.5) / 3 + (inY - 1) / 9;
      return {
        id: `${scene.name}-${i + 1}`,
        x: share(Math.min(middleX - ACROSS / 2, 1 - ACROSS)),
        y: share(Math.min(middleY - DOWN / 2, 1 - DOWN)),
        w: share(ACROSS),
        h: share(DOWN),
        label: String(row.label || scene.changes[i] || `Difference ${i + 1}`),
        part: `${partX}${partY}`,
      };
    });

    return Response.json({
      level,
      scene: scene.name,
      base: baseUrl,
      changed: changedUrl,
      differences,
      found: differences.length,
      credits,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}