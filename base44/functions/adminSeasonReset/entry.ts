import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

/**
 * An admin dropping one student on a season: the season named and every season after it are cleared out
 * of that student's own record — the marks of those seasons, the episodes closed in them and every
 * attempt counted — so the season named stands open at its first episode and the seasons after it wait
 * behind it again.
 *
 * The two places a student's standing is kept are dropped together, in one call: the progress held with
 * the account, and the standing on the leaderboard. Dropping them together is what makes the drop
 * stick. A leaderboard left standing would be read back by the examination on its next opening, which
 * recovers the cleared path from it and marks the dropped seasons' episodes as passed again.
 *
 * The drop is written down as a time, season by season, so a phone still holding those seasons' older
 * marks in its own store lets them go as it takes the account's copy up. An episode passed after the
 * drop is kept: only what stood passed before it is cleared.
 *
 * Only an admin may call it, and only with the email of the student to drop.
 */
// The last season the examination holds: a drop reaches every season after it, this one included, so the
// whole run of seasons above the drop is closed out at once and nothing waits unseen behind a number.
const LAST_SEASON = 11;

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();
    const season = Number(body?.season);
    if (!email || !email.includes('@')) {
      return Response.json({ error: 'The email of the student to drop is needed.' }, { status: 400 });
    }
    if (!Number.isInteger(season) || season < 1 || season > 40) {
      return Response.json({ error: 'The season to drop the student on is needed.' }, { status: 400 });
    }

    const at = new Date().toISOString();
    // one episode's own key is the season it belongs to and its number inside it, so the seasons a drop
    // reaches are read from the keys themselves
    const falls = (key: string) => {
      const no = Number(String(key).split(':')[0]);
      return Number.isInteger(no) && no >= season;
    };

    const standing = await base44.asServiceRole.entities.ExamRecord.filter(
      { user_email: email },
      { limit: 1 }
    );
    const record = standing?.items?.[0] || null;
    if (!record) {
      return Response.json({ error: 'No standing stands for that student yet.' }, { status: 404 });
    }

    // the student's own progress, found by the hand that wrote it: their own record holds their own id
    const own = record.created_by_id
      ? await base44.asServiceRole.entities.ExamStudentProgress.filter(
          { owner_id: record.created_by_id },
          { limit: 1 }
        )
      : { items: [] };
    const held = own?.items?.[0] || null;
    const before = held?.progress || {};

    const passed: Record<string, any> = {};
    const completed: Record<string, boolean> = {};
    const taken: Record<string, number> = {};
    Object.keys(before.passed || {}).forEach((key) => {
      if (!falls(key)) passed[key] = before.passed[key];
    });
    Object.keys(before.completed || {}).forEach((key) => {
      if (!falls(key)) completed[key] = before.completed[key];
    });
    Object.keys(before.taken || {}).forEach((key) => {
      if (!falls(key)) taken[key] = before.taken[key];
    });

    // the drop's own time, written down for the season named and for every season after it — the last
    // season of the examination included, whether or not it holds anything yet — so the marks of a phone
    // that has not taken the account's copy up are let go by it, season by season, and no season after the
    // drop can ever hold a mark written before it
    const resets: Record<string, string> = { ...(before.season_resets || {}) };
    const reached = new Set<number>();
    for (let no = season; no <= LAST_SEASON; no += 1) reached.add(no);
    [...Object.keys(before.passed || {}), ...Object.keys(before.completed || {}), ...Object.keys(before.taken || {})]
      .forEach((key) => {
        const no = Number(String(key).split(':')[0]);
        if (Number.isInteger(no) && no >= season) reached.add(no);
      });
    reached.forEach((no) => {
      resets[String(no)] = at;
    });

    const baseline = Number(before.baseline_score) || 0;
    const baselinePassed = Number(before.baseline_passed) || 0;
    const score = Math.round(
      Object.values(passed).reduce((sum, mark: any) => sum + (Number(mark?.best) || 0), 0) + baseline
    );
    const examPassed = Object.keys(passed).length + baselinePassed;
    const game = Number(record.game_episodes) || 0;

    if (held) {
      await base44.asServiceRole.entities.ExamStudentProgress.update(held.id, {
        progress: { ...before, passed, completed, taken, season_resets: resets },
      });
    }

    // The drop stands on its own record as well, one row for each season it reaches, and the phone never
    // writes there: a phone holding those seasons' older marks reads the rows with the progress on its
    // next opening and lets the marks go, so a drop cannot be written over by a standing saved after it.
    await base44.asServiceRole.entities.ExamSeasonReset.upsert(
      [...reached]
        .filter((no) => no >= season)
        .map((no) => ({ key: `${email}:${no}`, user_email: email, season: no, at })),
      { key: 'key' }
    );

    // the standing is rebuilt from what is left, so nothing of the dropped seasons is read back from it
    await base44.asServiceRole.entities.ExamRecord.update(record.id, {
      score,
      passed: examPassed,
      episodes: game + examPassed,
      season,
      episode: 1,
      at,
    });

    return Response.json({
      email,
      season,
      dropped: [...reached].filter((no) => no >= season).sort((one, other) => one - other),
      cleared: Math.max(0, (Number(record.passed) || 0) - examPassed),
      passed: examPassed,
      episodes: game + examPassed,
      score,
      progress: !!held,
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'The drop could not be made.' }, { status: 500 });
  }
}