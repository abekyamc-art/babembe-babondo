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