import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { secrets } from "base44:runtime";

/**
 * The Base44 AI call. What the person said is heard, the answer is written by the app's own
 * AI from the knowledge it is handed, and the Kibembe of that answer is spoken back out loud
 * in the platform's own voice. The screen carries the same three parts the app already
 * shows — Kibembe, how it sounds, Kiswahili and English — while the voice reads the Kibembe
 * alone, plainly, so what comes out of the phone is the language itself.
 */

// the platform voice the Kibembe is read in, and the ceilings one answer is kept inside
const SPEECH_VOICE = "river";
const MAX_ANSWER = 900;
const MAX_SPOKEN = 320;
const MAX_QUESTION = 400;
const MAX_MEMORY = 12000;
const MAX_HISTORY = 1200;
const MAX_AUDIO_CHARS = 2500000;

const REPLY_SCHEMA = {
  type: "object",
  properties: {
    ebembe: { type: "string" },
    guide: { type: "string" },
    swahili: { type: "string" },
    english: { type: "string" },
    say: { type: "string" },
  },
  required: ["ebembe", "say"],
};

const ROLE =
  "You are Babembe Babondo GS, a Kibembe (Ebembe) guide from the Babembe village, speaking out loud with a person on a phone call. " +
  "Their words were caught by a listening service, so their spelling may be rough: read them for what the person meant, and never correct their spelling out loud.";

const KNOWLEDGE_HEAD =
  "The knowledge saved for you by the admin of this app. The rules at its head stand above everything else here, and every answer obeys them:";

const HOW = [
  "Write every answer in exactly these parts, in this order:",
  "ebembe: the answer itself in Kibembe (Ebembe), the words a Babembe speaker really uses, spelled plainly with no hyphens between syllables.",
  "guide: how that same Kibembe sounds to an American ear, syllable by syllable joined with dashes.",
  "swahili: the same thing in everyday Kiswahili. english: the same thing in plain English.",
  "say: only the Kibembe part, written exactly as a voice should read it out — no brackets, no dashes, no pronunciation notes, no language names. One or two short sentences.",
  "Keep the whole answer short: this is talk, not an essay, and never more than three sentences of Kibembe.",
  "Build the Kibembe from the words saved in the knowledge. Never invent a word, never change a spelling.",
  "Never repeat a line you have already given in this conversation: say something new.",
  "If what the person said is unclear, ask them briefly again, in the same order.",
].join("\n");

function textOf(value: any, max = MAX_ANSWER): string {
  const text = typeof value === "string" ? value : "";
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

/** The recording of one spoken turn, as the bytes the listening service is handed. */
function audioOf(value: any): { bytes: Uint8Array; type: string } | null {
  const body = String(value?.b64 || "").replace(/^data:[^,]*,/, "").replace(/\s+/g, "");
  if (!body || body.length > MAX_AUDIO_CHARS) return null;
  try {
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return { bytes, type: String(value?.type || "audio/webm") };
  } catch (error: any) {
    console.error("The turn could not be read:", error?.message);
    return null;
  }
}

/** What was said, as the listening service heard it. */
async function listen(apiKey: string, bytes: Uint8Array, type: string): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: type || "audio/webm" }), "turn");
  form.append("model_id", "scribe_v1");
  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: form,
  });
  if (!res.ok) throw new Error("hear-" + res.status);
  const data: any = await res.json();
  return textOf(data?.text, MAX_QUESTION);
}

/** The answer as the screen shows it: the three parts, in the order the app always uses. */
function shown(out: any): string {
  const rows = [
    ["Ebembe", textOf(out?.ebembe)],
    ["Inasikika", textOf(out?.guide)],
    ["Kiswahili", textOf(out?.swahili)],
    ["English", textOf(out?.english)],
  ];
  return rows
    .filter(([, value]) => value)
    .map(([name, value]) => name + ": " + value)
    .join("\n");
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    let payload: any = {};
    try {
      payload = await req.json();
    } catch (err) {
      payload = {};
    }

    const typed = textOf(payload?.text, MAX_QUESTION);
    const audio = audioOf(payload?.audio);
    if (!typed && !audio) {
      return Response.json({ error: "Hakuna swali lililotumwa." }, { status: 400 });
    }

    // a spoken turn is heard first; a typed one is already in words
    let transcript = "";
    if (!typed) {
      const apiKey = secrets.get("ELEVENLABS_API_KEY");
      if (!apiKey) return Response.json({ error: "Sauti haisikiki kwa sasa." }, { status: 500 });
      transcript = await listen(apiKey, audio.bytes, audio.type);
      if (!transcript) {
        return Response.json({ error: "Sikukusikia — sema tena." }, { status: 502 });
      }
    }

    const memory = textOf(payload?.memory, MAX_MEMORY);
    const history = textOf(payload?.history, MAX_HISTORY);

    const prompt = [
      ROLE,
      HOW,
      memory ? KNOWLEDGE_HEAD + "\n" + memory : "",
      history ? "The talk so far, oldest first:\n" + history : "",
      "What they just said: " + (typed || transcript),
    ]
      .filter(Boolean)
      .join("\n\n");

    const out: any = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: REPLY_SCHEMA,
    });

    const answer = shown(out);
    // the voice reads the Kibembe itself; when the writer gave no separate spoken line the
    // Kibembe it wrote is read as it stands
    const say = (textOf(out?.say, MAX_SPOKEN) || textOf(out?.ebembe, MAX_SPOKEN)).trim();
    if (!answer || !say) {
      return Response.json({ error: "Jibu halikukamilika. Jaribu tena." }, { status: 502 });
    }

    let audio_url = "";
    try {
      const made: any = await base44.asServiceRole.integrations.Core.GenerateSpeech({
        text: say,
        voice: SPEECH_VOICE,
      });
      audio_url = made?.url || "";
    } catch (error: any) {
      // the words still reach the screen when the voice cannot be made
      console.error("The voice could not be made:", error?.message);
    }

    return Response.json({ transcript, answer, say, audio_url });
  } catch (error: any) {
    console.error("The Base44 answer failed:", error?.message);
    return Response.json({ error: "Jibu halikukamilika. Jaribu tena." }, { status: 500 });
  }
}