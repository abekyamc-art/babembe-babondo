import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { secrets } from "base44:runtime";
import { readForVoice } from "../../shared/ebembeReading.ts";

/**
 * The examination's own voice: one line of a question is spoken back in the app's own Ebembe voice, read
 * with Kiswahili's sounds — the sounds Ebembe is spoken with — and the account's other voice stands
 * behind it should the Ebembe voice be refused.
 *
 * The voice that reads Kibembe by Kiswahili's own letters is handed the spelling itself. A voice with no
 * Kibembe in it — the one that stands behind the Ebembe voice — cannot say a Kibembe spelling: it is
 * handed the Kibembe form written as it sounds instead (see shared/ebembeReading), so what is heard is
 * the sound of the word, while the form on the screen is never touched.
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

// The examination's own voice: the app's own Ebembe voice — the one kept for speaking Kibembe — reading
// the line with Kiswahili's own sounds, so a question is heard as Ebembe is spoken and not in another
// language's accent. The voice's own id is no secret; the key that opens the voice is.
const EBEMBE_TTS = "https://api.elevenlabs.io/v1/text-to-speech/";
const EBEMBE_VOICE = "EOxEQjshInX6yZjFsTg5";
const EBEMBE_MODEL = "eleven_v4";
const EBEMBE_LANG = "sw";
const EBEMBE_KEY = "ELEVENLABS_API_KEY";

/** How long a line may be: a question of the examination is a line or two, never more. */
// The app's own voice service, standing last behind the examination's own voices: the same warm voice,
// and the same voice language, the app already reads its Kibembe answers in (see kibembeVoice).
const APP_VOICE = "honey";
const APP_VOICE_LANG = "ms";

// A question and its three choices are read as one line, so the bound covers the whole of it whole.
const MAX_TEXT = 420;
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

/**
 * The line spoken in the app's own Ebembe voice. Kiswahili is named as the language the voice is to read
 * in, so it takes the sounds Ebembe is spoken with and not another language's; where a voice will not
 * have the language named, the same line is asked for plainly rather than left unheard.
 */
async function speakEbembe(apiKey: string, transcript: string) {
  const why: string[] = [];
  for (const language of [EBEMBE_LANG, ""]) {
    try {
      const body: any = { text: transcript, model_id: EBEMBE_MODEL };
      if (language) body.language_code = language;
      const res = await fetch(EBEMBE_TTS + EBEMBE_VOICE, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) {
        const said = (await res.text()).slice(0, 160);
        console.error("The Ebembe voice refused the line:", res.status, language || "unstated", said);
        why.push(`ebembe/${language || "unstated"}: ${res.status} ${said}`);
        continue;
      }
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (!bytes.length) continue;
      return { bytes, ext: "mp3", type: "audio/mpeg" };
    } catch (error: any) {
      console.error("The Ebembe voice failed:", error?.message);
      why.push(`ebembe/${language || "unstated"}: ${error?.message}`);
    }
  }
  return { bytes: null, why };
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
    // the Kibembe form standing in the line, when the paper names it: it is what a voice that knows no
    // Kibembe is given as a reading instead of a spelling
    const kibembe = clean(payload?.kibembe, 120);
    const forFallback = readForVoice(line, kibembe);

    // The voice that reads: the app's own Ebembe voice first; and where it cannot be had, the voice saved
    // in Secrets, and, where nothing is heard from that either, the voice of the agent it names.
    const ebembeKey = secrets.get(EBEMBE_KEY);
    let spoken: any = ebembeKey
      ? await speakEbembe(ebembeKey, line)
      : { bytes: null, why: ["the Ebembe voice's key is not set"] };
    // what every voice refused the line with, so a reading that fails can be traced to its account
    const why: string[] = [...(spoken?.why || [])];

    if (!spoken?.bytes) {
      spoken = await speak(apiKey, voiceId, forFallback);
      why.push(...(spoken?.why || []));
    }
    if (!spoken?.bytes) {
      const fromAgent = await voiceOfAgent(apiKey, voiceId);
      if (fromAgent.id) {
        spoken = await speak(apiKey, fromAgent.id, forFallback);
        if (!spoken?.bytes) why.push(...(spoken?.why || []));
      } else {
        why.push(fromAgent.why);
      }
    }
    // An account can run dry: the account holding the Ebembe voice may have no characters left, and the
    // one holding the examination's own voice may be past its credit limit. The examination is not left
    // silent for it — the line is read through the app's own voice service instead, on the voice and the
    // voice language the app already reads its Kibembe answers in, so a question is always heard while
    // the accounts are set right again.
    if (!spoken?.bytes) {
      try {
        const made: any = await base44.asServiceRole.integrations.Core.GenerateSpeech({
          text: forFallback,
          voice: APP_VOICE,
          language_code: APP_VOICE_LANG,
        });
        if (made?.url) return Response.json({ audio_url: made.url, voice: "app" });
        console.error("The app's own voice came back empty.");
        why.push("the app's own voice came back empty");
      } catch (error: any) {
        console.error("The app's own voice could not read the line:", error?.message);
        why.push(`app voice: ${error?.message}`);
      }
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