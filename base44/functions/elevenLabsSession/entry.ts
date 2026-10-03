import { secrets } from "base44:runtime";

export default async function (req: Request): Promise<Response> {
  const unavailable = "The voice call couldn't start. Please try again in a moment.";
  try {
    const apiKey = secrets.get("ELEVENLABS_API_KEY");
    const agentId = secrets.get("ELEVENLABS_AGENT_ID");

    if (!apiKey || !agentId) {
      console.error("ElevenLabs key or agent id is missing.");
      return Response.json({ error: unavailable }, { status: 500 });
    }

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

    return Response.json({ signed_url: data.signed_url });
  } catch (error) {
    console.error("Voice session failed:", error.message);
    return Response.json({ error: unavailable }, { status: 500 });
  }
}