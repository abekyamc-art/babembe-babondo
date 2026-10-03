import { secrets } from "base44:runtime";

const API = "https://api.liveavatar.com";
const SECRET_NAME = "Babembe Babondo GS voice";

/**
 * The app's own ElevenLabs key is registered with LiveAvatar once and reused
 * after that, so the agent's village-language voice is the only voice the
 * avatar ever speaks with.
 */
async function elevenLabsSecretId(apiKey: string, elevenKey: string): Promise<string> {
  const listRes = await fetch(`${API}/v1/secrets`, { headers: { "X-API-KEY": apiKey } });
  if (listRes.ok) {
    const listed = await listRes.json();
    const rows = Array.isArray(listed?.data) ? listed.data : [];
    const existing = rows.find((row: any) => row?.secret_type === "ELEVENLABS_API_KEY");
    if (existing?.id) return existing.id;
  }

  const createRes = await fetch(`${API}/v1/secrets`, {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      secret_type: "ELEVENLABS_API_KEY",
      secret_value: elevenKey,
      secret_name: SECRET_NAME,
    }),
  });
  const created = await createRes.json().catch(() => null);
  const id = created?.data?.id;
  if (!createRes.ok || !id) {
    console.error("LiveAvatar refused the ElevenLabs key:", createRes.status, created?.message || "");
    throw new Error("the ElevenLabs key could not be registered");
  }
  return id;
}

export default async function (req: Request): Promise<Response> {
  const unavailable = "Your face couldn't be reached right now.";
  try {
    const apiKey = secrets.get("LIVEAVATAR_API_KEY");
    const avatarId = secrets.get("LIVEAVATAR_AVATAR_ID");
    const elevenKey = secrets.get("ELEVENLABS_API_KEY");
    const agentId = secrets.get("ELEVENLABS_AGENT_ID");

    const body = await req.json().catch(() => ({}));

    // until the face is set up, the app stays on the voice-only path it always had
    if (!apiKey || !avatarId || !elevenKey || !agentId) {
      return Response.json({ ready: false, reason: "not_configured" });
    }
    if (body?.probe) return Response.json({ ready: true });

    const secretId = await elevenLabsSecretId(apiKey, elevenKey);

    // the session token is short-lived and belongs to this one call; the key never leaves the server
    const res = await fetch(`${API}/v1/sessions/token`, {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        mode: "LITE",
        avatar_id: avatarId,
        elevenlabs_agent_config: { secret_id: secretId, agent_id: agentId },
      }),
    });

    const payload = await res.json().catch(() => null);
    const token =
      payload?.data?.session_token ||
      payload?.data?.session_access_token ||
      payload?.data?.token;

    if (!res.ok || !token) {
      console.error("LiveAvatar refused the session:", res.status, payload?.message || "");
      return Response.json({ ready: false, error: unavailable }, { status: 502 });
    }

    return Response.json({ ready: true, session_token: token });
  } catch (error) {
    console.error("LiveAvatar session failed:", error.message);
    return Response.json({ ready: false, error: unavailable }, { status: 500 });
  }
}