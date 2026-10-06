import { CARTESIA_AI, CARTESIA_AI1, MBEMBE_AI, MBONDO_AI, SADIKI_AI } from "@/lib/providerNames";
import { AI2_ID, ai2Resting, CARTESIA_AI1_ANSWERS, CARTESIA_ANSWERS, TALK_ANSWERS } from "@/lib/talkRotation";

/**
 * Who answers on the home page's calls, and in what order.
 *
 * Every voice the app offers stands on this one ring: Cartesia AI opens the call, then the admin's
 * own second Cartesia account, Cartesia AI 1, then the talk AIs the admin has set up, then the
 * accounts that speak for the other modes — Mbembe AI for Base44 mode,
 * then Mbondo AI, then Sadiki AI — so a call walks through every voice the app offers and comes back
 * to Cartesia AI when the ring is complete. Each voice answers its own number of finished answers and
 * then stands aside for the next one that is available: Cartesia AI seven, Cartesia AI 1 five, and
 * every other voice two.
 *
 * GLOIRE AI is not on this ring: its own account stays set up exactly as it is, but a home call never
 * offers it a turn.
 *
 * Only the voices that really speak with a person stand here: the Kibembe assistant and the app's
 * own written helpers answer on their own screens or in writing, so none of them is on this ring.
 */
const RING = [
  { id: "cartesia", label: CARTESIA_AI, kind: "cartesia", account: "", answers: CARTESIA_ANSWERS },
  {
    id: "cartesia1",
    label: CARTESIA_AI1,
    kind: "cartesia",
    account: "one",
    answers: CARTESIA_AI1_ANSWERS,
  },
  { id: "talk2", label: "AI 2", kind: "talk", account: "talk2", answers: TALK_ANSWERS },
  { id: "talk3", label: "AI 3", kind: "talk", account: "talk3", answers: TALK_ANSWERS },
  { id: "talk4", label: "AI 4", kind: "talk", account: "talk4", answers: TALK_ANSWERS },
  { id: "mbembe", label: MBEMBE_AI, kind: "talk", account: "second", answers: TALK_ANSWERS },
  { id: "mbondo", label: MBONDO_AI, kind: "talk", account: "third", answers: TALK_ANSWERS },
  { id: "sadiki", label: SADIKI_AI, kind: "talk", account: "fourth", answers: TALK_ANSWERS },
];

// AI 2 is standing down until November 6, 2026 and comes back on its own on that date: while it is
// resting, the ring simply does not hold it, so a call never offers it a turn and every handoff
// passes it by. Nothing else about it changes, and no setting has to be touched on the day it
// returns — see talkRotation.
export const HOME_SEATS = RING.filter((seat) => !(seat.id === AI2_ID && ai2Resting()));

/**
 * The voices that may take the call next: the ring from the voice on the call now, in order, each of
 * them once — Cartesia AI included, since the ring wraps round to it. A voice that could not open a
 * call earlier in this one is passed over; and when every voice in the ring has been passed over, the
 * one that follows in order is offered again rather than the call being left with nowhere to go.
 */
export function nextPlan(fromId, tried = []) {
  const at = HOME_SEATS.findIndex((seat) => seat.id === fromId);
  const from = at < 0 ? HOME_SEATS.length - 1 : at;
  const ring = HOME_SEATS.map(
    (_, step) => HOME_SEATS[(from + step + 1) % HOME_SEATS.length]
  ).filter((seat) => seat.id !== fromId);
  const open = ring.filter((seat) => !tried.includes(seat.id));
  return open.length ? open : ring.slice(0, 1);
}