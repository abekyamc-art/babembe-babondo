import { base44 } from '@/api/base44Client';

/**
 * The reward codes a student has already taken, kept with their account rather than with the phone, so
 * a code taken on one device is off the shelf on every other one.
 *
 * A code is taken once and only once: the account is told the moment one is copied, and from then on the
 * shelf writes that season's cup with a copied mark instead of the code. Nothing is ever revealed twice.
 */

/** Which seasons' codes this account has already taken. */
export async function loadCopiedSeasons() {
  try {
    const { data } = await base44.functions.invoke('trophyCode', { action: 'list' });
    return Array.isArray(data?.copied) ? data.copied : [];
  } catch (err) {
    // an account that cannot be asked — a phone with no network, or a person not signed in yet — is
    // told nothing was taken, and the cup carries its code as it always did
    return [];
  }
}

/** Take a season's code: the account keeps the mark from this moment on. */
export async function claimTrophyCode(season) {
  try {
    await base44.functions.invoke('trophyCode', { action: 'copy', season });
    return true;
  } catch (err) {
    return false;
  }
}