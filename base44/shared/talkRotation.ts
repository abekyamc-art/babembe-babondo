/**
 * Who answers on the home page's calls, and in what order. Four talk AIs take turns, each on its
 * own ElevenLabs account — its own key, its own agent, its own knowledge — so a handoff is a
 * change of AI and never a change of voice on someone else's account. GLOIRE AI stands first, on
 * the account the app already had; the three after it are the admin's own. The fifth AI never
 * talks to a person: it is asked, in writing, whose turn the next two questions are.
 *
 * Both sides of the handoff read this one list: the session function that opens a call on an
 * account, and the function that reads the coordinator's signal.
 */
export const TALK_SLOTS = [
  {
    id: "gloire",
    label: "GLOIRE AI",
    account: "",
    key: "ELEVENLABS_API_KEY",
    agent: "ELEVENLABS_AGENT_ID",
  },
  {
    id: "talk2",
    label: "AI 2",
    account: "talk2",
    key: "ELEVENLABS_TALK2_API_KEY",
    agent: "ELEVENLABS_TALK2_AGENT_ID",
  },
  {
    id: "talk3",
    label: "AI 3",
    account: "talk3",
    key: "ELEVENLABS_TALK3_API_KEY",
    agent: "ELEVENLABS_TALK3_AGENT_ID",
  },
  {
    id: "talk4",
    label: "AI 4",
    account: "talk4",
    key: "ELEVENLABS_TALK4_API_KEY",
    agent: "ELEVENLABS_TALK4_AGENT_ID",
  },
];

/** The account the signal itself comes from, kept apart from the four that talk. */
export const COORDINATOR_ACCOUNT = "coordinator";

export const COORDINATOR_KEY = "ELEVENLABS_COORDINATOR_API_KEY";
export const COORDINATOR_AGENT = "ELEVENLABS_COORDINATOR_AGENT_ID";

/** How many answers a talk AI gives before it takes its break. */
export const TALK_ANSWERS = 2;

/**
 * The talk AI the coordinator's answer named, or nothing at all when it named none of them. The
 * id and the name it is shown by are both read, and the one named first wins, so an answer that
 * lists several is never read as the last one by accident.
 */
export function slotNamed(reply: string) {
  const said = String(reply || "").toLowerCase();
  if (!said) return null;

  let named = null;
  let at = Infinity;
  for (const slot of TALK_SLOTS) {
    for (const word of [slot.id, slot.label.toLowerCase()]) {
      const found = said.indexOf(word);
      if (found >= 0 && found < at) {
        at = found;
        named = slot;
      }
    }
  }
  return named;
}