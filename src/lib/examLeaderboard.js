import { base44 } from "@/api/base44Client";
import { episodesInSeason } from '@/lib/examSeasons';
import { episodesPassed, nextEpisode, seasonReached, totalScore } from "@/lib/examProgress";
import { clipToDrops, dropsOf } from "@/lib/examProgressSync";
import { levelsPassed, loadGame } from "@/lib/differenceGame/store";

/**
 * The app's public leaderboard: one record stands for each student, holding every episode they have
 * really passed — the game's own episodes and the examination's, together — and the hundred highest of
 * those records are read back in their own order, highest first.
 *
 * The standing is written down each time an episode of the examination is finished and each time an
 * episode of the game is passed, from what really stands passed on the phone, so both totals follow the
 * student as they go on. Nothing here is ever a reason the examination cannot be taken: a standing that
 * cannot be written down — on a signed-out phone, or on one that will not reach the store — is simply
 * not written, and the paper, or the game, goes on.
 *
 * A standing written before the one total was kept on the record itself carries only the two parts.
 * Such a record is read here through that same one total — the examination's own episodes and the
 * game's, added together — so every student is laid in the order of what they have really passed,
 * however old their standing is. The examination's score points are never read as episodes.
 */

/** How many records the leaderboard shows: the hundred highest standings in the app. */
export const BOARD_SIZE = 100;

/** Whether a record carries the one total it stands on. */
function carriesTotal(record) {
  return (
    record?.episodes !== undefined &&
    record?.episodes !== null &&
    Number.isFinite(Number(record.episodes))
  );
}

/**
 * The one total a record stands on: the total kept on it where the record carries one, and — where the
 * record was written before that total was kept — every episode of the examination and every episode of
 * the game it does carry, added together. Nothing else on the record is ever counted as an episode.
 */
export function totalEpisodes(record) {
  if (carriesTotal(record)) return Number(record.episodes);
  return (Number(record?.passed) || 0) + (Number(record?.game_episodes) || 0);
}

/** The same record with its own one total standing on it, so the list, the place and the total shown
 *  are all read from that one number. */
function withTotal(record) {
  return { ...record, episodes: totalEpisodes(record) };
}

/** What one student's record holds, as the app writes it. */
function recordOf(me, profile, progress) {
  const email = me?.email || "";
  const season = seasonReached(progress);
  // the two totals the leaderboard stands in: every episode of the game the student has really passed,
  // read off their own phone, and every episode of the examination they have passed
  const game = levelsPassed(loadGame());
  const exam = episodesPassed(progress);
  return {
    user_email: email,
    username: profile?.username || me?.full_name || email.split("@")[0] || "Student",
    avatar_url: profile?.avatar_url || "",
    score: totalScore(progress),
    passed: exam,
    game_episodes: game,
    episodes: game + exam,
    season,
    episode: nextEpisode(progress, season) ?? episodesInSeason(season) + 1,
    at: new Date().toISOString(),
  };
}

/** The signed-in student, or nothing at all on a phone that is not signed in. */
async function student() {
  try {
    return await base44.auth.me();
  } catch (err) {
    return null;
  }
}

/**
 * Writes the student's standing down: one record, found by their email, holding every episode of the
 * game and of the examination they have really passed, the episodes behind them and the season they
 * stand in.
 */
export async function saveScore(progress) {
  try {
    const me = await student();
    if (!me?.email) return null;

    const found = await base44.entities.Profile.filter({ user_email: me.email }, { limit: 1 });
    // A standing is never written above a drop an admin has made. The copy a caller hands over is the
    // phone's own, and it still carries the dropped seasons' marks until it takes the account's copy up,
    // so it is read for the drop here before the standing is read off it: the game's own write cannot
    // lift a dropped student back over the drop either.
    let held = progress;
    const rows = await base44.entities.ExamSeasonReset.filter(
      { user_email: me.email },
      { limit: 100 }
    ).catch(() => ({ items: [] }));
    const drops = dropsOf(rows);
    if (Object.keys(drops).length) {
      const standing = await base44.entities.ExamRecord.filter({ user_email: me.email }, { limit: 1 });
      held = clipToDrops({ ...progress }, drops, standing?.items?.[0] || null);
    }
    const record = recordOf(me, found?.items?.[0] || null, held);
    await base44.entities.ExamRecord.upsert([record], { key: "user_email" });
    return record;
  } catch (err) {
    console.error("The examination score could not be written down:", err?.message);
    return null;
  }
}

/**
 * The hundred highest standings in the app, highest first: every episode the student has passed, the
 * game's own and the examination's together.
 *
 * Two runs stand behind the list, because the one total is not kept on every record: the standings that
 * carry their own total are read in their own order, and the older ones — which carry only the two
 * parts — are read by the examination's own episodes, so a standing with the most of them is never left
 * off the run. Both are read through the one total and laid in one order, highest first.
 */
export async function topScores() {
  const [carried, older] = await Promise.all([
    base44.entities.ExamRecord.filter(
      { episodes: { $exists: true } },
      { sort: "-episodes", limit: BOARD_SIZE }
    ),
    base44.entities.ExamRecord.filter(
      { episodes: { $exists: false } },
      { sort: "-passed", limit: BOARD_SIZE }
    ),
  ]);
  return [...(carried?.items || []), ...(older?.items || [])]
    .map(withTotal)
    .sort((one, other) => other.episodes - one.episodes)
    .slice(0, BOARD_SIZE);
}

/** One student's own record, for the standing shown beside the list. */
export async function myRecord(email) {
  if (!email) return null;
  const page = await base44.entities.ExamRecord.filter({ user_email: email }, { limit: 1 });
  const found = page?.items?.[0] || null;
  return found ? withTotal(found) : null;
}

/** How many standings stand above a total: one more than them is that total's own place. */
export async function rankOf(episodes) {
  const mine = Number(episodes) || 0;
  // the standings carrying their own total, and the older ones, whose own total is the examination's
  // episodes and the game's added together — an older standing carries no game episodes of its own,
  // so its examination episodes are read as that total
  const [carried, older] = await Promise.all([
    base44.entities.ExamRecord.count({ episodes: { $gt: mine } }),
    base44.entities.ExamRecord.count({
      episodes: { $exists: false },
      passed: { $gt: mine },
    }),
  ]);
  return carried + older + 1;
}