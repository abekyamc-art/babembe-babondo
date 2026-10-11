import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { geminiImage, DRAW_BIG } from '../../shared/gemini.ts';

/** The least side a trophy card is accepted at: a full card, or the Replicate account draws it instead. */
const LEAST_4K = 3000;

/** The Replicate account's own picture model, and how long one trophy is waited for. */
const REPLICATE_MODEL = 'black-forest-labs/flux-1.1-pro-ultra';
const REPLICATE_WAIT = 90000;

/**
 * One trophy drawn on the owner's own Replicate account, paid out of that account's own allowance rather
 * than the app's credits. A drawing that is still being made when the request comes back is waited on a
 * little at a time, and the address of the finished picture is what comes back.
 */
async function viaReplicate(prompt: string, aspect: string): Promise<string> {
  const token = secrets.get('REPLICATE_API_TOKEN');
  if (!token) throw new Error('The Replicate account is not set (REPLICATE_API_TOKEN).');

  const res = await fetch(`https://api.replicate.com/v1/models/${REPLICATE_MODEL}/predictions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'wait=60',
    },
    body: JSON.stringify({
      input: { prompt, aspect_ratio: aspect, output_format: 'jpg', safety_tolerance: 2 },
    }),
    signal: AbortSignal.timeout(REPLICATE_WAIT),
  });
  const answer = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`The Replicate account answered ${res.status}. ${String(answer?.detail || '').slice(0, 200)}`);
  }

  let held = answer;
  for (let tries = 0; tries < 10 && held?.status && !['succeeded', 'failed', 'canceled'].includes(held.status); tries += 1) {
    await new Promise((rest) => setTimeout(rest, 3000));
    const again = await fetch(held.urls?.get, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30000),
    });
    held = await again.json().catch(() => held);
  }

  if (held?.status === 'failed' || held?.status === 'canceled') {
    throw new Error(`The Replicate account did not draw the picture: ${String(held?.error || '').slice(0, 200)}`);
  }

  const out = Array.isArray(held?.output) ? held.output[0] : held?.output;
  const url = typeof out === 'string' ? out : '';
  if (!url) throw new Error('The Replicate account returned no picture.');
  return url;
}

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

    const drawn = [];
    for (const no of seasons) {
      const wanted = `A shiny 3D gold trophy cup for season ${no} of a Kibembe language examination, with ${MOTIFS[no]}. ${LOOK}`;
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
      if (!url) url = await viaReplicate(wanted, '3:4');
      drawn.push({ season: no, url: url || null, credits: 0 });
    }

    return Response.json({ trophies: drawn });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}