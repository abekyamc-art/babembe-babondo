import { useEffect, useState } from "react";

// One account, two spellings of the same address.
//
// The account really stands under the address with the second "s"; the single-s spelling is the way
// the owner writes it, and it does not stand as an account of its own. Both spellings answer to the
// one account, so either one signs in to the same data and the same password — there is only ever
// one password, and changing it is changing it for both spellings at once.
//
// Which spelling is written on the account panel is the person's own choice on their phone, and one
// tap on the panel moves it. Nothing of the account itself moves with it: the session, the account
// and its data stay exactly as they are.
const ACCOUNT = "gssadiki1@gmail.com";
const ALIAS = "gsadiki1@gmail.com";
const SPELLINGS = [ACCOUNT, ALIAS];
const KEY = "babembe.login.spelling";

const clean = (value) => String(value ?? "").trim().toLowerCase();

/** The address a sign-in is really made under. Anything else is left as it was written. */
export function resolveLoginEmail(email) {
  const written = clean(email);
  return written === ALIAS ? ACCOUNT : written;
}

let current = "";
const listeners = new Set();

function read() {
  try {
    const saved = clean(window.localStorage.getItem(KEY));
    return SPELLINGS.includes(saved) ? saved : ACCOUNT;
  } catch (err) {
    return ACCOUNT;
  }
}

function tell() {
  listeners.forEach((fn) => fn(current));
}

/** The spelling in force right now, as this phone last chose it. */
export function loginSpelling() {
  if (!current) current = read();
  return current;
}

/** The address written for this account: the spelling chosen here, or the account's own address. */
export function shownLoginEmail(email) {
  const account = clean(email);
  return account === ACCOUNT ? loginSpelling() : account;
}

/** The other spelling of this same account, or nothing when the address is not this account's. */
export function otherLoginEmail(email) {
  const account = clean(email);
  if (account !== ACCOUNT) return "";
  return loginSpelling() === ACCOUNT ? ALIAS : ACCOUNT;
}

/** The spelling chosen from here on, kept on this phone. It changes nothing of the account itself. */
export function saveLoginSpelling(next) {
  const written = clean(next);
  const spelling = SPELLINGS.includes(written) ? written : ACCOUNT;
  current = spelling;
  try {
    window.localStorage.setItem(KEY, spelling);
  } catch (err) {
    // a phone that will not keep it still follows it for this session
  }
  tell();
  return spelling;
}

/** The spelling in force, kept in step with the row that switches it. */
export function useLoginSpelling() {
  const [spelling, setSpelling] = useState(loginSpelling);
  useEffect(() => {
    listeners.add(setSpelling);
    return () => listeners.delete(setSpelling);
  }, []);
  return spelling;
}