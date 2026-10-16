import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import OpenAI from 'npm:openai@6.45.0';

// One episode clip at a time, always the same shape: vertical, six seconds, with sound, and the
// teacher's own face carried in from a picture so the same person stands in every episode.
const MODEL = 'seedance_2';
const SECONDS = 6;
const ASPECT_RATIO = '9:16';
const RESOLUTION = '720p';
const MAX_PROMPT = 2200;
const MAX_REFERENCES = 2;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '');

    const { baseURL, token, headers } = base44.asServiceRole.aiGateway.connection();
    const videos = new OpenAI({ baseURL, apiKey: token, defaultHeaders: headers }).videos;

    // reading a clip that is still being drawn, so a long job is picked up rather than started twice
    if (action === 'retrieve') {
      const videoId = String(body?.videoId || '').trim();
      if (!videoId) return Response.json({ error: 'Missing video' }, { status: 400 });
      const job = await videos.retrieve(videoId);
      return Response.json({
        status: job.status,
        url: job.url || '',
        error: job.error?.message || '',
      });
    }

    if (action !== 'create') return Response.json({ error: 'Invalid action' }, { status: 400 });

    const prompt = String(body?.prompt || '').trim().slice(0, MAX_PROMPT);
    if (!prompt) return Response.json({ error: 'Missing prompt' }, { status: 400 });

    const references = (Array.isArray(body?.references) ? body.references : [])
      .filter((url) => typeof url === 'string' && /^https:\/\/\S+$/.test(url))
      .slice(0, MAX_REFERENCES)
      .map((url) => ({ type: 'image_url', image_url: { url } }));

    const request = {
      model: MODEL,
      prompt,
      seconds: SECONDS,
      aspect_ratio: ASPECT_RATIO,
      resolution: RESOLUTION,
      generate_audio: true,
      ...(references.length ? { input_references: references } : {}),
    };

    const job = await videos.create(request, { maxRetries: 0 });
    return Response.json({ id: job.id, status: job.status }, { status: 202 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}