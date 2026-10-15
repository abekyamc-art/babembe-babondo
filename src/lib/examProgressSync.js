import { base44 } from '@/api/base44Client';
import { loadProgress, storeProgress, setProgressOwner, episodeKey, totalScore, episodesPassed } from '@/lib/examProgress';
import { EXAM_SEASONS, episodesInSeason } from '@/lib/examSeasons';
let owner = null;

export async function loadStudentProgress() {
  owner = await base44.auth.isAuthenticated() ? await base44.auth.me() : null;
  setProgressOwner(owner?.id || 'guest');
  const local = loadProgress();
  if (!owner) return local;
  const [page, scores, dropped] = await Promise.all([
    base44.entities.ExamStudentProgress.filter({ owner_id: owner.id }, { limit: 1 }),
    base44.entities.ExamRecord.filter({ user_email: owner.email }, { limit: 1 }),
    base44.entities.ExamSeasonReset.filter({ user_email: owner.email }, { limit: 100 }).catch(() => ({ items: [] })),
  ]);
  const remote = page.items[0]?.progress || {};
  // A drop an admin has made stands on its own record, apart from the progress and never written by the
  // phone: a phone still holding the dropped seasons' older marks in its own store reads the drops here
  // and lets those marks go, so what it writes back cannot put a dropped season together again.
  const drops = { ...(remote.season_resets || {}) };
  (dropped?.items || []).forEach((row) => {
    const no = String(row?.season ?? "");
    if (!no || !row?.at) return;
    if (!drops[no] || Date.parse(row.at) > (Date.parse(drops[no]) || 0)) drops[no] = row.at;
  });
  const completed = { ...remote.completed, ...local.completed };
  const previous = scores.items[0];
  // Recover the already-cleared sequential path from the existing leaderboard.
  if (previous) EXAM_SEASONS.forEach((season) => {
    const end = season.no < previous.season ? episodesInSeason(season.no) : season.no === previous.season ? previous.episode - 1 : 0;
    for (let no = 1; no <= end; no++) completed[episodeKey(season.no, no)] = true;
  });
  const progress = { ...remote, ...local, passed: { ...remote.passed, ...local.passed }, taken: { ...remote.taken, ...local.taken }, completed,
    season_resets: drops,
    baseline_score: remote.baseline_score || local.baseline_score || 0,
    baseline_passed: remote.baseline_passed || local.baseline_passed || 0 };
  // Every drop stands above what the phone and the leaderboard still carry: the marks of the dropped
  // seasons are let go, and the standing they carried with them is brought no higher than the seasons
  // standing before the drop hold — so a standing written before the drop can never lift the student
  // back over it, and every episode passed after the drop is counted from its own mark as it is earned.
  clipToDrops(progress, drops, previous);
  storeProgress(progress);
  await saveStudentProgress(progress);
  return progress;
}

/**
 * A season that has been started over again, and when it was: the episodes of that season passed before
 * the restart are dropped — the ones written down on this phone as well as the ones kept with the
 * account — so the season stands open again from its first episode and is taken in its own order. Both
 * the marks and the closed episodes of that season are read this way. An episode passed after the
 * restart stands as it should: only what stood before the restart is dropped.
 */
function applySeasonResets(progress, resets) {
  if (!resets || typeof resets !== 'object') return progress;
  Object.keys(resets).forEach((season) => {
    const at = Date.parse(resets[season]) || 0;
    if (!at) return;
    const prefix = `${season}:`;
    const after = (key) => (Date.parse(progress.passed?.[key]?.at) || 0) >= at;
    Object.keys(progress.passed || {}).forEach((key) => {
      if (key.startsWith(prefix) && !after(key)) delete progress.passed[key];
    });
    Object.keys(progress.completed || {}).forEach((key) => {
      if (key.startsWith(prefix) && !after(key)) delete progress.completed[key];
    });
    Object.keys(progress.taken || {}).forEach((key) => {
      if (key.startsWith(prefix)) delete progress.taken[key];
    });
  });
  return progress;
}

/** How many episodes stand in the seasons before a season: what a standing may still carry after a drop. */
function episodesBefore(season) {
  if (!season) return 0;
  let total = 0;
  EXAM_SEASONS.forEach((one) => {
    if (one.no < season) total += episodesInSeason(one.no);
  });
  return total;
}

/** The lowest season a drop reaches, or nothing where no drop stands. */
function dropFloor(drops) {
  const held = Object.keys(drops || {})
    .map((no) => Number(no))
    .filter((no) => Number.isInteger(no) && no > 0);
  return held.length ? Math.min(...held) : 0;
}

/** The drops a student stands under, one time for every season they reach, read from their own rows. */
export function dropsOf(rows) {
  const drops = {};
  (rows?.items || []).forEach((row) => {
    const no = String(row?.season ?? "");
    if (!no || !row?.at) return;
    if (!drops[no] || Date.parse(row.at) > (Date.parse(drops[no]) || 0)) drops[no] = row.at;
  });
  return drops;
}

/**
 * One student's progress with every drop standing on it applied: the marks of a dropped season are let
 * go — on the phone as well as with the account — and the older standing carried for marks that live on
 * another device is brought no higher than the seasons standing before the drop hold. Everything passed
 * after the drop is counted from its own mark, as it is really earned.
 */
export function clipToDrops(progress, drops, previous) {
  applySeasonResets(progress, drops);
  const floor = dropFloor(drops);
  if (!floor && !previous) return progress;
  const most = floor ? episodesBefore(floor) : Infinity;
  const keepPassed = Math.min(Number(previous?.passed ?? progress.baseline_passed) || 0, most);
  const keepScore = Math.min(Number(previous?.score ?? progress.baseline_score) || 0, most * 100);
  // the marks themselves, apart from the baseline, so the lift is measured against what is really passed
  const marks = totalScore(progress) - (Number(progress.baseline_score) || 0);
  const keys = episodesPassed(progress) - (Number(progress.baseline_passed) || 0);
  progress.baseline_score = Math.max(0, keepScore - marks);
  progress.baseline_passed = Math.max(0, keepPassed - keys);
  return progress;
}

export async function saveStudentProgress(progress) {
  if (!owner) return;
  await base44.entities.ExamStudentProgress.upsert([{ owner_id: owner.id, progress }], { key: 'owner_id' });
}