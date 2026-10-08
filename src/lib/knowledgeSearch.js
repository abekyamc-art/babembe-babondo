import { base44 } from "@/api/base44Client";

/**
 * One search over the whole knowledge, put to the server: the document's own lines and the stories.
 * What comes back is the places a match stands in — the part of the document a line belongs to, and
 * for a story the name of the place inside it — never the library itself.
 */
export async function searchKnowledge(term) {
  const res = await base44.functions.invoke("knowledgeSearch", {
    query: String(term || "").trim(),
  });
  const data = res?.data || {};
  if (data.error) throw new Error(data.error);

  return {
    doc: Array.isArray(data.doc) ? data.doc : [],
    docMore: !!data.docMore,
    stories: Array.isArray(data.stories) ? data.stories : [],
    storiesMore: !!data.storiesMore,
  };
}