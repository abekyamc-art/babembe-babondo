import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Who answers in this app, as one app-level setting: the outside voice agent, or the app's
 * own Base44 AI. Only the admin writes it, every session reads it, and the choice is held
 * here between calls so a call that opens reads the mode the admin last set.
 */
const KEY = "voice";
const AGENT = "agent";
const BASE44 = "base44";

let current = AGENT;
const listeners = new Set();

/** The mode in force right now, as this phone last read it. */
export function voiceMode() {
  return current;
}

function tell() {
  listeners.forEach((fn) => fn(current));
}

async function setting() {
  const page = await base44.entities.AppSetting.filter({ key: KEY }, { limit: 1 });
  return page?.items?.[0] || null;
}

// a reading already on its way is shared: the app shell and the home screen both ask as they
// open, and one read of the setting answers them both
let reading = null;

/** Read the mode the admin last set; the outside agent stands when it cannot be read. */
export async function loadVoiceMode() {
  if (reading) return reading;
  reading = (async () => {
    try {
      const found = await setting();
      current = found?.mode === BASE44 ? BASE44 : AGENT;
    } catch (err) {
      current = AGENT;
    }
    tell();
    return current;
  })();
  try {
    return await reading;
  } finally {
    reading = null;
  }
}

/** The admin's own switch: the mode is written for the app, so every session follows it. */
export async function saveVoiceMode(mode) {
  const next = mode === BASE44 ? BASE44 : AGENT;
  const found = await setting();
  if (found) await base44.entities.AppSetting.update(found.id, { mode: next });
  else await base44.entities.AppSetting.create({ key: KEY, mode: next });
  current = next;
  tell();
  return next;
}

/** The mode in force, kept in step with the switch. */
export function useVoiceMode() {
  const [mode, setMode] = useState(current);
  useEffect(() => {
    listeners.add(setMode);
    return () => listeners.delete(setMode);
  }, []);
  return mode;
}