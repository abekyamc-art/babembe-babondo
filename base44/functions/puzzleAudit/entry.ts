import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

/**
 * GLOIRE AI — reading the places of one prize pair, one pair at a time.
 *
 * A prize puzzle is played on a pair of photographs drawn long ago, and the places that truly differ
 * between them are read here off the two pictures themselves — never taken on trust from the plan the
 * pair was drawn from. One pair is read per call, and every change of that pair is read twice, in two
 * different ways at once:
 *
 *   · a box around the changed object, and
 *   · the one centre point where the change stands.
 *
 * Two readings of one place that land in the same spot confirm each other, and the touch area is then
 * drawn around that spot — never larger than a change and never smaller than a finger. Where the two
 * readings disagree, the pair is asked about that one place a third time before anything is written
 * down. Where a change never came out in the picture at all, both readings say so and it is left out:
 * the level then asks only for the places its own picture truly holds.
 *
 * Nothing is drawn here and nothing is re-drawn: the photographs stand exactly as they are.
 */
const share = (n: number) => Math.round(Math.max(0, Math.min(1, n)) * 10000) / 10000;

/** A touch area is never drawn smaller than this, or a finger has nothing to land on. */
const LEAST = 0.07;

/** Nor wider than this, or it starts covering what stands beside the change. */
const MOST = 0.24;

/** Two readings this close stand on the very same place. */
const AGREE = 0.06;

/** A box of the named size, kept inside the picture and built round the named centre. */
function area(cx: number, cy: number, w: number, h: number) {
  const hold = (n: number) => Math.max(LEAST, Math.min(MOST, n));
  const width = hold(Number.isFinite(w) && w > 0 ? w : LEAST);
  const height = hold(Number.isFinite(h) && h > 0 ? h : LEAST);
  const left = Math.max(0, Math.min(cx - width / 2, 1 - width));
  const top = Math.max(0, Math.min(cy - height / 2, 1 - height));
  return {
    x: share(left),
    y: share(top),
    w: share(width),
    h: share(height),
    centre: [left + width / 2, top + height / 2] as [number, number],
  };
}

/** How far apart two readings stand. */
function apart(one: [number, number], two: [number, number]) {
  return Math.hypot(one[0] - two[0], one[1] - two[1]);
}

export default async function puzzleAudit(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Only an admin may read the prize pictures.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const one = body?.pair;
    if (
      !one?.scene ||
      typeof one?.base !== 'string' ||
      typeof one?.changed !== 'string' ||
      !Array.isArray(one?.changes) ||
      !one.changes.length
    ) {
      return Response.json({ error: 'One pair of pictures was not named.' }, { status: 400 });
    }

    const target = Math.min(10, Math.max(1, Number(one.target) || 5));
    const changes = one.changes.slice(0, 10).map((change: any) => String(change || '').trim());
    const pair = [one.base, one.changed];

    const ask = (prompt: string, properties: any, required: string[]) =>
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        file_urls: pair,
        response_json_schema: { type: 'object', properties, required },
      });

    // The box reading: where the changed object stands, and what stands at that spot in each picture.
    const boxPrompt = (change: string) =>
      'Two photographs of one and the same scene stand here: the first is the original, and the second ' +
      `was edited from it to make this one change: ${change} Answer about that one change and nothing ` +
      'else. Look carefully: is the change truly VISIBLE between the two photographs, or is that place the ' +
      'same in both (only lighting, jpeg noise or a slight drift of the camera)? Never say a change is ' +
      'visible when the two photographs look the same there. Then, if it is visible, give a box tightly ' +
      'around the changed object alone: x and y of its top-left corner, its width w and its height h, as ' +
      'whole numbers on a 1000 by 1000 grid laid over the WHOLE photograph, x from the left edge and y from ' +
      'the top edge, whatever the photograph\'s real pixel size is. An object that was removed stands in the ' +
      'first photograph; an object that was added or altered stands in the second. Box that single object — ' +
      'never several objects together and never a whole region of the picture.';

    // The centre reading: the one point the change stands at, told in another way, so the two answers
    // can be held against one another.
    const centrePrompt = (change: string) =>
      'Two photographs of one and the same scene stand here: the first is the original, and the second ' +
      `was edited from it to make this one change: ${change} Look at the two photographs and answer about ` +
      'that one change only. Is that place the same in both photographs (only lighting, jpeg noise or a ' +
      'slight drift of the camera differ there) — or is it truly different? If it is truly different, give ' +
      'the very centre point of the changed object as two whole numbers on a 1000 by 1000 grid laid over the ' +
      'WHOLE photograph: cx across from the left edge, cy down from the top edge, whatever the photograph\'s ' +
      'real pixel size is. Then name, in three or four plain words each, what stands at that very point in ' +
      'the first photograph and what stands there in the second.';

    const boxSchema = {
      properties: {
        visible: { type: 'boolean' },
        x: { type: 'number' },
        y: { type: 'number' },
        w: { type: 'number' },
        h: { type: 'number' },
        at: { type: 'string' },
      },
      required: ['visible'],
    };
    const centreSchema = {
      properties: {
        same: { type: 'boolean' },
        cx: { type: 'number' },
        cy: { type: 'number' },
        first: { type: 'string' },
        second: { type: 'string' },
      },
      required: ['same'],
    };

    const read = await Promise.allSettled(
      changes.map(async (change: string) => {
        const [boxedAny, centredAny] = await Promise.all([
          ask(boxPrompt(change), boxSchema.properties, boxSchema.required),
          ask(centrePrompt(change), centreSchema.properties, centreSchema.required),
        ]);
        const boxed = boxedAny || {};
        const centred = centredAny || {};

        const boxCentre: [number, number] = [Number(boxed.x) / 1000, Number(boxed.y) / 1000];
        const boxSize = [Number(boxed.w) / 1000, Number(boxed.h) / 1000];
        const hasBox =
          boxed.visible === true && [boxCentre[0], boxCentre[1], boxSize[0], boxSize[1]].every(Number.isFinite);
        const centrePoint: [number, number] | null =
          centred.same === false && Number.isFinite(Number(centred.cx)) && Number.isFinite(Number(centred.cy))
            ? [Number(centred.cx) / 1000, Number(centred.cy) / 1000]
            : null;

        // both readings must see the change for it to stand in the pair
        if (!hasBox && !centrePoint) {
          return { change, stands: false, why: 'both readings found that place unchanged' };
        }

        // where the two readings of one place disagree, that one place is asked about once more
        if (hasBox && !centrePoint) {
          const again = await ask(boxPrompt(`${change}. One reading placed it near x ${Math.round(
            boxCentre[0] * 1000
          )}, y ${Math.round(boxCentre[1] * 1000)}.`), boxSchema.properties, boxSchema.required);
          const said = again || {};
          if (said.visible !== true) {
            return { change, stands: false, why: 'the second look found that place unchanged' };
          }
          const againCentre: [number, number] = [Number(said.x) / 1000, Number(said.y) / 1000];
          const centre =
            Number.isFinite(againCentre[0]) && apart(againCentre, boxCentre) <= AGREE
              ? [(againCentre[0] + boxCentre[0]) / 2, (againCentre[1] + boxCentre[1]) / 2] as [number, number]
              : boxCentre;
          return {
            change,
            stands: true,
            sure: Number.isFinite(againCentre[0]) && apart(againCentre, boxCentre) <= AGREE,
            at: area(centre[0], centre[1], boxSize[0], boxSize[1]),
            said: [boxed.at, said.at].filter(Boolean).join(' · '),
          };
        }

        if (centrePoint && !hasBox) {
          const again = await ask(centrePrompt(`${change}. One reading placed its centre near x ${Math.round(
            centrePoint[0] * 1000
          )}, y ${Math.round(centrePoint[1] * 1000)}.`), centreSchema.properties, centreSchema.required);
          const said = again || {};
          if (said.same !== false || !Number.isFinite(Number(said.cx)) || !Number.isFinite(Number(said.cy))) {
            return { change, stands: false, why: 'the second look found that place unchanged' };
          }
          const againCentre: [number, number] = [Number(said.cx) / 1000, Number(said.cy) / 1000];
          return {
            change,
            stands: true,
            sure: apart(againCentre, centrePoint) <= AGREE,
            at: area(centrePoint[0], centrePoint[1], LEAST, LEAST),
            said: [centred.first, centred.second].filter(Boolean).join(' → '),
          };
        }

        // both readings stood: they confirm each other where they land together
        const width = Math.min(boxSize[0], MOST);
        const height = Math.min(boxSize[1], MOST);
        if (apart(boxCentre, centrePoint as [number, number]) <= AGREE) {
          const centre = [
            (boxCentre[0] + (centrePoint as [number, number])[0]) / 2,
            (boxCentre[1] + (centrePoint as [number, number])[1]) / 2,
          ] as [number, number];
          return {
            change,
            stands: true,
            sure: true,
            at: area(centre[0], centre[1], width, height),
            said: [centred.first, centred.second].filter(Boolean).join(' → '),
          };
        }

        const again = await ask(
          `${boxPrompt(change)} One reading of this change placed it near x ${Math.round(
            boxCentre[0] * 1000
          )}, y ${Math.round(boxCentre[1] * 1000)} and another near x ${Math.round(
            (centrePoint as [number, number])[0] * 1000
          )}, y ${Math.round((centrePoint as [number, number])[1] * 1000)}. Give the one box that truly holds ` +
            'the changed object.',
          boxSchema.properties,
          boxSchema.required
        );
        const said = again || {};
        if (said.visible !== true) {
          return { change, stands: false, why: 'the third look found that place unchanged' };
        }
        const thirdCentre: [number, number] = [Number(said.x) / 1000, Number(said.y) / 1000];
        const thirdSize = [Number(said.w) / 1000, Number(said.h) / 1000];
        if (!Number.isFinite(thirdCentre[0]) || !Number.isFinite(thirdCentre[1])) {
          return { change, stands: true, sure: false, at: area(boxCentre[0], boxCentre[1], width, height), said: '' };
        }
        const nearBox = apart(thirdCentre, boxCentre) <= AGREE;
        const nearCentre = apart(thirdCentre, centrePoint as [number, number]) <= AGREE;
        if (nearBox || nearCentre) {
          const hold = nearBox ? boxCentre : (centrePoint as [number, number]);
          const centre = [(thirdCentre[0] + hold[0]) / 2, (thirdCentre[1] + hold[1]) / 2] as [number, number];
          return {
            change,
            stands: true,
            sure: true,
            at: area(centre[0], centre[1], Number.isFinite(thirdSize[0]) ? thirdSize[0] : width, Number.isFinite(thirdSize[1]) ? thirdSize[1] : height),
            said: [boxed.at, said.at].filter(Boolean).join(' · '),
          };
        }
        return {
          change,
          stands: true,
          sure: false,
          at: area(boxCentre[0], boxCentre[1], width, height),
          said: [boxed.at, said.at].filter(Boolean).join(' · '),
        };
      })
    );

    const found: any[] = [];
    const left: any[] = [];
    read.forEach((answer: any, i: number) => {
      const said = answer?.status === 'fulfilled' ? answer.value : null;
      if (!said || !said.stands || !said.at) {
        left.push({ change: changes[i], why: said?.why || 'that change could not be read' });
        return;
      }
      const at = said.at;
      // a place that two readings landed on the same spot for is one and the same change
      const held = found.some((other) => apart(at.centre, other.at.centre) <= AGREE);
      if (held) {
        left.push({ change: changes[i], why: 'the same place as a change already found' });
        return;
      }
      found.push({ change: changes[i], sure: said.sure !== false, said: said.said || '', at });
    });

    const differences = found.map((oneBox, i) => ({
      id: `${one.scene}-photo-${i + 1}`,
      x: oneBox.at.x,
      y: oneBox.at.y,
      w: oneBox.at.w,
      h: oneBox.at.h,
      label: oneBox.change.replace(/^(in|on|at)\b[^,]*,\s*/i, '').trim() || oneBox.change,
      ...(i >= target ? { extra: true } : {}),
    }));

    return Response.json({
      scene: one.scene,
      asked: changes.length,
      target,
      found: differences.length,
      differences,
      left,
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}