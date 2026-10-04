import { secrets } from "base44:runtime";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { recognitionKeywords } from "../../shared/hearingKeywords.ts";

// The app's own ears: the account the admin gave this helper, and the model that writes down
// what it hears. A turn of speech is a few hundred kilobytes, so anything much larger than
// that is refused here rather than being sent on.
const MODEL = "scribe_v2";
const MAX_AUDIO_CHARS = 3_000_000;
const UNAVAILABLE = "Nothing could hear that turn — tap to talk again in a moment.";

// The cleanup stage: the room is taken out of the turn before a word of it is written down, so a
// fan, a door or a voice across the room is never handed to the assistant as something the person
// said. The turn is handed over as the samples it was recorded as — 16-bit PCM at 16 kHz, single
// channel — so nothing has to be decoded first, and the voice that comes back is what is read.
const ISOLATOR = "https://api.elevenlabs.io/v1/audio-isolation";
const RATE = 16000;
// The cleanup refuses a turn shorter than this, so a short turn is followed by silence until it is
// long enough to be cleaned. The silence is not the person: nothing written down outside the turn's
// own length is kept.
const MIN_SECONDS = 5;
const TAIL_SECONDS = 0.5;
// A cleanup that hangs is no cleanup at all: the turn is read as it always was rather than held.
const CLEAN_MS = 12000;

const UNCLEAN =
  "The noise cleanup isn't answering on this ElevenLabs key — turns are being read as before.";

// Anything the service names inside brackets is a sound rather than a word — a pause, a door, the
// wind — and is not something the person said.
const TAGS = /[([][^)\]]*[)\]]/g;

/** A secret's value, or nothing at all when it has not been saved yet. */
function secretOr(name: string): string {
  try {
    return secrets.get(name) || "";
  } catch (err) {
    return "";
  }
}

/** The turn's samples, with the WAV header the phone wrapped them in taken back off. */
function samplesOf(bytes: Uint8Array): Uint8Array | null {
  if (bytes.length <= 44) return null;
  const tag = (at: number) =>
    String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]);
  return tag(0) === "RIFF" && tag(8) === "WAVE" && tag(36) === "data" ? bytes.subarray(44) : null;
}

/** The turn's samples with silence after them, long enough for the cleanup to accept them. */
function padded(samples: Uint8Array): Uint8Array {
  const needed = RATE * 2 * MIN_SECONDS;
  if (samples.length >= needed) return samples;
  const out = new Uint8Array(needed);
  out.set(samples, 0);
  return out;
}

/**
 * The person's turn with the room taken out of it. What comes back is the cleaned voice — which is
 * what the ears are handed — together with how long the person actually spoke, so the silence added
 * for the cleanup is never read as words. A cleanup the key is not allowed to make, or one that
 * cannot answer in time, hands back nothing at all: the turn is never lost over it, and the reason
 * rides back with it so the app can say plainly that the room is not being cleaned.
 */
async function isolate(
  apiKey: string,
  bytes: Uint8Array
): Promise<{ voice: Uint8Array; type: string; spoken: number } | null> {
  const samples = samplesOf(bytes);
  const spoken = samples ? samples.length / (RATE * 2) : 0;

  const form = new FormData();
  form.append("file_format", samples ? "pcm_s16le_16" : "other");
  form.append(
    "audio",
    new Blob([samples ? padded(samples) : bytes], { type: "application/octet-stream" }),
    samples ? "turn.pcm" : "turn.wav"
  );

  const res = await fetch(ISOLATOR, {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: form,
    signal: AbortSignal.timeout(CLEAN_MS),
  });

  if (!res.ok) {
    console.error("The cleanup refused the turn:", res.status, (await res.text()).slice(0, 300));
    return null;
  }

  const voice = new Uint8Array(await res.arrayBuffer());
  if (!voice.length) return null;
  return { voice, type: res.headers.get("content-type") || "audio/mpeg", spoken };
}

/**
 * What the person said, read from the cleaned turn. Only a turn that had silence added to it is
 * shortened back to its own length: every word of a turn that was already long enough lies inside
 * it. A turn whose words are all sounds — a pause, a door, a breath — carries nothing to answer, so
 * the room is handed on as nothing at all rather than as a question nobody asked.
 */
function heardText(data: any, spoken: number): string {
  const words: any[] = Array.isArray(data?.words) ? data.words : [];
  let text = typeof data?.text === "string" ? data.text : "";

  if (spoken && spoken < MIN_SECONDS && words.length) {
    text = words
      .filter((word: any) => typeof word?.start !== "number" || word.start <= spoken + TAIL_SECONDS)
      .map((word: any) => (typeof word?.text === "string" ? word.text : ""))
      .join("");
  }

  const said = text.replace(TAGS, " ").trim();
  return /[\p{L}\p{N}]/u.test(said) ? said : "";
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

    // The room is taken out of the turn before anyone hears it, and only the voice left in it is
    // written down. A cleanup that cannot be made leaves the turn exactly as it was — nothing of it
    // is lost over the cleanup, and the reason is carried back with the words.
    let voice = bytes;
    let voiceType = "audio/wav";
    let voiceName = "turn.wav";
    let spokeFor = 0;
    let cleaned = true;
    let cleanup = "";
    try {
      const clean = await isolate(apiKey, bytes);
      if (clean) {
        voice = clean.voice;
        voiceType = clean.type;
        voiceName = "voice.mp3";
        spokeFor = clean.spoken;
      } else {
        cleaned = false;
        cleanup = UNCLEAN;
      }
    } catch (err: any) {
      console.error("The cleanup could not be reached:", err?.message);
      cleaned = false;
      cleanup = UNCLEAN;
    }

    const form = new FormData();
    form.append("model_id", MODEL);
    form.append("file", new Blob([voice], { type: voiceType }), voiceName);
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
      text: heardText(data, spokeFor),
      language: typeof data?.language_code === "string" ? data.language_code : "",
      cleaned,
      cleanup,
    });
  } catch (error: any) {
    console.error("The ears failed:", error?.message);
    return Response.json({ error: UNAVAILABLE }, { status: 500 });
  }
}