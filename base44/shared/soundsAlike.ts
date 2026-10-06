/**
 * Words as they sound rather than as they are spelled. A word the assistant only
 * heard is matched to the one the admin saved even when an accent, a letter or the
 * vowels of a phrase differ — ûle bilé, ole bile and oli bile all reach one entry.
 */

const VOWELS = "aeiou";

// how far a spelling may wander before it is taken for a different word
const LONG_WORD = 5;
const NEAR_EDITS = { long: 3, short: 2 };

/** Letters and digits only, accents and case dropped. */
export function tight(value: any) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** The consonants a word stands on, so only a change of sound matters. */
export function skeleton(value: any) {
  const letters = tight(value);
  const kept: string[] = [];
  for (let i = 0; i < letters.length; i += 1) {
    const letter = letters[i];
    if (VOWELS.includes(letter)) continue;
    if (kept[kept.length - 1] === letter) continue;
    kept.push(letter);
  }
  return kept.join("");
}

/** How many letters have to change for one word to become the other. */
function edits(a: string, b: string, cap: number) {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;

  let prev: number[] = [];
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    const next = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      next[j] = Math.min(prev[j] + 1, next[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = next;
  }
  return prev[b.length];
}

/** What the person may have said: one word at a time, and two at a time. */
function saidPhrases(heard: string) {
  const words = String(heard ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);

  const out: Array<{ tight: string; said: string }> = [];
  words.forEach((word, index) => {
    out.push({ tight: word, said: word });
    const next = words[index + 1];
    if (next) out.push({ tight: `${word}${next}`, said: `${word} ${next}` });
  });

  const seen = new Set<string>();
  return out.filter((phrase) => {
    if (seen.has(phrase.tight)) return false;
    seen.add(phrase.tight);
    return true;
  });
}

/** How a saved word stands against what was heard, or nothing when it is far off. */
function closeness(term: string, said: { tight: string; said: string }, root: string) {
  const word = tight(term);
  if (!word) return null;
  if (word === said.tight) return { tier: 0, edits: 0 };

  // an accent or one letter apart is the same word spoken a little differently
  if (Math.min(word.length, said.tight.length) >= 3 && edits(word, said.tight, 1) <= 1) {
    return { tier: 1, edits: 1 };
  }

  // same consonants: the vowels may wander as far as they like — but only when the
  // words are long enough for their consonants to mean anything
  const termRoot = skeleton(term);
  const long = Math.max(termRoot.length, root.length);
  const short = Math.max(word.length, said.tight.length);
  if (
    termRoot.length >= 2 &&
    root.length >= 2 &&
    long >= 3 &&
    // a word twice the length of the other is a different word, not a variant of it
    Math.min(word.length, said.tight.length) * 2 + 1 >= short &&
    (termRoot === root || root.includes(termRoot) || termRoot.includes(root))
  ) {
    return { tier: 2, edits: edits(word, said.tight, 4) };
  }

  return null;
}

/**
 * The other ways one saved word is known to come out: the variations kept with it, each one confirmed
 * by a person during a call. Every one of them is the same word, never a word of its own.
 */
export function heardForms(row: any): string[] {
  const list = Array.isArray(row?.heard) ? row.heard : [];
  return list
    .map((form: any) => String(form ?? "").trim())
    .filter((form: string) => !!form && form.length <= 40);
}

/** Every spelling one saved entry is known by: the word as the bank writes it, then its variations. */
export function spellingsOf(row: any): string[] {
  const term = String(row?.term ?? "").trim();
  const forms = heardForms(row);
  return term ? [term, ...forms] : forms;
}

/**
 * Whether one heard word really is one saved word said another way — and not merely a word that
 * shares some of its sounds.
 *
 * This is the rule the app's own reading of a turn stands on, so it is deliberately narrow: the same
 * spelling, one letter or one accent apart, or the same consonants in the same order in words of a
 * similar length. A wider resemblance is left to the voice answering the call, which carries the
 * whole Word Bank and the rules of the call with it: the app itself never answers a word nobody said.
 */
export function strongMatch(heard: any, term: any): boolean {
  const word = tight(heard);
  const want = tight(term);
  if (!word || !want) return false;
  if (word === want) return true;
  if (Math.min(word.length, want.length) < 3) return false;
  // a word twice the length of the other is a different word, not a variant of it
  if (Math.min(word.length, want.length) * 2 < Math.max(word.length, want.length)) return false;
  if (edits(word, want, 2) <= 1) return true;
  // the vowels may wander, the consonants may not: the same consonants, in the same order
  const a = skeleton(word);
  const b = skeleton(want);
  return a.length >= 3 && a === b && Math.abs(word.length - want.length) <= 2;
}

/**
 * The saved words one heard turn is a strong match to, with what was said for each of them: the word
 * itself, or two words of the turn said together, standing as the same word. Only a strong match is
 * taken, so a reading made from this is never a guess at a word nobody said.
 */
export function strongTerms(
  heard: string,
  rows: any[]
): { term: string; spelling: string; said: string }[] {
  const phrases = saidPhrases(heard);
  if (!phrases.length) return [];

  const found: { term: string; spelling: string; said: string; span: number }[] = [];
  for (const row of rows) {
    const term = String(row?.term ?? "").trim();
    const spellings = spellingsOf(row);
    if (!spellings.length) continue;

    let best: { spelling: string; said: string; span: number } | null = null;
    for (const phrase of phrases) {
      for (const spelling of spellings) {
        if (!strongMatch(phrase.tight, spelling)) continue;
        // the longest thing the person said that stands as this word is the one that names it
        if (!best || phrase.tight.length > best.span) {
          best = { spelling, said: phrase.said, span: phrase.tight.length };
        }
      }
    }
    if (best) {
      found.push({ term: term || best.spelling, spelling: best.spelling, said: best.said, span: best.span });
    }
  }

  // the longest match leads, so a saved expression beats a single word inside it
  found.sort((a, b) => b.span - a.span || a.term.length - b.term.length);
  return found.map(({ term, spelling, said }) => ({ term, spelling, said }));
}

/**
 * The saved words closest to what was heard, nearest first: the same word, then a
 * letter or an accent apart, then words standing on the same consonants. Only when
 * none of those fit are the nearest spellings offered instead, so the person can
 * say which one was meant.
 */
export function alikeTerms(heard: string, rows: any[], limit = 3) {
  const phrases = saidPhrases(heard);
  if (!phrases.length) return [];

  const heardWords = phrases.map((phrase) => ({ ...phrase, root: skeleton(phrase.tight) }));
  const found: any[] = [];

  for (const row of rows) {
    const term = String(row?.term ?? "").trim();
    // every way this word is known to be said: the saved spelling and the variations kept with it
    const spellings = spellingsOf(row);
    if (!spellings.length) continue;

    let best: any = null;
    for (const spelling of spellings) {
      for (const heardWord of heardWords) {
        const close = closeness(spelling, heardWord, heardWord.root);
        if (!close) continue;
        if (
          !best ||
          close.tier < best.tier ||
          (close.tier === best.tier && close.edits < best.edits)
        ) {
          best = { ...close, heard: heardWord.said, matched: spelling };
        }
      }
    }
    if (best) {
      found.push({
        term: term || best.matched,
        meaning: row.meaning || "",
        usage: row.usage || "",
        heard: best.heard,
        tier: best.tier,
        edits: best.edits,
        // how far apart the two spellings are for their length, and how much of what
        // was said this entry accounts for
        ratio: best.edits / Math.max(tight(best.matched).length, tight(best.heard).length, 1),
        span: tight(best.heard).length,
      });
    }
  }

  // nothing sounds close: the nearest spellings are offered instead
  if (!found.length) {
    for (const row of rows) {
      const term = String(row?.term ?? "").trim();
      let best: any = null;
      for (const spelling of spellingsOf(row)) {
        const word = tight(spelling);
        if (!word) continue;
        const cap = word.length >= LONG_WORD ? NEAR_EDITS.long : NEAR_EDITS.short;

        for (const heardWord of heardWords) {
          // a misheard word keeps its opening sound, so the rest is not compared
          if (word[0] !== heardWord.tight[0]) continue;
          const away = edits(word, heardWord.tight, cap);
          if (away > cap) continue;
          if (!best || away < best.edits) {
            best = { edits: away, heard: heardWord.said, matched: spelling };
          }
        }
      }
      if (best) {
        found.push({
          term: term || best.matched,
          meaning: row.meaning || "",
          usage: row.usage || "",
          heard: best.heard,
          tier: 3,
          edits: best.edits,
          ratio:
            best.edits / Math.max(tight(best.matched).length, tight(best.heard).length, 1),
          span: tight(best.heard).length,
        });
      }
    }
  }

  // nearest first: the same word, then the closest spelling for its length, and
  // between two equally close entries the one that accounts for more of what was
  // said — so a saved two-word greeting beats a single word that merely sounds like it
  found.sort(
    (a, b) =>
      a.tier - b.tier ||
      a.ratio - b.ratio ||
      b.span - a.span ||
      a.edits - b.edits ||
      a.term.length - b.term.length
  );
  return found.slice(0, limit);
}