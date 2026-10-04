/**
 * The pace he speaks at. It lives on his own ElevenLabs agent, which both kinds of call read
 * before they open — the voice-only call and the call carrying his face — so neither one ever
 * opens at the slow default.
 */

// a fifth brisker than the normal pace, and the fastest this voice accepts
const PACE = 1.2;

const AGENT_API = "https://api.elevenlabs.io/v1/convai/agents/";

/** The pace the agent is set to right now, or null when it cannot be read. */
async function readSpeed(apiKey: string, agentId: string): Promise<number | null> {
  try {
    const res = await fetch(AGENT_API + encodeURIComponent(agentId), {
      headers: { "xi-api-key": apiKey },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const speed = data?.conversation_config?.tts?.speed;
    return typeof speed === "number" ? speed : null;
  } catch (error: any) {
    console.error("Could not read the agent's pace:", error?.message);
    return null;
  }
}

/** Writes the pace, and hands back whether the write was accepted. */
async function writeSpeed(apiKey: string, agentId: string): Promise<boolean> {
  try {
    const res = await fetch(AGENT_API + encodeURIComponent(agentId), {
      method: "PATCH",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_config: { tts: { speed: PACE } } }),
    });
    if (!res.ok) {
      console.error("Could not set the agent's pace:", res.status, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (error: any) {
    console.error("Could not set the agent's pace:", error?.message);
    return false;
  }
}

/**
 * Makes sure he speaks at the brisker pace. The pace is read first and written only when it has
 * drifted back, so an ordinary call costs nothing; the write is read back to confirm it took,
 * with one retry when the pace is unset or the write is refused. A pace that cannot be set is
 * never a reason a call fails to open.
 */
export async function ensureFastPace(apiKey: string, agentId: string): Promise<boolean> {
  if (!apiKey || !agentId) return false;
  try {
    const current = await readSpeed(apiKey, agentId);
    if (current !== null && current >= PACE) return true;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (!(await writeSpeed(apiKey, agentId))) continue;
      const after = await readSpeed(apiKey, agentId);
      if (after !== null && after >= PACE) return true;
    }
    return false;
  } catch (error: any) {
    console.error("The agent's pace could not be made sure of:", error?.message);
    return false;
  }
}