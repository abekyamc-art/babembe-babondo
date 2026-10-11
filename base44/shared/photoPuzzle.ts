import OpenAI from 'npm:openai@6.45.0';
import { photoPuzzleAreas } from './photoPuzzleAreas.ts';
import { geminiText, geminiImage, DRAW_BIG } from './gemini.ts';

/** The least side a prize photograph is accepted at: a true 4K photograph, or the app draws it itself. */
const LEAST_4K = 3000;

/**
 * GLOIRE AI — one 4K photograph turned into a spot-the-difference puzzle.
 *
 * The changes are decided before anything is drawn: the photograph itself is read first, and the exact
 * places to change are named — what stands there, and what should stand there instead. The edit is then
 * asked for by name, one numbered change at a time, so the picture that comes back carries the changes a
 * level asks for in the places they were chosen. An edit asked for blindly comes back with far fewer
 * changes than a level needs.
 *
 * What was really changed is then read back off the pair of photographs, never assumed from what was
 * asked for, so every touch area of the level stands exactly where the picture changes.
 */
export async function photoPuzzle(base44, scene, body) {
  const ownMedia = 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/';
  const base = String(body.base || '');
  const target = Number(body.target || scene.changes.length);
  if (!base.startsWith(ownMedia) || ![5, 7, 10].includes(target)) throw new Error('Invalid photo puzzle request.');
  const { baseURL, token, headers } = base44.asServiceRole.aiGateway.connection();
  const client = new OpenAI({ baseURL, apiKey: token, defaultHeaders: headers, maxRetries: 0 });
  // a change or two is always lost on the way — a small one goes unnoticed, two near each other read as
  // one — so a couple more are asked for than the level needs, and the ones really there are what install
  const reuse = typeof body.changed === 'string' && body.changed.startsWith(ownMedia);
  const supplement = reuse && body.addObjects === true;
  const count = supplement ? 3 : target + 6;
  const source = supplement ? body.changed : base;

  // Which places to change is read off the photograph itself, so the edits can be asked for by name.
  const plan = reuse && !supplement ? null : await geminiText({
    base44,
    group: "pictures",
    prompt: supplement ? `Look at this photograph. Plan exactly THREE ADDED realistic large objects in separate empty foreground spaces. Choose three distinct objects NOT already present in this photograph from: a large red jerrycan, a yellow woven hat, a blue fishing bucket, a green watering can, a white sack, a wooden stool, a purple travel bag, an orange pumpkin, or a brass cooking pot. Each must be clearly recognisable on a phone, widely separated and not overlap any existing person, animal, flowers, bridge, basket, or crate. Preserve everything else. Give x,y on a 1000 by 1000 whole-photo grid, label, instruction for each. No removals or recolouring.` : `Look at this photograph and plan a spot-the-difference puzzle to be made from it. Choose exactly ${count} changes, each one a large, unmistakable, clearly visible object that can be added, removed or altered while the photograph keeps its own realism, its camera angle and its light. Every change must stand in its own place, well apart from the others, and be big enough to recognise on a phone. Among them choose: one person whose clothing is turned to a bright contrasting colour, one person taken out of the picture with what stands behind them left in their place, one realistic dog added where a dog could truly stand, and either a realistic cat or a cow added. Use a 1000-by-1000 grid laid over the whole photograph, left to right and top to bottom, whatever its real pixel size is; give each change its own x and y as whole numbers from 0 to 1000 — the very point the change stands at. Give each change a short label and one clear sentence saying exactly what is to change there. Nothing drawn, nothing cartoon: photographic edits only.`,
    file_urls: [source],
    response_json_schema: {
      type: 'object',
      properties: {
        edits: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              label: { type: 'string' },
              instruction: { type: 'string' },
            },
            required: ['x', 'y', 'label', 'instruction'],
          },
        },
      },
      required: ['edits'],
    },
  });

  const edits = (plan?.edits || []).filter((edit) => Number.isFinite(edit.x) && Number.isFinite(edit.y));
  const wanted = edits
    .map(
      (edit, i) =>
        `${i + 1}. At about x ${Math.round(edit.x)}, y ${Math.round(edit.y)} (of 1000, left to right and top to bottom): ${edit.instruction}`
    )
    .join('\n');
  const style = `Subjects must be large enough to recognise at phone size, not tiny dots. Natural fur, cloth textures, perspective, contact shadows and realistic scale. No cartoons, drawings, stickers, flat icons, outlines, circles, highlights, text or markers. Keep this a sharp true 4K photographic image.`;
  const prompt = wanted
    ? `Edit this exact photograph into a spot-the-difference puzzle. Preserve its photographic realism, camera angle, framing, lighting and every untouched pixel as closely as possible. Make exactly these ${edits.length} changes, each one large, unmistakable and far from the others:\n${wanted}\n${style}`
    : `Edit this exact photograph into a spot-the-difference puzzle. Preserve its photographic realism, camera angle, framing, lighting and every untouched pixel as closely as possible. Make exactly ${count} large, unmistakable, widely separated edits, including one person's clothing turned to a bright contrasting colour, one person removed with what stands behind them left in their place, one realistic dog added, and either a realistic cat or a cow added. ${style}`;

  // The puzzle's own account draws the edited copy first, and it must come back a true 4K photograph: a
  // picture smaller than that is refused here and the app's own 4K picture service draws it instead, so a
  // level is never quietly played on a small picture.
  let changed = reuse && !supplement ? String(body.changed || '') : '';
  let credits = 0;
  if (!changed) {
    try {
      changed = await geminiImage({
        base44,
        group: 'puzzledraw',
        model: DRAW_BIG,
        prompt,
        reference_urls: [source],
        aspect: '16:9',
        imageSize: '4K',
        least: LEAST_4K,
      });
    } catch (error: any) {
      console.error("The puzzle's edited copy was not drawn on its own account:", error?.message);
    }
  }
  if (!changed) {
    const edited = await client.images.generate({
      model: 'seedream_5_0_lite',
      output_format: 'jpeg',
      quality: 'auto',
      resolution: '4K',
      aspect_ratio: '16:9',
      response_format: 'url',
      n: 1,
      reference_image_urls: [source],
      prompt,
    });
    changed = edited.data?.[0]?.url || '';
    credits = edited.usage?.base44_credits || 0;
  }
  if (!changed) throw new Error('The edited photograph was not returned.');

  const audit = await geminiText({
    base44,
    group: "pictures",
    prompt: `Compare these two photographs, first original and second edited. Locate every clear independent object difference actually visible. Do not infer requested changes. Ignore JPEG noise, tiny texture drift, lens flare and global lighting changes; these are not object differences. Use a 1000-by-1000 coordinate grid for each whole image (independently of its actual pixel dimensions). Return top-left x,y and width w,height h as integers from 0 to 1000 around the object in either photo (union if removed or added). Each box must match one distinguishable object, not a whole grid cell or multiple nearby objects. Give a factual short label and what is visibly present in each image. Need at least ${target + 3} genuine, clear differences so the player can find ${target} and leave three; if fewer exist return only those you can see.`,
    file_urls: [base, changed],
    response_json_schema: { type: 'object', properties: { differences: { type: 'array', items: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, w: { type: 'number' }, h: { type: 'number' }, label: { type: 'string' }, first: { type: 'string' }, second: { type: 'string' } }, required: ['x','y','w','h','label','first','second'] } } }, required: ['differences'] },
  });

  const checked = await photoPuzzleAreas(base44, base, changed, audit.differences.slice(0, target + 6));
  const measured = checked.map((d) => ({ ...d, x: d.x / 1000, y: d.y / 1000, w: d.w / 1000, h: d.h / 1000 }));
  const seen = measured.filter((d) => [d.x,d.y,d.w,d.h].every(Number.isFinite) && d.x >= 0 && d.y >= 0 && d.w > 0 && d.h > 0 && d.x + d.w <= 1.01 && d.y + d.h <= 1.01);
  if (seen.length < target + 3) {
    return { error: `Only ${seen.length} clear differences found; need ${target + 3} including three extras. Photo was not installed.`, changed, base, audit };
  }
  const differences = seen.map((d, i) => ({ ...d, w: Math.min(d.w, 1-d.x), h: Math.min(d.h, 1-d.y), id: `${scene.name}-photo-${i+1}`, extra: i >= target }));
  return { scene: scene.name, base, changed, differences, target, resolution: '4K', credits };
}