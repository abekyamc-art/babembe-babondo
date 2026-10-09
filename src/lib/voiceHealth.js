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
 *
 * Each voice that cannot take the call comes back with the reason it gave — the account itself, and
 * what is left to do about it — so a failure is said plainly on screen instead of as a voice that
 * simply did not answer. The Cartesia seat is several accounts behind one name, and it is bounded
 * account by account: an account that says nothing in its own time falls through to the backup paired
 * with it rather than holding the whole seat until the check gives up on Cartesia altogether.
 */

// The longest any one voice is given to answer.
const CHECK_MS = 9000;
// The longest any one Cartesia account is given, since the one Cartesia name is several accounts
// tried one after another and the one behind must be reached without waiting the seat out.
const ACCOUNT_MS = 4000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The line said of a voice that answered nothing at all in its own time. */
const gaveUp = (label) => `${label} didn't answer in time.`;

/** One talk AI's account, asked for the session its call is opened with. */
async function checkTalk(seat) {
  try {
    const res = await base44.functions.invoke("elevenLabsSession", { account: seat.account });
    const session = res?.data || {};
    if (!session.signed_url) return { seat, why: session.error || "" };
    return { seat, session, account: seat.account };
  } catch (err) {
    // the account could not be asked at all: whatever it said is kept, so the voice is named rather
    // than left as one that simply did not answer
    return { seat, why: err?.response?.data?.error || "" };
  }
}

/**
 * One Cartesia account, asked for the token its call is opened with: either the session comes back,
 * or the reason the account gave for refusing it does.
 */
async function checkCartesiaAccount(one) {
  try {
    const res = await base44.functions.invoke("cartesiaSession", { account: one.account });
    const session = res?.data || {};
    if (!session.token || !session.agent_id) {
      // the account itself refused — it stands aside for a while, exactly as it does when a call fails
      cartesiaFailed(one.account);
      return { why: session.error || "" };
    }
    cartesiaOpened(one.account);
    return { session };
  } catch (err) {
    // the account could not be asked at all: nothing is held against it, and the reason it refused
    // with — a key, an agent, a service having a bad moment — is the one the screen says
    return { why: err?.response?.data?.error || "" };
  }
}

/**
 * The Cartesia voice is one seat with several accounts behind it: whichever of them answers first is
 * the one that seat speaks through, so the seat is named for the account that really took it — and an
 * account that cannot take it is passed over for the one paired with it.
 */
async function checkCartesia(seat) {
  let why = "";
  for (const one of cartesiaOrder()) {
    const probe = await Promise.race([
      checkCartesiaAccount(one),
      wait(ACCOUNT_MS).then(() => null),
    ]);
    if (probe?.session) {
      return { seat: { ...seat, label: one.label }, session: probe.session, account: one.account };
    }
    // An account that said nothing in its own time is one this call does without, and it stands aside
    // like an account that refused: the one behind it is tried next, so a single silent account never
    // costs the call the whole Cartesia seat.
    if (probe?.why) why = probe.why;
    else {
      cartesiaFailed(one.account);
      why = gaveUp(one.label);
    }
  }
  return { seat, why };
}

/**
 * The ring, asked all at once: the voices that can take a call, in the order they stand in the ring,
 * each with the session it was checked with — and the ones that cannot, each with the reason it gave,
 * so what is passed over is named rather than left to be guessed at.
 */
export async function checkVoiceSeats(seats) {
  const asked = await Promise.all(
    seats.map(async (seat) => {
      const probe = seat.kind === "cartesia" ? checkCartesia(seat) : checkTalk(seat);
      return Promise.race([probe, wait(CHECK_MS).then(() => ({ seat, why: gaveUp(seat.label) }))]);
    })
  );
  const ready = asked.filter((one) => one?.session);
  const refused = asked
    .filter((one) => !one?.session)
    .map((one) => ({ ...(one?.seat || {}), why: one?.why || "" }));
  return { ready, refused };
}