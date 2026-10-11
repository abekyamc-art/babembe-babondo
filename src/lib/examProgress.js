import {
  episodesInSeason,
  EXAM_SEASONS,
  episodeSize,
  seasonByNo,
  buildEpisodePaper,
} from "./examSeasons";

/**
 * The examination as it goes on: which season and episode stand open, which have been passed, and how
 * many times each episode has been taken.
 *
 * A local, per-student copy keeps progress available between openings. The account copy is handled
 * by examProgressSync. Only a paper that reached more than eighty per cent of its points closes the
 * episode and opens the one after it: a paper that fell short is counted as an attempt and leaves the
 * episode standing open, so it can be taken again.
 */
const PROGRESS_KEY = "gloire-kibembe-exam-seasons-v2";
const ATTEMPT_KEY = "gloire-kibembe-exam-episode-v2";
let progressOwner = 'guest';
/** The progress this session holds in memory, standing beside the phone's own copy. */
let kept = null;
export function setProgressOwner(id) { progressOwner = id; kept = null; }
const scoped = (key) => `${key}:${progressOwner}`;
export function storeProgress(progress) { write(PROGRESS_KEY, progress); }

/** One episode's own name in the store: the season it belongs to and its number inside it. */
export function episodeKey(season, episode) {
  return `${season}:${episode}`;
}

function read(key, fallback) {
  try {
    let raw = window.localStorage.getItem(scoped(key));
    const claim = window.localStorage.getItem(`${PROGRESS_KEY}:legacy-owner`);
    if (!raw && (!claim || claim === progressOwner)) {
      raw = window.localStorage.getItem(key);
      if (raw) {
        window.localStorage.setItem(`${PROGRESS_KEY}:legacy-owner`, progressOwner);
        window.localStorage.setItem(scoped(key), raw);
      }
    }
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    return fallback;
  }
}

function write(key, value) {
  // The progress is kept in memory as well as in the phone's store. A phone that refuses to store —
  // private browsing, a store that has filled up — would otherwise find nothing written down the moment
  // it looked again, and would lock the episode that was just earned.
  if (key === PROGRESS_KEY) kept = value;
  try {
    window.localStorage.setItem(scoped(key), JSON.stringify(value));
  } catch (err) {
    // a phone that refuses the store still takes the examination
  }
}

/** How far the student has come: every episode passed with its best mark, and how often each was taken. */
export function loadProgress() {
  // the copy this session holds comes first, so what has just been passed is what the next episode is
  // opened against, whether or not the phone agreed to write it down
  const held = kept || read(PROGRESS_KEY, null);
  const passed = held && held.passed && typeof held.passed === "object" ? held.passed : {};
  const taken = held && held.taken && typeof held.taken === "object" ? held.taken : {};
  const completed = { ...(held?.completed || {}) };
  Object.keys(passed).forEach((key) => { completed[key] = true; });
  return { passed, taken, completed, baseline_score: held?.baseline_score || 0, baseline_passed: held?.baseline_passed || 0 };
}

/** How many episodes of a season have been passed. */
export function passedIn(progress, season) {
  let count = 0;
  for (let episode = 1; episode <= episodesInSeason(season); episode += 1) {
    if (progress?.passed?.[episodeKey(season, episode)]) count += 1;
  }
  return count;
}

/** A season is cleared when every one of its hundred episodes has been passed. */
export function seasonCleared(progress, season) {
  return completedIn(progress, season) >= episodesInSeason(season);
}

/** A season is open when it is the first one, or when the season before it has been cleared. */
export function seasonOpen(progress, season) {
  if (season <= 1) return true;
  return seasonCleared(progress, season - 1);
}

/** A passed episode is closed for good, and closing it is what unlocks the episode after it. */
export function episodeCompleted(progress, season, episode) {
  const key = episodeKey(season, episode);
  return !!(progress?.completed?.[key] || progress?.passed?.[key]);
}

export function completedIn(progress, season) {
  let count = 0;
  for (let no = 1; no <= episodesInSeason(season); no++) if (episodeCompleted(progress, season, no)) count++;
  return count;
}

export function episodeOpen(progress, season, episode) {
  if (!seasonOpen(progress, season) || episode < 1 || episode > episodesInSeason(season)) return false;
  if (episodeCompleted(progress, season, episode)) return false;
  return episode === 1 || episodeCompleted(progress, season, episode - 1);
}

/** The first unfinished episode, or null when the season is complete. */
export function nextEpisode(progress, season) {
  for (let episode = 1; episode <= episodesInSeason(season); episode += 1) {
    if (!episodeCompleted(progress, season, episode)) return episode;
  }
  return null;
}

/** The best mark an episode has been passed at, or nothing where it has never been passed. */
export function bestOf(progress, season, episode) {
  return progress?.passed?.[episodeKey(season, episode)]?.best || 0;
}

/** How many times an episode has been taken, passed or not. */
export function attemptsOf(progress, season, episode) {
  return progress?.taken?.[episodeKey(season, episode)] || 0;
}

/** How many episodes have been passed over every season. */
export function episodesPassed(progress) {
  return EXAM_SEASONS.reduce((sum, season) => sum + passedIn(progress, season.no), progress?.baseline_passed || 0);
}

/**
 * The total the leaderboard stands in: the best mark of every episode the student has passed, added
 * together. Every episode counts for at most a hundred, so a whole cleared season is ten thousand and
 * the whole examination is thirty thousand.
 */
export function totalScore(progress) {
  let total = progress?.baseline_score || 0;
  EXAM_SEASONS.forEach((season) => {
    for (let episode = 1; episode <= episodesInSeason(season.no); episode += 1) {
      total += bestOf(progress, season.no, episode);
    }
  });
  return total;
}

/** The furthest season a student has reached: the last one that stands open. */
export function seasonReached(progress) {
  let at = 1;
  EXAM_SEASONS.forEach((season) => {
    if (seasonOpen(progress, season.no)) at = season.no;
  });
  return at;
}

/** The episode left half-answered, when one is standing, so it can be taken up where it was left. */
export function loadAttempt() {
  const held = read(ATTEMPT_KEY, null);
  if (!held || !Number.isInteger(held.season) || !Number.isInteger(held.episode)) return null;
  const season = seasonByNo(held.season);
  if (!season) return null;
  if (!Array.isArray(held.questions) || held.questions.length !== episodeSize(season, held.episode)) {
    return null;
  }
  if (typeof held.at !== "number" || !held.marks || held.at >= held.questions.length) return null;
  if (!episodeOpen(loadProgress(), held.season, held.episode)) { clearAttempt(); return null; }
  return held;
}

export function saveAttempt(state) {
  write(ATTEMPT_KEY, state);
  return state;
}

export function clearAttempt() {
  try {
    window.localStorage.removeItem(scoped(ATTEMPT_KEY));
    if (window.localStorage.getItem(`${PROGRESS_KEY}:legacy-owner`) === progressOwner) window.localStorage.removeItem(ATTEMPT_KEY);
  } catch (err) {
    // nothing to clear on a phone that keeps no store
  }
}

/** Begin an episode: its paper, freshly drawn and shuffled. */
export function startEpisode(season, episode) {
  if (!episodeOpen(loadProgress(), season, episode)) return null;
  return saveAttempt({
    id: `${season}:${episode}:${Date.now()}`,
    season,
    episode,
    at: 0,
    questions: buildEpisodePaper(season, episode),
    marks: {},
    started_at: new Date().toISOString(),
  });
}

/**
 * A finished episode written down: the attempt counted, and — where more than eighty per cent of its
 * points were reached — the episode marked as passed and closed, which is what opens the episode after
 * it and, at the hundredth, the season after it. A paper that fell short stays open and can be taken
 * again; how often an episode is taken is only ever counted, never limited.
 */
export function recordFinish(season, episode, report) {
  const progress = loadProgress();
  const key = episodeKey(season, episode);

  if (episodeCompleted(progress, season, episode)) { clearAttempt(); return progress; }
  const taken = { ...progress.taken, [key]: (progress.taken[key] || 0) + 1 };
  const passed = { ...progress.passed };
  const completed = { ...progress.completed };
  if (report?.passed) {
    passed[key] = {
      best: Math.max(passed[key]?.best || 0, report.percent),
      at: new Date().toISOString(),
    };
    completed[key] = true;
  }

  const next = { ...progress, passed, taken, completed };
  write(PROGRESS_KEY, next);
  clearAttempt();
  return next;
}