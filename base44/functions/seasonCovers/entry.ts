import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import OpenAI from 'npm:openai@6.45.0';
import { geminiImage, DRAW_BIG } from '../../shared/gemini.ts';

/** The least side a season's cover is accepted at: a real 4K picture, or the app's own picture service draws it. */
const LEAST_4K = 3000;

/**
 * GLOIRE AI — FIND THE DIFFERENCES: the seasons' own covers.
 *
 * Each season of the game opens on a cover of its own: a photograph of the very world its episodes are
 * played in, drawn once in 4K and kept by its address beside the game, so the season menu opens with its
 * pictures already standing there and draws nothing while a player is looking at it.
 */

/** Each season's own place in the world, worked into its photograph. */
const PLACES: Record<number, string> = {
  1: 'a Congolese village home at sunrise: a thatched mud house, a cooking fire with a steaming pot beside it, a mango tree, a water bucket on swept red earth, smoke rising into warm morning light',
  2: 'a drum circle at golden hour on a village clearing above a river: tall hand-carved wooden drums, dancers in bright printed cloth caught mid-step, dust hanging in the low sun, tall palms behind them',
  3: 'a wide calm river at dawn seen from the bank: wooden pirogues resting at the edge, fishermen casting long nets, mist lying on the water, papyrus reeds, the sun just rising behind the far bank',
  4: 'a green hillside in the afternoon with a herd of goats: a young herder leaning on a staff, tall grasses, scattered trees, soft clouds in a wide blue sky, a village far down in the valley',
  5: 'the wide water at its landing at first light: wooden pirogues drawn up on the bank, fishermen spreading long nets over the drying racks, baskets of fresh fish and a market opening along the water, palms behind and a dugout ferry crossing in the mist',
  6: 'the wood and the wild in the afternoon: a tall honey tree, a young herder walking a herd of goats along a path through tall grass, a clearing where tall wooden drums stand waiting to be brought out, thick green bush and palms behind',
  7: 'the town as it grows along its one street in bright daylight: the first shops with their shutters open, small workshops with a carpentry bench at the roadside, a new school wall, and a busy market square with crates and baskets set out',
  8: 'the dry season and its first rains: cracked red earth around a deep well with its rope and bucket, dry grass and a thorn fence, and dark rain clouds gathering over the hills behind',
  9: 'a village festival at golden hour: a dancing crowd in bright printed cloth around tall hand-carved drums, a long table of food set out under the trees, lanterns lit and dust hanging in the low sun',
  10: 'the high mountain pasture in the late afternoon: a grassy peak standing above the clouds, a young herder with a herd of goats whose bells hang at their necks, a stone well at the top of the path and distant hills far below',
};

/** The one look every cover is drawn in: a real photograph of the real world, never a drawing. */
const LOOK =
  'Real documentary photograph of rural Congo, shot on 35mm film in natural light, photorealistic with ' +
  'true-to-life colour and sharp real-world detail, wide landscape composition, no text, no letters, no ' +
  'numbers, no logos, no watermark, no border, not an illustration, not a painting, not CGI';

export default async function seasonCovers(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Only an admin may draw the season covers.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const asked = Array.isArray(body?.seasons) ? body.seasons : [2, 3, 4];
    const seasons = asked
      .map(Number)
      .filter((no: number) => PLACES[no])
      .slice(0, 4);
    if (!seasons.length) return Response.json({ error: 'No season was named.' }, { status: 400 });

    const { baseURL, token, headers } = base44.asServiceRole.aiGateway.connection();
    const client = new OpenAI({ baseURL, apiKey: token, defaultHeaders: headers, maxRetries: 0 });

    const drawn = [];
    for (const no of seasons) {
      const wanted = `${PLACES[no]}. ${LOOK}`;
      // the covers' own account draws first, and a picture smaller than a full 4K frame is refused, so the
      // app's own picture service draws it instead — a season is never quietly covered by a small picture
      let url = '';
      let credits = 0;
      try {
        url = await geminiImage({
          base44,
          group: 'covers',
          model: DRAW_BIG,
          prompt: wanted,
          aspect: '16:9',
          imageSize: '4K',
          least: LEAST_4K,
        });
      } catch (error: any) {
        console.error(`The cover of season ${no} was not drawn on its own account:`, error?.message);
      }
      if (!url) {
        const { data, usage } = await client.images.generate({
          model: 'automatic',
          prompt: wanted,
          n: 1,
          response_format: 'url',
          aspect_ratio: '16:9',
          resolution: '4K',
        });
        url = data?.[0]?.url || '';
        credits = usage?.base44_credits || 0;
      }
      drawn.push({ season: no, url: url || null, credits });
    }

    return Response.json({ covers: drawn });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}