import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { geminiText } from '../../shared/gemini.ts';

const PROMPT =
  "You are lifting the written text out of a document so it can be filed away. " +
  "Return the document's own words verbatim as plain text: no summary, no commentary, " +
  "no translation, and no headings of your own. Keep the order and the paragraphs of the " +
  "document, and keep the language it is written in. Return the text alone.";

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    let payload: any = {};
    try {
      payload = await req.json();
    } catch (err) {
      payload = {};
    }
    const fileUri = typeof payload?.file_uri === "string" ? payload.file_uri.trim() : "";
    // a stored file only: this endpoint never fetches a web address for a caller
    if (!fileUri || /^https?:/i.test(fileUri)) {
      return Response.json({ error: "No document to read." }, { status: 400 });
    }

    const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: fileUri,
      expires_in: 600,
    });
    const signedUrl = signed?.signed_url;
    if (!signedUrl) {
      return Response.json({ error: "Could not open that document." }, { status: 400 });
    }

    const lifted = await geminiText({
      base44,
      group: "answer",
      prompt: PROMPT,
      file_urls: [signedUrl],
    });
    const text = typeof lifted === "string" ? lifted.trim() : "";
    if (!text) {
      return Response.json({ error: "No readable text was found in that document." }, { status: 400 });
    }

    return Response.json({ text });
  } catch (error) {
    console.error("Could not read the uploaded document:", error.message);
    return Response.json(
      { error: "Could not read that document — paste the text instead." },
      { status: 500 }
    );
  }
}