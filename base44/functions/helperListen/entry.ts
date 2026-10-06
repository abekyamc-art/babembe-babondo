import { secrets } from "base44:runtime";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { correctEbembe, earsKnowledge, writeDown } from "../../shared/openAiEars.ts";

// The app's own ears: OpenAI is the one reader of every voice feature, so what a person says comes
// back written once, in one hand, whichever call they are on — the Cartesia calls, the talk calls,
// and the app's own AI call all listen through here.
//
// The reader is handed the admin's own words before it listens (see openAiEars), and the turn it
// writes down is then placed on the saved spelling of those words, so the Ebembe that reaches the
// answering AI is the confirmed Ebembe. A turn of speech is a few hundred kilobytes, so anything
// much larger than that is refused here rather than being sent on.
const MAX_AUDIO_CHARS = 3_000_000;
const UNAVAILABLE = "Nothing could hear that turn — tap to talk again in a moment.";

// The cleanup stage: the room is taken out of the turn before a word of it is written down, so a
// fan, a door or a voice across the room is never handed on as something the person said. The turn
// is handed over as the samples it was recorded as — 16-bit PCM at 16 kHz, single channel — so
// nothing has to be decoded first, and the voice that comes back is what is read.
const ISOLATOR = "https://api.elevenlabs.io/v1/audio-isolation";
const RATE = 16000;
// The cleanup refuses a turn shorter than this, so a short turn is followed by silence until it is
// long enough to be cleaned. The silence is not the person: nothing written down outside the turn's
// own length is kept.
const MIN_SECONDS = 5;
// A cleanup that hangs is no cleanup at all: the turn is read as it always was rather than held.
const CLEAN_MS = 12000;

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
 * what the reader is handed. A cleanup the key is not allowed to make, or one that cannot answer in
 * time, hands back nothing at all: the turn is never lost over it.
 */
async function isolate(
  apiKey: string,
  bytes: Uint8Array
): Promise<{ voice: Uint8Array; type: string } | null> {
  const samples = samplesOf(bytes);

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
  return { voice, type: res.headers.get("content-type") || "audio/mpeg" };
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

    // OpenAI is the app's one reader, so the key it listens on is the one the app already holds.
    const apiKey = secretOr("OPENAI_API_KEY");
    if (!apiKey) {
      console.error("The ears' OpenAI key is missing.");
      return Response.json(
        { error: "The ears aren't set up yet — add the OpenAI key in Secrets, then talk again." },
        { status: 500 }
      );
    }

    // the app's own client, so the admin's saved words can point the reader at them
    const base44 = createClientFromRequest(req);
    const { terms, rows } = await earsKnowledge(base44);

    let bytes: Uint8Array;
    try {
      bytes = Uint8Array.from(atob(audio), (char) => char.charCodeAt(0));
    } catch (err) {
      console.error("The turn could not be read back from the request.");
      return Response.json({ error: "That turn could not be read." }, { status: 400 });
    }

    // The room is taken out of the turn before it is read: a cleanup that cannot be made leaves the
    // turn exactly as it was, and the reason is carried back so the app can say so once.
    let voice = bytes;
    let voiceType = "audio/wav";
    let cleaned = true;
    let cleanup = "";
    const isolateKey = secretOr("HELPER_SPEECH_API_KEY");
    if (isolateKey) {
      try {
        const clean = await isolate(isolateKey, bytes);
        if (clean) {
          voice = clean.voice;
          voiceType = clean.type;
        } else {
          cleaned = false;
          cleanup = "The noise cleanup isn't answering on this ElevenLabs key — turns are being read as before.";
        }
      } catch (err: any) {
        console.error("The cleanup could not be reached:", err?.message);
        cleaned = false;
        cleanup = "The noise cleanup isn't answering on this ElevenLabs key — turns are being read as before.";
      }
    }

    let heard = "";
    try {
      heard = await writeDown({ apiKey, bytes: voice, type: voiceType, terms });
    } catch (err: any) {
      console.error("The ears could not read the turn:", err?.message);
      return Response.json(
        {
          error:
            err?.message === "ears-no-key"
              ? "The ears refused the turn: check the OpenAI key in Secrets, then talk again."
              : "The ears couldn't read that turn — say it again in a moment.",
        },
        { status: 502 }
      );
    }

    // the turn is placed on the app's own spelling of its words, so the Ebembe handed on is the
    // confirmed Ebembe and never a sound-alike of it
    const text = correctEbembe(heard, rows);
    return Response.json({ text, language: "", cleaned, cleanup });
  } catch (error: any) {
    console.error("The ears failed:", error?.message);
    return Response.json({ error: UNAVAILABLE }, { status: 500 });
  }
}