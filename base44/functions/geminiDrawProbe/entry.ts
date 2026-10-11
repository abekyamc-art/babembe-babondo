import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { geminiImage, geminiText, drawAccountName } from '../../shared/gemini.ts';

/** A one-off check: does each drawing account answer, and can it draw a picture at all? */
export default async function geminiDrawProbe(req: Request) {
  const base44 = createClientFromRequest(req);

  const groups = ['drawing', 'puzzledraw', 'sceneone', 'scenetwo', 'trophies'];

  const readings = [];
  for (const group of groups) {
    try {
      const out = await geminiText({ base44, group, prompt: 'Reply with the single word: pong' });
      readings.push({ group, heard: String(out).trim().slice(0, 20) });
    } catch (error: any) {
      readings.push({ group, said: String(error?.message || '').slice(0, 160) });
    }
  }

  const drawings = [];
  for (const group of groups) {
    try {
      const url = await geminiImage({
        base44,
        group,
        model: 'gemini-2.5-flash-image',
        prompt: 'A single ripe mango on a plain white background, one subject, centred, natural daylight, photographic.',
        aspect: '16:9',
      });
      drawings.push({ group, drawn: true, url: String(url).slice(0, 70) });
    } catch (error: any) {
      drawings.push({ group, drawn: false, said: String(error?.message || '').slice(0, 170) });
    }
  }

  return Response.json({
    map: groups.map((group) => ({ group, secret: drawAccountName(group) })),
    readings,
    drawings,
  });
}