import { base44 } from "@/api/base44Client";

/**
 * The private voice bank, as the phone records into it.
 *
 * A short recording of the person's own voice is made here, labelled with the confirmed word it is of
 * and the conditions it was made in, and kept in the app's private storage — never at a public
 * address, and read only by the person whose voice it is and the admin. Before it is saved, the
 * recording is put to the app's own ears, so the way the person says that word is written down beside
 * it: that writing is what the hearing is pointed at afterwards.
 *
 * Nothing here is ever a word of its own and nothing here changes a spelling: a recording gives the
 * app a way of hearing a word the bank already holds, and the admin's own approval is what puts it to
 * use.
 */

// how long a recording may run: long enough for a phrase said slowly, short enough that the whole
// bank stays a set of short clips
export const RECORD_MAX_MS = 12000;

/** The formats a phone will record in, best first. */
const KINDS = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

function bestKind() {
  try {
    return KINDS.find((one) => window.MediaRecorder?.isTypeSupported?.(one)) || "";
  } catch (err) {
    return "";
  }
}

/**
 * Start recording from the phone's own microphone. The controller that comes back holds everything
 * the screen needs: how long it has been running, how to stop it and take the clip, and how to let it
 * go without keeping anything.
 */
export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const type = bestKind();
  const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
  const chunks = [];
  const started = Date.now();

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size) chunks.push(event.data);
  };
  const stopped = new Promise((resolve) => {
    recorder.onstop = () => resolve();
  });
  recorder.start();

  const release = () => stream.getTracks().forEach((track) => track.stop());

  return {
    /** How long the recording has been running, in seconds. */
    seconds() {
      return Math.round((Date.now() - started) / 1000);
    },
    /** Let the recording go, and keep nothing. */
    cancel() {
      try {
        if (recorder.state !== "inactive") recorder.stop();
      } catch (err) {
        // a recorder that was already gone needs nothing done to it
      }
      release();
    },
    /** End the recording and take the clip itself. */
    async stop() {
      const seconds = Math.max(1, Math.round((Date.now() - started) / 1000));
      try {
        if (recorder.state !== "inactive") recorder.stop();
      } catch (err) {
        // the clip already ended by itself
      }
      await stopped;
      release();
      return { blob: new Blob(chunks, { type: recorder.mimeType || type || "audio/webm" }), seconds };
    },
  };
}

/** A clip as the text the app's own ears make of it: what the person's voice was written down as. */
export async function hearClip(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let at = 0; at < bytes.length; at += 1) binary += String.fromCharCode(bytes[at]);
  const res = await base44.functions.invoke("helperListen", {
    audio: btoa(binary),
    // what was handed over, so the ears write it down under the name of the sound it really is
    type: blob.type || "audio/webm",
  });
  return String(res?.data?.text || "");
}

/**
 * A recording kept in the voice bank. The clip goes into the app's private storage, the way the ears
 * wrote it goes beside it, and nothing is used until the admin approves it.
 */
export async function saveVariant({ term, condition, note, blob, seconds, heard }) {
  // Who the voice is, taken before anything is uploaded: a recording is never left in the bank
  // without the person it belongs to.
  const email = (await base44.auth.me())?.email || "";
  if (!email) throw new Error("Sign in first, so the recording is kept under your own name.");

  const file = new File([blob], `voice-${Date.now()}.webm`, {
    type: blob.type || "audio/webm",
  });
  const saved = await base44.integrations.Core.UploadPrivateFile({ file });
  const file_uri = String(saved?.file_uri || "");
  if (!file_uri) throw new Error("The recording could not be saved.");

  return base44.entities.VoiceVariant.create({
    term: String(term || "").trim(),
    condition: condition || "normal",
    note: String(note || "").trim(),
    heard: String(heard || "").trim(),
    file_uri,
    seconds: Number(seconds) || 0,
    approved: false,
    recorded_by: email,
  });
}

/** Approve a recording: the word it is of is taught the way the person really says it. */
export async function approveVariant(id) {
  const res = await base44.functions.invoke("voiceVariants", { action: "approve", id });
  return res?.data || {};
}

/** Let a recording stand aside: it is kept, and heard by nobody. */
export async function dismissVariant(id) {
  await base44.functions.invoke("voiceVariants", { action: "dismiss", id });
}

/** Throw a recording away for good. */
export async function removeVariant(id) {
  await base44.functions.invoke("voiceVariants", { action: "remove", id });
}

/** A short-lived address for one private recording, so it can be played back and checked. */
export async function clipUrl(fileUri) {
  try {
    const res = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri });
    return String(res?.signed_url || "");
  } catch (err) {
    return "";
  }
}