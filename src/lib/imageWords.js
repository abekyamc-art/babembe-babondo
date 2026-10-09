/**
 * The words the admin hands in with a run of pictures.
 *
 * They are the second place a word for a picture is looked for — after the words of the knowledge
 * document — so a batch of pictures whose names carry words the document does not hold yet can still
 * be matched as it arrives. They are written one to a line, or separated by commas, and are sent to
 * the server as a plain list.
 */
export function parseWords(text) {
  return String(text || "")
    .split(/[\n,;]+/)
    .map((word) => word.replace(/\s+/g, " ").trim().slice(0, 40))
    .filter((word, at, all) => word.length > 1 && all.indexOf(word) === at)
    .slice(0, 200);
}