import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { lookupForTurn, lookupSource } from "../../shared/freshLookup.ts";
import { TRUTH_RULES } from "../../shared/truthRules.ts";

/**
 * The material one turn needs from outside the admin's saved knowledge — a story, the news, who
 * someone is, a word — asked for by the phone before that turn is put to whoever answers it.
 *
 * The lookup itself lives in one place, so every provider is handed the same material, and a
 * turn that needs a search is never answered while the search is still running. What comes back
 * is the material for this answer alone: the entry it was saved as stays on the server.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    let payload: any = {};
    try {
      payload = await req.json();
    } catch (err) {
      payload = {};
    }

    // the names the app put before the person last turn ride back in with their answer, so this turn
    // is read as the choice it is — and the names a search turns up now ride back with it
    const lookup = await lookupForTurn(base44, payload?.query, payload?.asked);
    // where the material came from goes back with it — named, with its own address — so the call it
    // is handed into can show the source of what the answer says, not only speak it aloud. A turn
    // that is asking which of several names is meant has no source to name: it answered nothing yet.
    return Response.json({
      ...lookup,
      source: lookup.candidates.length >= 2 ? null : lookupSource(lookup.material),
      // The law of truth rides back with the material, so whoever asked for it is told plainly what
      // this is: what a search brought is never called confirmed, and the answer says which of the two
      // it stands on. It is a field of its own, so no part of the material itself is touched.
      truth: TRUTH_RULES,
    });
  } catch (error: any) {
    console.error("Could not look anything up:", error.message);
    return Response.json({ error: "The lookup is unavailable right now." }, { status: 500 });
  }
}