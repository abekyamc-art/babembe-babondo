/**
 * The microphone and the recording of it. The artist's voice is taken in through a gain and a gentle
 * high-pass — so a close, loud take can be caught before it clips rather than after — and it is that
 * prepared sound which is written down, not a second copy of it.
 *
 * Where the phone lets the sound be written is its own business: the recording comes back in the
 * format the device writes (M4A/AAC on iPhone), which is kept as it is and never re-encoded.
 */

import { audioGraph } from "@/lib/rapAudio";

export const QUALITY = [
  { id: 44100, label: "44.1 kHz" },
  { id: 48000, label: "48 kHz" },
];

const MIMES = [
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
];

/** What this phone writes its recordings in. */
export function pickMime() {
  if (typeof MediaRecorder === "undefined") return "";
  for (const mime of MIMES) {
    try {
      if (MediaRecorder.isTypeSupported(mime)) return mime;
    } catch (err) {
      // this phone answers nothing about that format
    }
  }
  return "";
}

/** The file ending that belongs to what the phone wrote. */
export function extensionFor(mime) {
  if (!mime) return "m4a";
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav")) return "wav";
  return "webm";
}

/** What the artist is told when the microphone will not open. */
export function inputMessage(err) {
  const name = err?.name || "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "denied";
  }
  if (name === "NotFoundError") return "none";
  if (name === "NotReadableError") return "busy";
  if (name === "MicUnsupported") return "unsupported";
  return "failed";
}

/**
 * The microphone, opened for a recording: through its own gain and high-pass, metered, and ready to
 * be written down. Kept open between takes so a second layer begins the moment it is asked for.
 */
export async function openInput({ gain = 1, monitor = false, deviceId = "" } = {}) {
  if (!navigator.mediaDevices?.getUserMedia) {
    const err = new Error("This browser cannot reach the microphone.");
    err.name = "MicUnsupported";
    throw err;
  }

  const constraints = {
    audio: {
      echoCancellation: false,
      noiseSuppression: true,
      autoGainControl: false,
      channelCount: 1,
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    },
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  const ctx = audioGraph();
  if (ctx.state === "suspended") await ctx.resume().catch(() => {});

  const source = ctx.createMediaStreamSource(stream);
  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 70;
  const gainNode = ctx.createGain();
  gainNode.gain.value = Math.max(0, Number(gain) || 1);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  const toWriter = ctx.createMediaStreamDestination();
  const monitorGain = ctx.createGain();
  monitorGain.gain.value = monitor ? 1 : 0;

  source.connect(highpass);
  highpass.connect(gainNode);
  gainNode.connect(analyser);
  gainNode.connect(toWriter);
  gainNode.connect(monitorGain);
  monitorGain.connect(ctx.destination);

  const scratch = new Float32Array(analyser.fftSize);

  return {
    stream,
    writeStream: toWriter.stream,
    /** How loud the voice is right now, so a take that is too hot is seen while it is still being made. */
    level() {
      analyser.getFloatTimeDomainData(scratch);
      let sum = 0;
      let peak = 0;
      for (let i = 0; i < scratch.length; i += 1) {
        const value = scratch[i];
        sum += value * value;
        const abs = Math.abs(value);
        if (abs > peak) peak = abs;
      }
      return { rms: Math.sqrt(sum / scratch.length), peak };
    },
    setGain(value) {
      gainNode.gain.value = Math.max(0, Number(value) || 0);
    },
    setMonitor(on) {
      monitorGain.gain.value = on ? 1 : 0;
    },
    close() {
      try {
        source.disconnect();
        highpass.disconnect();
        gainNode.disconnect();
        analyser.disconnect();
        monitorGain.disconnect();
      } catch (err) {
        // already out of the graph
      }
      stream.getTracks().forEach((track) => track.stop());
    },
  };
}

/**
 * Writing the sound down. Every couple of seconds the piece written so far is handed over, so an
 * interruption costs the last second or two and never the whole take.
 */
export function writeRecording(stream, { onChunk, timeslice = 2000 } = {}) {
  const mime = pickMime();
  const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  const startedAt = Date.now();

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size) {
      chunks.push(event.data);
      onChunk?.(event.data);
    }
  };

  const finished = new Promise((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime || "audio/webm" }));
  });

  recorder.start(timeslice);

  return {
    mime: mime || "audio/webm",
    seconds: () => (Date.now() - startedAt) / 1000,
    async stop() {
      try {
        recorder.stop();
      } catch (err) {
        // the recorder had already stopped
      }
      return finished;
    },
    cancel() {
      try {
        recorder.stop();
      } catch (err) {
        // already stopped
      }
    },
  };
}