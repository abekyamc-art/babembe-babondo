import { secrets } from "base44:runtime";

export default async function (req: Request): Promise<Response> {
  try {
    const apiKey = secrets.get("ELEVENLABS_API_KEY");
    const agentId = secrets.get("ELEVENLABS_AGENT_ID");

    if (!apiKey || !agentId) {
      return Response.json(
        { error: "The voice agent is not connected yet." },
        { status: 500 }
      );
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
      return Response.json(
        { error: reason || "ElevenLabs refused the session (" + res.status + ")." },
        { status: 502 }
      );
    }

    const data = await res.json();
    if (!data || !data.signed_url) {
      return Response.json({ error: "No conversation link was returned." }, { status: 502 });
    }

    return Response.json({ signed_url: data.signed_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}