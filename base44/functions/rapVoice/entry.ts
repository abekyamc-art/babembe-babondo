import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { secrets } from "base44:runtime";

const UNAVAILABLE = "Sauti haikuweza kutengenezwa. Jaribu tena baada ya sekunde chache.";
const MAX_LINES = 32;
const MAX_LINE = 140;
const MIN_MS = 12000;
const MAX_MS = 240000;

function clean(value: any, max: number): string {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return text.slice(0, max);
}

/** The voice his own agent speaks with, so a take can be rapped by it when music isn't available. */
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

/** A sung take: the singing voice comes back with its own Afro-Zaga beat already under it. */
async function singSong(apiKey: string, bpm: number, lyrics: string, lengthMs: number) {
  const prompt = [
    "An Afro-Zaga / Bongo Flava rap track at " + bpm + " BPM: a driving kick and clap, bongo tom rolls, a shaker on every sixteenth, a deep one-note bass, no long intro.",
    "One singer raps and sings the whole song on the beat, fast and clear, with a sung hook.",
    "Use exactly these lines as the lyrics, one line per bar, and add nothing else:",
    lyrics,
  ].join("\n");

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/music", {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, music_length_ms: lengthMs, model_id: "music_v1" }),
    });
    if (!res.ok) {
      console.error("Music generation refused:", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    return new Uint8Array(await res.arrayBuffer());
  } catch (error: any) {
    console.error("Music generation failed:", error?.message);
    return null;
  }
}

/** The plain voice track: the same lines, rapped at speed, for the beat chosen on the phone. */
async function rapVoice(apiKey: string, voiceId: string, lyrics: string) {
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
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.8,
            style: 0.45,
            use_speaker_boost: true,
          },
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

    const seconds = (lines.length * 4 * 60) / bpm + 3;
    const lengthMs = Math.min(MAX_MS, Math.max(MIN_MS, Math.round(seconds * 1000)));
    const lyrics = lines.join("\n");

    let bytes: Uint8Array | null = null;
    let kind = "voice";

    // a song carries its own beat, so it is only asked for when no other beat is laid
    // under it on the phone afterwards
    if (voice === "sing" && beat === "app") {
      bytes = await singSong(apiKey, bpm, lyrics, lengthMs);
      if (bytes) kind = "song";
    }

    if (!bytes) {
      const voiceId = await agentVoice(apiKey, agentId);
      if (!voiceId) {
        console.error("The agent has no voice configured.");
        return Response.json({ error: UNAVAILABLE }, { status: 502 });
      }
      bytes = await rapVoice(apiKey, voiceId, lyrics);
      if (!bytes) return Response.json({ error: UNAVAILABLE }, { status: 502 });
    }

    const file = new File([bytes], "take.mp3", { type: "audio/mpeg" });
    const uploaded: any = await base44.asServiceRole.integrations.Core.UploadPublicFile({ file });
    if (!uploaded?.file_url) {
      console.error("The take could not be stored.");
      return Response.json({ error: UNAVAILABLE }, { status: 502 });
    }

    return Response.json({
      audio_url: uploaded.file_url,
      kind,
      seconds: Math.round(seconds * 10) / 10,
    });
  } catch (error: any) {
    console.error("Rap voice failed:", error?.message);
    return Response.json({ error: UNAVAILABLE }, { status: 500 });
  }
}