import { secrets } from "base44:runtime";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { ensureFastPace } from "../../shared/agentPace.ts";
import { recognitionKeywords } from "../../shared/hearingKeywords.ts";

const unavailable = "The voice call couldn't start. Please try again in a moment.";

// The accounts a call can open on. Each one keeps its own key and its own agent, and a call opens
// on the account it asked for and nowhere else: the standing account for the original outside
// voice, the second one for Base44 mode's spoken voice, Mbondo's own and Sadiki's own for
// everything they answer, written or spoken, and the app's two written helpers. Nothing here ever
// falls back from one account to another, so whatever is missing is said plainly instead of being
// answered by someone else.
const ACCOUNTS: { id: string; name: string; key: string; agent: string; plain?: boolean }[] = [
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
  {
    id: "fourth",
    name: "Sadiki AI",
    key: "ELEVENLABS_ACCOUNT4_API_KEY",
    agent: "ELEVENLABS_ACCOUNT4_AGENT_ID",
  },
  // The admin's own talk AIs, waiting their turn behind the standing one: the home page's calls
  // take turns on all four, each on its own account with its own key, its own agent and its own
  // knowledge, and each answering two questions before the coordinator signals the change.
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

// The words the app's own ears and the call's own hearing service are both pointed at live in
// one shared place, so every turn of speech is written down the same way.
//
// So does the language the hearing is pointed at. The service knows no Kibembe at all: left to
// guess, it writes a Kibembe turn as whatever language it thinks it heard, and the words come back
// in letters nobody here speaks, with nothing to answer from. Pointed at Kiswahili — the language
// Kibembe is heard through in this app — the turn comes back as the words that were said, in the
// app's own letters, and the saved words point it at the Kibembe itself.
const HEARD_LANGUAGE = "sw";

/**
 * The service only takes the saved words, and only writes turns in the language the hearing is
 * pointed at, when the agent's own security settings allow it — and it ignores them silently when
 * they do not, so both permissions are made sure of here. The agent's settings are merged into as
 * they already stand, never replaced, and a permission that cannot be written is never a reason a
 * call fails to open.
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
    const spoken = fields.agent || {};
    if (asr.keywords === true && spoken.language === true) return true;

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
                agent: { ...spoken, language: true },
              },
            },
          },
        }),
      }
    );
    if (!res.ok) {
      console.error("Could not allow the saved words and language into the hearing service:", res.status);
      return false;
    }
    return true;
  } catch (error: any) {
    console.error("Could not allow the saved words and language into the hearing service:", error?.message);
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
async function readAgent(apiKey: string, agentId: string, tune: boolean) {
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
      // written, and read back to confirm the write took
      await ensureFastPace(apiKey, agentId);
      // and the saved words and the language of the hearing are only taken when the agent allows them
      await allowHearingSettings(apiKey, agentId, data);
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
    // A helper asked in writing is never tuned, and the app's own words are not spent on a
    // session that hears nothing.
    const [agent, keywords] = await Promise.all([
      readAgent(apiKey, agentId, !account.plain),
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
      asr_language: account.plain ? "" : HEARD_LANGUAGE,
    });
  } catch (error) {
    console.error("Voice session failed:", error.message);
    return Response.json({ error: unavailable }, { status: 500 });
  }
}