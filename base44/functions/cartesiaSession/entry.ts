import { secrets } from "base44:runtime";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

const VERSION = "2026-08-14";
const unavailable = "Cartesia AI couldn't be reached. Please try again in a moment.";

/** A secret's value, or nothing at all when it has not been saved yet. */
function secretOr(name: string): string {
  try {
    return secrets.get(name) || "";
  } catch (err) {
    return "";
  }
}

/**
 * The key that opens Cartesia AI's call, minted here and never handed out.
 *
 * A phone cannot hold an API key: anyone could read it off the page and spend the account. So the
 * key stays on the server, and the phone is given a short-lived token instead — one that opens the
 * agent's calling socket and nothing else, and that has run out by the time the call is over.
 */
export default async function (req: Request): Promise<Response> {
  try {
    // a call is only ever opened for a signed-in person
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const apiKey = secretOr("CARTESIA_API_KEY");
    const agentId = secretOr("CARTESIA_AGENT_ID");
    if (!apiKey || !agentId) {
      console.error("Cartesia's key or agent id is missing.");
      return Response.json(
        {
          error:
            "Cartesia AI isn't set up yet — add its key and its agent id in Secrets, then tap to talk again.",
        },
        { status: 500 }
      );
    }

    // The saved agent is checked before a token is spent on it: an id that is not one of the
    // account's agents, or a key that is refused, is said plainly — with what to do about it —
    // rather than the call failing later with nothing to act on.
    const check = await fetch(`https://api.cartesia.ai/agents/${encodeURIComponent(agentId)}`, {
      headers: { Authorization: `Bearer ${apiKey}`, "Cartesia-Version": VERSION },
    });
    if (check.status === 404) {
      console.error("The saved Cartesia agent id is not an agent on this account.");
      return Response.json(
        {
          error:
            "Cartesia AI isn't set up yet — create an agent in Cartesia and save its agent_... id in Secrets.",
        },
        { status: 500 }
      );
    }
    if (check.status === 401 || check.status === 403) {
      console.error("Cartesia refused the key:", check.status);
      return Response.json(
        { error: "Cartesia AI refused the key — check the key saved in Secrets." },
        { status: 502 }
      );
    }

    const res = await fetch("https://api.cartesia.ai/access-token", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Cartesia-Version": VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ grants: { agent: true }, expires_in: 3600 }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Cartesia refused the token:", res.status, detail);
      return Response.json(
        {
          error:
            "Cartesia AI refused the call — give its key Agents permission, then tap to talk again.",
        },
        { status: 502 }
      );
    }

    const data = await res.json();
    if (!data || !data.token) {
      console.error("Cartesia returned no token.");
      return Response.json({ error: unavailable }, { status: 502 });
    }

    return Response.json({ token: data.token, agent_id: agentId, version: VERSION });
  } catch (error: any) {
    console.error("Cartesia session failed:", error?.message);
    return Response.json({ error: unavailable }, { status: 500 });
  }
}