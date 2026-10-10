import { base44 } from '@/api/base44Client';
import { loadProgress, storeProgress, setProgressOwner, episodeKey, totalScore, episodesPassed } from '@/lib/examProgress';
import { EXAM_SEASONS, episodesInSeason } from '@/lib/examSeasons';
let owner = null;

export async function loadStudentProgress() {
  owner = await base44.auth.isAuthenticated() ? await base44.auth.me() : null;
  setProgressOwner(owner?.id || 'guest');
  const local = loadProgress();
  if (!owner) return local;
  const [page, scores] = await Promise.all([
    base44.entities.ExamStudentProgress.filter({ owner_id: owner.id }, { limit: 1 }),
    base44.entities.ExamRecord.filter({ user_email: owner.email }, { limit: 1 }),
  ]);
  const remote = page.items[0]?.progress || {};
  const completed = { ...remote.completed, ...local.completed };
  const previous = scores.items[0];
  // Recover the already-cleared sequential path from the existing leaderboard.
  if (previous) EXAM_SEASONS.forEach((season) => {
    const end = season.no < previous.season ? episodesInSeason(season.no) : season.no === previous.season ? previous.episode - 1 : 0;
    for (let no = 1; no <= end; no++) completed[episodeKey(season.no, no)] = true;
  });
  const progress = { ...remote, ...local, passed: { ...remote.passed, ...local.passed }, taken: { ...remote.taken, ...local.taken }, completed,
    baseline_score: remote.baseline_score || local.baseline_score || 0,
    baseline_passed: remote.baseline_passed || local.baseline_passed || 0 };
  // Preserve earlier leaderboard points whose per-episode marks were on another device.
  if (previous) {
    progress.baseline_score += Math.max(0, previous.score - totalScore(progress));
    progress.baseline_passed += Math.max(0, previous.passed - episodesPassed(progress));
  }
  storeProgress(progress);
  await saveStudentProgress(progress);
  return progress;
}

export async function saveStudentProgress(progress) {
  if (!owner) return;
  await base44.entities.ExamStudentProgress.upsert([{ owner_id: owner.id, progress }], { key: 'owner_id' });
}