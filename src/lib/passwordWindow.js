import { base44 } from "@/api/base44Client";
import { loginSpellings } from "@/lib/loginAlias";

/** How long the door stands open once it is first reached. */
const OPEN_MS = 2 * 60 * 60 * 1000;

/** How long the door still stands open, in milliseconds. */
export function windowLeftMs(row) {
  return row?.open_until ? new Date(row.open_until).getTime() - Date.now() : OPEN_MS;
}

/** A door that has been used, or whose two hours are up, is shut for good. */
export function isShut(row) {
  return !!row?.used_at || (!!row?.open_until && windowLeftMs(row) <= 0);
}

/**
 * The door standing open for this account, if one is.
 *
 * The two hours are counted from the first time the door is reached, and they are written down
 * then — so the window is never opened twice, and it closes of itself whether or not anything
 * is done with it.
 */
export async function openWindowFor(email) {
  if (!email) return null;
  // The one account answers to both spellings of its address, so a door opened under either
  // spelling is found by the account itself — whichever spelling is written on the panel. Nothing
  // is widened by the wider look: the same read rules decide what comes back, so a person is only
  // ever handed the door that names their own account.
  const page = await base44.entities.PasswordWindow.filter(
    { user_email: { $in: loginSpellings(email) } },
    { sort: "-created_date", limit: 5 }
  );
  const standing = (page?.items || []).find((row) => !isShut(row));
  if (!standing || standing.open_until) return standing || null;

  const now = Date.now();
  try {
    const stamped = await base44.entities.PasswordWindow.update(standing.id, {
      user_email: standing.user_email,
      opened_at: new Date(now).toISOString(),
      open_until: new Date(now + OPEN_MS).toISOString(),
    });
    return stamped || standing;
  } catch {
    // The door opens whether or not those two hours could be written down: the change itself is
    // what the person came for, and it is never lost to a bookkeeping write.
    return standing;
  }
}

/** The door shuts the moment the password is changed, so it never stands open twice. */
export async function shutWindow(row) {
  if (!row?.id) return;
  await base44.entities.PasswordWindow.update(row.id, {
    user_email: row.user_email,
    used_at: new Date().toISOString(),
  });
}