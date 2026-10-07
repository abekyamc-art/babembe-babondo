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
    id: "story",
    tab: "Stories",
    empty:
      "No stories saved yet — write the first one, give it its tags, and attach a picture, a video or a link.",
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
    {
      name: "guide",
      label: "Pronunciation (private)",
      placeholder: "Mfano: oh-leg-bile — hii haionyeshwi kwa mtu",
    },
    { name: "meaning", label: "Meaning", placeholder: "Maana yake" },
    { name: "usage", label: "How to use it", area: true, placeholder: "Jinsi anapaswa kuitumia" },
  ],
};

const TEXT_FIELDS = ["question", "answer", "title", "text", "term", "guide", "meaning", "usage"];

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
  // a word saved from a pasted list may have no meaning yet, so the meaning is
  // what the admin comes back to fill in
  return !!(draft.term || "").trim();
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
  return [
    row.meaning,
    row.usage,
    row.guide ? `Pronunciation: ${row.guide}` : "",
  ].filter(Boolean).join(" · ");
}

/**
 * The admin's knowledge as the private note handed to the assistant before it
 * answers a typed message. The entries themselves never come down to a device.
 *
 * What comes back is the note, the language the person's own words are in — read on the server,
 * where the saved words are — whether that turn is a greeting rather than a question, and whether
 * it left a place the saved words do not hold, which is the place the words helper reviews twice.
 */
export async function loadKnowledgeNote(query = "", typed = false) {
  const none = { note: "", lang: "", greeting: false, missing: false };
  try {
    const asked = String(query || "").trim();
    // A typed message carries no ears, so the function is told it was written: the language the
    // person wrote in is then read from their own words and named at the head of the note.
    const res = await base44.functions.invoke(
      "assistantKnowledge",
      asked ? { query: asked, typed: !!typed } : {}
    );
    const data = res?.data || {};
    return {
      note: String(data.note || ""),
      lang: String(data.lang || ""),
      greeting: !!data.greeting,
      missing: !!data.missing,
    };
  } catch (err) {
    // the note is a help, never a reason to hold up a message
    return none;
  }
}

export function withKnowledge(memory, note) {
  if (!note) return memory || "";
  return memory ? `${memory}\n\n${note}` : note;
}

/**
 * Material looked up online for a request the saved knowledge does not cover — a story, news, a
 * word, who someone is. The lookup decides on the server whether anything is needed, saves what
 * it finds into the knowledge, and hands back only the words this answer uses: the material
 * itself, or — when the turn needed a search and nothing was found — the line telling the answer
 * to say plainly that nothing could be confirmed. Whoever asks for it waits for it, so the turn
 * it belongs to is never answered before it arrives.
 */
export async function loadFreshMaterial(query = "") {
  const asked = String(query || "").trim();
  const none = { material: "", needed: false, found: false };
  if (!asked) return none;
  try {
    const res = await base44.functions.invoke("freshKnowledge", { query: asked });
    const data = res?.data || {};
    return {
      material: String(data.material || ""),
      needed: !!data.needed,
      found: !!data.found,
    };
  } catch (err) {
    // the answer carries on from what is already saved
    return none;
  }
}