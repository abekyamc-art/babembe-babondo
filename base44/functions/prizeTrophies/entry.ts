import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { geminiImage, DRAW_BIG } from '../../shared/gemini.ts';
import { replicateImage } from '../../shared/replicate.ts';

/** The least side a trophy card is accepted at: a full card, or the Replicate account draws it instead. */
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

/**
 * The idea a season's cup is drawn on where none of its own is written: a plain banded cup, so a cup can
 * be drawn for every season the examination is numbered for.
 */
function motifOf(no) {
  return MOTIFS[no] || 'three slim engraved laurel bands around the cup, plain and elegant';
}

/** How many seasons the examination is numbered for: a cup may be drawn for each of them. */
const MOST_SEASONS = 96;

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
    const seasons = [...new Set(asked.map(Number))]
      .filter((no) => Number.isInteger(no) && no >= 1 && no <= MOST_SEASONS)
      .slice(0, 12);
    if (!seasons.length) return Response.json({ error: 'No season was named.' }, { status: 400 });

    const drawn = [];
    for (const no of seasons) {
      const wanted = `A shiny 3D gold trophy cup for season ${no} of a Kibembe language examination, with ${motifOf(no)}. ${LOOK}`;
      // the trophies' own account draws first, and a card smaller than a full card is refused, so the
      // owner's own Replicate account draws it instead — a trophy is never quietly hung on a small card
      let url = '';
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
      if (!url) url = await replicateImage({ base44, prompt: wanted, aspect: '3:4' });
      drawn.push({ season: no, url: url || null, credits: 0 });
    }

    return Response.json({ trophies: drawn });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}