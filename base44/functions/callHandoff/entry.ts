import { secrets } from "base44:runtime";
import { slotNamed } from "../../shared/talkRotation.ts";

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
    const slot = slotNamed(reply);

    if (!slot) {
      console.error("The signal named no talk AI the app knows:", reply.slice(0, 120));
      return Response.json({ error: unread });
    }
    if (slot.id === from) {
      console.error("The signal named the talk AI that is already taking its break:", slot.id);
      return Response.json({ error: unread });
    }
    // the account the turn is being handed to must be whole: its own key and its own agent
    if (!secretOr(slot.key) || !secretOr(slot.agent)) {
      console.error(`${slot.label}'s key or agent id is missing, so no signal was given.`);
      return Response.json({ error: unread });
    }

    return Response.json({ next: { id: slot.id, label: slot.label, account: slot.account } });
  } catch (error: any) {
    console.error("The handoff signal failed:", error?.message);
    return Response.json({ error: unread }, { status: 500 });
  }
}