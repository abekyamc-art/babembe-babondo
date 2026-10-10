/**
 * HOW KIBEMBE IS WRITTEN FOR A VOICE THAT DOES NOT KNOW IT.
 *
 * Gloire Sadiki's own reading rules, applied to the Kibembe form standing in a line, so a voice that
 * knows no Kibembe says the sounds of the word and not the letters of its spelling. It is the app's own
 * "American reading" (see the teaching rule: Kibembe | American reading | English): the rule book gives
 * the sound of every letter, and this writes that sound the way such a voice reads it.
 *
 * The written form is never changed anywhere: it stands on the screen exactly as the Word Bank holds it,
 * and the Ebembe voice — which reads Kibembe by Kiswahili's own letters — is handed the spelling itself,
 * untouched. Only a voice with no Kibembe in it is handed this reading.
 *
 * Every rule below is one of the guide's own reading rules, and nothing is added to them:
 * - every vowel is always said: a = ah, e = eh, i = ee, o = oh, u = oo; an initial i is ee; two vowels
 *   standing together are two sounds, each said and heard apart.
 * - c is read ch (Abeca = Abecha); ch, sh, ny and the sound groups mb, nd, ng, bw, ngy are kept whole.
 * - an apostrophe is a short cut and a hyphen a clear beat: both are heard as a beat, never dropped and
 *   never run together.
 * - an initial doubled m closes the lips first (Mmendo = M-mendo).
 * - spaces are kept: words written apart are never merged.
 */

/** The sound of each vowel, as the rule book gives it. */
const VOWELS: Record<string, string> = { a: "ah", e: "eh", i: "ee", o: "oh", u: "oo" };

/** The base letter of an accented one: an accent lowers or lifts the voice, it never changes the sound. */
function base(letter: string): string {
  return letter.toLowerCase().normalize("NFD").charAt(0);
}

/** One run of letters and marks, read as the rule book gives it. */
function readPiece(piece: string): string {
  let out = "";
  let said = false; // whether a vowel has just been said, so the next vowel stands apart from it
  for (let at = 0; at < piece.length; at += 1) {
    const letter = piece.charAt(at);
    const plain = base(letter);

    // c is read ch: an "h" right behind it is that one ch sound and is left exactly as it stands
    if (plain === "c" && base(piece.charAt(at + 1)) !== "h") {
      out += "ch";
      said = false;
      continue;
    }

    const sound = VOWELS[plain];
    if (sound) {
      if (said) out += "-";
      out += sound;
      said = true;
      continue;
    }

    out += plain;
    said = false;
  }
  return out;
}

/** One word of a line, with its apostrophes and hyphens heard as the beats they are. */
function readWord(word: string): string {
  const pieces = word.split(/([’'\-])/); // the marks are kept, so a beat is never lost
  const said: string[] = [];
  let beat = false; // a beat stands written before the piece now being read
  const opensLips = /^mm/i.test(word);

  pieces.forEach((piece) => {
    if (piece === "'" || piece === "’" || piece === "-") {
      beat = true;
      return;
    }
    if (!piece) return;

    if (!said.length) {
      // a word opening on a doubled m closes the lips first and releases into the word
      said.push(opensLips ? `m-${readPiece(piece.replace(/^mm/i, "m"))}` : readPiece(piece));
      beat = false;
      return;
    }

    // a "y" standing on its own joins the sound behind it (y-imo = yee-moh); everything else keeps the
    // beat it was written with, so each part is read and then joined naturally
    const joins = beat && !(said.length === 1 && said[0] === "y");
    said.push(`${joins ? "-" : ""}${readPiece(piece)}`);
    beat = false;
  });

  return said.join("");
}

/** A Kibembe form written the way a voice that does not know Kibembe reads it. */
export function ebembeReading(text: string): string {
  return String(text || "")
    .split(/\s+/)
    .filter(Boolean)
    .map(readWord)
    .join(" ");
}

/**
 * The line a voice that does not know Kibembe is handed: the Kibembe form standing inside it is written
 * as it sounds, and every other word of the line — an instruction, a meaning, a name — is left exactly as
 * it stands. A line with no Kibembe form in it is handed on untouched.
 */
export function readForVoice(line: string, kibembe: string): string {
  const text = String(line || "");
  const form = String(kibembe || "").trim();
  if (!form) return text;
  const pattern = form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(pattern, "gi"), ebembeReading(form));
}