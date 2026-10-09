/**
 * One clip of the microphone, for a voice track. Opened on a tap, closed on the next one, and the
 * clip is handed back as a file the studio can read — the recording itself is never sent anywhere.
 */

import { audioGraph } from "@/lib/rapAudio";

export const NO_MIC =
  "Kipaza sauti hakipatikani. Ruhusu kipaza sauti kwenye browser, kisha jaribu tena.";

/** Opens the microphone and starts recording. */
export async function startClipRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: true,
      channelCount: 1,
    },
  });

  const chunks = [];
  const recorder = new MediaRecorder(stream);
  recorder.ondataavailable = (event) => {
    if (event.data?.size) chunks.push(event.data);
  };
  recorder.start();

  const close = () => {
    stream.getTracks().forEach((track) => track.stop());
  };

  return {
    /** The clip that was just recorded. */
    stop: () =>
      new Promise((resolve) => {
        const done = () => {
          close();
          resolve(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
        };
        if (recorder.state === "inactive") done();
        else {
          recorder.onstop = done;
          recorder.stop();
        }
      }),
    /** The tap was taken back: nothing is kept. */
    cancel: () => {
      try {
        if (recorder.state !== "inactive") recorder.stop();
      } catch (err) {
        // the recording had already ended
      }
      close();
    },
  };
}

/** A clip the studio can work with, read on the phone. */
export async function clipToBuffer(blob) {
  const bytes = await blob.arrayBuffer();
  return audioGraph().decodeAudioData(bytes.slice(0));
}