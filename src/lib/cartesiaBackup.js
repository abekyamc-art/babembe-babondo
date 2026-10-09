import { CARTESIA_AI, CARTESIA_AI1, CARTESIA_AI2 } from "@/lib/providerNames";

/**
 * The three Cartesia accounts the one Cartesia voice on a home call speaks through, in the order
 * they are tried: the app's own account first, then the admin's second and third.
 *
 * Each one is a whole account of its own — its own key and its own agent — so when the account ahead
 * of it cannot take the call the next one answers instead and the person on the phone is never left
 * without a voice. They are not turns of the same rotation: only one of them is ever on the line,
 * and the call opens on whichever of them is healthy rather than walking from one to the next.
 */
const ACCOUNTS = [
  { account: "", label: CARTESIA_AI },
  { account: "one", label: CARTESIA_AI1 },
  { account: "two", label: CARTESIA_AI2 },
];

// How long an account that could not take a call stands aside. Short enough that a passing refusal
// is over by the next call, long enough that a call is not spent trying an account that is down.
const COOLDOWN_MS = 120000;

// until when each account stands aside, kept for this device and this visit only
const cooling = new Map();

/**
 * The accounts to try for one call, in their own order: the primary first whenever it is healthy,
 * then the backups behind it. The primary leads every call, so a recovered primary takes its place
 * back on its own with nothing to switch anywhere — and only an account that has proved it cannot
 * take a call stands behind one of the others.
 */
export function cartesiaOrder(now = Date.now()) {
  const ready = ACCOUNTS.filter((one) => (cooling.get(one.account) || 0) <= now);
  // Every account is standing aside: they are tried in their own order rather than the call being
  // given up on, since a cooldown is only a guess and an account may well answer.
  return ready.length ? ready : ACCOUNTS;
}

/** An account that could not take a call: it stands aside for a while and is passed over. */
export function cartesiaFailed(account, now = Date.now()) {
  cooling.set(account, now + COOLDOWN_MS);
}

/** A real call opened on it: it is healthy again, whatever it did before. */
export function cartesiaOpened(account) {
  cooling.delete(account);
}