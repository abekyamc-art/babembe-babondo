import { base44 } from "@/api/base44Client";
import { episodesPassed, nextEpisode, seasonReached, totalScore } from "@/lib/examProgress";

/**
 * The app's public leaderboard: one record stands for each student, holding the total score they have
 * earned in the examination, and the hundred highest of those records are read back in their own order.
 *
 * A score is written down each time an episode is finished, from what stands passed on the phone, so the
 * leaderboard follows the student's own examination as it goes on. Nothing here is ever a reason the
 * examination cannot be taken: a score that cannot be written down — on a signed-out phone, or on one
 * that will not reach the store — is simply not written, and the paper goes on.
 */

/** How many records the leaderboard shows: the hundred highest scores in the app. */
export const BOARD_SIZE = 100;

/** What one student's record holds, as the app writes it. */
function recordOf(me, profile, progress) {
  const email = me?.email || "";
  const season = seasonReached(progress);
  return {
    user_email: email,
    username: profile?.username || me?.full_name || email.split("@")[0] || "Student",
    avatar_url: profile?.avatar_url || "",
    score: totalScore(progress),
    passed: episodesPassed(progress),
    season,
    episode: nextEpisode(progress, season),
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
 * Writes the student's standing down: one record, found by their email, holding the total score of
 * everything they have passed, the episodes behind them and the season they stand in.
 */
export async function saveScore(progress) {
  try {
    const me = await student();
    if (!me?.email) return null;

    const found = await base44.entities.Profile.filter({ user_email: me.email }, { limit: 1 });
    const record = recordOf(me, found?.items?.[0] || null, progress);
    await base44.entities.ExamRecord.upsert([record], { key: "user_email" });
    return record;
  } catch (err) {
    console.error("The examination score could not be written down:", err?.message);
    return null;
  }
}

/** The hundred highest scores in the app, highest first. */
export async function topScores() {
  const page = await base44.entities.ExamRecord.filter(
    { score: { $gte: 0 } },
    { sort: "-score", limit: BOARD_SIZE }
  );
  return page?.items || [];
}

/** One student's own record, for the standing shown beside the list. */
export async function myRecord(email) {
  if (!email) return null;
  const page = await base44.entities.ExamRecord.filter({ user_email: email }, { limit: 1 });
  return page?.items?.[0] || null;
}

/** How many records stand above a score: one more than them is that score's own place. */
export async function rankOf(score) {
  const ahead = await base44.entities.ExamRecord.count({ score: { $gt: Number(score) || 0 } });
  return ahead + 1;
}