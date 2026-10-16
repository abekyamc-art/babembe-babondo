/**
 * The one account that stands under two spellings of its own address.
 *
 * The account really stands under the address carrying the second "s"; the single-s spelling is the
 * way its owner writes it and stands as no account of its own. Both spellings answer to the one
 * account — one password, one set of data — and both stand on the leaderboard, an entry each, one
 * beside the other, carrying the one name.
 *
 * The two spellings live here so the pair is written from one place on the server side as well: the
 * same two the app keeps on the phone, and never a spelling read from what was asked.
 */

export const PAIR_ACCOUNT = 'gssadiki1@gmail.com';
export const PAIR_ALIAS = 'gsadiki1@gmail.com';
export const PAIR_SPELLINGS = [PAIR_ACCOUNT, PAIR_ALIAS];

/** Every spelling the address answers to: both for the paired account, its own address otherwise. */
export function pairSpellings(email: any): string[] {
  const written = String(email ?? '').trim().toLowerCase();
  if (!written) return [];
  return written === PAIR_ACCOUNT ? PAIR_SPELLINGS : [written];
}