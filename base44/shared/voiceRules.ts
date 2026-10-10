import { bankRows, knowledgeStamp } from "./wordBank.ts";
import { recordedEvidence } from "./pronunciation.ts";
import { savedWords } from "./knowledgeWords.ts";
import { docWholeBlock } from "./knowledgeDoc.ts";

/**
 * Everything a voice answers from, gathered in one place.
 *
 * A voice that hears and answers on its own account — a Cartesia agent, and now the app's own OpenAI
 * seat — is given the admin's saved material the moment its call is opened, because a call sends such
 * a voice sound and nothing else: the one place the app can say anything to it is the rules block it
 * carries. This is that material: the admin's saved answers, the confirmed Kibembe words, the ways the
 * confirmed words are really said, and as much of the admin's one document as a voice can carry.
 *
 * It is read here, once, so both the agent side and the app's own OpenAI seat answer from the very
 * same material — a word the admin confirms, or a correction Gloire Sadiku gives, is in force on the
 * next call of every voice at the same moment.
 */

// the admin's saved answers and saved notes, newest first: what a voice answers with
const KEY_ROWS = 200;
const NOTE_ROWS = 60;

/**
 * The admin's saved material as a voice reads it, with the stamp saying what the store looked like
 * when it was read — so a caller that keeps the material on its own account can tell at a glance
 * whether what it holds is still current.
 */
export async function loadSavedMaterial(base44: any, docRoom: number) {
  const [keys, notes, words, doc, bank, evidence, stamp] = await Promise.all([
    base44.asServiceRole.entities.AssistantKnowledge.filter(
      { kind: "qa" },
      { sort: "-created_date", limit: KEY_ROWS, fields: ["question", "answer"] }
    ),
    base44.asServiceRole.entities.AssistantKnowledge.filter(
      { kind: "note" },
      { sort: "-created_date", limit: NOTE_ROWS, fields: ["title", "text"] }
    ),
    savedWords(base44),
    // the admin's one knowledge document, as much of it as a voice can carry: its rules whole, the
    // parts that matter, and a slice of every other part
    docWholeBlock(base44, docRoom),
    // and how the confirmed words are really said: the readings the person's own corrections carry,
    // and the ways their approved recordings were written down
    bankRows(base44),
    recordedEvidence(base44),
    knowledgeStamp(base44),
  ]);

  return {
    stamp,
    saved: {
      keys: Array.isArray(keys) ? keys : keys?.items || [],
      notes: Array.isArray(notes) ? notes : notes?.items || [],
      words,
      doc,
      bank: Array.isArray(bank) ? bank : bank?.items || [],
      evidence,
    },
  };
}