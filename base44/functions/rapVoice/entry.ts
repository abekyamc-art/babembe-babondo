import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { secrets } from "base44:runtime";
import { flowOf } from "../../shared/rapFlows.ts";
import { separateStems } from "../../shared/stems.ts";

const UNAVAILABLE = "Sauti haikuweza kutengenezwa. Jaribu tena baada ya sekunde chache.";
const MAX_LINES = 80;
const MAX_LINE = 140;
const MIN_MS = 8000;
const MAX_MS = 240000;
// the song models that carry a sung lead, the newest first: the account may not hold them all
const SONG_MODELS = ["music_v2_5", "music_v2", "music_v1"];

function clean(value: any, max: number): string {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return text.slice(0, max);
}

/** The voice his own agent speaks with, for a take the person asks to hear in it. */
async function agentVoice(apiKey: string, agentId: string): Promise<string> {
  try {
    const res = await fetch(
      "https://api.elevenlabs.io/v1/convai/agents/" + encodeURIComponent(agentId),
      { headers: { "xi-api-key": apiKey } }
    );
    if (!res.ok) return "";
    const data = await res.json();
    return data?.conversation_config?.tts?.voice_id || "";
  } catch (error: any) {
    console.error("Could not read the agent's voice:", error?.message);
    return "";
  }
}

/** The voice settings a kind of rap asks for: the usual ones, and a pace when the flow calls for one. */
function flowSettings(flow: any): any {
  const settings: any = {
    stability: 0.4,
    similarity_boost: 0.8,
    style: 0.45,
    use_speaker_boost: true,
  };
  // the provider takes a speed between 0.7 and 1.2; the usual flow keeps its own pace
  if (flow?.speed) settings.speed = Math.min(1.2, Math.max(0.7, flow.speed));
  return settings;
}

/** A sung take: the lines are sung and rapped on the beat, in the beat's own key and tempo. */
async function singSong(
  apiKey: string,
  bpm: number,
  lyrics: string,
  lengthMs: number,
  flow: any,
  key: string
) {
  const prompt = [
    "An Afro-Zaga / Bongo Flava rap song in the key of " +
      key +
      " at " +
      bpm +
      " BPM: a driving kick and clap, bongo tom rolls, a shaker on every sixteenth, a deep bass locked to that key, no long intro.",
    "One lead voice SINGS and RAPS every line in pitch with the beat — a melodic sung hook and sung verses, " +
      flow.delivery +
      ".",
    "Singing only, on the beat, in that key: never spoken word, never a reading, never a narrator or a talking voice.",
    "Use exactly these lines as the lyrics, one line per bar, and add nothing else:",
    lyrics,
  ].join("\n");

  for (const model of SONG_MODELS) {
    try {
      const res = await fetch("https://api.elevenlabs.io/v1/music", {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, music_length_ms: lengthMs, model_id: model }),
      });
      if (!res.ok) {
        console.error("Music generation refused:", model, res.status, (await res.text()).slice(0, 300));
        continue;
      }
      return new Uint8Array(await res.arrayBuffer());
    } catch (error: any) {
      console.error("Music generation failed:", model, error?.message);
    }
  }
  return null;
}

/** The plain voice track of the agent itself: the same lines, rapped at speed, for the beat on the phone. */
async function rapVoice(apiKey: string, voiceId: string, lyrics: string, flow: any) {
  try {
    const res = await fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/" + encodeURIComponent(voiceId),
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: lyrics,
          model_id: "eleven_multilingual_v2",
          voice_settings: flowSettings(flow),
        }),
      }
    );
    if (!res.ok) {
      console.error("Voice refused:", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    return new Uint8Array(await res.arrayBuffer());
  } catch (error: any) {
    console.error("Voice failed:", error?.message);
    return null;
  }
}

/** An audio file the take can be played from. */
async function store(base44: any, bytes: Uint8Array, name: string): Promise<string> {
  const file = new File([bytes], name, { type: "audio/mpeg" });
  const uploaded: any = await base44.asServiceRole.integrations.Core.UploadPublicFile({ file });
  if (!uploaded?.file_url) console.error("A take file could not be stored.");
  return uploaded?.file_url || "";
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Ingia kwenye akaunti kwanza." }, { status: 401 });

    const apiKey = secrets.get("ELEVENLABS_API_KEY");
    const agentId = secrets.get("ELEVENLABS_AGENT_ID");
    if (!apiKey || !agentId) {
      console.error("ElevenLabs key or agent id is missing.");
      return Response.json({ error: UNAVAILABLE }, { status: 500 });
    }

    let payload: any = {};
    try {
      payload = await req.json();
    } catch (err) {
      payload = {};
    }

    const lines = (Array.isArray(payload?.lines) ? payload.lines : [])
      .map((line: any) => clean(line, MAX_LINE))
      .filter((line: string) => line)
      .slice(0, MAX_LINES);
    if (!lines.length) {
      return Response.json({ error: "Hakuna mistari ya kusomwa." }, { status: 400 });
    }

    const bpm = Math.min(160, Math.max(60, Number(payload?.bpm) || 112));
    const beat = ["app", "mine", "none"].includes(payload?.beat) ? payload.beat : "app";
    const voice = payload?.voice === "agent" ? "agent" : "sing";
    const flow = flowOf(payload?.flow);
    const key = clean(payload?.key, 24) || "A minor";

    const seconds = (lines.length * 4 * 60) / bpm;
    const lengthMs = Math.min(MAX_MS, Math.max(MIN_MS, Math.round(seconds * 1000)));
    const lyrics = lines.join("\n");
    const timing = Math.round(seconds * 10) / 10;

    // The singing voice is only ever asked for a sung performance. There is no reading of the
    // lines behind it: a take either comes back sung, or it does not come back at all.
    if (voice === "sing") {
      const sung = await singSong(apiKey, bpm, lyrics, lengthMs, flow, key);
      if (!sung) return Response.json({ error: UNAVAILABLE }, { status: 502 });

      const songUrl = await store(base44, sung, "take.mp3");
      if (!songUrl) return Response.json({ error: UNAVAILABLE }, { status: 502 });

      // Over the person's own beat the voice is lifted out of the sung song and laid on that
      // beat on the phone, so the take sings in the beat's own key and tempo.
      if (beat !== "app") {
        const stems = await separateStems(apiKey, sung);
        if (stems) {
          const voiceUrl = await store(base44, stems.voice.bytes, "voice.mp3");
          if (voiceUrl) {
            return Response.json({
              audio_url: voiceUrl,
              song_url: songUrl,
              kind: "vocal",
              seconds: timing,
            });
          }
        }
        console.error("The voice could not be lifted out of the sung song.");
      }

      return Response.json({
        audio_url: songUrl,
        song_url: songUrl,
        kind: "song",
        seconds: timing,
      });
    }

    // the person asked for the take in the assistant's own voice
    const voiceId = await agentVoice(apiKey, agentId);
    if (!voiceId) {
      console.error("The agent has no voice configured.");
      return Response.json({ error: UNAVAILABLE }, { status: 502 });
    }
    const spoken = await rapVoice(apiKey, voiceId, lyrics, flow);
    if (!spoken) return Response.json({ error: UNAVAILABLE }, { status: 502 });

    const url = await store(base44, spoken, "take.mp3");
    if (!url) return Response.json({ error: UNAVAILABLE }, { status: 502 });

    return Response.json({ audio_url: url, song_url: "", kind: "voice", seconds: timing });
  } catch (error: any) {
    console.error("Rap voice failed:", error?.message);
    return Response.json({ error: UNAVAILABLE }, { status: 500 });
  }
}