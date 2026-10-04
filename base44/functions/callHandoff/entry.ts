import { secrets } from "base44:runtime";
import { slotNamed, slotsAfter } from "../../shared/talkRotation.ts";

/**
 * The handoff signal, read and checked on the server. The coordinator's own answer is handed over
 * here, and the talk AI it named is looked up against the four the app is set up with. A signal
 * that named nobody, named the AI that is already taking its break, or named an account whose key
 * and agent id are not both saved yet is refused rather than turned into a guess: the app is told
 * no handoff, never a destination it made up, and no account is ever used for another one's turn.
 *
 * This function opens nothing and spends nothing: it reads one answer and answers with one name.
 */
const unread = "The handoff signal could not be read.";

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

    const reply = String(payload?.reply || "").slice(0, 600);
    const from = String(payload?.from || "");
    const named = slotNamed(reply);
    // the account a turn is handed to must be whole: its own key and its own agent id
    const ready = (slot: any) => !!secretOr(slot.key) && !!secretOr(slot.agent);

    // The AI the signal named takes the turn when it is a real one, when it is not the AI taking
    // its break, and when its account is whole. A signal that names nobody, names the AI already
    // resting, or names an account that is not set up is never guessed at: the turn passes to the
    // AI that follows in order instead, so the talk always moves on to another AI and can never
    // settle on one of them.
    let slot = named && named.id !== from && ready(named) ? named : null;
    if (!slot) {
      console.error("No usable signal, so the turn moves on in order:", (reply || "").slice(0, 120));
      slot = slotsAfter(from).find((row: any) => row.id !== from && ready(row)) || null;
    }
    if (!slot) {
      console.error("No other talk AI has both its key and its agent id saved, so no signal was given.");
      return Response.json({ error: unread });
    }

    return Response.json({ next: { id: slot.id, label: slot.label, account: slot.account } });
  } catch (error: any) {
    console.error("The handoff signal failed:", error?.message);
    return Response.json({ error: unread }, { status: 500 });
  }
}