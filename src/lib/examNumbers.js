import { shuffled } from "./examSeries";
import { mathsPictureFor } from "./examImages";
import { CONFIRMED_NUMBERS } from "./examExtras";
import { challengeQuestion } from "./challengeQuestions";

/**
 * GLOIRE AI — THE EXAMINATION: the season of the numbers.
 *
 * The counting of the language is met here in every way the examination knows it. First the calculation:
 * three figures added up, a sum with one figure taken away, two figures multiplied, and a product with
 * one figure added to it — so a sum is worked out rather than one figure met alone. Then the names
 * themselves, asked apart from the calculation: what a figure is called in Kibembe, which number a
 * confirmed Kibembe number names, what the numbers named in tens, in hundreds and in thousands are
 * called, and how many tens stand in a number the language names in tens.
 *
 * Nothing here is guessed at. Every Kibembe form a question gives or offers is a confirmed entry of the
 * number bank, and every answer key is worked out from the figures the question itself shows — the sum
 * of them, or the number that stands before the ten of it. The figures of a calculation stay small
 * enough that the number it lands on stands in the bank, so a sum is answered in the language itself
 * and never in figures alone.
 */

/** How many questions one paper of the examination asks, the picture puzzle standing at the last one. */
const PAPER_SIZE = 10;

/** The confirmed numbers the counting is added up and taken away in: one to twenty. */
const COUNTING = CONFIRMED_NUMBERS.filter((row) => row.n <= 20);

/** The numbers the language names in tens, in hundreds and in thousands. */
const NAMED = CONFIRMED_NUMBERS.filter((row) => row.n >= 20);

/** The tens a place-value question counts: twenty to ninety. */
const TENS = NAMED.filter((row) => row.n <= 90);

/** How a counting answer is written: the confirmed Kibembe form with the number it stands for beside it. */
const withDigit = (row) => `${row.kb} (${row.n})`;

/** The four ways the season asks, taken in turn so no paper is made of one kind alone. */
const KINDS = ["calculation", "name", "named", "tens"];

/**
 * Two other confirmed numbers of a list, so every choice put up is a Kibembe form of the bank and never
 * an invented one. They are stepped out of the list from the question's own place, so a question is
 * always offered the same two wrong choices.
 */
function others(answer, index, pool, step, pick) {
  const out = [];
  for (let at = 1; out.length < 2 && at <= pool.length; at += 1) {
    const row = pool[(index + at * step) % pool.length];
    if (row.n === answer || out.includes(pick(row))) continue;
    out.push(pick(row));
  }
  return out;
}

/** The picture a question of the numbers is studied on: the number's own drawn scene wherever it has one. */
const pictureOf = (row, index) => row?.picture || mathsPictureFor(index * 2);

/**
 * One calculation of the season. The figures are drawn from the question's own place, so the same place
 * always draws the same calculation and two places never draw the same one.
 */
function calculationQuestion(index) {
  // the kind and the shape both stand on the question's place, so the shape is read a step higher: a paper
  // carries three calculations, and no two of them are worked out the same way
  const shape = Math.floor(index / KINDS.length) % 4;
  let expression = "";
  let answer = 0;

  if (shape === 0) {
    const first = (index % 5) + 2;
    const second = (Math.floor(index / 5) % 5) + 1;
    const third = (Math.floor(index / 25) % 4) + 1;
    expression = `${first} + ${second} + ${third}`;
    answer = first + second + third;
  } else if (shape === 1) {
    const first = (index % 5) + 3;
    const second = (Math.floor(index / 5) % 4) + 2;
    const taken = (index % second) + 1;
    expression = `${first} + ${second} − ${taken}`;
    answer = first + second - taken;
  } else if (shape === 2) {
    const first = (Math.floor(index / 4) % 4) + 2;
    const second = (Math.floor(index / 16) % 3) + 2;
    expression = `${first} × ${second}`;
    answer = first * second;
  } else {
    const first = (index % 3) + 2;
    const second = (Math.floor(index / 3) % 2) + 2;
    const added = (Math.floor(index / 9) % 4) + 1;
    expression = `${first} × ${second} + ${added}`;
    answer = first * second + added;
  }

  const row = COUNTING.find((held) => held.n === answer) || null;
  return challengeQuestion(
    `numbers:calc:${index}`,
    "Calculation",
    "Calculate ",
    expression,
    " = ?",
    row ? withDigit(row) : String(answer),
    others(answer, index, COUNTING, 5, withDigit),
    `${expression} = ${answer}${row ? ` — ${row.kb}` : ""}.`,
    pictureOf(row, index)
  );
}

/**
 * What a number is called in the language: the number is given and its confirmed Kibembe name asked for.
 * One question asks among the counting and the next among the numbers the language names in tens, so a
 * figure and a named number are both met with the name that is really theirs.
 */
function nameQuestion(index) {
  const pool = Math.floor(index / KINDS.length) % 2 === 0 ? COUNTING : NAMED;
  const row = pool[index % pool.length];
  return challengeQuestion(
    `numbers:name:${index}`,
    "Number",
    "What do you call the number ",
    String(row.n),
    " in Kibembe?",
    row.kb,
    others(row.n, index, pool, 5, (other) => other.kb),
    `${row.n} = ${row.kb} — ${row.en}.`,
    pictureOf(row, index)
  );
}

/**
 * The other way round: a confirmed Kibembe number is given and the number it names is asked for — the
 * counting one question and the named numbers the next.
 */
function namedQuestion(index) {
  const pool = Math.floor(index / KINDS.length) % 2 === 0 ? COUNTING : NAMED;
  const row = pool[index % pool.length];
  return challengeQuestion(
    `numbers:named:${index}`,
    "Number",
    "Which number does the Kibembe ",
    row.kb,
    " name?",
    String(row.n),
    others(row.n, index, pool, 5, (other) => String(other.n)),
    `${row.kb} = ${row.n} — ${row.en}.`,
    pictureOf(row, index)
  );
}

/**
 * The place a number stands in: how many tens stand in a number the language names in tens. The answer is
 * worked out from the number itself — forty is four tens — so nothing is counted that the bank does not
 * name.
 */
function tensQuestion(index) {
  const row = TENS[index % TENS.length];
  const count = row.n / 10;
  return challengeQuestion(
    `numbers:tens:${index}`,
    "Number",
    "How many tens stand in ",
    String(row.n),
    "?",
    String(count),
    others(row.n, index, TENS, 3, (other) => String(other.n / 10)),
    `${row.n} = ${count} tens — ${row.kb}.`,
    pictureOf(row, index)
  );
}

/** One question of the season, drawn from the place its own number gives it. */
function numberQuestionAt(index) {
  const kind = KINDS[index % KINDS.length];
  if (kind === "name") return nameQuestion(index);
  if (kind === "named") return namedQuestion(index);
  if (kind === "tens") return tensQuestion(index);
  return calculationQuestion(index);
}

/**
 * One episode's paper of ten: the ten places its own number gives it, so the episodes beside each other
 * never ask the same thing and every paper carries a calculation, a name of a number and the place it
 * stands in. The last question stands where the examination's own picture puzzle always stands.
 */
export function buildNumberPaper(episode) {
  const start = (episode - 1) * PAPER_SIZE;
  return shuffled(
    Array.from({ length: PAPER_SIZE }, (_, slot) => numberQuestionAt(start + slot))
  );
}