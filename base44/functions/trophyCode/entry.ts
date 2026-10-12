import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

/**
 * The reward codes a student has already taken.
 *
 * A trophy's code is written on the cup once and copied once: this keeps the mark that says which
 * seasons' codes have been taken, so the shelf writes the code on a cup only until it has been copied
 * and keeps the cup standing, marked, from then on. The mark is kept with the person's own account and
 * not with the phone, so a code taken on one device is off the shelf on every other one.
 *
 * Nothing of the code itself is kept here — only that it was taken — and only the signed-in person's own
 * marks are ever written or read: the email comes from the session and never from what was asked.
 */

/** How many seasons the examination is numbered for: a code is taken for one of them. */
const MOST_SEASONS = 96;

export default async function trophyCode(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) return Response.json({ error: 'Sign in to keep a code.' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || 'list');

    if (action === 'copy') {
      const season = Number(body?.season);
      if (!Number.isInteger(season) || season < 1 || season > MOST_SEASONS) {
        return Response.json({ error: 'No season was named.' }, { status: 400 });
      }
      // One mark to a season, written once: the key is the person and the season together, so a second
      // tap on the same cup finds the key already standing and changes nothing at all.
      await base44.asServiceRole.entities.TrophyCodeCopy.upsert(
        [
          {
            key: `${user.email}:${season}`,
            user_email: user.email,
            season,
            at: new Date().toISOString(),
          },
        ],
        { key: 'key' }
      );
    } else if (action !== 'list') {
      return Response.json({ error: 'That ask is not known.' }, { status: 400 });
    }

    const page = await base44.asServiceRole.entities.TrophyCodeCopy.filter(
      { user_email: user.email },
      { limit: 200, fields: ['season'] }
    );
    const copied = [...new Set(page.items.map((one) => one.season))]
      .filter((one) => Number.isInteger(one))
      .sort((a, b) => a - b);

    return Response.json({ copied });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}