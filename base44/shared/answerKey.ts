/**
 * The answer key: the questions the admin saved, matched against what is being asked. A question
 * whose own words are the words being asked ranks above one that only shares a word with it, so the
 * saved answer that leads a reply is the one written for exactly this question. The voice note and
 * the app's own AI both read the key from here, so the same question finds the same answer whichever
 * provider is answering.
 */
export const KEY_LIMIT = 3;

// Short words that carry no meaning for matching, in both languages the admin writes in.
const STOPWORDS = new Set([
  "the", "and", "for", "are", "was", "were", "with", "that", "this", "from", "what",
  "who", "why", "how", "when", "where", "which", "does", "did", "about", "into",
  "your", "you", "his", "her", "its", "our", "their", "them", "they", "have", "has",
  "had", "will", "would", "can", "could", "should", "not", "but", "all", "any",
  "some", "tell", "give", "please", "there", "here", "then", "than", "also",
  "kama", "nini", "nani", "wapi", "vipi", "gani", "huyu", "hawa", "hivyo",
  "lakini", "pia", "sana", "kila", "moja", "wetu", "wake", "wangu", "yako",
  "kwenye", "katika", "kuhusu", "ambayo", "ambao", "huu", "hii", "hilo",
]);

// Anything between brackets, and any syllable-by-syllable run, is a note for the ear rather than a
// word to show: it is taken out of every line handed on, so a private pronunciation guide never
// reaches the screen or the voice.
const BRACKETED = /[([][^)\]]*[)\]]/g;
const SYLLABLES = /\b[a-z]{1,6}(?:-[a-z]{1,6}){2,}\b/gi;

/** One saved line as it is read back: brackets and syllable guides taken out. */
export function keyText(value: any): string {
  return String(value ?? "")
    .replace(BRACKETED, " ")
    .replace(SYLLABLES, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

/** The words that carry meaning in a line, in either language. */
export function keyTokens(value: any): string[] {
  const found = String(value || "").toLowerCase().match(/[\p{L}\p{N}']+/gu) || [];
  return found.filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

export type KeyMatch = { said: string; answer: string; score: number };

/**
 * The saved answers that meet what is being asked, nearest first: a saved question that matches,
 * or a saved word the person has just said. A question whose own words are the words being asked
 * ranks above one that only shares a word with it, and a word said exactly ranks above a word that
 * merely begins the same way, so the answer that leads a reply is the one saved for this turn.
 */
export function keyMatches(rows: any[], query: string, limit = KEY_LIMIT): KeyMatch[] {
  const wanted = Array.from(new Set(keyTokens(query)));
  if (!wanted.length) return [];
  const spoken = keyText(query).toLowerCase().match(/[\p{L}\p{N}']+/gu) || [];

  const scored: KeyMatch[] = [];
  for (const row of rows) {
    // a saved question and the answer to give for it
    const question = keyText(row?.question);
    const answer = keyText(row?.answer);
    if (question && answer) {
      const words = (question.toLowerCase().match(/[\p{L}\p{N}']+/gu) || []).filter(
        (word) => word.length > 2
      );
      if (!words.length) continue;

      let hits = 0;
      for (const token of wanted) {
        if (
          words.includes(token) ||
          (token.length >= 5 && words.some((word) => word.startsWith(token)))
        ) {
          hits += 1;
        }
      }
      if (!hits) continue;
      // a question that shares most of its own words is the question being asked
      scored.push({ said: question, answer, score: hits + hits / words.length });
      continue;
    }

    // a saved word the person has just said: its meaning is the answer to give
    const term = keyText(row?.term);
    if (!term) continue;
    const meaning = keyText(row?.meaning);
    if (!meaning) continue;

    const termWords = (term.toLowerCase().match(/[\p{L}\p{N}']+/gu) || []).filter(
      (word) => word.length > 2
    );
    if (!termWords.length) continue;
    const exact = termWords.every((word) => spoken.includes(word));
    const stem =
      !exact && termWords[0].length >= 4 && spoken.some((word) => word.startsWith(termWords[0]));
    if (!exact && !stem) continue;

    const usage = keyText(row?.usage);
    scored.push({
      said: term,
      answer: usage ? `${meaning} · ${usage}` : meaning,
      score: exact ? 2.6 : 1.6,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/** One matched answer as the voice note reads it: what they said, then the answer to give. */
export function keyLine(match: KeyMatch): string {
  return `- Alisema: "${match.said}"\n  JIBU: "${match.answer}"\n`;
}

/** The same, as the app's own AI reads it. */
export function keyLineEn(match: KeyMatch): string {
  return `- They said: "${match.said}"\n  Answer to give: "${match.answer}"\n`;
}