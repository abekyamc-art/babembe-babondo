import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { geminiImage, drawAccountName } from '../../shared/gemini.ts';

/** A one-off check: can one of the owner's accounts draw a picture at all, and which model answers? */
export default async function geminiDrawProbe(req: Request) {
  const base44 = createClientFromRequest(req);
  const asked =
    'A single ripe mango on a plain white background, one subject, centred, natural daylight, photographic, sharp.';

  const out = [];
  for (const model of [
    'gemini-2.5-flash-image',
    'gemini-2.5-flash-image-preview',
    'gemini-3-pro-image',
    'gemini-3-pro-image-preview',
  ]) {
    try {
      const url = await geminiImage({ base44, group: 'answer', model, prompt: asked, aspect: '16:9' });
      out.push({ model, drawn: true, url: String(url).slice(0, 80) });
    } catch (error: any) {
      out.push({ model, drawn: false, said: String(error?.message || '').slice(0, 200) });
    }
  }

  return Response.json({
    accounts: ['drawing', 'puzzledraw', 'sceneone', 'scenetwo', 'trophies'].map((group) => ({
      group,
      secret: drawAccountName(group),
    })),
    attempts: out,
  });
}