import { base44 } from "@/api/base44Client";
import { countWords, formatLength, splitPassages } from "@/lib/knowledgeTexts";
import { readPasteLine } from "@/lib/pasteLines";

// the paste kept whole as a document is named this, so the words tab finds it again
const PASTE_TITLE = "Words, plurals and rules";

// a paste goes to the server in these batches, so a whole vocabulary lands in one go
const BATCH = 400;

/**
 * A paste read line by line. A line that reads like an entry becomes a word with
 * its spelling, its meaning and — held apart from both — the pronunciation guide
 * that only the assistant hears. Every other line (plurals, rules, the alphabet,
 * headings) is kept as the document the assistant answers from rather than being
 * saved as a word with no meaning.
 */
export function parseWordList(raw) {
  const entries = [];
  const rules = [];

  String(raw || "")
    .split(/\r?\n/)
    .forEach((line) => {
      if (!line.trim()) return;
      const read = readPasteLine(line);
      if (read.kind === "word") {
        entries.push({ term: read.term, guide: read.guide, meaning: read.meaning });
        return;
      }
      rules.push(line.trim());
    });

  return {
    entries,
    rules,
    ruleCount: rules.length,
    guideCount: entries.filter((entry) => entry.guide).length,
    document: String(raw || "").trim(),
  };
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

/** What one paste brought in, in one plain line. */
export function readLine({ entries, ruleCount, guideCount, already }) {
  const said = [];
  if (entries.length) said.push(`${wordCount(entries)} read`);
  if (already) said.push(`${already.toLocaleString()} already saved and skipped`);
  if (ruleCount) {
    said.push(
      `${ruleCount.toLocaleString()} line${ruleCount === 1 ? "" : "s"} of plurals, rules and letters kept as a document`
    );
  }
  if (guideCount) {
    said.push(
      `${guideCount.toLocaleString()} pronunciation guide${guideCount === 1 ? "" : "s"} set aside`
    );
  }
  return said.length ? `${said.join(", ")}.` : "";
}

/** The reading of a paste, kept with the document so the words panel can state it. */
export function reviewNote({ entries, ruleCount, guideCount }) {
  const total = entries.length + ruleCount;
  const said = [`${total.toLocaleString()} lines read`, `${wordCount(entries)} saved`];
  if (ruleCount) {
    said.push(
      `${ruleCount.toLocaleString()} lines of plurals, rules and letters kept as a document`
    );
  }
  if (guideCount) {
    said.push(
      `${guideCount.toLocaleString()} pronunciation guide${
        guideCount === 1 ? "" : "s"
      } kept beside their word, never shown or said`
    );
  }
  return `${said.join(" — ")}.`;
}

/** What the assistant knows: how much of the list he is given, and the document he searches. */
export function knownLine(stats, docWords, review) {
  const said = [];
  if (stats && stats.total) {
    const total = stats.total.toLocaleString();
    said.push(
      stats.whole
        ? `Both AIs know all ${total} words.`
        : `Both AIs know ${stats.carried.toLocaleString()} of ${total} words — the list is longer than one session can carry.`
    );
  }
  if (stats && stats.guided) {
    said.push(
      `${stats.guided.toLocaleString()} pronunciation guide${
        stats.guided === 1 ? "" : "s"
      } kept beside their word, never shown or said.`
    );
  }
  if (docWords) {
    said.push(
      `The whole document (${formatLength(docWords)}) is kept and searched with every question.`
    );
  }
  if (review) said.push(`Last review: ${review}`);
  return said.join(" ");
}

// a paste longer than one document field is kept as several parts, so a whole list
// is stored however long it is
const PART_MAX = 6000;
const MAX_PARTS = 20;

/** A paste cut into the parts one document field can hold, split between lines. */
function partsOf(text) {
  const parts = [];
  let current = "";
  const keep = (piece) => {
    if (!current) {
      current = piece;
      return;
    }
    if (`${current}\n${piece}`.length > PART_MAX) {
      parts.push(current);
      current = piece;
      return;
    }
    current = `${current}\n${piece}`;
  };

  String(text || "")
    .split(/\r?\n/)
    .forEach((line) => {
      if (line.length <= PART_MAX) {
        keep(line);
        return;
      }
      for (let i = 0; i < line.length; i += PART_MAX) keep(line.slice(i, i + PART_MAX));
    });
  if (current) parts.push(current);
  return parts.slice(0, MAX_PARTS);
}

function partTitle(index, count) {
  const name = pasteTitle();
  return count > 1 ? `${name} (part ${index + 1} of ${count})` : name;
}

/** Every part of the paste as it is kept, oldest part first. */
async function loadPasteDocs() {
  const page = await base44.entities.KnowledgeText.filter(
    { title: { $regex: `^${PASTE_TITLE}` } },
    { sort: "created_date", limit: MAX_PARTS, fields: ["title", "word_count", "review_note"] }
  );
  return page?.items || [];
}

/**
 * The paste kept whole as the document the assistant answers from, cut into the
 * passages a question is matched against and into as many parts as one field holds,
 * so a paste of any length is stored in full and no part of it is left behind. A
 * later paste writes over the parts already there instead of piling up.
 */
export async function savePasteDocument(text, review) {
  const body = String(text || "").trim();
  if (!body) return null;
  const parts = partsOf(body);
  if (!parts.length) return null;
  const rows = await loadPasteDocs();

  const saved = [];
  for (let i = 0; i < parts.length; i += 1) {
    const fields = {
      title: partTitle(i, parts.length),
      text: parts[i],
      word_count: countWords(parts[i]),
      passages: splitPassages(parts[i]),
      file_uri: "",
      review_note: i === 0 ? String(review || "") : "",
    };
    const row = rows[i];
    saved.push(
      row
        ? await base44.entities.KnowledgeText.update(row.id, fields)
        : await base44.entities.KnowledgeText.create(fields)
    );
  }

  // a paste shorter than the one before it leaves no part of it behind
  const extra = rows.slice(parts.length);
  if (extra.length) {
    await Promise.all(extra.map((row) => base44.entities.KnowledgeText.delete(row.id)));
  }

  const wordCountTotal = parts.reduce((sum, part) => sum + countWords(part), 0);
  return { id: saved[0].id, word_count: wordCountTotal, review_note: String(review || "") };
}

/** The document a paste was kept as, in however many parts, and the last review of it. */
export async function loadPasteDoc() {
  try {
    const rows = await loadPasteDocs();
    if (!rows.length) return null;
    const words = rows.reduce((sum, row) => sum + (Number(row.word_count) || 0), 0);
    const review = rows.map((row) => row.review_note).find(Boolean) || "";
    return { id: rows[0].id, word_count: words, review_note: review };
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

/** Every spelling already saved, so a list pasted again is not written twice. */
export async function loadSavedTerms() {
  const terms = new Set();
  try {
    const page = await base44.entities.AssistantKnowledge.list({ distinct: "term", limit: 1000 });
    const values = Array.isArray(page) ? page : page?.items || [];
    values.forEach((value) => {
      const key = String(value || "").trim().toLowerCase();
      if (key) terms.add(key);
    });
  } catch (err) {
    // with no list the paste still goes: the server skips what is already saved
  }
  return terms;
}

/**
 * The whole list handed to the server, which holds the one rule about what a word is: a word
 * with a short meaning is saved, a pair that is not one is left with the rules, and a term
 * already saved is skipped. What did not save comes back so the box can be tried again.
 */
export async function saveWordList(entries) {
  const out = { ok: true, saved: [], notWord: 0, already: 0 };

  for (let i = 0; i < entries.length; i += BATCH) {
    const group = entries.slice(i, i + BATCH);
    try {
      const res = await base44.functions.invoke("knowledgeWords", {
        action: "save",
        entries: group,
      });
      const data = res?.data || {};
      if (!Array.isArray(data.saved)) throw new Error(data.error || "save");
      out.saved.push(...data.saved);
      out.notWord += Number(data.notWord) || 0;
      out.already += Number(data.already) || 0;
    } catch (err) {
      return { ...out, ok: false };
    }
  }

  return out;
}

/** What one save brought in, in one plain line. */
export function writeNote({ saved, notWord, already }) {
  const said = [];
  if (saved.length) said.push(`${wordCount(saved)} saved`);
  if (already) said.push(`${already.toLocaleString()} were already saved`);
  if (notWord) {
    said.push(
      `${wordCount(notWord)} read as a pair but ${
        notWord === 1 ? "is" : "are"
      } not a word with a short meaning — they stay with the rules`
    );
  }
  return said.length ? `${said.join(" · ")}.` : "Nothing new in that paste.";
}