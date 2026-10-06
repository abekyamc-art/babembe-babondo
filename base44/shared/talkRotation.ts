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
 * AI 2 stands down for a month and comes back on its own. From today until November 6, 2026 the
 * talk's ring passes over it — no signal can name it and no turn is handed to it, whichever order
 * the ring is walked in — and on that date it takes its place in the ring again with nothing to
 * change anywhere. Its own account, its own key and its own agent are left exactly as they are.
 */
export const AI2_ID = "talk2";
export const AI2_BACK_ON = "2026-11-06";

/** Whether AI 2 is still standing down: true before its return date, false from that date on. */
export function ai2Resting(): boolean {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
  return today < AI2_BACK_ON;
}

/** Whether a talk AI may take a turn right now. */
function onDuty(id: string): boolean {
  return !(id === AI2_ID && ai2Resting());
}

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
    // an AI that is standing down is never read as the destination, whatever the signal said
    if (!onDuty(slot.id)) continue;
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

/**
 * The four talk AIs in the order their turns follow this one. It is the order the turn is handed on
 * in when a signal cannot be used, so the talk always moves on and can never settle on one AI.
 */
export function slotsAfter(fromId: string) {
  const at = TALK_SLOTS.findIndex((slot) => slot.id === fromId);
  const from = at < 0 ? TALK_SLOTS.length - 1 : at;
  return TALK_SLOTS.map((_, step) => TALK_SLOTS[(from + step + 1) % TALK_SLOTS.length]).filter(
    (slot) => onDuty(slot.id)
  );
}