import { base44 } from "@/api/base44Client";

/**
 * How the home call hears Kibembe.
 *
 * The voices on a home call hear the person themselves and answer on their own accounts, so the
 * app's own reading of the call is handed to them as it is made: the rules of the call as it opens
 * — Kibembe first, answered in Kibembe, the Word Bank as the only source of its words — and then,
 * turn by turn, the confirmed Kibembe word or phrase the sound belongs to. A word, a sound or an
 * answer the person puts right is saved into the bank as the turn is read, so every later call
 * already knows it.
 *
 * Both calls are a help and never a reason to hold up a call: a reading that cannot be made leaves
 * the turn to the voice that is answering it, which is already carrying the rules of the call.
 */

/** The rules of the call, as they go into it the moment it opens. */
export async function openHearingNote() {
  try {
    const res = await base44.functions.invoke("kibembeHearing", {});
    return String(res?.data?.note || "");
  } catch (err) {
    return "";
  }
}

/**
 * The reading of one heard turn, as the voice answering it is told. An empty string when the turn
 * is close to nothing in the app's own word bank, or when the reading could not be made at all.
 */
export async function readHeardTurn(text, lastAgent = "") {
  const said = String(text || "").trim();
  if (!said) return "";
  try {
    const res = await base44.functions.invoke("kibembeHearing", {
      text: said,
      lastAgent: String(lastAgent || ""),
    });
    return String(res?.data?.note || "");
  } catch (err) {
    return "";
  }
}