// One account, two spellings of the same address.
//
// The account really stands under the address with the second "s"; the single-s spelling is the
// way the owner writes it, and it does not stand as an account of its own. Both spellings are
// answered with the one account, so either one opens the same data — and nothing else is touched:
// every other address is handled exactly as before.
const ACCOUNT = "gssadiki1@gmail.com";
const ALIAS = "gsadiki1@gmail.com";

const clean = (value) => String(value ?? "").trim().toLowerCase();

/** The address a sign-in is really made under. Anything else is left as it was written. */
export function resolveLoginEmail(email) {
  const written = clean(email);
  return written === ALIAS ? ACCOUNT : written;
}

/** The other spelling of the same account, or nothing when the address is not this account's. */
export function otherLoginEmail(email) {
  return resolveLoginEmail(email) === ACCOUNT ? ALIAS : "";
}