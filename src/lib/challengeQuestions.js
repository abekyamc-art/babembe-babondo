import { shuffled } from '@/lib/examSeries';

export function challengeQuestion(id, focus, lead, key, tail, right, wrong, explain) {
  const options = shuffled([String(right), ...wrong.map(String)]);
  return { id, focus, lead, key: String(key), tail, prompt: `${lead}${key}${tail}`, kb: '', options, correct: options.indexOf(String(right)), explain, practice: [] };
}

export function buildCalculationPaper(episode, everyday = false) {
  const start = (episode - 1) * 10;
  return shuffled(Array.from({ length: 10 }, (_, slot) => {
    const index = start + slot;
    const a = Math.floor(index / 20) + 2;
    const b = index % 20 + 2;
    if (everyday) {
      const type = index % 4;
      if (type === 0) return challengeQuestion(`life-math:${index}`, 'Shopping', `You buy ${b} items costing `, `${a} coins each`, '. How many coins do you spend?', a * b, [a * b + b, a * b - 1], `${b} × ${a} = ${a * b} coins.`);
      if (type === 1) return challengeQuestion(`life-math:${index}`, 'Sharing', `Share ${a * b} fruits equally among `, `${b} people`, '. How many fruits does each person get?', a, [a + 1, a + 3], `${a * b} ÷ ${b} = ${a} fruits per person.`);
      if (type === 2) return challengeQuestion(`life-math:${index}`, 'Number patterns', 'What comes next: ', `${a}, ${a + b}, ${a + 2 * b}`, ', ...?', a + 3 * b, [a + 2 * b + 1, a + 4 * b], `Add ${b} at each step. The next number is ${a + 3 * b}.`);
      return challengeQuestion(`life-math:${index}`, 'Time', `A journey lasts ${a} hours and `, `${b} minutes`, '. How many minutes is that altogether?', a * 60 + b, [a * 60 + b + 60, a * 60 + b - 1], `${a} × 60 + ${b} = ${a * 60 + b} minutes.`);
    }
    const type = Math.floor(index / 250);
    const symbol = ['+', '−', '×', '÷'][type];
    const left = type === 1 ? a + b : type === 3 ? a * b : a;
    const answer = type === 0 ? a + b : type === 1 ? a : type === 2 ? a * b : a;
    const expression = `${left} ${symbol} ${b}`;
    return challengeQuestion(`calculation:${index}`, 'Calculation', 'Calculate ', expression, ' = ?', answer, [answer + 2, Math.max(0, answer - 2)], `${expression} = ${answer}.`);
  }));
}