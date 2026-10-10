import { secrets } from "base44:runtime";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { ensureFastPace } from "../../shared/agentPace.ts";
import { recognitionKeywords } from "../../shared/hearingKeywords.ts";
import {
  AGENT_ROOM,
  appRulesBlock,
  blockKey,
  RULES_MARK,
  RULES_VERSION,
  withAppRules,
} from "../../shared/cartesiaRules.ts";
import { knowledgeStamp } from "../../shared/wordBank.ts";
import { loadSavedMaterial } from "../../shared/voiceRules.ts";

const unavailable = "The voice call couldn't start. Please try again in a moment.";

// The accounts a call can open on. Each one keeps its own key and its own agent, and a call opens
// on the account it asked for and nowhere else: the standing account for the original outside
// voice, the second one for Base44 mode's spoken voice, Mbondo's own and Sadiki's own for
// everything they answer, written or spoken, and the app's two written helpers. Nothing here ever
// falls back from one account to another, so whatever is missing is said plainly instead of being
// answered by someone else.
const ACCOUNTS: {
  id: string;
  name: string;
  key: string;
  agent: string;
  plain?: boolean;
  keepPace?: boolean;
}[] = [
  // The standing account, and the app's own name for the voice that answers on it.
  { id: "", name: "GLOIRE AI", key: "ELEVENLABS_API_KEY", agent: "ELEVENLABS_AGENT_ID" },
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
  {
    id: "fourth",
    name: "Sadiki AI",
    key: "ELEVENLABS_ACCOUNT4_API_KEY",
    agent: "ELEVENLABS_ACCOUNT4_AGENT_ID",
  },
  // The admin's own talk AIs, waiting their turn behind the standing one: the home page's calls
  // take turns on all four, each on its own account with its own key, its own agent and its own
  // knowledge, and each answering two questions before the coordinator signals the change.
  // The voice AI 1 — the first voice of a home call — speaks through: its own agent, on its own
  // account, holding the voice the admin gave it. Its pace is left exactly as it was set, because
  // this voice carries its accent in its own delivery and a pace written over it would speak the
  // accent out of it.
  {
    id: "ai1voice",
    name: "AI 1",
    key: "ELEVENLABS_AI1VOICE_API_KEY",
    agent: "ELEVENLABS_AI1VOICE_AGENT_ID",
    keepPace: true,
  },
  { id: "talk2", name: "AI 2", key: "ELEVENLABS_TALK2_API_KEY", agent: "ELEVENLABS_TALK2_AGENT_ID" },
  { id: "talk3", name: "AI 3", key: "ELEVENLABS_TALK3_API_KEY", agent: "ELEVENLABS_TALK3_AGENT_ID" },
  { id: "talk4", name: "AI 4", key: "ELEVENLABS_TALK4_API_KEY", agent: "ELEVENLABS_TALK4_AGENT_ID" },
  // The app's own helpers, each on the account the admin gave it: the writer answers typed
  // questions, the words helper finds the words an answer should stand on, and the signal AI is
  // asked in writing whose turn the next two questions are. All three are asked in writing only,
  // so none of them is ever tuned for a voice call.
  {
    id: "coordinator",
    name: "The signal AI",
    key: "ELEVENLABS_COORDINATOR_API_KEY",
    agent: "ELEVENLABS_COORDINATOR_AGENT_ID",
    plain: true,
  },
  {
    id: "helper-write",
    name: "The writer",
    key: "HELPER_WRITE_API_KEY",
    agent: "HELPER_WRITE_AGENT_ID",
    plain: true,
  },
  {
    id: "helper-words",
    name: "The words helper",
    key: "HELPER_WORDS_API_KEY",
    agent: "HELPER_WORDS_AGENT_ID",
    plain: true,
  },
];

// The words the hearing service is pointed at live in one shared place, so every turn of speech is
// written down the same way. The app's own ears are the ones that write every turn down, so the
// language the voice answers in is left alone completely: the one the admin gave his agent stands.

// How much of the admin's one knowledge document rides onto a voice agent. The document is far larger
// than any voice can carry, so the agent is given the app's own rules whole, its guide, the admin's
// saved answers, their notes and their confirmed words, and as much of the document as is left of the
// room — never a part of it passed off as the whole of it.
const AGENT_DOC_ROOM = 6000;

/** Where the agent keeps its own instructions, and what they say. */
function promptOf(agent: any) {
  const prompt = agent?.conversation_config?.agent?.prompt;
  return { prompt, text: typeof prompt?.prompt === "string" ? prompt.prompt : "" };
}

/**
 * The app's own rules kept on the agent: Gloire's current guide, the admin's answer key, their saved
 * answers and notes, the confirmed words, and the law of truth that stands over all of it — written
 * below the agent's own instructions, which are never touched.
 *
 * A voice on this account hears and answers on its own, so the one place the app can put its
 * knowledge in front of it is the agent itself. The block is written again only when the store has
 * moved or the app's rules have changed shape, so an ordinary call costs one look at the agent; a
 * write the service refuses leaves the agent exactly as it stood and never stops a call opening.
 */
async function keepRules(base44: any, apiKey: string, agentId: string, agent: any) {
  try {
    const { prompt, text: current } = promptOf(agent);
    // no prompt to write into: this agent keeps its instructions somewhere this app does not know
    if (!prompt) return false;

    const stamp = await knowledgeStamp(base44);
    if (current.includes(RULES_MARK) && blockKey(current) === `${RULES_VERSION}|${stamp}`) {
      return true;
    }

    const { saved } = await loadSavedMaterial(base44, AGENT_DOC_ROOM);
    const wanted = withAppRules(current, appRulesBlock(saved, stamp, AGENT_ROOM));
    if (wanted === current) return true;

    const res = await fetch(
      "https://api.elevenlabs.io/v1/convai/agents/" + encodeURIComponent(agentId),
      {
        method: "PATCH",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        // the prompt is sent back whole with only its own text changed, so everything else the admin
        // set on it — the model, its tools, its temperature — stands exactly as it was
        body: JSON.stringify({
          conversation_config: { agent: { prompt: { ...prompt, prompt: wanted } } },
        }),
      }
    );
    if (!res.ok) {
      const detail = await res.text();
      console.error("The app's rules could not be kept on the agent:", res.status, detail.slice(0, 300));
      return false;
    }
    return true;
  } catch (error: any) {
    console.error("The app's rules could not be kept on the agent:", error?.message);
    return false;
  }
}

/**
 * The service only takes the saved words when the agent's own security settings allow it — and it
 * ignores them silently when they do not, so that one permission is made sure of here. Nothing of the
 * agent's own language is touched: his settings are merged into as they already stand, never
 * replaced, and a permission that cannot be written is never a reason a call fails to open.
 */
async function allowHearingSettings(apiKey: string, agentId: string, agent: any) {
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
              conversation_config_override: {
                ...fields,
                asr: { ...asr, keywords: true },
              },
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
async function readAgent(base44: any, apiKey: string, agentId: string, tune: boolean, pace = true) {
  try {
    const res = await fetch(
      "https://api.elevenlabs.io/v1/convai/agents/" + encodeURIComponent(agentId),
      { headers: { "xi-api-key": apiKey } }
    );
    if (!res.ok) return { intro: "", allowIntroOverride: false };

    const data = await res.json();
    // a helper asked in writing keeps exactly the settings the admin gave it: nothing is tuned
    // on an agent that hears nothing
    if (tune) {
      // the pace lives on the agent, so it is made sure of before this call opens: read,
      // written, and read back to confirm the write took. One voice is left alone: AI 1's own voice
      // is the admin's own, and it is spoken exactly as he set it
      if (pace) await ensureFastPace(apiKey, agentId);
      // and the saved words and the language of the hearing are only taken when the agent allows them
      await allowHearingSettings(apiKey, agentId, data);
      // the app's own rules, its guide, the admin's saved knowledge and the law of truth are made sure
      // of on the agent itself, so this voice answers from the app's knowledge rather than from its own
      // memory — whichever account the call opened on
      await keepRules(base44, apiKey, agentId, data);
    }
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

// Room for whole answers, not for a few characters: an account with next to nothing left is an
// account that has nothing left to speak with.
const ROOM_FLOOR = 500;

/**
 * Whether this account has run out of room. A plan that has nothing left refuses every conversation
 * the moment it opens, so the voice never says a word and the call dies in the person's hand — which
 * is heard as an AI that simply will not answer. The account's own room is read here, before its seat
 * is offered to a call, so such a voice is passed over by the ring's own check and what is left to do
 * about it is said plainly instead.
 *
 * Only a plain shortage counts: an account that will not say, or says something this app does not
 * know, is left exactly as it was and never refused on a guess.
 */
async function outOfRoom(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
      headers: { "xi-api-key": apiKey },
    });
    if (!res.ok) return false;
    const data = await res.json();
    const used = Number(data?.character_count);
    const limit = Number(data?.character_limit);
    if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) return false;
    return limit - used < ROOM_FLOOR;
  } catch (error: any) {
    console.error("The account's own room could not be read:", error?.message);
    return false;
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

    // A voice whose own account has run out of room cannot say a word, so it is not offered the call
    // at all: the ring's check reads this refusal, passes over the seat and gives the call to the
    // voice behind it, and the line on the screen says plainly what is left to do about it.
    if (await outOfRoom(apiKey)) {
      const who = account.name || "That voice";
      console.error(`${who}'s account has no room left for a conversation.`);
      return Response.json(
        {
          error: `${who}'s voice account is out of credits — add credits or upgrade that ElevenLabs plan, then tap to talk again.`,
        },
        { status: 402 }
      );
    }

    // the app's own client, so the admin's saved words can be read for the hearing service
    const base44 = createClientFromRequest(req);
    // A helper asked in writing is never tuned, and the app's own words are not spent on a
    // session that hears nothing.
    const [agent, keywords] = await Promise.all([
      readAgent(base44, apiKey, agentId, !account.plain, !account.keepPace),
      account.plain ? [] : recognitionKeywords(base44),
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