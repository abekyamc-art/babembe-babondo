import OpenAI from 'npm:openai@6.45.0';

export async function photoPuzzle(base44, scene, body) {
  const ownMedia = 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/';
  const base = String(body.base || '');
  const target = Number(body.target || scene.changes.length);
  if (!base.startsWith(ownMedia) || ![5, 7, 10].includes(target)) throw new Error('Invalid photo puzzle request.');
  const { baseURL, token, headers } = base44.asServiceRole.aiGateway.connection();
  const client = new OpenAI({ baseURL, apiKey: token, defaultHeaders: headers, maxRetries: 0 });
  const count = target + 2;
  const reuse = typeof body.changed === 'string' && body.changed.startsWith(ownMedia);
  const edited = reuse ? { data: [{ url: body.changed }], usage: { base44_credits: 0 } } : await client.images.generate({
    model: 'automatic', resolution: '4K', aspect_ratio: '16:9', output_format: 'jpeg', quality: 'auto', response_format: 'url', n: 1,
    reference_image_urls: [base],
    prompt: `Edit this exact photograph into a spot-the-difference puzzle. Preserve its photographic realism, camera angle, framing, lighting and all untouched pixels as closely as possible. Make exactly ${count} large, unmistakable, widely separated edits. Include changing one person's clothing colour, removing one person with natural background restoration, adding a realistic dog, and adding either a realistic cat or cow where appropriate. Remaining changes can remove a basket, change a boat or vehicle colour, add a bird, or alter another clearly visible object. Each edit must be one independent object in its own position; no overlapping edits. Subjects must be large enough to recognise at phone size, not tiny dots. Natural fur, cloth textures, perspective, contact shadows and realistic scale. No cartoons, drawings, stickers, flat icons, outlines, circles, highlights, text or markers. Keep this a sharp true 4K photographic image.`,
  });
  const changed = edited.data?.[0]?.url;
  if (!changed) throw new Error('The edited photograph was not returned.');
  const audit = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Compare these two photographs, first original and second edited. Locate every clear independent object difference actually visible. Do not infer requested changes. Ignore JPEG noise and tiny texture drift. Use a 1000-by-1000 coordinate grid for each whole image (independently of its actual pixel dimensions). Return top-left x,y and width w,height h as integers from 0 to 1000 around the object in either photo (union if removed or added). Each box must match one distinguishable object, not a whole grid cell or multiple nearby objects. Give a factual short label and what is visibly present in each image. Need at least ${target} genuine, clear differences; if fewer exist return only those you can see.`,
    file_urls: [base, changed],
    response_json_schema: { type: 'object', properties: { differences: { type: 'array', items: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, w: { type: 'number' }, h: { type: 'number' }, label: { type: 'string' }, first: { type: 'string' }, second: { type: 'string' } }, required: ['x','y','w','h','label','first','second'] } } }, required: ['differences'] },
  });
  const measured = audit.differences.map((d) => ({ ...d, x: d.x / 1000, y: d.y / 1000, w: d.w / 1000, h: d.h / 1000 }));
  const seen = measured.filter((d) => [d.x,d.y,d.w,d.h].every(Number.isFinite) && d.x >= 0 && d.y >= 0 && d.w > 0 && d.h > 0 && d.x + d.w <= 1.01 && d.y + d.h <= 1.01);
  if (seen.length < target) {
    return { error: `Only ${seen.length} clear differences found; photo was not installed.`, changed, base, audit };
  }
  const differences = seen.slice(0, count).map((d, i) => ({ ...d, w: Math.min(d.w, 1-d.x), h: Math.min(d.h, 1-d.y), id: `${scene.name}-photo-${i+1}`, extra: i >= target }));
  return { scene: scene.name, base, changed, differences, target, resolution: '4K', credits: edited.usage?.base44_credits || 0 };
}