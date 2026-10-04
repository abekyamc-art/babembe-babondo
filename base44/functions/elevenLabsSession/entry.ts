import { secrets } from "base44:runtime";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { ensureFastPace } from "../../shared/agentPace.ts";
import { MAX_TERM, clean, knowledgeWordRows } from "../../shared/knowledgeWords.ts";

const unavailable = "The voice call couldn't start. Please try again in a moment.";

// The accounts a call can open on. Each one keeps its own key and its own agent, and a call opens
// on the account it asked for and nowhere else: the standing account for the original outside
// voice, the second one for Base44 mode's spoken voice, and Mbondo's own for everything he
// answers, written or spoken. Nothing here ever falls back from one account to another, so
// whatever is missing is said plainly instead of being answered by someone else.
const ACCOUNTS = [
  { id: "", name: "", key: "ELEVENLABS_API_KEY", agent: "ELEVENLABS_AGENT_ID" },
  {
    id: "second",
    name: "Mbembe AI",
    key: "ELEVENLABS_ACCOUNT2_API_KEY",
    agent: "ELEVENLABS_ACCOUNT2_AGENT_ID",
  },
  {
    id: "third",
    name: "Mbondo AI",
    key: "ELEVENLABS_ACCOUNT3_API_KEY",
    agent: "ELEVENLABS_ACCOUNT3_AGENT_ID",
  },
];

// The hearing service behind the call knows no Kibembe at all: a word it was never taught comes
// back as the English or Kiswahili word it nearly sounds like, and the answer follows that wrong
// text. It does take words of the app's own, though, so the admin's saved Ebembe words ride with
// every call — up to the fifty it accepts — and what the person says comes back spelled the way
// the app already holds it.
const KEYWORD_LIMIT = 50;

// The letter runs no English or Kiswahili word carries. A word wearing one has nothing for the
// service to fall back on, so those are the words pointed at first, the longest of them ahead.
const CLUSTERS = ["ny", "ng", "mb", "nk", "nd", "nt", "mv", "bv", "hw", "bw", "gw", "kw", "by"];

// the name of the language itself: always heard, and always written the same way
const ALWAYS = ["Ebembe", "Kibembe"];

/** How much a saved word needs the service pointed at it. */
function keywordScore(term: string): number {
  const word = term.toLowerCase();
  // Letters past a handful say nothing about whether the word ever gets said, and a very
  // long word would otherwise take a place an everyday one is the one that needs.
  let score = Math.min(word.length, 6);
  CLUSTERS.forEach((cluster) => {
    if (word.includes(cluster)) score += 4;
  });
  return score;
}

/** The saved words the hearing service is pointed at: one spelling each, single words only, the
 *  ones it would otherwise turn into English or Kiswahili words first. */
function hearingKeywords(rows: any[]): string[] {
  const seen = new Set(ALWAYS.map((word) => word.toLowerCase()));
  const found: { term: string; score: number }[] = [];

  rows.forEach((row: any) => {
    const term = clean(row?.term, MAX_TERM);
    // One plain word, and nothing else: a phrase, a syllable run joined by dashes, a rule or a
    // heading is not something the person says, and pointing the service at it would only make
    // it write dashes and headings back.
    if (!/^[\p{L}'’]{3,}$/u.test(term)) return;
    const key = term.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ term, score: keywordScore(term) });
  });

  found.sort((a, b) => b.score - a.score);
  return [...ALWAYS, ...found.slice(0, KEYWORD_LIMIT - ALWAYS.length).map((row) => row.term)];
}

// The words are read once per call, not once per turn: the admin's list is the same list a
// moment later, and a call opens in one beat.
const CACHE_MS = 60000;
let cache: { at: number; words: string[] } = { at: 0, words: [] };

/** The admin's saved words as recognition keywords, kept for a moment so a call reads them once. */
async function recognitionKeywords(base44: any): Promise<string[]> {
  if (cache.words.length && Date.now() - cache.at < CACHE_MS) return cache.words;
  try {
    const rows = await knowledgeWordRows(base44);
    cache = { at: Date.now(), words: hearingKeywords(rows) };
    return cache.words;
  } catch (error: any) {
    console.error("The saved words could not be read for the hearing service:", error?.message);
    return cache.words;
  }
}

/**
 * The service only takes those words when the agent's own security settings allow it, and it
 * ignores them silently when they do not — so the permission is made sure of here. The agent's
 * settings are merged into as they already stand, never replaced, and a permission that cannot
 * be written is never a reason a call fails to open.
 */
async function allowKeywordBoost(apiKey: string, agentId: string, agent: any) {
  try {
    const settings = agent?.platform_settings;
    // the settings are only ever written from a copy of themselves: without them there is
    // nothing safe to merge into, so the write is left alone
    if (!settings || typeof settings !== "object") return false;

    const overrides = settings.overrides || {};
    const fields = overrides.conversation_config_override || {};
    const asr = fields.asr || {};
    if (asr.keywords === true) return true;

    const res = await fetch(
      "https://api.elevenlabs.io/v1/convai/agents/" + encodeURIComponent(agentId),
      {
        method: "PATCH",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          platform_settings: {
            ...settings,
            overrides: {
              ...overrides,
              conversation_config_override: { ...fields, asr: { ...asr, keywords: true } },
            },
          },
        }),
      }
    );
    if (!res.ok) {
      console.error("Could not allow the saved words into the hearing service:", res.status);
      return false;
    }
    return true;
  } catch (error: any) {
    console.error("Could not allow the saved words into the hearing service:", error?.message);
    return false;
  }
}

/**
 * Makes sure his agent speaks at the brisker pace. It is checked first and written
 * only when it has drifted back, so an ordinary call costs nothing, and a pace that
 * cannot be set is never a reason the call fails to open.
 */
/**
 * His own agent holds the opening line and the switch that turns it off for a later
 * session. Both are read here, and neither is guessed.
 */
async function readAgent(apiKey: string, agentId: string) {
  try {
    const res = await fetch(
      "https://api.elevenlabs.io/v1/convai/agents/" + encodeURIComponent(agentId),
      { headers: { "xi-api-key": apiKey } }
    );
    if (!res.ok) return { intro: "", allowIntroOverride: false };

    const data = await res.json();
    // the pace lives on the agent, so it is made sure of before this call opens: read,
    // written, and read back to confirm the write took
    await ensureFastPace(apiKey, agentId);
    // and the saved words are only taken by the hearing service when the agent allows them
    await allowKeywordBoost(apiKey, agentId, data);
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

/** A secret's value, or nothing at all when it has not been saved yet. */
function secretOr(name: string): string {
  try {
    return secrets.get(name) || "";
  } catch (err) {
    return "";
  }
}

export default async function (req: Request): Promise<Response> {
  try {
    let payload: any = {};
    try {
      payload = await req.json();
    } catch (err) {
      payload = {};
    }

    // A call opens on the account it asked for; an account nobody named is the standing one.
    const asked = String(payload?.account || "");
    const account = ACCOUNTS.find((row) => row.id === asked) || ACCOUNTS[0];
    const apiKey = secretOr(account.key);
    const agentId = secretOr(account.agent);

    if (!apiKey || !agentId) {
      console.error(
        account.id
          ? `${account.name}'s key or agent id is missing.`
          : "ElevenLabs key or agent id is missing."
      );
      return Response.json(
        {
          error: account.id
            ? `${account.name}'s own voice account isn't set up yet — add its ElevenLabs key and agent id in Secrets, then tap to talk again.`
            : unavailable,
        },
        { status: 500 }
      );
    }

    // the app's own client, so the admin's saved words can be read for the hearing service
    const base44 = createClientFromRequest(req);
    const [agent, keywords] = await Promise.all([
      readAgent(apiKey, agentId),
      recognitionKeywords(base44),
    ]);

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
      return Response.json(
        {
          error: account.id
            ? `${account.name}'s voice account refused the call${
                reason ? `: ${reason}` : ""
              }. Give its ElevenLabs key Conversational AI permission, then tap to talk again.`
            : unavailable,
        },
        { status: 502 }
      );
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
      asr_keywords: keywords,
    });
  } catch (error) {
    console.error("Voice session failed:", error.message);
    return Response.json({ error: unavailable }, { status: 500 });
  }
}