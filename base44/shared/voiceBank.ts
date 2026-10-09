import { clean } from "./knowledgeWords.ts";
import { heardForms, tight } from "./soundsAlike.ts";

/**
 * The other ways one confirmed word is known to come out, kept in one place.
 *
 * A person's own way of saying a word — an accent, a letter, a syllable, a phrase said fast, softly
 * or far from the phone — is never a word of its own: it is that same word, said another way. Every
 * such way is kept under the word it belongs to, and every reader of the app's knowledge reads them
 * from here, so the spelling the app holds and the sounds the person really makes for it can never
 * drift apart. The recordings themselves stay in the private voice bank; what rides into the hearing
 * is the way each of them was written down.
 *
 * A word's room for those ways is bounded, so a word that collects accents for years cannot grow
 * without end: the newest way always lands, and the oldest one is let go for it.
 */

export const MAX_HEARD_FORMS = 12;

/** A way of saying a word has to be something a person really says: a word, or three at most. */
function sayable(form: any): string {
  const said = clean(form, 40);
  if (!said || said.split(/\s+/).length > 3) return "";
  return said.replace(/[^\p{L}]/gu, "").length >= 3 ? said : "";
}

/**
 * The ways one word is known to be said, with what has just been confirmed joined to them. The word's
 * own confirmed spelling is never written into the list — every way kept here belongs to it.
 */
export function withHeard(row: any, ...forms: string[]): string[] {
  const out = heardForms(row).slice(0, MAX_HEARD_FORMS);
  const key = tight(clean(row?.term, 40));

  forms.forEach((form) => {
    const said = sayable(form);
    if (!said) return;
    const saidKey = tight(said);
    if (!saidKey || saidKey === key) return;
    if (out.some((kept) => tight(kept) === saidKey)) return;
    out.push(said);
  });

  // the newest way always lands: the oldest is let go only where the word is really full
  return out.slice(-MAX_HEARD_FORMS);
}

// How much of a word's past is kept: enough that a correction can be traced back, and never so much
// that the record of one word grows without end.
export const MAX_REVISIONS = 20;

/**
 * One word's past, with the state it stands in right now written onto the end of it. It is kept
 * before the word is changed, so the version that was there before a correction is never lost: the
 * newest correction is the word itself, and every older one waits here.
 */
export function withRevision(row: any, at: string): any[] {
  const kept = Array.isArray(row?.revisions)
    ? row.revisions.filter((one: any) => one && typeof one === "object").slice(-(MAX_REVISIONS - 1))
    : [];
  const term = clean(row?.term, 40);
  if (!term) return kept;
  kept.push({
    at: at || "",
    term,
    meaning: clean(row?.meaning, 200),
    heard: heardForms(row).slice(0, MAX_HEARD_FORMS),
  });
  return kept;
}