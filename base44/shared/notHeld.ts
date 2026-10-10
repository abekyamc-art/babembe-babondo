import { MAX_MEANING, MAX_TERM, clean } from "./knowledgeWords.ts";

/**
 * What the app says when its own confirmed knowledge holds nothing of a turn.
 *
 * Every AI of this app answers from the admin's confirmed Kibembe and from nothing else, so a turn
 * the app holds nothing of is never covered by a sentence built to fill the gap: what is said is one
 * of the admin's own confirmed lines, whole, and no Kibembe is invented around it.
 *
 * Both lines stand in the admin's own document — "Shi ke — I do not know." and
 * "Oto ela — Please repeat." — and they are read out of the confirmed words here rather than fixed in
 * this file, so a correction the admin makes to either of them is the line every AI says from that
 * moment on.
 */

// The two lines as the admin's document writes them, kept only as the last resort: the confirmed words
// are read first, and the document's own newest spelling of the line is what is said wherever it holds
// one. Neither of these is ever spoken as a form of its own where the bank confirms another spelling.
export const NOT_HELD = "Shi ke";
export const ASK_AGAIN = "Oto ela";

// The meaning each line carries in the document, so the line is found by what it says rather than by a
// spelling fixed here.
const NOT_HELD_MEANING = /^(?:i (?:do not|don't) know|sijui)\b/i;
const ASK_AGAIN_MEANING = /^(?:please )?(?:repeat|say (?:it|that) again|tena)\b/i;

/** The admin's own confirmed line for one meaning, read out of the words the app holds. */
function lineFor(rows: any[], meaning: RegExp): string {
  for (const row of rows || []) {
    if (!meaning.test(clean(row?.meaning, MAX_MEANING))) continue;
    const term = clean(row?.term, MAX_TERM);
    // a line of one word or a short phrase is a line of talk: a long entry is a rule or a note
    if (term && term.split(/\s+/).length <= 4) return term;
  }
  return "";
}

/** The confirmed Kibembe line said for a turn the app holds nothing of: "Shi ke — I do not know." */
export function notHeldLine(rows: any[] = []): string {
  return lineFor(rows, NOT_HELD_MEANING) || NOT_HELD;
}

/** The confirmed Kibembe line said when the app has nothing of its own to say again. */
export function askAgainLine(rows: any[] = []): string {
  return lineFor(rows, ASK_AGAIN_MEANING) || ASK_AGAIN;
}