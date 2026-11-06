import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import OpenAI from 'npm:openai@6.45.0';
import { geminiImage, DRAW_BIG } from '../../shared/gemini.ts';

/** The least side a season's cover is accepted at: a real 4K picture, or the app's own picture service draws it. */
const LEAST_4K = 3000;

/**
 * GLOIRE AI — THE EXAMINATION: the seasons' own covers.
 *
 * Each season of the examination opens on a cover of its own: a photograph of the very life its papers
 * are about — the everyday village morning, the health post, the riverside market where the whole
 * language is spoken, the trader's stall the calculations stand on, the music of the people, the family
 * working things out, the healer's own knowledge of the body. They are drawn once in 4K and kept by their
 * addresses beside the examination, so the season list opens with its pictures already standing there and
 * draws nothing while a student is looking at it.
 */

/** Each season's own scene, worked into its photograph — one for every season the examination is numbered for. */
const PLACES: Record<number, string> = {
  1: 'a Congolese village compound in the early morning: a grandmother greeting from the doorway of a thatched mud house, a mother with her baby on her back, neighbours talking across a swept red-earth courtyard, a cooking fire with a steaming pot, chickens pecking, a tall mango tree, warm first light',
  2: 'a small Congolese village health post in bright daylight: a wooden table under a mango tree with a stethoscope, a folded white cloth and a jerrycan of clean water, a nurse in a white coat listening to a small child, a mother standing beside them, red earth swept clean around the bench',
  3: 'a busy riverside market in the Congo at midday: women selling cassava, plantains and fish from woven baskets on the ground, many people talking and laughing under bright sun, colourful printed cloth, wooden pirogues at the water behind the stalls',
  4: 'a Congolese market trader\'s stall in warm afternoon light: neat pyramids of tomatoes, cassava roots and plantains on a wooden table, an old hand-cranked balance scale with brass weights, coins and folded notes in an open tin, the trader\'s hands counting them, red earth underfoot',
  5: 'a Congolese music performance in a village clearing at golden hour: a guitarist and a singer at a microphone on a small wooden stage, drums beside them, dancers in bright printed cloth caught mid-step, an audience clapping, dust hanging in the low warm sun',
  6: 'a Congolese family working things out together in a compound in the afternoon: a man mending a bicycle turned upside down on a mat, a woman measuring cassava flour into a basin with a calabash, children carrying water buckets, tools laid out in a row, long warm daylight',
  7: 'a Congolese village classroom at midday, the lesson of counting: children at long wooden benches working with a wooden counting frame strung with beads and neat rows of small stones and bottle caps laid out on the board, a girl holding her hands up with the fingers spread, a hand chalking large simple sums — a plus, a minus and a times sign with their own numbers — on a dark slate board propped against the wall, warm daylight through the open window and red dust outside',
  8: 'a wide Congolese landscape at golden hour seen from the top of a hill: a small whitewashed church with a wooden cross standing on the ridge, people hoeing a cassava field below, a broad river winding away between green hills, smoke rising from the roofs of a village further off, the whole world of the people spread out under a wide sky',
  9: 'a traditional Congolese healer\'s compound at dawn: bundles of dried herbs and bark hanging from the eaves, clay pots and a carved wooden bowl on a woven mat, a polished wooden carving of a human torso standing among them, soft misty morning light',
  12: 'a Congolese market trading table under a mango tree at mid-morning: neat heaps of groundnuts and cassava flour in woven baskets, an old brass balance scale with its weights, a trader\'s hands counting coins and folded notes into a tin, sacks of grain stacked behind, a loaded bicycle leaning nearby, red earth swept clean',
  13: 'a Congolese family garden at mid-morning: rows of cassava and green leafy vegetables in dark soil, a woman harvesting leaves into a wide woven basket, a man hoeing further down the row, a black cooking pot steaming on three stones beside the garden with vegetables being washed in a basin, banana plants, warm daylight',
  14: 'a red-earth road leaving a Congolese village in the early morning: thatched houses on either side, a stone well in the square with a woman drawing water, a man walking out along the road with a bundle on his head and a loaded bicycle beside him, a narrow log footbridge over a stream further off, green hills beyond',
  15: 'a Congolese family celebration in a swept compound in the afternoon: elders seated on low carved stools under a shade tree, women in bright printed cloth talking and laughing, a shared enamel bowl of food on a mat, two drums beside them, children watching from the edge, a thatched house behind',
  16: 'a Congolese village at play in bright daylight: children running and jumping on a swept dusty ground, a boy climbing a low tree, a girl carrying a small basin, a mother resting on a bench with a baby, a nurse in a white coat writing at a folding table under a mango tree with a first-aid tin and a jerrycan of clean water',
  17: 'a Congolese craftsmen\'s yard at mid-morning: a carpenter planing a plank on a bench with his hand tools laid in a row, a blacksmith at a charcoal forge with his hammer and glowing metal, a tailor bent over a treadle sewing machine under a thatched shelter, shavings and iron offcuts on the red earth',
  18: 'a wide Congolese valley under gathering rain clouds: a broad brown river winding between green hills, tall trees and palms on its banks, a herd of goats and a few cattle grazing, a small garden plot on the slope, heavy grey clouds with shafts of sunlight breaking through in the distance',
  19: 'two Congolese elders greeting one another warmly in a village compound in the morning: the younger man bowing slightly with both hands clasped as he offers a greeting, the older man smiling and answering him, a woman standing nearby with a basket, children listening from the doorway of a thatched hut, a swept red-earth courtyard',
  20: 'an evening gathering around a small fire in a Congolese village: an old man with a carved stick speaking, seated on a low stool, children and a few adults sitting close on a mat listening, faces lit warm orange by the flames, thatched roofs and a dark blue sky with the first stars behind them',
};

/** The one look every cover is drawn in: a real photograph of the real world, never a drawing. */
const LOOK =
  'Real documentary photograph of rural Congo, shot on 35mm film in natural light, photorealistic with ' +
  'true-to-life colour and sharp real-world detail, wide landscape composition, no text, no letters, no ' +
  'numbers, no logos, no watermark, no border, not an illustration, not a painting, not CGI';

/**
 * The look a season is drawn in, where it differs from the covers' own look. The season of the numbers
 * stands on a lesson of counting, so its own cover carries the very sums a student of that season works
 * out — the only cover of the set that does — while every other season is drawn with no number in it.
 */
const LOOKS: Record<number, string> = {
  7: 'Real documentary photograph of rural Congo, shot on 35mm film in natural light, photorealistic with true-to-life colour and sharp real-world detail, wide landscape composition, the chalked sums and the numbers beside them clear and readable across the board, no letters, no logos, no watermark, no border, not an illustration, not a painting, not CGI',
};

export default async function examSeasonCovers(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Only an admin may draw the season covers.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const asked = Array.isArray(body?.seasons) ? body.seasons : Object.keys(PLACES);
    const seasons = asked
      .map(Number)
      .filter((no: number) => PLACES[no])
      .slice(0, 20);
    if (!seasons.length) return Response.json({ error: 'No season was named.' }, { status: 400 });

    const { baseURL, token, headers } = base44.asServiceRole.aiGateway.connection();
    const client = new OpenAI({ baseURL, apiKey: token, defaultHeaders: headers, maxRetries: 0 });

    const drawn = [];
    for (const no of seasons) {
      const wanted = `${PLACES[no]}. ${LOOKS[no] || LOOK}`;
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