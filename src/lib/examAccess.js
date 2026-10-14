import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { setExamOverride } from "@/lib/examProgress";

/**
 * Unrestricted examination access, as one app-level setting, held for admins alone.
 *
 * An admin who switches it on takes any season and any episode of the examination, whatever stands
 * passed before it, so the whole of it can be read through before students meet it. The setting stands
 * on its own — nothing of it is written into a student's progress, and nothing of an attempt taken this
 * way reaches the leaderboard — and a student never meets it: where the person signed in is not an
 * admin the same setting holds nothing at all, whatever it says.
 *
 * Only an admin writes it, every session reads it, and it is held here between calls, so the
 * examination a session opens reads the same way the admin last set it.
 */
const KEY = "exam";

// the setting as the app holds it, whether the person signed in is an admin, and the two together
let saved = false;
let mine = false;
let inForce = false;

const listeners = new Set();

/** The setting and the person together, pushed into the examination's own locks. */
function apply() {
  inForce = saved && mine;
  setExamOverride(inForce);
  listeners.forEach((fn) => fn(inForce));
}

/** Read the setting, and who is signed in: a student's examination is never opened by an admin's switch. */
export async function loadExamAccess() {
  try {
    const me = await base44.auth.me();
    mine = me?.role === "admin";
  } catch (err) {
    mine = false;
  }
  try {
    const page = await base44.entities.AppSetting.filter({ key: KEY }, { limit: 1 });
    saved = page?.items?.[0]?.open_exams === true;
  } catch (err) {
    saved = false;
  }
  apply();
  return inForce;
}

/** The admin's own switch: the setting is written for the app, so the examination opens the same way everywhere. */
export async function saveExamAccess(on) {
  const next = on === true;
  const page = await base44.entities.AppSetting.filter({ key: KEY }, { limit: 1 });
  const found = page?.items?.[0];
  if (found) await base44.entities.AppSetting.update(found.id, { open_exams: next });
  else await base44.entities.AppSetting.create({ key: KEY, open_exams: next });
  saved = next;
  apply();
  return inForce;
}

/** The setting as it stands, kept in step with the switch. */
export function useExamAccess() {
  const [on, setOn] = useState(inForce);
  useEffect(() => {
    const fn = () => setOn(inForce);
    listeners.add(fn);
    fn();
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return on;
}

/** Whether the person signed in is an admin — the only hand the switch is ever shown to. */
export function useExamAdmin() {
  const [admin, setAdmin] = useState(mine);
  useEffect(() => {
    const fn = () => setAdmin(mine);
    listeners.add(fn);
    fn();
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return admin;
}