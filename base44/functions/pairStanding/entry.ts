import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { PAIR_ACCOUNT, pairSpellings } from '../../shared/pairAccount.ts';

/**
 * The one account that answers to two spellings of its address, written as one pair.
 *
 * Both spellings stand on the leaderboard as an entry of their own, one beside the other, and both
 * carry the one name. The standing is written here under both spellings in one hand, and a name or a
 * picture changed in the account panel is carried onto both at once — rather than waiting for the
 * next episode to be passed — so neither spelling is ever left standing on an older name or an older
 * standing, and nothing stands on one spelling alone.
 *
 * Only the paired account itself may ask for this, and the account is read from the session and never
 * from what was asked: no other account's rows can be reached here, and no spelling is ever taken
 * from the ask. The pair is the app's own two spellings and nothing else.
 *
 * Nothing of the ask is kept beyond the standing itself: the name, the picture and the counts that
 * stand on the leaderboard, each held inside the bounds the app writes them in.
 */

const MOST_EPISODES = 1000000;
const MOST_SEASONS = 96;
const NAME_LIMIT = 24;
const URL_LIMIT = 500;

/** A count as the app keeps it: a whole number, held inside its own bounds, never a guess. */
function count(value: any, most: number): number {
  const held = Number(value);
  if (!Number.isFinite(held)) return 0;
  return Math.min(Math.max(Math.trunc(held), 0), most);
}

/** A name as the app writes it: the letters a handle is made of, and never longer than a handle. */
function handle(value: any): string {
  return String(value ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9._]/g, '')
    .slice(0, NAME_LIMIT);
}

/** A picture's address, and nothing at all where what was given is no address. */
function picture(value: any): string {
  const url = String(value ?? '').trim();
  return /^https?:\/\//i.test(url) ? url.slice(0, URL_LIMIT) : '';
}

export default async function pairStanding(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) {
      return Response.json({ error: 'Sign in to write a standing.' }, { status: 401 });
    }
    if (String(user.email).trim().toLowerCase() !== PAIR_ACCOUNT) {
      return Response.json({ error: 'This account keeps no second spelling.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const spelled = pairSpellings(PAIR_ACCOUNT);
    const asked = body?.standing && typeof body.standing === 'object' ? body.standing : null;
    const username = handle(body?.username) || handle(asked?.username);
    const avatar = picture(body?.avatar_url) || picture(asked?.avatar_url);
    // A picture stands beside the name on both rows, so a rename that names no picture leaves the one
    // already standing where it is rather than wiping it.
    const spokeOfPicture = body?.avatar_url !== undefined || asked?.avatar_url !== undefined;

    if (username) {
      const change: any = { $set: { username } };
      if (spokeOfPicture) change.$set.avatar_url = avatar;
      // the one name, written onto both spellings' standings and both of their profiles at once
      await base44.asServiceRole.entities.ExamRecord.updateMany(
        { user_email: { $in: spelled } },
        change
      );
      await base44.asServiceRole.entities.Profile.updateMany(
        { user_email: { $in: spelled } },
        change
      );
    }

    if (asked) {
      const passed = count(asked?.passed, MOST_EPISODES);
      const game = count(asked?.game_episodes, MOST_EPISODES);
      const standing = {
        username,
        avatar_url: avatar,
        score: count(asked?.score, MOST_EPISODES * 100),
        passed,
        game_episodes: game,
        episodes: count(asked?.episodes, MOST_EPISODES) || passed + game,
        season: count(asked?.season, MOST_SEASONS) || 1,
        episode: count(asked?.episode, MOST_EPISODES) || 1,
        at: new Date().toISOString(),
      };
      await base44.asServiceRole.entities.ExamRecord.upsert(
        spelled.map((user_email) => ({ user_email, ...standing })),
        { key: 'user_email' }
      );
    }

    return Response.json({ ok: true, spellings: spelled });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}