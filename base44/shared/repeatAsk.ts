import { clean } from "./knowledgeWords.ts";

/**
 * "What did you say?" — the one ask that is answered with the same line twice.
 *
 * "Omo tenda bile?" and "Omo tenda ii-ii?" are not a question about Kibembe and not a lesson: the
 * person is asking for the line they have just been given, because it was not heard or not caught.
 * The ask is recognised here, in the app's own code, from the words themselves — the ears write it a
 * dozen ways — and the line that goes back is the one the app already holds: the last line it put
 * before them, handed over whole and unchanged.
 *
 * Nothing is ever written for the ask: no new sentence, no English meaning, no syllable reading, no
 * Kiswahili version, and no explanation of what was said. Where no line of the assistant's own
 * stands — the very first turn of a call — nothing is invented to fill the place: the app says
 * plainly that nothing has been said yet and asks one short question.
 */

/** A line given back is a line of talk: long enough to say what was said, and no longer. */
const MAX_LINE = 1200;

/**
 * The ask as it is taught, and the ways the ears write it down: the two words said together, an extra
 * letter, the hyphen written as a space or dropped altogether. Each ask is compared word by word, so a
 * spelling the ears made up never hides it.
 */
const ASKS: string[][] = [
  ["tenda", "bile"],
  ["tenda", "bilei"],
  ["tenda", "i"],
  ["tenda", "ii"],
  ["tenda", "i", "i"],
  ["tenda", "ii", "ii"],
  // the same ask in the words the app's own saved greetings give for it — "Oto ela — Please repeat"
  ["oto", "ela"],
  ["otela"],
];

/** The words of one turn, however it was written: marks and hyphens are the spaces between them. */
function askWords(value: any): string[] {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

/**
 * Whether one turn is the person asking for the line they have just been given. Nothing else is ever
 * read as this ask: the ask is the two taught words together, so the word "tenda" on its own — which
 * is an ordinary word of the language — is never taken for it.
 */
export function isRepeatAsk(heard: any): boolean {
  const said = askWords(heard);
  if (!said.length) return false;
  return ASKS.some((ask) =>
    said.some(
      (_, at) => at + ask.length <= said.length && ask.every((word, step) => said[at + step] === word)
    )
  );
}

/**
 * The ask as it rides into a voice's call, with the line that is to be given back: what the turn
 * means, the line itself, and in the same breath that the rules keeping an answer from being said
 * twice — and the four parts a phrase is taught in — do not stand on a turn like this.
 */
export function repeatNote(heard: any, lastAgent: any): string {
  const said = clean(heard, 240);
  const line = clean(lastAgent, MAX_LINE);

  const head =
    "SAFI YA KUSEMA TENA — THE PERSON HAS ASKED FOR THAT AGAIN\n" +
    `One turn was just said: "${said}"\n` +
    'It is the app\'s own ask for a repeat: it means "What did you say?" Nothing else is being asked of you, and this is not a lesson and not a phrase request.\n';

  if (!line) {
    return (
      head +
      "- No line of your own was handed over with this turn, so nothing is invented to fill the place: never write a line you did not say, and never answer as though you had said one.\n" +
      "- Where you have just given a line, give that same line again exactly as it stood. Where nothing has been said yet, say plainly, in one short Kibembe line, that nothing has been said yet, and ask one short question about what they would like to hear.\n"
    );
  }

  return (
    head +
    `Your own last line was, word for word: "${line}"\n` +
    "- Say exactly that line again, exactly as it stands: the same words, in the same order, spelled the same way. It is the whole answer, and nothing is added to it and nothing is left out of it.\n" +
    "- Do not shorten it, do not re-word it, and do not add an English meaning, a Kiswahili version, a syllable reading or a pronunciation note. Never explain what you said, and never say it in other words.\n" +
    "- The rule that the same answer is never given twice in one call does not stand here, and neither do the four parts a phrase is taught in: this is that same line being asked for, so it is given again exactly as it was.\n" +
    "- Give the line and nothing else — never their own question back to them, and never a note about repeating it.\n"
  );
}

/**
 * His own last line, read back off the talk so far: the last line that was his, and nothing at all
 * when the talk holds none. What a repeat ask gives back is this line, and it is never guessed at.
 */
export function lastOwnLine(history: any): string {
  // the talk may reach here as it was written — one line to a turn — or gathered onto one line, so
  // the line is found by its speaker's mark wherever it stands rather than by the line it is on
  const talk = String(history ?? "").replace(/[ \t]+/g, " ").trim();
  if (!talk) return "";

  const own = /\b(?:wewe|assistant|agent)\s*:\s*/gi;
  let at = -1;
  let mark = own.exec(talk);
  while (mark) {
    at = mark.index + mark[0].length;
    mark = own.exec(talk);
  }
  if (at < 0) return "";

  // the line runs to the next speaker's mark, or to the end of the talk
  const rest = talk.slice(at);
  const next = rest.search(/\b(?:mtu|wewe|person|user|assistant|agent)\s*:/i);
  return clean(next < 0 ? rest : rest.slice(0, next), MAX_LINE);
}