import { secrets } from "base44:runtime";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { appRulesBlock, blockKey, RULES_MARK, RULES_VERSION, withAppRules } from "../../shared/cartesiaRules.ts";
import { knowledgeStamp } from "../../shared/wordBank.ts";
import { savedWords } from "../../shared/knowledgeWords.ts";
import { docWholeBlock } from "../../shared/knowledgeDoc.ts";
import { agentKeywords } from "../../shared/hearingKeywords.ts";

const VERSION = "2026-08-14";

/**
 * The nearest Bantu reading of what is spoken here, and the language every reader of this app's
 * Kibembe is pointed at. The app's own ears read Kibembe on it — left to guess, they wander off into
 * whatever script they land on — and the voice's own hearing is pointed at it here with them. An
 * agent left on English hears a Kibembe turn as the English words it nearly sounds like, and answers
 * what it thought it heard instead of what was said.
 */
const HEAR_LANGUAGE = "sw";

// the admin's saved answers and saved notes, newest first: what the agent answers with
const KEY_ROWS = 200;
const NOTE_ROWS = 60;

/**
 * How much of the admin's document rides onto the agent. The document is far larger than any voice
 * can carry — it runs to hundreds of thousands of characters — and an agent whose instructions are
 * longer than it can read loses the app's own rules entirely, which is heard as a voice that repeats
 * one line or says nothing at all. So the agent is given the document's rules whole and the parts
 * that matter, inside a room a voice can hold; the whole of the document stands in the app, and the
 * turns that need it are answered from it there.
 */
const AGENT_DOC_ROOM = 6000;

/**
 * The Cartesia accounts a home call's voices open on, each with its own key and its own agent.
 * Cartesia AI answers on the account the app already had; Cartesia AI 1 answers on the admin's own
 * second account, and Cartesia AI 2 on their third. Behind each of those stands the one backup kept
 * for that AI alone — its own separate account, with its own key and its own agent — so an account
 * that cannot take a call hands it to the backup paired with it and never to anybody else's. The
 * admin's remaining accounts are not listed here and are never used. None of the accounts' own
 * settings are touched from here.
 */
const ACCOUNTS: Record<string, { name: string; key: string; agent: string }> = {
  "": { name: "Cartesia AI", key: "CARTESIA_API_KEY", agent: "CARTESIA_AGENT_ID" },
  bak: { name: "Cartesia AI B", key: "CARTESIA_BACKUP_API_KEY", agent: "CARTESIA_BACKUP_AGENT_ID" },
  one: { name: "Cartesia AI 1", key: "CARTESIA_AI1_API_KEY", agent: "CARTESIA_AI1_AGENT_ID" },
  onebak: {
    name: "Cartesia AI 1B",
    key: "CARTESIA_AI1_BACKUP_API_KEY",
    agent: "CARTESIA_AI1_BACKUP_AGENT_ID",
  },
  two: { name: "Cartesia AI 2", key: "CARTESIA_AI2_API_KEY", agent: "CARTESIA_AI2_AGENT_ID" },
  twobak: {
    name: "Cartesia AI 2B",
    key: "CARTESIA_AI2_BACKUP_API_KEY",
    agent: "CARTESIA_AI2_BACKUP_AGENT_ID",
  },
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
 * Where an agent keeps its own instructions, and what they say: the agents this app opens are the
 * deployed ones and keep them as llm_system_prompt, while a managed agent keeps the same text under
 * config.instructions. Whichever the agent has is the one read and the one written back.
 */
function promptOf(agent: any): { field: "llm_system_prompt" | "config"; text: string } {
  const deployed = typeof agent?.llm_system_prompt === "string" ? agent.llm_system_prompt : "";
  if (deployed) return { field: "llm_system_prompt", text: deployed };
  return { field: "config", text: String(agent?.config?.instructions || "") };
}

/**
 * The app's own rules kept on the agent: Gloire's current guide, the admin's answer key — the
 * answers that are spoken word for word and nothing after them — and the confirmed words. They are
 * written below the agent's own instructions, which are never touched, and the block is replaced
 * only when the store has moved since it was written, so a correction, a new saved answer or a word
 * the admin has just put right is in force on the very next call.
 */
/**
 * Whether the agent's own hearing already stands as the app keeps it: pointed at the nearest Bantu
 * reading of Kibembe, and holding the admin's confirmed words as the terms its service listens for.
 */
function hearingKept(agent: any, keyterms: string[]): boolean {
  const config = agent?.config || {};
  if (String(config?.language?.primary || "").toLowerCase() !== HEAR_LANGUAGE) return false;
  const had = Array.isArray(config?.audio?.input?.keyterms) ? config.audio.input.keyterms : [];
  return had.length === keyterms.length && had.every((term: any, at: number) => String(term) === keyterms[at]);
}

async function keepRules(base44: any, apiKey: string, agentId: string, agent: any) {
  try {
    const { field, text: current } = promptOf(agent);
    const stamp = await knowledgeStamp(base44);
    // The agent's own hearing is kept alongside its rules: the reading the app's own ears use for
    // Kibembe, and the admin's confirmed words as the terms its hearing service listens for — so a
    // word the app already holds is heard as the app writes it instead of as the English sound-alike
    // of it, and a word the admin has just confirmed is heard right on the very next call.
    const keyterms = await agentKeywords(base44);
    const rulesKept =
      current.includes(RULES_MARK) && blockKey(current) === `${RULES_VERSION}|${stamp}`;
    const hearingOk = hearingKept(agent, keyterms);
    // the block on the agent is the one the store holds and the one this code writes, and its hearing
    // stands as the app keeps it: nothing is read again and nothing is written, so an ordinary call
    // costs one look at the agent
    if (rulesKept && hearingOk) return true;

    const body: any = {};

    if (!rulesKept) {
      const [keys, notes, words, doc] = await Promise.all([
        base44.asServiceRole.entities.AssistantKnowledge.filter(
          { kind: "qa" },
          { sort: "-created_date", limit: KEY_ROWS, fields: ["question", "answer"] }
        ),
        base44.asServiceRole.entities.AssistantKnowledge.filter(
          { kind: "note" },
          { sort: "-created_date", limit: NOTE_ROWS, fields: ["title", "text"] }
        ),
        savedWords(base44),
        // the admin's one knowledge document, as much of it as a voice can carry: its rules whole,
        // the parts that matter, and a slice of every other part
        docWholeBlock(base44, AGENT_DOC_ROOM),
      ]);

      const saved = {
        keys: Array.isArray(keys) ? keys : keys?.items || [],
        notes: Array.isArray(notes) ? notes : notes?.items || [],
        words,
        doc,
      };
      const wanted = withAppRules(current, appRulesBlock(saved, stamp));
      if (wanted !== current) {
        // a deployed agent keeps its instructions as llm_system_prompt; a managed one as its config
        if (field === "llm_system_prompt") body.llm_system_prompt = wanted;
        else body.config = { instructions: wanted };
      }
    }

    // the agent's own hearing, in the same visit: the voice, its pace and everything else the admin
    // set are never touched, and a deployed agent keeps its own settings untouched as well
    if (!hearingOk && field === "config") {
      body.config = {
        ...(body.config || {}),
        language: { primary: HEAR_LANGUAGE },
        audio: { input: { keyterms } },
      };
    }
    if (!Object.keys(body).length) return true;

    const res = await fetch(`https://api.cartesia.ai/agents/${encodeURIComponent(agentId)}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Cartesia-Version": VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("The app's rules could not be kept on the agent:", res.status, detail.slice(0, 300));
      return false;
    }
    return true;
  } catch (error: any) {
    // the rules are never a reason a call fails to open: the agent answers as it already stood
    console.error("The app's rules could not be kept on the agent:", error?.message);
    return false;
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
    const base44 = createClientFromRequest(req);

    // Who is signed in is never what holds a call back: the home screen is open to a visitor, and
    // every other voice the call can open on opens for one too. The read below is only so the app's
    // own client is what reads the saved rules — so a session that cannot be read is simply nobody
    // signed in, and the call opens all the same. It must never fail the call: reading it used to
    // take the first AI off the line for a visitor before the call had even begun.
    try {
      await base44.auth.me();
    } catch (err) {
      // nobody is signed in on this device: the call still opens on the account it asked for
    }

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

    // The agent answers out of its own instructions, so the app's rules are made sure of here,
    // before the call opens: the answer key it must answer with, and the Kibembe it speaks from.
    // Rules that cannot be written leave the agent as it stood and never stop the call.
    let agent: any = null;
    try {
      agent = await check.json();
    } catch (err) {
      agent = null;
    }
    await keepRules(base44, apiKey, agentId, agent);

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