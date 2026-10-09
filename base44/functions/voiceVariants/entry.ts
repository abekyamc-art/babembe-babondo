import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { MAX_MEANING, MAX_TERM, MAX_USAGE, clean, knowledgeWordRows } from "../../shared/knowledgeWords.ts";
import { withHeard, withRevision } from "../../shared/voiceBank.ts";
import { savedEntry } from "../../shared/kibembeFirst.ts";

/**
 * The private voice bank: short recordings of a person's own voice, each one labelled with the
 * confirmed word it is of and the conditions it was made in.
 *
 * A recording is never a word of its own and never changes a spelling. What it gives the app is a way
 * of hearing: the app's own ears write the recording down, and that writing — with the way the person
 * says the word — is kept under the confirmed word it belongs to, where every reader of the app's
 * knowledge already looks for the other ways a word comes out. So a word said quietly, far from the
 * phone, quickly or in a noisy place is recognised the more surely the more of it has been recorded,
 * while the word itself, its spelling and its meaning are never touched.
 *
 * Only what the admin approves is used. A recording waiting for approval is heard by nobody, and a
 * recording of a word the bank does not hold at all is only added as a confirmed word when the admin
 * approves it as one.
 *
 * The recordings stay in private storage: each one is opened through a short-lived link, and only the
 * person whose voice it is and the admin ever read it.
 */

const MAX_NOTE = 200;
const UNAUTHORIZED = "Ingia kwenye akaunti kwanza.";
const NOT_ADMIN = "Ni admin tu anayeweza kuhifadhi sauti hizi.";

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: UNAUTHORIZED }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: NOT_ADMIN }, { status: 403 });

    let payload: any = {};
    try {
      payload = await req.json();
    } catch (err) {
      payload = {};
    }

    const action = clean(payload?.action, 20) || "approve";
    const id = clean(payload?.id, 60);
    if (!id) return Response.json({ error: "No recording was named." }, { status: 400 });

    const service = base44.asServiceRole;
    const variant = await service.entities.VoiceVariant.get(id).catch(() => null);
    if (!variant) return Response.json({ error: "That recording is no longer saved." }, { status: 404 });

    if (action === "remove") {
      await service.entities.VoiceVariant.delete(id);
      return Response.json({ removed: true, term: clean(variant.term, MAX_TERM) });
    }

    if (action === "dismiss") {
      await service.entities.VoiceVariant.update(id, { approved: false, approved_at: "" });
      return Response.json({ approved: false, term: clean(variant.term, MAX_TERM) });
    }

    // Approving a recording: the way the person says the word, and the form the ears wrote for this
    // very recording, are joined to the confirmed word — never written as a word of their own.
    const term = clean(variant.term, MAX_TERM);
    if (!term) return Response.json({ error: "That recording has no word saved with it." }, { status: 400 });

    const rows = await knowledgeWordRows(base44);
    // A recording of a word the bank already holds is that word, not a second one: the bank's own
    // spelling stands, however the person typed the label.
    const known = savedEntry(rows, term);
    const canonical = clean(known?.term, MAX_TERM) || term;
    const heard = clean(variant.heard, MAX_TERM);
    const now = new Date().toISOString();

    const fields: any = {
      kind: "word",
      term: canonical,
      meaning: clean(known?.meaning, MAX_MEANING),
      guide: clean(known?.guide, 60),
      usage: clean(known?.usage, MAX_USAGE),
      // the person's own way of saying it, and what the ears made of this recording: both are this one
      // word coming out, and neither is ever written or spoken as the word
      heard: withHeard(known, term, heard),
      revisions: withRevision(known, now),
      source: clean(known?.source, 120) || "the voice bank",
    };

    if (known?.id) await service.entities.AssistantKnowledge.update(known.id, fields);
    else await service.entities.AssistantKnowledge.create(fields);

    await service.entities.VoiceVariant.update(id, { approved: true, approved_at: now });

    return Response.json({
      approved: true,
      term: canonical,
      // what the word is now known to be said as, so the admin sees what the recording added
      heard: fields.heard,
      note: clean(variant.note, MAX_NOTE),
    });
  } catch (error: any) {
    console.error("The recording could not be saved into the voice bank:", error?.message);
    return Response.json(
      { error: "That recording could not be saved into the Word Bank just now — try again in a moment." },
      { status: 500 }
    );
  }
}