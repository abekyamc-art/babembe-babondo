import { useEffect, useState } from "react";

/**
 * The language the app is answering in — Kibembe, Kiswahili or English.
 *
 * Kibembe stands unless the person plainly asks for another, and the language they ask for stands
 * from that moment on: turn after turn, into every later call, and across a reload of the app. The
 * choice is the person's own and lives on their phone, so it is not something an admin has to set for
 * them, and nothing about a call waits on reading it.
 *
 * Every turn of every call is handed the language in force, so an answer is never given in a language
 * the person has just left — and a turn that plainly asks for another language is read on the app's
 * own server, where it changes this at once.
 */

const KEY = "babembe.lang";

/** The three languages, in the order one tap moves through them. */
export const LANGS = [
  { id: "kibembe", label: "Kibembe", sub: "Ebembe" },
  { id: "swahili", label: "Kiswahili", sub: "Swahili" },
  { id: "english", label: "English", sub: "English" },
];

/** The language a saved value stands for; Kibembe stands when it is not one the app knows. */
export function asLang(value) {
  return LANGS.some((one) => one.id === value) ? value : "kibembe";
}

let current = "";
const listeners = new Set();

function read() {
  try {
    return asLang(window.localStorage.getItem(KEY));
  } catch (err) {
    return "kibembe";
  }
}

function tell() {
  listeners.forEach((fn) => fn(current));
}

/** The language in force right now, as this phone last set it. */
export function langMode() {
  if (!current) current = read();
  return current;
}

/** The language's name, as it is written on the screen. */
export function langLabel(value) {
  const found = LANGS.find((one) => one.id === asLang(value));
  return found ? found.label : "Kibembe";
}

/** The person's own choice: it stands from here on, in every turn and in every call. */
export function saveLangMode(next) {
  const lang = asLang(next);
  current = lang;
  try {
    window.localStorage.setItem(KEY, lang);
  } catch (err) {
    // a phone that will not keep it still follows it for this session
  }
  tell();
  return lang;
}

/** The language one tap on the switch moves to, so all three are reachable from one control. */
export function nextLangMode(value) {
  const at = LANGS.findIndex((one) => one.id === asLang(value));
  return LANGS[(at + 1) % LANGS.length].id;
}

/** The language in force, kept in step with the switch. */
export function useLangMode() {
  const [lang, setLang] = useState(langMode);
  useEffect(() => {
    listeners.add(setLang);
    return () => listeners.delete(setLang);
  }, []);
  return lang;
}