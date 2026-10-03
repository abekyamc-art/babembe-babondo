import { base44 } from "@/api/base44Client";

// each line is split at the first of these, so "word = meaning", "word - meaning",
// "word: meaning" and a tab between the two all read the same way
const SEPARATOR = /[=\-—:\t]/;

// a list goes to the server in these batches, so a whole vocabulary lands in one go
const BATCH = 500;

/**
 * A pasted list read line by line: the Ebembe word before the separator, its
 * meaning after it. A line with no separator still counts as a word, with the
 * meaning left blank to be filled in later.
 */
export function parseWordList(raw) {
  const entries = [];
  const skipped = [];

  String(raw || "")
    .split(/\r?\n/)
    .forEach((line, index) => {
      if (!line.trim()) return;
      const at = line.search(SEPARATOR);
      if (at === -1) {
        entries.push({ term: line.trim(), meaning: "" });
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

  return { entries, skipped };
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

/** What the assistant knows of the list, in one plain line. */
export function knownLine(stats) {
  if (!stats || !stats.total) return "";
  const total = stats.total.toLocaleString();
  if (stats.whole) return `The assistant knows all ${total} words.`;
  return `The assistant knows ${stats.carried.toLocaleString()} of ${total} words — the list is longer than one session can carry.`;
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