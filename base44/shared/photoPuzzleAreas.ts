import { geminiText } from "./gemini.ts";

/** Recheck object bounds against the photos, not the edit plan or coarse grid cells. */
export async function photoPuzzleAreas(base44, base, changed, candidates) {
  const result = await geminiText({
    base44,
    prompt: `Check these candidate object differences against the two photographs (original first, edited second). Candidate labels: ${candidates.map((d) => d.label).join('; ')}. Re-measure each actual differing object carefully. Use the WHOLE photograph as a 1000 by 1000 grid, x from left edge and y from top edge. A person on the ground must have y at the ground, not in the sky. Trace the whole object, not just its head or center. For a removed object use its bounds in the ORIGINAL; for an added object use the EDITED. Only return genuinely visible differences. If two people or two objects are separately removed, return TWO separate bounding boxes, never one combined change. Do not include global lighting, unchanged objects, or invented differences. Return tight top-left x,y,width w,height h integers.`,
    file_urls: [base, changed],
    response_json_schema: { type: 'object', properties: { differences: { type: 'array', items: { type: 'object', properties: {
      x: { type: 'number' }, y: { type: 'number' }, w: { type: 'number' }, h: { type: 'number' }, label: { type: 'string' }
    }, required: ['x', 'y', 'w', 'h', 'label'] } } }, required: ['differences'] }
  });
  return result.differences;
}