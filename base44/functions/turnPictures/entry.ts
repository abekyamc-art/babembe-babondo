import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { turnPictures } from "../../shared/answerPictures.ts";

/**
 * The pictures the admin saved beside the words one turn is made of, for an answer the app's own
 * voices wrote themselves.
 *
 * A voice on the home page answers on its own account and writes its own words, so its answer is
 * read here against the admin's pictures: the word the person asked about first, then the words the
 * answer itself says. Only the word, the name and the address of a picture come back, and a private
 * one comes back through a short-lived link.
 *
 * A picture that cannot be read is nothing: the answer is never held up by one.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    let payload: any = {};
    try {
      payload = await req.json();
    } catch (err) {
      payload = {};
    }

    const question = String(payload?.question || "").slice(0, 600);
    const answer = String(payload?.answer || "").slice(0, 4000);
    if (!user || (!question && !answer)) return Response.json({ pictures: [] });

    return Response.json({ pictures: await turnPictures(base44, question, answer) });
  } catch (error: any) {
    console.error("The pictures for a turn could not be read:", error?.message);
    return Response.json({ pictures: [] });
  }
}