import { buildLevelPaper, levelByNo, levelSize } from "./examSeries";

/**
 * The examination series as it goes on: which level is open, which has been passed, and how many times
 * each one has been taken.
 *
 * Everything stands on the phone itself and nothing else — the pass that opens the next level, the level
 * left half-answered, and the count of attempts. There is no daily limit anywhere in it: a student may sit
 * as many papers in a day as they wish, and taking a level again never costs anything.
 */
const PROGRESS_KEY = "gloire-kibembe-exam-series-v1";
const ATTEMPT_KEY = "gloire-kibembe-exam-series-attempt-v1";

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

/** How far the student has come: the levels passed with their best score, and how often each was taken. */
export function loadProgress() {
  const held = read(PROGRESS_KEY, null);
  const passed = held && held.passed && typeof held.passed === "object" ? held.passed : {};
  const taken = held && held.taken && typeof held.taken === "object" ? held.taken : {};
  return { passed, taken };
}

/** A level is open when it is the first one, or when the level before it has been passed. */
export function levelOpen(progress, no) {
  if (no <= 1) return true;
  return !!progress?.passed?.[String(no - 1)];
}

/** The best score a level has been answered at, or nothing where it has never been passed. */
export function bestOf(progress, no) {
  return progress?.passed?.[String(no)]?.best || 0;
}

/** How many times a level has been taken, passed or not. */
export function attemptsOf(progress, no) {
  return progress?.taken?.[String(no)] || 0;
}

/** How many levels have been passed. */
export function levelsPassed(progress) {
  return Object.keys(progress?.passed || {}).length;
}

/** The level left half-answered, when one is standing, so it can be taken up where it was left. */
export function loadAttempt() {
  const held = read(ATTEMPT_KEY, null);
  if (!held || !Number.isInteger(held.level) || !Array.isArray(held.questions)) return null;
  if (held.questions.length !== levelSize(levelByNo(held.level))) return null;
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

/** Begin a level: its everyday and its health questions, freshly ordered and shuffled together. */
export function startLevel(no) {
  return saveAttempt({
    id: `${no}:${Date.now()}`,
    level: no,
    at: 0,
    questions: buildLevelPaper(no),
    marks: {},
    started_at: new Date().toISOString(),
  });
}

/**
 * A finished level written down: the attempt counted, and — where the pass mark was reached — the level
 * marked as passed, which is what opens the next one. How often a level is taken is only ever counted,
 * never limited.
 */
export function recordFinish(no, report) {
  const progress = loadProgress();
  const key = String(no);

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