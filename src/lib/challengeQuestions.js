import { shuffled } from '@/lib/examSeries';
import { mathsPictureFor } from '@/lib/examImages';
import { CONFIRMED_NUMBERS } from '@/lib/examExtras';

/**
 * One challenge of calculation or of everyday problem solving, with its own scene to study it on. The
 * correct answer is put wherever the shuffle sends it, so it never keeps one place.
 */
export function challengeQuestion(id, focus, lead, key, tail, right, wrong, explain, picture = null) {
  const options = shuffled([String(right), ...wrong.map(String)]);
  return {
    id,
    focus,
    lead,
    key: String(key),
    tail,
    prompt: `${lead}${key}${tail}`,
    kb: '',
    options,
    correct: options.indexOf(String(right)),
    explain,
    practice: [],
    image: picture,
    hint: picture ? `Study the picture — ${picture.scene} — before you answer.` : '',
  };
}

/** The confirmed Kibembe numbers of the counting, by the number each one stands for. */
const COUNTING = CONFIRMED_NUMBERS.filter((row) => row.n <= 20);

/** The Kibembe form of one number, exactly as the document holds it. */
const wordOfNumber = (n) => COUNTING.find((row) => row.n === n)?.kb || String(n);

/** The two other confirmed numbers beside the right one, so every choice put up is a Kibembe form. */
function otherNumbers(answer, seed) {
  const out = [];
  for (let step = 1; out.length < 2 && step <= COUNTING.length; step += 1) {
    const row = COUNTING[(seed + step * 5) % COUNTING.length];
    if (row.n === answer || out.includes(row.kb)) continue;
    out.push(row.kb);
  }
  return out;
}

/**
 * One calculation of every day: the two figures and the sign between them, with the three choices
 * standing as confirmed Kibembe numbers — so the counting is met in the language itself, and no word
 * problem about coins, fruits or journeys is ever put in front of a student.
 */
function sumQuestion(index, left, symbol, right, answer, picture) {
  const answerWord = wordOfNumber(answer);
  return challengeQuestion(
    `sum:${index}`,
    'Calculation',
    'Calculate ',
    `${left} ${symbol} ${right}`,
    ' = ?',
    answerWord,
    otherNumbers(answer, index),
    `${left} ${symbol} ${right} = ${answer} — ${answerWord}.`,
    picture
  );
}

/**
 * One challenge, drawn from the place its own number gives it: the same number always draws the same
 * challenge, and two different numbers never draw the same one — which is what lets a paper reach for a
 * challenge instead of a word that has already been asked.
 */
export function challengeAt(index, everyday = false) {
  const picture = mathsPictureFor(index * 2);
  const a = Math.floor(index / 20) + 2;
  const b = (index % 20) + 2;

  if (everyday) {
    // Every calculation of every day is a plain sum of small figures — 2 + 2 = ? — answered in Kibembe.
    const kind = index % 4;
    const first = (index % 9) + 1;
    const second = (Math.floor(index / 9) % 9) + 1;

    if (kind === 0) return sumQuestion(index, first, '+', second, first + second, picture);

    if (kind === 1) {
      const high = first === second ? first + 1 : Math.max(first, second);
      const low = Math.min(first, second);
      return sumQuestion(index, high, '−', low, high - low, picture);
    }

    if (kind === 2) {
      const one = (index % 4) + 2;
      const other = (Math.floor(index / 4) % 4) + 1;
      return sumQuestion(index, one, '×', other, one * other, picture);
    }

    const divisor = (index % 3) + 2;
    const each = (Math.floor(index / 3) % 4) + 2;
    return sumQuestion(index, divisor * each, '÷', divisor, each, picture);
  }

  const type = Math.floor(index / 250);
  const symbol = ['+', '−', '×', '÷'][type];
  const left = type === 1 ? a + b : type === 3 ? a * b : a;
  const answer = type === 0 ? a + b : type === 1 ? a : type === 2 ? a * b : a;
  const expression = `${left} ${symbol} ${b}`;
  return challengeQuestion(
    `challenge:calc:${index}`,
    'Calculation',
    'Calculate ',
    expression,
    ' = ?',
    answer,
    [answer + 2, Math.max(0, answer - 2)],
    `${expression} = ${answer}.`,
    picture
  );
}

/**
 * One episode's paper of ten challenges: the ten places its own number gives it, so the papers beside
 * each other never draw the same calculation, and every paper shows ten different scenes.
 */
export function buildCalculationPaper(episode, everyday = false) {
  const start = (episode - 1) * 10;
  return shuffled(Array.from({ length: 10 }, (_, slot) => challengeAt(start + slot, everyday)));
}