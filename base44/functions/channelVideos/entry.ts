import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { readChannel } from '../../shared/channelRead.ts';

/**
 * The videos an artist's channel has published, read for the admin's own panel so they can be kept
 * with the story.
 *
 * The one reading of a channel lives in the shared channel reader, because two askers need it: this
 * panel, which keeps the list with the story, and the answer that hands the artist's most watched
 * videos to the person asking about them. Nothing is saved here: what comes back is handed to the
 * panel, which writes it into the story it belongs to.
 *
 * Only an admin reads a channel for a story, and a channel that cannot be reached says so instead of
 * handing back an empty list as if the artist had published nothing.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    // only an admin keeps a story, so only an admin reads a channel for one
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const read = await readChannel({
      channel: body?.channel,
      known: body?.known,
      limit: 100,
      names: true,
    });

    if (!read.ok) {
      return Response.json({
        ok: false,
        channel_id: read.channel_id || '',
        videos: [],
        reason: read.reason || 'That channel could not be read — your saved videos stay as they are.',
      });
    }

    return Response.json({
      ok: true,
      channel_id: read.channel_id || '',
      videos: read.videos,
      count: read.videos.length,
      synced_at: new Date().toISOString(),
    });
  } catch (error: any) {
    // the panel is told plainly that the channel could not be read, and keeps the list it already has
    console.error('The channel could not be read:', error?.message);
    return Response.json({
      ok: false,
      videos: [],
      reason: 'The channel could not be read just now — your saved videos stay as they are.',
    });
  }
}