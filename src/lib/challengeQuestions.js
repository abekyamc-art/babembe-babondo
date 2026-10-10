import { shuffled } from '@/lib/examSeries';
import { mathsPictureFor } from '@/lib/examImages';

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
    const type = index % 4;
    if (type === 0) {
      return challengeQuestion(
        `challenge:life:${index}`,
        'Shopping',
        `You buy ${b} items costing `,
        `${a} coins each`,
        '. How many coins do you spend?',
        a * b,
        [a * b + b, a * b - 1],
        `${b} × ${a} = ${a * b} coins.`,
        picture
      );
    }
    if (type === 1) {
      return challengeQuestion(
        `challenge:life:${index}`,
        'Sharing',
        `Share ${a * b} fruits equally among `,
        `${b} people`,
        '. How many fruits does each person get?',
        a,
        [a + 1, a + 3],
        `${a * b} ÷ ${b} = ${a} fruits per person.`,
        picture
      );
    }
    if (type === 2) {
      return challengeQuestion(
        `challenge:life:${index}`,
        'Number patterns',
        'What comes next: ',
        `${a}, ${a + b}, ${a + 2 * b}`,
        ', ...?',
        a + 3 * b,
        [a + 2 * b + 1, a + 4 * b],
        `Add ${b} at each step. The next number is ${a + 3 * b}.`,
        picture
      );
    }
    return challengeQuestion(
      `challenge:life:${index}`,
      'Time',
      `A journey lasts ${a} hours and `,
      `${b} minutes`,
      '. How many minutes is that altogether?',
      a * 60 + b,
      [a * 60 + b + 60, a * 60 + b - 1],
      `${a} × 60 + ${b} = ${a * 60 + b} minutes.`,
      picture
    );
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