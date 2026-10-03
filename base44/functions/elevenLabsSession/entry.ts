import { secrets } from "base44:runtime";

const unavailable = "The voice call couldn't start. Please try again in a moment.";

// The pace he speaks at: a fifth brisker than the normal pace, and the fastest this
// voice accepts. The agent allows no per-call pace, so it is kept on the agent itself.
const PACE = 1.2;
const MIN_PACE = 0.7;
const MAX_PACE = 1.2;

/**
 * Makes sure his agent speaks at the brisker pace. It is checked first and written
 * only when it has drifted back, so an ordinary call costs nothing, and a pace that
 * cannot be set is never a reason the call fails to open.
 */
async function raisePace(apiKey: string, agentId: string, speed: any) {
  const target = Math.min(MAX_PACE, Math.max(MIN_PACE, PACE));
  if (typeof speed === "number" && speed >= target) return;

  try {
    const res = await fetch(
      "https://api.elevenlabs.io/v1/convai/agents/" + encodeURIComponent(agentId),
      {
        method: "PATCH",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_config: { tts: { speed: target } } }),
      }
    );
    if (!res.ok) {
      console.error("Could not raise the agent's pace:", res.status, (await res.text()).slice(0, 300));
    }
  } catch (error) {
    console.error("Could not raise the agent's pace:", error.message);
  }
}

/**
 * His own agent holds the opening line, the switch that turns it off for a later
 * session, and the pace he speaks at. All three are read here, and none is guessed.
 */
async function readAgent(apiKey: string, agentId: string) {
  try {
    const res = await fetch(
      "https://api.elevenlabs.io/v1/convai/agents/" + encodeURIComponent(agentId),
      { headers: { "xi-api-key": apiKey } }
    );
    if (!res.ok) return { intro: "", allowIntroOverride: false };

    const data = await res.json();
    // the pace lives on the agent, so it is made sure of before this call opens
    await raisePace(apiKey, agentId, data?.conversation_config?.tts?.speed);
    const agent = data?.conversation_config?.agent || {};
    const overrides =
      data?.platform_settings?.overrides?.conversation_config_override?.agent || {};

    return {
      intro: typeof agent.first_message === "string" ? agent.first_message : "",
      allowIntroOverride: overrides.first_message === true,
    };
  } catch (error) {
    console.error("Could not read the agent's opening line:", error.message);
    return { intro: "", allowIntroOverride: false };
  }
}

export default async function (req: Request): Promise<Response> {
  try {
    const apiKey = secrets.get("ELEVENLABS_API_KEY");
    const agentId = secrets.get("ELEVENLABS_AGENT_ID");

    if (!apiKey || !agentId) {
      console.error("ElevenLabs key or agent id is missing.");
      return Response.json({ error: unavailable }, { status: 500 });
    }

    const agent = await readAgent(apiKey, agentId);

    const res = await fetch(
      "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=" +
        encodeURIComponent(agentId),
      { headers: { "xi-api-key": apiKey } }
    );

    if (!res.ok) {
      const detail = await res.text();
      let reason = "";
      try {
        reason = JSON.parse(detail)?.detail?.message || "";
      } catch (err) {
        reason = "";
      }
      console.error("ElevenLabs refused the session:", res.status, reason || detail);
      return Response.json({ error: unavailable }, { status: 502 });
    }

    const data = await res.json();
    if (!data || !data.signed_url) {
      console.error("ElevenLabs returned no conversation link.");
      return Response.json({ error: unavailable }, { status: 502 });
    }

    return Response.json({
      signed_url: data.signed_url,
      intro: agent.intro,
      allow_intro_override: agent.allowIntroOverride,
    });
  } catch (error) {
    console.error("Voice session failed:", error.message);
    return Response.json({ error: unavailable }, { status: 500 });
  }
}