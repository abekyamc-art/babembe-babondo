import { base44 } from "@/api/base44Client";
import { cartesiaFailed, cartesiaOpened, cartesiaOrder } from "@/lib/cartesiaBackup";

/**
 * Which of the home page's voices can really take a call.
 *
 * Before a call opens, every voice the ring holds is asked the one question that decides it: can this
 * account hand over the session a call is opened with? It is the very question the call itself asks
 * — the same session each voice opens through — so a voice that passes is a voice whose call opens,
 * and a voice that fails is passed over instead of the person waiting on it.
 *
 * The whole ring is asked at once, so the check costs one round trip however many voices are set up,
 * and every one of them is bounded: a service that has said nothing by then is one this call does
 * without. Nothing is opened by the check — no microphone is claimed and no socket is made — so only
 * the voice the call really opens on is ever on the line, and the sessions of the rest are dropped.
 */

// The longest any one voice is given to answer.
const CHECK_MS = 9000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** One talk AI's account, asked for the session its call is opened with. */
async function checkTalk(seat) {
  try {
    const res = await base44.functions.invoke("elevenLabsSession", { account: seat.account });
    const session = res?.data || {};
    if (!session.signed_url) return null;
    return { seat, session, account: seat.account };
  } catch (err) {
    return null;
  }
}

/** One Cartesia account, asked for the token its call is opened with. */
async function checkCartesiaAccount(one) {
  let session = null;
  try {
    const res = await base44.functions.invoke("cartesiaSession", { account: one.account });
    session = res?.data || {};
  } catch (err) {
    // the account could not be asked at all: nothing is held against it
    return null;
  }
  if (!session?.token || !session?.agent_id) {
    // the account itself refused — it stands aside for a while, exactly as it does when a call fails
    cartesiaFailed(one.account);
    return null;
  }
  cartesiaOpened(one.account);
  return session;
}

/**
 * The Cartesia voice is one seat with several accounts behind it: whichever of them answers first is
 * the one that seat speaks through, so the seat is named for the account that really took it.
 */
async function checkCartesia(seat) {
  for (const one of cartesiaOrder()) {
    const session = await checkCartesiaAccount(one);
    if (session) return { seat: { ...seat, label: one.label }, session, account: one.account };
  }
  return null;
}

/**
 * The ring, asked all at once: the voices that can take a call, in the order they stand in the ring,
 * each with the session it was checked with — and the ones that cannot, so what is passed over is
 * named rather than left to be guessed at.
 */
export async function checkVoiceSeats(seats) {
  const asked = await Promise.all(
    seats.map(async (seat) => {
      const probe = seat.kind === "cartesia" ? checkCartesia(seat) : checkTalk(seat);
      return Promise.race([probe, wait(CHECK_MS).then(() => null)]);
    })
  );
  const ready = asked.filter(Boolean);
  const readyIds = ready.map((one) => one.seat.id);
  return { ready, refused: seats.filter((seat) => !readyIds.includes(seat.id)) };
}