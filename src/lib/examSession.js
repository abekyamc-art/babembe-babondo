import { LETTERS, QUESTION_COUNT, buildExam } from "./examBank";

/**
 * The examination while it is being taken: the questions, the answers already given and the score,
 * kept on the phone itself so a refresh or a closed tab never costs what has been answered.
 */
const KEY = "gloire-kibembe-exam-v1";

/** The mark the examination passes at: more than eighty per cent of the points. */
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

/**
 * What one question is worth: a question of choices earns a single point, and the picture puzzle earns
 * one point for every difference it holds — so the puzzle is passed only when they have all been found.
 */
export function pointsOf(question) {
  return question?.kind === "difference" ? question?.puzzle?.differences?.length || 1 : 1;
}

/** How many points one answer has earned: the differences it found, or the point of a right choice. */
function earned(mark) {
  if (typeof mark?.got === "number") return mark.got;
  return mark?.ok ? 1 : 0;
}

/** How many points stand earned so far. */
export function scoreOf(state) {
  return Object.values(state?.marks || {}).reduce((sum, mark) => sum + earned(mark), 0);
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
  const total = questions.reduce((sum, question) => sum + pointsOf(question), 0);
  const right = scoreOf(state);
  const percent = total ? Math.round((right / total) * 100) : 0;
  const missed = [];
  const practice = [];

  questions.forEach((question, at) => {
    const mark = marks[at];
    const worth = pointsOf(question);
    if (!mark || earned(mark) >= worth) return;
    // the picture puzzle is written out in the words of a puzzle: how many differences were found of
    // how many stood, rather than a choice against a letter
    if (question.kind === "difference") {
      missed.push({
        at,
        prompt: question.prompt,
        chosen: `${earned(mark)} of ${worth} differences found`,
        letter: "",
        correct: `Every one of the ${worth} differences`,
        explain: question.explain,
      });
      return;
    }
    {
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
    passed: percent > PASS_MARK,
    missed,
    practice,
  };
}