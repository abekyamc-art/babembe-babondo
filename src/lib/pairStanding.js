import { base44 } from "@/api/base44Client";
import { loginSpellings } from "@/lib/loginAlias";

/**
 * The account that stands under two spellings of its own address.
 *
 * Both spellings stand on the leaderboard — an entry each, one beside the other — and they carry the
 * one name. Everything that keeps them together is written from here: the standing is written under
 * both spellings in one hand, and a name or a picture changed in the account panel is carried onto
 * both at once, rather than waiting for the next episode to be passed.
 *
 * An account standing under one spelling alone is untouched by any of this: its own record is its
 * whole standing, written as it has always been.
 */

/** Whether this account answers to more than one spelling of its address. */
export function standsPair(email) {
  return loginSpellings(email).length > 1;
}

/** Both spellings' rows written together, from the server side, where the pair's own rows live. */
async function syncPair(payload) {
  const res = await base44.functions.invoke("pairStanding", payload);
  if (res?.data?.ok !== true) {
    throw new Error(res?.data?.error || "the pair could not be written down");
  }
  return true;
}

/** One standing, written under every spelling the account stands by, in one hand. */
export function savePairStanding(standing) {
  return syncPair({ standing });
}

/**
 * The one name, carried onto the account's own standing at once — and, for the account that stands by
 * two spellings, onto both of its entries and both of its profiles in the same breath. The name is
 * already saved where it was written; a standing that will not take it is said in the log and
 * nowhere else, so the name itself is never lost over it.
 */
export async function syncStandingName(email, username, avatar_url) {
  try {
    if (standsPair(email)) {
      await syncPair({ username, avatar_url });
      return true;
    }
    await base44.entities.ExamRecord.updateMany(
      { user_email: email },
      { $set: { username, avatar_url } }
    );
    return true;
  } catch (err) {
    console.error("The name could not be carried onto the standing:", err?.message);
    return false;
  }
}