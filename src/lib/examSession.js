import { LETTERS, QUESTION_COUNT, buildExam } from "./examBank";

/**
 * The examination while it is being taken: the questions, the answers already given and the score,
 * kept on the phone itself so a refresh or a closed tab never costs what has been answered.
 */
const KEY = "gloire-kibembe-exam-v1";

/** The mark the examination passes at. */
export const PASS_MARK = 80;

function write(state) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    // a phone that refuses the store still takes the examination
  }
}

/** The examination already on this phone, when it is really one of ours and still whole. */
export function loadExam() {
  try {
    const raw = window.localStorage.getItem(KEY);
    const held = raw ? JSON.parse(raw) : null;
    if (!held || !Array.isArray(held.questions) || held.questions.length !== QUESTION_COUNT) return null;
    if (typeof held.at !== "number" || !held.marks) return null;
    return held;
  } catch (err) {
    return null;
  }
}

/** A fresh examination: new questions, a new order, and the correct answer standing elsewhere. */
export function startExam() {
  const state = { at: 0, questions: buildExam(), marks: {}, started_at: new Date().toISOString() };
  write(state);
  return state;
}

export function saveExam(state) {
  write(state);
  return state;
}

/** How many answers stand right so far. */
export function scoreOf(state) {
  return Object.values(state?.marks || {}).filter((mark) => mark?.ok).length;
}

/** The band a finished examination stands in. */
export function gradeOf(percent) {
  if (percent >= 90) return { label: "Excellent", tone: "top" };
  if (percent >= PASS_MARK) return { label: "Passed", tone: "good" };
  if (percent >= 60) return { label: "Needs Improvement", tone: "mid" };
  return { label: "Repeat Lesson", tone: "low" };
}

/** Everything the results screen shows, worked out from the answers as they stand. */
export function reportOf(state) {
  const questions = state?.questions || [];
  const marks = state?.marks || {};
  const total = questions.length;
  const right = scoreOf(state);
  const percent = total ? Math.round((right / total) * 100) : 0;
  const missed = [];
  const practice = [];

  questions.forEach((question, at) => {
    const mark = marks[at];
    if (!mark) return;
    if (!mark.ok) {
      missed.push({
        at,
        prompt: question.prompt,
        chosen: question.options[mark.chosen],
        letter: LETTERS[question.correct],
        correct: question.options[question.correct],
        explain: question.explain,
      });
      (question.practice || []).forEach((pair) => {
        if (practice.some((held) => held.en === pair.en && held.kb === pair.kb)) return;
        practice.push(pair);
      });
    }
  });

  return {
    total,
    right,
    wrong: total - right,
    percent,
    grade: gradeOf(percent),
    passed: percent >= PASS_MARK,
    missed,
    practice,
  };
}