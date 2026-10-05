import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

/**
 * The Kibembe assistant's voice. The words themselves are written by the Kibembe assistant — never
 * here — and this function does nothing but read them out loud, so the assistant's own rules, its
 * Word Bank and its answering are left exactly as they are.
 *
 * It reads a line in the same warm spoken voice, and on the same voice language, the app already
 * reads its Kibembe answers in: the voice service holds no Bantu language, and Malay sounds every
 * letter the Bantu way, so the Kibembe spelling is carried as it is written.
 */

const VOICE = "honey";
const VOICE_LANG = "ms";
// longer than any spoken answer the assistant gives: a runaway line is closed rather than read out
const MAX_SPEECH = 900;
const UNAVAILABLE = "Sauti haikuweza kutengenezwa. Jaribu tena.";

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

    const text = typeof payload?.text === "string" ? payload.text.trim().slice(0, MAX_SPEECH) : "";
    if (!text) return Response.json({ error: "Nothing to read out." }, { status: 400 });

    const made: any = await base44.asServiceRole.integrations.Core.GenerateSpeech({
      text,
      voice: VOICE,
      language_code: VOICE_LANG,
    });

    const audio_url = made?.url || "";
    if (!audio_url) {
      console.error("The voice came back empty.");
      return Response.json({ error: UNAVAILABLE }, { status: 502 });
    }

    return Response.json({ audio_url });
  } catch (error: any) {
    console.error("The Kibembe voice could not be made:", error?.message);
    return Response.json({ error: UNAVAILABLE }, { status: 500 });
  }
}