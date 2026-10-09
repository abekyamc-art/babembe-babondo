/**
 * Audio brought into the studio from outside it — a file picked from the phone, or a beat saved in the
 * app's own beat library. Either way it is decoded once, kept under its own key, and read back by
 * however many clips end up standing on it.
 */

import { base44 } from "@/api/base44Client";
import { audioGraph } from "@/lib/rapAudio";
import { holdBuffer, peakOf } from "@/lib/studioEngine";
import { putAudio } from "@/lib/studioStore";
import { uid } from "@/lib/studioTracks";

/** A piece of audio, kept for a song and ready to be cut and moved without ever being rewritten. */
export async function keepSource({ projectId, blob, name }) {
  const ctx = audioGraph();
  const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
  const sourceKey = uid("aud");
  holdBuffer(sourceKey, buffer);
  await putAudio({
    id: sourceKey,
    project_id: projectId,
    name,
    mime: blob.type || "",
    size: blob.size,
    created_at: new Date().toISOString(),
    blob,
  });
  return { sourceKey, seconds: buffer.duration, peak: peakOf(buffer), name };
}

/** A file the artist picked from the phone. */
export function readPickedFile(file) {
  return { blob: file, name: String(file.name || "Audio").replace(/\.[^.]+$/, "") };
}

/**
 * A beat out of the app's own library. Its file is private to the account, so a short-lived address is
 * asked for and the beat itself is read from there — it is never made public to be brought in.
 */
export async function readSavedBeat(beat) {
  const { signed_url: url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: beat.file_uri });
  const res = await fetch(url);
  if (!res.ok) throw new Error("The beat could not be read.");
  const blob = await res.blob();
  return { blob, name: beat.name || "Beat" };
}