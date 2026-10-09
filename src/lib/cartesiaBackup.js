import {
  CARTESIA_AI,
  CARTESIA_AI1,
  CARTESIA_AI2,
  CARTESIA_AI_B,
  CARTESIA_AI1_B,
  CARTESIA_AI2_B,
} from "@/lib/providerNames";

/**
 * The Cartesia AIs the one Cartesia voice on a home call speaks through, each with the single backup
 * paired with it: the app's own account, then the admin's second and third, and behind each of them
 * the account kept for that one AI alone.
 *
 * Each one is a whole account of its own — its own key and its own agent — and a backup stands behind
 * the AI it was paired with and nobody else: an account that cannot take the call falls through to
 * its own backup, and only then does the call move on to the next Cartesia AI. The admin's remaining
 * accounts are never used here, so the spares they are keeping are left untouched.
 */
const PAIRS = [
  { account: "", label: CARTESIA_AI, backup: "bak", backupLabel: CARTESIA_AI_B },
  { account: "one", label: CARTESIA_AI1, backup: "onebak", backupLabel: CARTESIA_AI1_B },
  { account: "two", label: CARTESIA_AI2, backup: "twobak", backupLabel: CARTESIA_AI2_B },
];

/** Every account in the order it is tried: each AI's own account, then the backup paired with it. */
const ACCOUNTS = PAIRS.flatMap((pair) => [
  { account: pair.account, label: pair.label },
  { account: pair.backup, label: pair.backupLabel },
]);

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