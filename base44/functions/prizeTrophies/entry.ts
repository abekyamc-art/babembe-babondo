import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import OpenAI from 'npm:openai@6.45.0';
import { geminiImage, DRAW_BIG } from '../../shared/gemini.ts';

/** The least side a trophy card is accepted at: a full card, or the app's own picture service draws it. */
const LEAST_4K = 3000;

/**
 * The season trophies of the examination, drawn as 4K pictures of shiny 3D gold cups.
 *
 * One trophy stands for each season, and each is drawn on that season's own idea, so no two of them are
 * the same cup. The pictures are drawn once and their addresses are kept beside the examination, so the
 * prize shelf opens instantly and draws nothing while a student is looking at it.
 */

/** Each season's own idea, worked into its cup. */
const MOTIFS = {
  1: 'a golden speech bubble with a friendly talking mouth, and a rising sun behind it, engraved on the cup',
  2: 'a golden heart with a heartbeat pulse line running across it, engraved on the cup',
  3: 'a golden globe wrapped in an open book, engraved on the cup',
  4: 'golden plus, minus, multiply and divide symbols engraved around the cup',
  5: 'a golden star above a vintage studio microphone, engraved on the cup',
  6: 'a golden abacus beside balanced scales, engraved on the cup',
  7: 'a golden lantern with small sparks of light, engraved on the cup',
  8: 'a golden laurel wreath crowned with a small crown, engraved on the cup',
  9: 'a golden laurel branch beside a stylised standing figure, engraved on the cup',
};

/** The one look every trophy is drawn in, so the whole shelf stands as one set. */
const LOOK =
  'photorealistic ultra-detailed 3D render, gleaming polished gold with rich specular highlights, ' +
  'standing on a dark navy-black pedestal, deep navy-black background (#0b1020) with a soft warm ' +
  'golden glow behind it, dramatic studio lighting, centred composition with generous space around ' +
  'the trophy, no text, no letters, no numbers, no logos, no watermark, no people';

export default async function prizeTrophies(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Only an admin may draw the prizes.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const asked = Array.isArray(body?.seasons) ? body.seasons : Object.keys(MOTIFS);
    const seasons = asked
      .map(Number)
      .filter((no) => MOTIFS[no])
      .slice(0, 9);
    if (!seasons.length) return Response.json({ error: 'No season was named.' }, { status: 400 });

    const { baseURL, token, headers } = base44.asServiceRole.aiGateway.connection();
    const client = new OpenAI({ baseURL, apiKey: token, defaultHeaders: headers, maxRetries: 0 });

    const drawn = [];
    for (const no of seasons) {
      const wanted = `A shiny 3D gold trophy cup for season ${no} of a Kibembe language examination, with ${MOTIFS[no]}. ${LOOK}`;
      // the trophies' own account draws first, and a card smaller than a full card is refused, so the
      // app's own picture service draws it instead — a trophy is never quietly hung on a small card
      let url = '';
      let credits = 0;
      try {
        url = await geminiImage({
          base44,
          group: 'trophies',
          model: DRAW_BIG,
          prompt: wanted,
          aspect: '3:4',
          imageSize: '4K',
          least: LEAST_4K,
        });
      } catch (error: any) {
        console.error('A trophy was not drawn on its own account:', error?.message);
      }
      if (!url) {
        const { data, usage } = await client.images.generate({
          model: 'automatic',
          prompt: wanted,
          n: 1,
          response_format: 'url',
          aspect_ratio: '3:4',
          resolution: '4K',
        });
        url = data?.[0]?.url || '';
        credits = usage?.base44_credits || 0;
      }
      drawn.push({ season: no, url: url || null, credits });
    }

    return Response.json({ trophies: drawn });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}