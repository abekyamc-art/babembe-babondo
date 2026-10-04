import { secrets } from "base44:runtime";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { recognitionKeywords } from "../../shared/hearingKeywords.ts";

// The app's own ears: the account the admin gave this helper, and the model that writes down
// what it hears. A turn of speech is a few hundred kilobytes, so anything much larger than
// that is refused here rather than being sent on.
const MODEL = "scribe_v2";
const MAX_AUDIO_CHARS = 3_000_000;
const UNAVAILABLE = "Nothing could hear that turn — tap to talk again in a moment.";

/** A secret's value, or nothing at all when it has not been saved yet. */
function secretOr(name: string): string {
  try {
    return secrets.get(name) || "";
  } catch (err) {
    return "";
  }
}

export default async function (req: Request): Promise<Response> {
  try {
    let payload: any = {};
    try {
      payload = await req.json();
    } catch (err) {
      payload = {};
    }

    const audio = typeof payload?.audio === "string" ? payload.audio : "";
    if (!audio) {
      return Response.json({ error: "Nothing was said." }, { status: 400 });
    }
    if (audio.length > MAX_AUDIO_CHARS) {
      return Response.json(
        { error: "That turn was too long to listen to — say it in a shorter one." },
        { status: 413 }
      );
    }

    const apiKey = secretOr("HELPER_SPEECH_API_KEY");
    if (!apiKey) {
      console.error("The ears' API key is missing.");
      return Response.json(
        { error: "The ears aren't set up yet — add their ElevenLabs key in Secrets, then talk again." },
        { status: 500 }
      );
    }

    // the app's own client, so the admin's saved words can point the service at them
    const base44 = createClientFromRequest(req);
    const keywords = await recognitionKeywords(base44);

    let bytes: Uint8Array;
    try {
      bytes = Uint8Array.from(atob(audio), (char) => char.charCodeAt(0));
    } catch (err) {
      console.error("The turn could not be read back from the request.");
      return Response.json({ error: "That turn could not be read." }, { status: 400 });
    }

    const form = new FormData();
    form.append("model_id", MODEL);
    form.append("file", new Blob([bytes], { type: "audio/wav" }), "turn.wav");
    // the saved words point the service at the letters it would otherwise write as the English
    // or Kiswahili words they nearly sound like, one field each — joined into a single field
    // they are refused
    keywords.forEach((word: string) => form.append("keyterms", word));

    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: form,
    });

    if (!res.ok) {
      const detail = await res.text();
      let reason = "";
      try {
        reason = JSON.parse(detail)?.detail?.message || "";
      } catch (err) {
        reason = "";
      }
      console.error("The ears refused the turn:", res.status, reason || detail);
      return Response.json(
        {
          error:
            res.status === 401 || res.status === 403
              ? "The ears refused the turn: check their ElevenLabs key in Secrets, then talk again."
              : `The ears couldn't read that turn${reason ? `: ${reason}` : ""}.`,
        },
        { status: 502 }
      );
    }

    const data = await res.json();
    return Response.json({
      text: typeof data?.text === "string" ? data.text.trim() : "",
      language: typeof data?.language_code === "string" ? data.language_code : "",
    });
  } catch (error: any) {
    console.error("The ears failed:", error?.message);
    return Response.json({ error: UNAVAILABLE }, { status: 500 });
  }
}