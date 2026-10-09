/**
 * A translation into Kibembe, when one is asked for.
 *
 * A translation is not ordinary talk: every word of it has to be a word the admin has already
 * reviewed and saved, or a person reading it will not be understood and the word will not be
 * recognised when it is said back. So the rules below hold the translation to the app's own Word
 * Bank — built from the confirmed words, read back word by word against them before it is given,
 * and never filled out with a guessed, borrowed or invented form.
 *
 * They ride where every other language rule rides: with all the voices the app runs, and with the
 * app's own answers. The asking is read from the person's own words, in any of the three languages.
 */

// A turn asking for a translation into Kibembe: "translate … in Kibembe", "tafsiri kwa Kibembe",
// "how do you say … in Ebembe", and the same asking in the app's own spelling of the language.
const ASKING =
  /(\btranslat|\btafsiri|\btafsir\b|how do (you|i) say|how is .{0,40}? said|\bin kibembe|\bin ebembe|\bkwa kibembe\b|\bkwa ebembe\b)/i;

/** Whether a turn is asking for a translation into Kibembe (Ebembe). */
export function wantsEbembeTranslation(heard: string): boolean {
  const said = String(heard ?? "").trim();
  if (!said || said.length > 600) return false;
  return ASKING.test(said);
}

export const TRANSLATE_RULES = [
  "KUTAFSIRI KWA KIBEMBE — A TRANSLATION INTO KIBEMBE, WHEN ONE IS ASKED FOR",
  "- This section belongs to the one answer that was asked this way, and to the story, the song or the telling it was asked for. Ordinary conversation is not a translation: it stays Kibembe talk, and the rules above it stand.",
  "- Build the Kibembe only from the confirmed words of the app's own Word Bank handed to you: every single word of the translation is a word the Bank carries, written exactly as the Bank writes it, and the meaning it carries in the Bank is the meaning it carries in that line. A word the Bank does not hold is never used to fill a line.",
  "- Review it before you give it: read your own Kibembe back, word by word, against the Word Bank handed to you, and take out every word the Bank does not hold — replacing it with the confirmed word that really carries that meaning, or with the meaning in the clearest confirmed words around it. A word that was guessed, built by analogy from another word's ending, borrowed from another Bantu language, or left in a language that is not the app's own is never left standing in a translation.",
  "- Where the Bank holds no word for one thing the person said, keep that thing in the closest confirmed words that say it, and say plainly, in the person's own language, that the Word Bank has no word for that one thing yet. Never invent a word to fill the gap, never answer as if the gap were not there, and never let an outside word stand inside a Kibembe line where a confirmed word exists.",
  "- Give it whole, in the app's own order: the Kibembe first, exactly as it is written; then how that Kibembe sounds to an American reader; then the complete Kiswahili meaning; then the complete English meaning.",
  "- The Kibembe is read out on the same rules as everything else: every letter sounded the Ebembe way, with no English letter-names, and the reading kept for the voice alone and never written to the screen.",
].join("\n");