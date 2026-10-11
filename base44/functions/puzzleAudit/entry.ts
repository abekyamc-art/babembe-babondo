import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import jpeg from 'npm:jpeg-js@0.4.4';
import pngjs from 'npm:pngjs@7.0.0';
import { puzzleAuditCrop } from '../../shared/puzzleAuditCrop.ts';

/**
 * GLOIRE AI — the places of one prize pair, read from the two photographs themselves.
 *
 * A prize puzzle is played on a pair of photographs drawn long ago, and every touch area of it is found
 * here — not guessed at, and not taken on trust from the plan the pair was drawn from. One pair is read
 * per call, and each place is settled twice over:
 *
 *   · the two photographs are compared pixel by pixel, part by part. The very pixels that moved are where
 *     the picture changed, and a run of them that stands together, moves clearly, and stands as a compact
 *     shape rather than a thin smear of drift, is one place — so a touch area always stands on a change
 *     that is truly in the picture, and never on a place where the light merely shifted.
 *   · every place the pixels found is then looked at by eye, in the two photographs, and named: what stood
 *     there in the original, what stands there in the edited copy, and whether those two really differ. A
 *     place that only drifted is thrown out here, so nothing faint is ever asked for.
 *
 * The level then asks only for the places its own picture truly holds. Nothing is drawn or re-drawn here:
 * the photographs stand exactly as they are.
 */
const share = (n: number) => Math.round(Math.max(0, Math.min(1, n)) * 10000) / 10000;

/** A touch area is never drawn smaller than this, or a finger has nothing to land on. */
const LEAST = 0.07;

/** Nor wider or taller than this, or it reaches across into what stands beside the change. */
const MOST = 0.24;

/** The pictures are compared in this many parts across and down. */
const ACROSS = 256;
const DOWN = 144;

/** A part is only taken for changed when its colour truly moves by this much. */
const TRULY = 22;

/** A change this small, this faint, this loose a shape, or this big is drift of the light — not a change. */
const LEAST_BLOCKS = 25;
const LEAST_STRENGTH = 32;
const LEAST_PACKED = 0.28;
const MOST_AREA = 0.06;

type Picture = { width: number; height: number; data: Uint8Array };

/**
 * A small copy of the same photograph, asked of the picture service. Two copies of a pair are opened
 * together and held in the hand at once, and a pair read at full size is far larger than the reading
 * needs: the places are found part by part, and every part is a few pixels of the small copy anyway.
 */
function small(url: string) {
  try {
    const at = new URL(url);
    if (at.hostname !== 'media.base44.com' && at.hostname !== 'static.wixstatic.com') return url;
    const cut = at.pathname.match(/^(.*?)\/v1\/(?:fill|fit)\//i);
    const basePath = cut ? cut[1] : at.pathname;
    const name = basePath.split('/').pop() || 'picture';
    const outName = `${name.replace(/\.[a-z0-9]+$/i, '')}.jpg`;
    return `${at.origin}${basePath}/v1/fit/w_1600,h_1600,q_92,enc_jpg/${outName}`;
  } catch {
    return url;
  }
}

/** One of the pair, opened as plain colour. */
async function open(url: string): Promise<Picture> {
  const address = small(url);
  const res = await fetch(address, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`A photograph of the pair could not be opened (${res.status}).`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const kind = res.headers.get('content-type') || address;
  if (/\.png$/i.test(kind)) {
    const png = pngjs.PNG.sync.read(Buffer.from(bytes));
    return { width: png.width, height: png.height, data: new Uint8Array(png.data) };
  }
  const photo = jpeg.decode(bytes, { useTArray: true });
  return { width: photo.width, height: photo.height, data: photo.data as Uint8Array };
}

/** The picture read down to one colour for each of its parts, so the two can be held together. */
function blocks(picture: Picture) {
  const blockW = picture.width / ACROSS;
  const blockH = picture.height / DOWN;
  const out = new Float64Array(ACROSS * DOWN * 3);
  for (let by = 0; by < DOWN; by += 1) {
    const y0 = Math.floor(by * blockH);
    const y1 = Math.max(y0 + 1, Math.floor((by + 1) * blockH));
    for (let bx = 0; bx < ACROSS; bx += 1) {
      const x0 = Math.floor(bx * blockW);
      const x1 = Math.max(x0 + 1, Math.floor((bx + 1) * blockW));
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const i = (y * picture.width + x) * 4;
          r += picture.data[i];
          g += picture.data[i + 1];
          b += picture.data[i + 2];
          n += 1;
        }
      }
      const at = (by * ACROSS + bx) * 3;
      out[at] = r / n;
      out[at + 1] = g / n;
      out[at + 2] = b / n;
    }
  }
  return out;
}

/** How far each part moved between the two, with the whole picture's own drift of light taken off it. */
function movement(one: Float64Array, two: Float64Array) {
  let dr = 0;
  let dg = 0;
  let db = 0;
  for (let i = 0; i < one.length; i += 3) {
    dr += two[i] - one[i];
    dg += two[i + 1] - one[i + 1];
    db += two[i + 2] - one[i + 2];
  }
  const parts = one.length / 3;
  dr /= parts;
  dg /= parts;
  db /= parts;
  const out = new Float64Array(ACROSS * DOWN);
  for (let i = 0, j = 0; i < one.length; i += 3, j += 1) {
    out[j] =
      (Math.abs(two[i] - one[i] - dr) +
        Math.abs(two[i + 1] - one[i + 1] - dg) +
        Math.abs(two[i + 2] - one[i + 2] - db)) /
      3;
  }
  return out;
}

/** The places the picture truly changed in: each run of moved parts that stands as a change. */
function places(moved: Float64Array) {
  const taken = new Uint8Array(ACROSS * DOWN);
  const out: any[] = [];
  for (let i = 0; i < ACROSS * DOWN; i += 1) {
    if (taken[i] || moved[i] < TRULY) continue;
    const stack = [i];
    taken[i] = 1;
    let x0 = ACROSS;
    let x1 = -1;
    let y0 = DOWN;
    let y1 = -1;
    let sum = 0;
    let n = 0;
    while (stack.length) {
      const at = stack.pop() as number;
      const x = at % ACROSS;
      const y = (at - x) / ACROSS;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
      sum += moved[at];
      n += 1;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= ACROSS || ny >= DOWN) continue;
          const next = ny * ACROSS + nx;
          if (!taken[next] && moved[next] >= TRULY) {
            taken[next] = 1;
            stack.push(next);
          }
        }
      }
    }
    const w = (x1 - x0 + 1) / ACROSS;
    const h = (y1 - y0 + 1) / DOWN;
    const strength = sum / n;
    const packed = n / ((x1 - x0 + 1) * (y1 - y0 + 1));
    if (n < LEAST_BLOCKS) continue;
    if (strength < LEAST_STRENGTH) continue;
    if (packed < LEAST_PACKED) continue;
    if (w * h > MOST_AREA) continue;
    out.push({
      x: x0 / ACROSS,
      y: y0 / DOWN,
      w,
      h,
      blocks: n,
      strength: Math.round(strength),
      centre: [x0 / ACROSS + w / 2, y0 / DOWN + h / 2] as [number, number],
    });
  }
  return out.sort((one, two) => two.strength - one.strength);
}

/** The touch area drawn round a place the pixels found: room for a finger, never more than the change. */
function area(place: any) {
  const width = Math.min(MOST, Math.max(LEAST, place.w + 0.012));
  const height = Math.min(MOST, Math.max(LEAST, place.h + 0.012));
  const left = Math.max(0, Math.min(place.centre[0] - width / 2, 1 - width));
  const top = Math.max(0, Math.min(place.centre[1] - height / 2, 1 - height));
  return {
    x: share(left),
    y: share(top),
    w: share(width),
    h: share(height),
  };
}

export default async function puzzleAudit(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Only an admin may read the prize pictures.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const pair = body?.pair;
    if (!pair?.scene || typeof pair?.base !== 'string' || typeof pair?.changed !== 'string') {
      return Response.json({ error: 'One pair of pictures was not named.' }, { status: 400 });
    }
    const ownMedia = 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/';
    if (![pair.base, pair.changed].every((url) => url.startsWith(ownMedia)) || !/^[a-z]+$/.test(pair.scene)) {
      return Response.json({ error: 'Only this game’s own photograph pairs can be audited.' }, { status: 400 });
    }
    const target = Math.min(10, Math.max(1, Number(pair.target) || 5));

    // ── what the pictures themselves hold ────────────────────────────────────────────────────────────
    const first = await open(pair.base);
    const firstBlocks = blocks(first);
    const second = await open(pair.changed);
    if (first.width !== second.width || first.height !== second.height) {
      return Response.json(
        { error: 'The two photographs are not the same size, so their places cannot be held together.' },
        { status: 422 }
      );
    }
    const found = places(movement(firstBlocks, blocks(second)));

    // Verify each measured region independently; never assign a label from the requested edit plan.
    const differences = [];
    const candidates = found.slice(0, 24);
    for (let start = 0; start < candidates.length; start += 4) {
      const batch = candidates.slice(start, start + 4);
      const looked = await Promise.allSettled(batch.map(async (place) => {
        const at = area(place);
        const cropUrl = await puzzleAuditCrop(base44, first, second, at);
        const seen = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: 'This image contains TWO tightly cropped views side by side: original on LEFT, edited on RIGHT. Compare only what is actually visible here. Return differs=true only for a clearly identifiable object that was added, removed, or recolored. Ignore lighting shifts, texture, JPEG noise and tiny geometric drift. If uncertain or no identifiable object differs, return false. Describe the left view in first, right view in second, and the actual object change in label. Never infer an object outside these crops.',
          file_urls: [cropUrl],
          response_json_schema: {
            type: 'object',
            properties: { first: { type: 'string' }, second: { type: 'string' }, differs: { type: 'boolean' }, label: { type: 'string' } },
            required: ['first', 'second', 'differs', 'label'],
          },
        });
        return seen?.differs === true && seen.label?.trim()
          ? { ...at, label: seen.label.trim() }
          : null;
      }));
      if (looked.some((result) => result.status === 'rejected')) {
        throw new Error('A picture region could not be verified; no partial audit was returned.');
      }
      for (const result of looked) {
        if (result.status === 'fulfilled' && result.value) differences.push(result.value);
      }
    }

    const written = differences.map((one, i) => ({
      id: `${pair.scene}-photo-${i + 1}`,
      x: one.x,
      y: one.y,
      w: one.w,
      h: one.h,
      label: one.label,
      ...(i >= target ? { extra: true } : {}),
    }));

    return Response.json({
      scene: pair.scene,
      target,
      places: found.length,
      found: written.length,
      differences: written,
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}