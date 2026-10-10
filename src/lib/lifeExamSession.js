import { LIFE_QUESTION_COUNT, buildLifeExam } from "./lifeExamBank";

/**
 * The daily-life examination while it is being taken: the questions, the answers already given and the
 * score, kept on the phone itself under its own key — so the medical examination's own answers stand
 * untouched beside it, and a refresh or a closed tab never costs what has been answered.
 */
const KEY = "gloire-kibembe-life-exam-v1";

function write(state) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    // a phone that refuses the store still takes the examination
  }
}

/** The daily-life examination already on this phone, when it is really one of ours and still whole. */
export function loadExam() {
  try {
    const raw = window.localStorage.getItem(KEY);
    const held = raw ? JSON.parse(raw) : null;
    if (!held || !Array.isArray(held.questions) || held.questions.length !== LIFE_QUESTION_COUNT) {
      return null;
    }
    if (typeof held.at !== "number" || !held.marks) return null;
    return held;
  } catch (err) {
    return null;
  }
}

/** A fresh examination: new questions, a new order, and the correct answer standing elsewhere. */
export function startExam() {
  const state = { at: 0, questions: buildLifeExam(), marks: {}, started_at: new Date().toISOString() };
  write(state);
  return state;
}

export function saveExam(state) {
  write(state);
  return state;
}