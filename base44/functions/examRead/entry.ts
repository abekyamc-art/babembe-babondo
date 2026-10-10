import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { secrets } from "base44:runtime";

/**
 * The examination's own voice, on Cartesia: one line of a question is spoken back in the voice the
 * examination reads in.
 *
 * The key stays on the server and is never handed to the browser, and nothing but the line itself is ever
 * passed to the voice — the function reads no record, writes nothing, and changes nothing of the paper.
 * Only a student of the app may have a line read, and the line is bounded to the length of one question.
 */

const API = "https://api.cartesia.ai";
const VERSION = "2026-08-14";
// the speech models the account may hold, the newest first: the account may not hold them all
const MODELS = ["sonic-3.6", "sonic-3.5", "sonic-3", "sonic-2"];
// the shapes of the recording, the smaller one first
const FORMATS: any[] = [
  { container: "mp3", bit_rate: 128000, sample_rate: 44100 },
  { container: "wav", encoding: "pcm_s16le", sample_rate: 44100 },
];

/** How long a line may be: a question of the examination is a line or two, never more. */
const MAX_TEXT = 320;
const UNAVAILABLE = "The question could not be read aloud. Please try again.";
const NOTHING = "There is nothing to read.";

function clean(value: any, max: number): string {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return text.slice(0, max);
}

/** The line spoken in the examination's own voice. The first shape the account answers to is used. */
async function speak(apiKey: string, voiceId: string, transcript: string) {
  const why: string[] = [];
  for (const format of FORMATS) {
    for (const model of MODELS) {
      try {
        const res = await fetch(API + "/tts/bytes", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + apiKey,
            "Cartesia-Version": VERSION,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model_id: model,
            transcript,
            voice: { mode: "id", id: voiceId },
            output_format: format,
          }),
          signal: AbortSignal.timeout(20000),
        });
        if (!res.ok) {
          const said = (await res.text()).slice(0, 200);
          console.error("Reading refused:", model, format.container, res.status, said);
          why.push(`${model}/${format.container}: ${res.status} ${said}`);
          continue;
        }
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (!bytes.length) continue;
        return {
          bytes,
          ext: format.container,
          type: format.container === "mp3" ? "audio/mpeg" : "audio/wav",
        };
      } catch (error: any) {
        console.error("Reading failed:", model, format.container, error?.message);
        why.push(`${model}/${format.container}: ${error?.message}`);
      }
    }
  }
  return { bytes: null, why };
}

/**
 * The voice the examination reads in, when what stands in Secrets is the agent's own id rather than a
 * voice's: an agent is looked up by its id and the voice it reads in is the one used. The agent itself
 * is never touched — nothing is written to it, and only its voice is read.
 */
async function voiceOfAgent(apiKey: string, saved: string) {
  try {
    const res = await fetch(API + "/agents/" + encodeURIComponent(saved), {
      headers: { Authorization: "Bearer " + apiKey, "Cartesia-Version": VERSION },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const said = (await res.text()).slice(0, 200);
      console.error("The saved id is not an agent of this account:", res.status, said);
      return { id: "", why: `agent/${res.status}: ${said}` };
    }
    const agent: any = await res.json();
    // an agent keeps the voice it reads in at its head, as tts_voice; the older shapes are looked at too
    const voice = agent?.tts_voice ?? agent?.config?.voice ?? agent?.voice ?? null;
    const id = typeof voice === "string" ? voice : voice?.id || voice?.voice_id || "";
    const clean_ = typeof id === "string" ? id.trim() : "";
    if (!clean_) console.error("The agent answers without a voice.");
    return { id: clean_, why: clean_ ? "" : "the agent answers without a voice of its own" };
  } catch (error: any) {
    console.error("The agent could not be read:", error?.message);
    return { id: "", why: `agent: ${error?.message}` };
  }
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Sign in to hear the question read." }, { status: 401 });

    const apiKey = secrets.get("CARTESIA_EXAM_API_KEY");
    const voiceId = secrets.get("CARTESIA_EXAM_VOICE_ID");
    if (!apiKey || !voiceId) {
      console.error("The examination's Cartesia key or voice is missing.");
      return Response.json({ error: UNAVAILABLE }, { status: 500 });
    }

    let payload: any = {};
    try {
      payload = await req.json();
    } catch (err) {
      payload = {};
    }

    const line = clean(payload?.text, MAX_TEXT);
    if (!line) return Response.json({ error: NOTHING }, { status: 400 });

    // The voice that reads: the id saved in Secrets, and — where nothing is heard from it, because what
    // stands there is the agent's own id — the voice of the agent it names.
    let spoken: any = await speak(apiKey, voiceId, line);
    const why: string[] = spoken?.why || [];
    if (!spoken?.bytes) {
      const fromAgent = await voiceOfAgent(apiKey, voiceId);
      if (fromAgent.id) {
        spoken = await speak(apiKey, fromAgent.id, line);
        if (!spoken?.bytes) why.push(...(spoken?.why || []));
      } else {
        why.push(fromAgent.why);
      }
    }
    if (!spoken?.bytes) {
      return Response.json({ error: UNAVAILABLE, detail: why }, { status: 502 });
    }

    const file = new File([spoken.bytes], "question." + spoken.ext, { type: spoken.type });
    const uploaded: any = await base44.asServiceRole.integrations.Core.UploadPublicFile({ file });
    if (!uploaded?.file_url) return Response.json({ error: UNAVAILABLE }, { status: 502 });

    return Response.json({ audio_url: uploaded.file_url });
  } catch (error: any) {
    console.error("Reading the question failed:", error?.message);
    return Response.json({ error: UNAVAILABLE }, { status: 500 });
  }
}