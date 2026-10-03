import { base44 } from "@/api/base44Client";
import { countWords, formatLength, splitPassages } from "@/lib/knowledgeTexts";

// each line is split at the first of these, so "word = meaning", "word - meaning",
// "word: meaning" and a tab between the two all read the same way
const SEPARATOR = /[=\-—:\t]/;

// the paste kept whole as a document is named this, so the words tab finds it again
const PASTE_TITLE = "Words, plurals and rules";

// a list goes to the server in these batches, so a whole vocabulary lands in one go
const BATCH = 500;

/**
 * A paste read line by line: the Ebembe word before the separator, its meaning
 * after it. A line with no separator is a plural or a rule, so it stays in the
 * document the assistant answers from instead of becoming a word with no meaning.
 */
export function parseWordList(raw) {
  const entries = [];
  const skipped = [];
  let ruleCount = 0;

  String(raw || "")
    .split(/\r?\n/)
    .forEach((line, index) => {
      if (!line.trim()) return;
      const at = line.search(SEPARATOR);
      if (at === -1) {
        ruleCount += 1;
        return;
      }
      const term = line.slice(0, at).trim();
      const meaning = line.slice(at + 1).trim();
      if (!term) {
        skipped.push(index + 1);
        return;
      }
      entries.push({ term, meaning });
    });

  return { entries, skipped, document: String(raw || "").trim(), ruleCount };
}

export function listLine(word) {
  return word.meaning ? `${word.term} = ${word.meaning}` : word.term;
}

export function wordCount(words) {
  const count = words.length;
  return `${count.toLocaleString()} ${count === 1 ? "word" : "words"}`;
}

/**
 * How much of the saved list the assistant is actually given, counted on the
 * server so a list of any size is stated honestly.
 */
export async function loadWordStats() {
  try {
    const res = await base44.functions.invoke("assistantKnowledge", { stats: true });
    const words = res?.data?.words;
    if (!words || typeof words.total !== "number") return null;
    return words;
  } catch (err) {
    return null;
  }
}

/** What one paste brought in, in one plain line: its words, and its plurals and rules. */
export function readLine({ entries, ruleCount }) {
  const said = [];
  if (entries.length) said.push(wordCount(entries));
  if (ruleCount) said.push(`${ruleCount.toLocaleString()} lines of plurals and rules`);
  return said.length ? `${said.join(" and ")} read` : "";
}

/** What the assistant knows: how much of the list he is given, and the document he searches. */
export function knownLine(stats, docWords) {
  const said = [];
  if (stats && stats.total) {
    const total = stats.total.toLocaleString();
    said.push(
      stats.whole
        ? `The assistant knows all ${total} words.`
        : `The assistant knows ${stats.carried.toLocaleString()} of ${total} words — the list is longer than one session can carry.`
    );
  }
  if (docWords) {
    said.push(
      `The whole document (${formatLength(docWords)}) is kept and searched with every question.`
    );
  }
  return said.join(" ");
}

/**
 * The paste kept whole as the document the assistant answers from, cut into the
 * passages a question is matched against, so a paste of any length is stored in
 * full and no part of it is ever left behind.
 */
export async function savePasteDocument(text, docId) {
  const body = String(text || "").trim();
  if (!body) return null;
  const fields = {
    title: pasteTitle(),
    text: body,
    word_count: countWords(body),
    passages: splitPassages(body),
    file_uri: "",
  };
  if (docId) {
    const saved = await base44.entities.KnowledgeText.update(docId, fields);
    return { id: saved.id, word_count: saved.word_count };
  }
  const saved = await base44.entities.KnowledgeText.create(fields);
  return { id: saved.id, word_count: saved.word_count };
}

/** The document a paste was kept as, so a later paste writes over it instead of piling up. */
export async function loadPasteDoc() {
  try {
    const page = await base44.entities.KnowledgeText.filter(
      { title: { $regex: `^${PASTE_TITLE}` } },
      { sort: "-updated_date", limit: 1, fields: ["title", "word_count"] }
    );
    const row = (page?.items || [])[0];
    return row ? { id: row.id, word_count: row.word_count || 0 } : null;
  } catch (err) {
    return null;
  }
}

function pasteTitle() {
  const when = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${PASTE_TITLE} — pasted ${when}`;
}

/**
 * The whole list written as word entries. What did land comes back with what is
 * still to write, so a list is never half lost or written twice.
 */
export async function saveWordList(words) {
  const saved = [];
  for (let i = 0; i < words.length; i += BATCH) {
    const group = words.slice(i, i + BATCH);
    try {
      const created = await base44.entities.AssistantKnowledge.bulkCreate(
        group.map((word) => ({ kind: "word", term: word.term, meaning: word.meaning, usage: "" }))
      );
      if (Array.isArray(created)) saved.push(...created);
    } catch (err) {
      return { saved, remaining: words.slice(i) };
    }
  }
  return { saved, remaining: [] };
}