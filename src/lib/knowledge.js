import { base44 } from "@/api/base44Client";

/** The three kinds of entry the admin writes, in the order they are shown. */
export const KINDS = [
  {
    id: "qa",
    tab: "Questions",
    empty:
      "No questions saved yet — write the first question and the exact answer the assistant should give.",
  },
  {
    id: "note",
    tab: "World notes",
    empty: "No notes saved yet — write what the assistant should know about the Babembe world.",
  },
  {
    id: "word",
    tab: "Ebembe words",
    empty: "No words saved yet — add an Ebembe word with its meaning and how it should be used.",
  },
  {
    id: "text",
    tab: "Long texts",
    empty:
      "No long texts saved yet — paste a whole document or upload one, and the assistant answers from the parts that matter.",
  },
];

/** The fields each kind is written in, in the order they are typed. */
export const FIELDS = {
  qa: [
    { name: "question", label: "Question", placeholder: "Swali ambalo mtu anaweza kuuliza" },
    {
      name: "answer",
      label: "Answer to give",
      area: true,
      placeholder: "Jibu kamili ambalo assistant atatoa",
    },
  ],
  note: [
    { name: "title", label: "Title", placeholder: "Mfano: Historia ya Babembe" },
    { name: "text", label: "What to know", area: true, placeholder: "Andika hapa kile anapaswa kujua" },
  ],
  word: [
    { name: "term", label: "Ebembe word", placeholder: "Mfano: babondo" },
    { name: "meaning", label: "Meaning", placeholder: "Maana yake" },
    { name: "usage", label: "How to use it", area: true, placeholder: "Jinsi anapaswa kuitumia" },
  ],
};

const TEXT_FIELDS = ["question", "answer", "title", "text", "term", "meaning", "usage"];

export function emptyEntry(kind) {
  const blank = { kind };
  TEXT_FIELDS.forEach((name) => {
    blank[name] = "";
  });
  return blank;
}

export function entryFields(draft) {
  const fields = {};
  TEXT_FIELDS.forEach((name) => {
    fields[name] = String(draft[name] || "").trim();
  });
  return fields;
}

/** An entry needs only the fields its own kind is written in. */
export function isComplete(draft) {
  if (draft.kind === "qa") {
    return !!(draft.question || "").trim() && !!(draft.answer || "").trim();
  }
  if (draft.kind === "note") return !!(draft.text || "").trim();
  return !!(draft.term || "").trim() && !!(draft.meaning || "").trim();
}

export function kindHint(kind) {
  const found = KINDS.find((item) => item.id === kind);
  return found ? found.empty : "";
}

export function entryHeadline(row) {
  if (row.kind === "qa") return row.question || "";
  if (row.kind === "note") return row.title || "Note";
  return row.term || "";
}

export function entryBody(row) {
  if (row.kind === "qa") return row.answer || "";
  if (row.kind === "note") return row.text || "";
  return [row.meaning, row.usage].filter(Boolean).join(" · ");
}

/**
 * The admin's knowledge as the private note handed to the assistant before it
 * answers a typed message. The entries themselves never come down to a device.
 */
export async function loadKnowledgeNote(query = "") {
  try {
    const asked = String(query || "").trim();
    const res = await base44.functions.invoke("assistantKnowledge", asked ? { query: asked } : {});
    return res?.data?.note || "";
  } catch (err) {
    // the note is a help, never a reason to hold up a message
    return "";
  }
}

export function withKnowledge(memory, note) {
  if (!note) return memory || "";
  return memory ? `${memory}\n\n${note}` : note;
}