/**
 * A turn the ears wrote down in a script this app's people never speak.
 *
 * Ebembe, Kiswahili, English and every other language of this app are written in Latin letters, so a
 * line that comes back in Chinese, Japanese or Korean characters is the ears guessing at a language
 * nobody said: the words are not the person's words, and no answer should be written from them.
 * The blocks are matched as they are written in the text: kana and the Japanese and Chinese
 * ideographs, Hangul, and the compatibility forms of the same characters.
 */
const OTHER_SCRIPTS = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\uf900-\ufaff]/;

/** Whether one written turn came back in a script this app's people never speak. */
export function isMisheard(text) {
  return OTHER_SCRIPTS.test(String(text || ""));
}

// A turn of speech carries at least a word: two letters is the least a word of this app's languages
// is written with.
const FEWEST_LETTERS = 2;

/**
 * Whether what the ears wrote is a turn of speech at all.
 *
 * A breath of room noise, a fan, a door coming back written down is a fragment, a stray mark, or
 * nothing at all — never the person's words. Nothing is shown, held or answered from one: the turn
 * is simply asked for again, so no line nobody said is ever put on the screen as theirs.
 */
export function isRealTurn(text) {
  const line = String(text || "").trim();
  if (!line) return false;
  return line.replace(/[^\p{L}\p{N}]/gu, "").length >= FEWEST_LETTERS;
}

/** The line the person is given when a capture carried no turn of speech to answer. */
export const SAY_AGAIN_TURN = "Didn't catch that — say it again.";

/**
 * The line the person is given when the ears come back with a language nobody on this call speaks.
 * The turn is asked for once more rather than written down and answered as words they never said.
 */
export const SAY_AGAIN_KIBEMBE = "Those weren't words from here — say it again, in Kibembe.";