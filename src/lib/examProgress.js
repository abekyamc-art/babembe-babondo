import {
  EPISODES_PER_SEASON,
  EXAM_SEASONS,
  episodeSize,
  seasonByNo,
  buildEpisodePaper,
} from "./examSeasons";

/**
 * The examination as it goes on: which season and episode stand open, which have been passed, and how
 * many times each episode has been taken.
 *
 * Everything stands on the phone itself and nothing else — the passes that open the next episode and the
 * next season, the episode left half-answered, and the count of attempts. There is no daily limit
 * anywhere in it: a student may sit as many episodes in a day as they wish, and taking one again never
 * costs anything.
 */
const PROGRESS_KEY = "gloire-kibembe-exam-seasons-v2";
const ATTEMPT_KEY = "gloire-kibembe-exam-episode-v2";

/** One episode's own name in the store: the season it belongs to and its number inside it. */
export function episodeKey(season, episode) {
  return `${season}:${episode}`;
}

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    return fallback;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // a phone that refuses the store still takes the examination
  }
}

/** How far the student has come: every episode passed with its best mark, and how often each was taken. */
export function loadProgress() {
  const held = read(PROGRESS_KEY, null);
  const passed = held && held.passed && typeof held.passed === "object" ? held.passed : {};
  const taken = held && held.taken && typeof held.taken === "object" ? held.taken : {};
  return { passed, taken };
}

/** How many episodes of a season have been passed. */
export function passedIn(progress, season) {
  let count = 0;
  for (let episode = 1; episode <= EPISODES_PER_SEASON; episode += 1) {
    if (progress?.passed?.[episodeKey(season, episode)]) count += 1;
  }
  return count;
}

/** A season is cleared when every one of its hundred episodes has been passed. */
export function seasonCleared(progress, season) {
  return passedIn(progress, season) >= EPISODES_PER_SEASON;
}

/** A season is open when it is the first one, or when the season before it has been cleared. */
export function seasonOpen(progress, season) {
  if (season <= 1) return true;
  return seasonCleared(progress, season - 1);
}

/** An episode is open when its season is open and the episode before it has been passed. */
export function episodeOpen(progress, season, episode) {
  if (!seasonOpen(progress, season)) return false;
  if (episode <= 1) return true;
  return !!progress?.passed?.[episodeKey(season, episode - 1)];
}

/** The episode a student meets next in a season: the first one not yet passed. */
export function nextEpisode(progress, season) {
  for (let episode = 1; episode <= EPISODES_PER_SEASON; episode += 1) {
    if (!progress?.passed?.[episodeKey(season, episode)]) return episode;
  }
  return EPISODES_PER_SEASON;
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
  return EXAM_SEASONS.reduce((sum, season) => sum + passedIn(progress, season.no), 0);
}

/**
 * The total the leaderboard stands in: the best mark of every episode the student has passed, added
 * together. Every episode counts for at most a hundred, so a whole cleared season is ten thousand and
 * the whole examination is thirty thousand.
 */
export function totalScore(progress) {
  let total = 0;
  EXAM_SEASONS.forEach((season) => {
    for (let episode = 1; episode <= EPISODES_PER_SEASON; episode += 1) {
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
  if (typeof held.at !== "number" || !held.marks) return null;
  return held;
}

export function saveAttempt(state) {
  write(ATTEMPT_KEY, state);
  return state;
}

export function clearAttempt() {
  try {
    window.localStorage.removeItem(ATTEMPT_KEY);
  } catch (err) {
    // nothing to clear on a phone that keeps no store
  }
}

/** Begin an episode: its paper, freshly drawn and shuffled. */
export function startEpisode(season, episode) {
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
 * A finished episode written down: the attempt counted, and — where the pass mark was reached — the
 * episode marked as passed, which is what opens the episode after it and, at the hundredth, the season
 * after it. How often an episode is taken is only ever counted, never limited.
 */
export function recordFinish(season, episode, report) {
  const progress = loadProgress();
  const key = episodeKey(season, episode);

  const taken = { ...progress.taken, [key]: (progress.taken[key] || 0) + 1 };
  const passed = { ...progress.passed };
  if (report?.passed) {
    passed[key] = {
      best: Math.max(passed[key]?.best || 0, report.percent),
      at: new Date().toISOString(),
    };
  }

  const next = { passed, taken };
  write(PROGRESS_KEY, next);
  clearAttempt();
  return next;
}