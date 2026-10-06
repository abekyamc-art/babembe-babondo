import { secrets } from "base44:runtime";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

const VERSION = "2026-08-14";

/**
 * The Cartesia accounts a home call's voices open on, each with its own key and its own agent.
 * Cartesia AI answers on the account the app already had; Cartesia AI 1 answers on the admin's own
 * second account. Neither account's own settings are touched from here.
 */
const ACCOUNTS: Record<string, { name: string; key: string; agent: string }> = {
  "": { name: "Cartesia AI", key: "CARTESIA_API_KEY", agent: "CARTESIA_AGENT_ID" },
  one: { name: "Cartesia AI 1", key: "CARTESIA_AI1_API_KEY", agent: "CARTESIA_AI1_AGENT_ID" },
};

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
  // the voice whose account could not be reached, named in anything said about it
  let who = ACCOUNTS[""].name;
  try {
    // a call is only ever opened for a signed-in person
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    let payload: any = {};
    try {
      payload = await req.json();
    } catch (err) {
      payload = {};
    }

    // which Cartesia account answers: the app's own, or the admin's second one
    const asked = String(payload?.account || "").trim();
    const account = ACCOUNTS[asked] || ACCOUNTS[""];
    who = account.name;

    const apiKey = secretOr(account.key);
    const agentId = secretOr(account.agent);
    if (!apiKey || !agentId) {
      console.error(`${account.name}'s key or agent id is missing.`);
      return Response.json(
        {
          error: `${account.name} isn't set up yet — add its key and its agent id in Secrets, then tap to talk again.`,
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
          error: `${account.name} isn't set up yet — create an agent in Cartesia and save its agent_... id in Secrets.`,
        },
        { status: 500 }
      );
    }
    if (check.status === 401 || check.status === 403) {
      console.error("Cartesia refused the key:", check.status);
      return Response.json(
        { error: `${account.name} refused the key — check the key saved in Secrets.` },
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
          error: `${account.name} refused the call — give its key Agents permission, then tap to talk again.`,
        },
        { status: 502 }
      );
    }

    const data = await res.json();
    if (!data || !data.token) {
      console.error("Cartesia returned no token.");
      return Response.json(
        { error: `${account.name} couldn't be reached. Please try again in a moment.` },
        { status: 502 }
      );
    }

    return Response.json({ token: data.token, agent_id: agentId, version: VERSION });
  } catch (error: any) {
    console.error("Cartesia session failed:", error?.message);
    return Response.json({ error: `${who} couldn't be reached. Please try again in a moment.` }, { status: 500 });
  }
}