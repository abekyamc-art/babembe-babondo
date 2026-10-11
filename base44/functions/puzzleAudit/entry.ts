import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

/**
 * GLOIRE AI — reading the differences off a pair of 4K photographs that already stand.
 *
 * A prize puzzle is played on a pair of photographs drawn long ago, and the places that really change
 * between them are read here off the two pictures themselves. Each change the pair was drawn from is asked
 * about on its own — one question about one place is what a picture reader answers most truly, where five
 * at once is where a place gets mislaid — and the answer says both whether that change truly stands in the
 * second photograph and the exact box it stands in. Nothing is taken on trust from the plan a pair was
 * drawn from: a change that never came out in the picture is left out of it.
 *
 * Where the asked-for changes did not all come out, the pair is looked over once more for anything else
 * that truly differs, so a level still holds the number of places it asks for whenever the picture really
 * holds them.
 *
 * Nothing is drawn here: the photographs are kept exactly as they are.
 */
const share = (n: number) => Math.round(Math.max(0, Math.min(1, n)) * 10000) / 10000;

/** A touch area is never drawn smaller than this, or a finger has nothing to land on. */
const LEAST = 0.07;

/** The box a change stands in, as a share of the picture, drawn at least as large as a finger needs. */
function boxOf(one: any) {
  const x = Number(one?.x) / 1000;
  const y = Number(one?.y) / 1000;
  const w = Math.max(Number(one?.w) / 1000, LEAST);
  const h = Math.max(Number(one?.h) / 1000, LEAST);
  if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) return null;
  const grew = { x: x - (w - Number(one.w) / 1000) / 2, y: y - (h - Number(one.h) / 1000) / 2, w, h };
  const left = Math.max(0, Math.min(grew.x, 1 - w));
  const top = Math.max(0, Math.min(grew.y, 1 - h));
  return {
    x: share(left),
    y: share(top),
    w: share(w),
    h: share(h),
    label: String(one?.label || '').trim(),
    centre: [left + w / 2, top + h / 2] as [number, number],
  };
}

/** Whether two boxes stand on one and the same place — a change found twice, not two changes. */
function samePlace(one: any, two: any) {
  const [ax, ay] = one.centre;
  const [bx, by] = two.centre;
  return ax >= two.x - 0.02 && ax <= two.x + two.w + 0.02 && ay >= two.y - 0.02 && ay <= two.y + two.h + 0.02;
}

export default async function puzzleAudit(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Only an admin may read the prize pictures.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const asked = Array.isArray(body?.scenes) ? body.scenes : [];
    const list = asked.filter(
      (one: any) =>
        one?.scene &&
        typeof one?.base === 'string' &&
        typeof one?.changed === 'string' &&
        Array.isArray(one?.changes) &&
        one.changes.length
    );
    if (!list.length) return Response.json({ error: 'No pair of pictures was named.' }, { status: 400 });

    const out = [];
    for (const one of list) {
      const target = Math.min(10, Math.max(1, Number(one.target) || 5));

      // every change of the pair is asked about on its own, all of them at once
      const answers = await Promise.allSettled(
        one.changes.slice(0, 10).map((change: string) =>
          base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt:
              'Two photographs of one and the same scene stand here: the first is the original, and the ' +
              `second was edited from it to make this one change: ${change} Look at the two photographs and ` +
              'answer about that change and nothing else. First: is it truly visible in the second photograph ' +
              '(the change really came out in the picture), or is that place the same in both (only lighting, ' +
              'jpeg noise or a slight drift of the camera differs there)? Answer honestly: never say a change ' +
              'is visible when the two photographs look the same there. Then, if it is visible, where does ' +
              'it stand — a box around the changed object: x and y of its top-left corner, and its width w ' +
              'and its height h, all as whole numbers on a 1000 by 1000 grid laid over the WHOLE photograph, ' +
              'x from the left edge and y from the top edge, whatever the photograph\'s real pixel size is. ' +
              'For an object that was removed give its place in the first photograph; for an object that was ' +
              'added give its place in the second. Box that one object only, tightly around it — never ' +
              'several objects, never a whole region of the picture.',
            file_urls: [one.base, one.changed],
            response_json_schema: {
              type: 'object',
              properties: {
                visible: { type: 'boolean' },
                x: { type: 'number' },
                y: { type: 'number' },
                w: { type: 'number' },
                h: { type: 'number' },
                label: { type: 'string' },
              },
              required: ['visible'],
            },
          })
        )
      );

      const boxes: any[] = [];
      answers.forEach((answer: any, i: number) => {
        const said = answer?.status === 'fulfilled' ? answer.value : null;
        if (!said || said.visible !== true) return;
        const box = boxOf({ ...said, label: said.label || one.changes[i] });
        if (box && !boxes.some((held) => samePlace(box, held))) boxes.push(box);
      });

      // Where the asked-for changes did not all come out in the picture, the pair is looked over once more
      // for anything else that truly differs in it.
      if (boxes.length < target) {
        const named = boxes.map((box) => box.label).filter(Boolean).join('; ');
        const more = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt:
            'Two photographs of one and the same scene stand here: the first is the original, and the second ' +
            'was edited from it. These differences have already been found and are set aside: ' +
            `${named || 'none'} Find every OTHER clear, unmistakable difference between the two photographs ` +
            'that is not one of those. A change of lighting over the whole picture, jpeg noise, a slight ' +
            'drift of the camera, and anything you only suspect are not differences: leave them out. Give ' +
            'each one you truly see as a box around the changed object — x and y of its top-left corner and ' +
            'its width w and height h, whole numbers on a 1000 by 1000 grid laid over the WHOLE photograph, ' +
            'x from the left edge and y from the top edge, whatever the photograph\'s real pixel size is — ' +
            'with three or four plain words naming what the box holds. Answer with an empty list when ' +
            'nothing else truly differs.',
          file_urls: [one.base, one.changed],
          response_json_schema: {
            type: 'object',
            properties: {
              differences: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    x: { type: 'number' },
                    y: { type: 'number' },
                    w: { type: 'number' },
                    h: { type: 'number' },
                    label: { type: 'string' },
                  },
                  required: ['x', 'y', 'w', 'h', 'label'],
                },
              },
            },
            required: ['differences'],
          },
        });
        (more?.differences || []).forEach((said: any) => {
          const box = boxOf(said);
          if (box && !boxes.some((held) => samePlace(box, held))) boxes.push(box);
        });
      }

      const differences = boxes.slice(0, target + 3).map((box, i) => ({
        id: `${one.scene}-photo-${i + 1}`,
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        label: box.label || `Difference ${i + 1}`,
        ...(i >= target ? { extra: true } : {}),
      }));

      out.push({
        scene: one.scene,
        asked: one.changes.length,
        target,
        found: differences.length,
        differences,
      });
    }

    return Response.json({ scenes: out });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}