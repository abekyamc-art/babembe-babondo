/**
 * The take is mixed on the phone: the voice track the singing voice came back with,
 * over the beat that was chosen. The same mixed buffer is what is heard, what is
 * saved as a file, and what the vertical video is built from.
 */

import { scheduleBeat } from "@/lib/rapBeat";

const RATE = 44100;

let graph = null;

/** The phone's own audio graph, opened on the first tap and kept for the take. */
export function audioGraph() {
  if (!graph) graph = new (window.AudioContext || window.webkitAudioContext)();
  if (graph.state === "suspended") graph.resume().catch(() => {});
  return graph;
}

/** The bytes of a take, so it can be mixed and saved rather than only played. */
export async function fetchAudio(url) {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error("Faili la sauti halipatikani kwa sasa.");
  return res.arrayBuffer();
}

function writeText(view, offset, text) {
  for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
}

/** The mixed take as a file anyone can play: 16-bit PCM in a WAV container. */
export function wavBlob(buffer) {
  const channels = Math.max(1, buffer.numberOfChannels);
  const frames = buffer.length;
  const size = 44 + frames * channels * 2;
  const view = new DataView(new ArrayBuffer(size));

  writeText(view, 0, "RIFF");
  view.setUint32(4, size - 8, true);
  writeText(view, 8, "WAVE");
  writeText(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  writeText(view, 36, "data");
  view.setUint32(40, frames * channels * 2, true);

  const data = [];
  for (let c = 0; c < channels; c += 1) data.push(buffer.getChannelData(c));

  let offset = 44;
  for (let i = 0; i < frames; i += 1) {
    for (let c = 0; c < channels; c += 1) {
      const value = Math.max(-1, Math.min(1, data[c][i]));
      view.setInt16(offset, value < 0 ? value * 0x8000 : value * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([view.buffer], { type: "audio/wav" });
}

/**
 * The voice over the beat, in one pass. A song the singing voice came back with
 * already carries its own beat, so the app's beat is not laid under it; a plain voice
 * track gets whichever beat was chosen.
 */
export async function mixTake({ vocalBytes, vocalKind, beatKind, beatBytes, bpm, seconds }) {
  const span = Math.max(6, (Number(seconds) || 0) + 2);
  const ctx = new OfflineAudioContext(2, Math.ceil(span * RATE), RATE);

  if (vocalBytes) {
    const vocal = await ctx.decodeAudioData(vocalBytes.slice(0));
    const src = ctx.createBufferSource();
    src.buffer = vocal;
    src.connect(ctx.destination);
    src.start(0);
  }

  if (beatKind === "app" && vocalKind !== "song") {
    scheduleBeat(ctx, ctx.destination, { bpm, seconds: span });
  }

  if (beatBytes) {
    const beat = await ctx.decodeAudioData(beatBytes.slice(0));
    const src = ctx.createBufferSource();
    src.buffer = beat;
    src.loop = true;
    src.connect(ctx.destination);
    src.start(0);
    src.stop(span);
  }

  return ctx.startRendering();
}

/** Plays a mixed take, reporting its place as it goes so the words can follow it. */
export function playBuffer(buffer, { offset = 0, onTime, onEnd } = {}) {
  const ctx = audioGraph();
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);

  let raf = 0;
  let done = false;
  // the clock the place is read from starts where playback was told to begin, so a take carried on
  // after a pause still reports the place it truly stands at
  const from = Math.max(0, Math.min(Math.max(0, buffer.duration - 0.05), Number(offset) || 0));
  const startedAt = ctx.currentTime - from;

  const tick = () => {
    const at = Math.min(buffer.duration, ctx.currentTime - startedAt);
    onTime?.(at);
    raf = requestAnimationFrame(tick);
  };

  const finish = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    onEnd?.();
  };

  src.onended = finish;
  src.start(0, from);
  raf = requestAnimationFrame(tick);

  return () => {
    done = true;
    cancelAnimationFrame(raf);
    try {
      src.stop();
    } catch (err) {
      // the take already finished
    }
  };
}