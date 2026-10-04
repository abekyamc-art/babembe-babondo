import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { lookupForTurn } from "../../shared/freshLookup.ts";

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

    return Response.json(await lookupForTurn(base44, payload?.query));
  } catch (error: any) {
    console.error("Could not look anything up:", error.message);
    return Response.json({ error: "The lookup is unavailable right now." }, { status: 500 });
  }
}