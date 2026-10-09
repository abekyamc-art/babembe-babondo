import { base44 } from "@/api/base44Client";
import { langMode } from "@/lib/langMode";

/**
 * How the home call hears Kibembe.
 *
 * The voices on a home call hear the person themselves and answer on their own accounts, so the
 * app's own reading of the call is handed to them as it is made: the rules of the call as it opens
 * — Kibembe first, the language the person is answering in, the Word Bank as the only source of its
 * words — and then, turn by turn, the confirmed Kibembe word or phrase the sound belongs to. A word,
 * a sound or an answer the person puts right is saved into the bank as the turn is read, so every
 * later call already knows it.
 *
 * The language in force rides with every turn, so an answer is never given in a language the person
 * has just left, and a turn that plainly asks for another language changes it at once: what comes
 * back says which language now stands, and the screen keeps it for the turns that follow.
 *
 * Both calls are a help and never a reason to hold up a call: a reading that cannot be made leaves
 * the turn to the voice that is answering it, which is already carrying the rules of the call.
 */

/** The rules of the call, as they go into it the moment it opens. */
export async function openHearingNote() {
  try {
    const res = await base44.functions.invoke("kibembeHearing", { lang: langMode() });
    return String(res?.data?.note || "");
  } catch (err) {
    return "";
  }
}

/**
 * The reading of one heard turn, as the voice answering it is told: the note that rides into the call
 * with the turn, whether the app is sure of what it heard, and the language that stands from this turn
 * on. A turn the app's own knowledge holds nothing of comes back `sure: false`, which is what lets the
 * call show the writing to the person and wait for their own word before any voice answers it.
 *
 * A reading that cannot be made is never a reason to hold a call up: it comes back sure, with no note.
 */
export async function readHeardTurn(text, lastAgent = "") {
  const said = String(text || "").trim();
  if (!said) return { note: "", sure: true, mode: "" };
  try {
    const res = await base44.functions.invoke("kibembeHearing", {
      text: said,
      lastAgent: String(lastAgent || ""),
      lang: langMode(),
    });
    return {
      note: String(res?.data?.note || ""),
      // only a plain no is a no: an older reading that says nothing about it is taken as sure
      sure: res?.data?.sure !== false,
      // the language that stands from this turn on, when the person has just asked for another one
      mode: String(res?.data?.mode || ""),
    };
  } catch (err) {
    return { note: "", sure: true, mode: "" };
  }
}

/**
 * What the app would keep from a turn the person has put right on the screen: their own words in
 * place of what the ears wrote for that turn, read against the app's own Word Bank. Nothing is saved
 * by this — it is the offer the person is shown, and their own answer to it is what saves. A null
 * comes back when their words carry nothing to keep.
 */
export async function proposeHeard(text, heard = "") {
  const said = String(text || "").trim();
  if (!said) return null;
  try {
    const res = await base44.functions.invoke("kibembeHearing", {
      text: said,
      heard: String(heard || ""),
      propose: true,
      lang: langMode(),
    });
    return res?.data?.proposal || null;
  } catch (err) {
    return null;
  }
}

/**
 * The person has said the offer should be kept: their own words go into the Word Bank now, and when
 * they are only another way of saying a word already saved, they are kept under that word and never
 * as a word of their own. The saved spelling comes back, or an empty string when nothing was kept.
 */
export async function keepHeard(text, heard = "") {
  const said = String(text || "").trim();
  if (!said) return "";
  try {
    const res = await base44.functions.invoke("kibembeHearing", {
      text: said,
      heard: String(heard || ""),
      confirmed: true,
      lang: langMode(),
    });
    return String(res?.data?.saved || "");
  } catch (err) {
    return "";
  }
}