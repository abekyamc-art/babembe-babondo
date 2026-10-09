import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { secrets } from "base44:runtime";

/**
 * The Rap Studio's own voice, on Cartesia: a voice is cloned once from a short clip, and a take is
 * then sung in that voice. The key stays on the server and is never handed to the browser, and a
 * voice is only ever cloned on the person's own word that they may use it.
 */

const CLONE_VERSION = "2026-03-01";
const TTS_VERSION = "2026-08-14";
// the speech models that sing, the newest first: the account may not hold them all
const TTS_MODELS = ["sonic-3.6", "sonic-3.5", "sonic-3"];
// the speech models take a language code: Kibembe has none, so it is left to the model itself
const TTS_LANG: any = { english: "en", swahili: "sw" };

const API = "https://api.cartesia.ai";
const UNAVAILABLE = "Sauti haikuweza kutengenezwa. Jaribu tena baada ya sekunde chache.";
const NO_CONSENT = "Thibitisha kwamba una ruhusa ya kutumia sauti hii, kisha jaribu tena.";
const MAX_TRANSCRIPT = 1600;
const MAX_LINE = 140;
const MAX_LINES = 60;
const MIN_CLIP_BYTES = 4000;
const MAX_CLIP_BYTES = 12 * 1024 * 1024;

function clean(value: any, max: number): string {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return text.slice(0, max);
}

/** The clip a voice is cloned from, read back from the app's own private storage. */
async function readClip(url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) {
      console.error("Clip could not be read:", res.status);
      return null;
    }
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength < MIN_CLIP_BYTES || bytes.byteLength > MAX_CLIP_BYTES) {
      console.error("Clip is not a usable length:", bytes.byteLength);
      return null;
    }
    return { bytes, type: res.headers.get("content-type") || "audio/wav" };
  } catch (error: any) {
    console.error("Clip read failed:", error?.message);
    return null;
  }
}

/** A voice made from the clip. The field that keeps it private has changed shape over time, so the
 *  one the account answers to is the one used. */
async function cloneVoice(apiKey: string, bytes: ArrayBuffer, type: string, name: string): Promise<string> {
  const accessFields: string[][] = [
    ["access[type]", "private"],
    ["access", "private"],
  ];

  for (const [field, value] of accessFields) {
    try {
      const form = new FormData();
      form.append("clip", new Blob([bytes], { type }), "clip.wav");
      form.append("name", name);
      form.append("description", "Rap Studio voice");
      form.append(field, value);

      const res = await fetch(API + "/voices/clone", {
        method: "POST",
        headers: { Authorization: "Bearer " + apiKey, "Cartesia-Version": CLONE_VERSION },
        body: form,
        signal: AbortSignal.timeout(90000),
      });
      if (!res.ok) {
        console.error("Voice clone refused:", field, res.status, (await res.text()).slice(0, 300));
        continue;
      }
      const data: any = await res.json();
      const id = data?.id || data?.voice_id || data?.voice?.id || "";
      if (id) return id;
      console.error("Voice clone answered without an id.");
    } catch (error: any) {
      console.error("Voice clone failed:", error?.message);
    }
  }
  return "";
}

/** The lines sung in the cloned voice. The model that answers is the first the account holds. */
async function singVoice(
  apiKey: string,
  voiceId: string,
  transcript: string,
  speed: number,
  language: string
): Promise<Uint8Array | null> {
  const attempts: any[] = TTS_MODELS.map((model) => ({ model_id: model, voice: voiceId }));
  // the oldest shape of the voice field, tried last
  attempts.push({ model_id: TTS_MODELS[0], voice: { mode: "id", id: voiceId } });

  for (const attempt of attempts) {
    try {
      const payload: any = {
        model_id: attempt.model_id,
        transcript,
        voice: attempt.voice,
        output_format: { container: "wav", encoding: "pcm_s16le", sample_rate: 44100 },
        generation_config: { volume: 1, speed },
      };
      if (language) payload.language = language;

      const res = await fetch(API + "/tts/bytes", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + apiKey,
          "Cartesia-Version": TTS_VERSION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) {
        console.error("Voice singing refused:", attempt.model_id, res.status, (await res.text()).slice(0, 300));
        continue;
      }
      return new Uint8Array(await res.arrayBuffer());
    } catch (error: any) {
      console.error("Voice singing failed:", attempt.model_id, error?.message);
    }
  }
  return null;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Ingia kwenye akaunti kwanza." }, { status: 401 });

    const apiKey = secrets.get("CARTESIA_SONGWRITER_API_KEY");
    if (!apiKey) {
      console.error("The Cartesia songwriter key is missing.");
      return Response.json({ error: UNAVAILABLE }, { status: 500 });
    }

    let payload: any = {};
    try {
      payload = await req.json();
    } catch (err) {
      payload = {};
    }

    // A voice is never cloned, and never sung with, without the person's own word that they may
    // use it: their own voice, or one they are allowed to use.
    if (payload?.consent !== true) {
      return Response.json({ error: NO_CONSENT }, { status: 400 });
    }

    // ---- a voice made from a clip
    if (payload?.action !== "sing") {
      const name = clean(payload?.name, 40) || "Sauti yangu";
      const clipUrl = clean(payload?.clip_url, 900);
      if (!clipUrl) return Response.json({ error: "Klipi ya sauti haipo." }, { status: 400 });

      const clip = await readClip(clipUrl);
      if (!clip) {
        return Response.json(
          { error: "Klipi hii haiwezi kusomwa — tumia klipi fupi la sauti safi." },
          { status: 400 }
        );
      }

      const voiceId = await cloneVoice(apiKey, clip.bytes, clip.type, name);
      if (!voiceId) return Response.json({ error: UNAVAILABLE }, { status: 502 });
      return Response.json({ voice_id: voiceId, name });
    }

    // ---- the lines sung in a voice that was already made
    const voiceId = clean(payload?.voice_id, 120);
    if (!voiceId) return Response.json({ error: "Chagua sauti kwanza." }, { status: 400 });

    const lines = (Array.isArray(payload?.lines) ? payload.lines : [])
      .map((line: any) => clean(line, MAX_LINE))
      .filter((line: string) => line)
      .slice(0, MAX_LINES);

    const transcript = clean(payload?.transcript, MAX_TRANSCRIPT) || lines.join(", ");
    if (!transcript) return Response.json({ error: "Hakuna mistari ya kuimbwa." }, { status: 400 });

    const speed = Math.min(1.2, Math.max(0.7, Number(payload?.speed) || 1));
    const language = TTS_LANG[clean(payload?.language, 12)] || "";

    const bytes = await singVoice(apiKey, voiceId, transcript, speed, language);
    if (!bytes) return Response.json({ error: UNAVAILABLE }, { status: 502 });

    const file = new File([bytes], "take.wav", { type: "audio/wav" });
    const uploaded: any = await base44.asServiceRole.integrations.Core.UploadPublicFile({ file });
    if (!uploaded?.file_url) return Response.json({ error: UNAVAILABLE }, { status: 502 });

    return Response.json({ audio_url: uploaded.file_url, kind: "cloned" });
  } catch (error: any) {
    console.error("Rap voice clone failed:", error?.message);
    return Response.json({ error: UNAVAILABLE }, { status: 500 });
  }
}