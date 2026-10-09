/**
 * The studio's engine: it holds the song, plays it, renders it to a file, and never knows anything
 * about the screen. The timeline only says what should be heard and where; everything to do with
 * sound — decoding a recording, laying clips at the right moment, summing the tracks, the master
 * chain, the export — happens here, so what is heard while working and what comes out of the
 * export are made by the very same code.
 */

import { audioGraph, wavBlob } from "@/lib/rapAudio";
import { getAudio } from "@/lib/studioStore";
import { buildChain } from "@/lib/studioEffects";
import { clipEnd, projectDuration } from "@/lib/studioTracks";
import { pickMime } from "@/lib/studioRecorder";

export { wavBlob };

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, Number(value) || 0));

/* --- the recordings, held once and read back by the key a clip points at --- */

const buffers = new Map();
const peakCache = new Map();

export function heldBuffer(key) {
  return buffers.get(key) || null;
}

export function holdBuffer(key, buffer) {
  buffers.set(key, buffer);
  return buffer;
}

export function dropBuffer(key) {
  buffers.delete(key);
  [...peakCache.keys()].filter((one) => one.startsWith(`${key}:`)).forEach((one) => peakCache.delete(one));
}

/** A recording, decoded and kept, so a clip plays the moment it is asked for. */
export async function loadBuffer(key) {
  if (!key) return null;
  const held = buffers.get(key);
  if (held) return held;
  const row = await getAudio(key);
  if (!row?.blob) return null;
  const buffer = await audioGraph().decodeAudioData(await row.blob.arrayBuffer());
  buffers.set(key, buffer);
  return buffer;
}

/** Every recording the song points at, read in one go. Anything missing is named, not guessed at. */
export async function loadMissing(project) {
  const keys = new Set();
  (project?.tracks || []).forEach((track) => (track.clips || []).forEach((clip) => clip.source_key && keys.add(clip.source_key)));
  (project?.takes || []).forEach((take) => take.source_key && keys.add(take.source_key));
  const gone = [];
  await Promise.all(
    [...keys].map(async (key) => {
      try {
        const buffer = await loadBuffer(key);
        if (!buffer) gone.push(key);
      } catch (err) {
        gone.push(key);
      }
    })
  );
  return gone;
}

/** The shape of a recording, drawn to as many marks as the clip is wide on screen. */
export function peaksFor(key, buffer, marks = 300) {
  const cacheKey = `${key}:${marks}`;
  const held = peakCache.get(cacheKey);
  if (held) return held;
  const count = Math.max(8, Math.min(2400, Math.floor(marks)));
  const data = buffer.getChannelData(0);
  const step = Math.max(1, Math.floor(data.length / count));
  const out = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    let peak = 0;
    const start = i * step;
    for (let j = 0; j < step; j += 1) {
      const value = Math.abs(data[start + j] || 0);
      if (value > peak) peak = value;
    }
    out[i] = peak;
  }
  peakCache.set(cacheKey, out);
  return out;
}

/** The loudest moment of a recording, so a take that clipped is seen at once. */
export function peakOf(buffer) {
  const data = buffer.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < data.length; i += 1) {
    const value = Math.abs(data[i]);
    if (value > peak) peak = value;
  }
  return peak;
}

/* --- who is heard, and how loud --- */

export function anySoloed(project) {
  return (project?.tracks || []).some((track) => track.soloed);
}

export function isAudible(project, track) {
  if (track.muted) return false;
  return anySoloed(project) ? !!track.soloed : true;
}

export function busGain(project, track) {
  const bus = project?.buses?.[track.bus || "music"];
  if (!bus) return 1;
  if (bus.muted) return 0;
  return clamp(bus.volume ?? 1, 0, 2);
}

export function trackGain(project, track) {
  return clamp(track.volume ?? 1, 0, 2) * busGain(project, track);
}

/* --- what is heard, and when --- */

/**
 * Every piece of sound the song asks for: a clip, the track it stands on, when it begins, how far
 * into its recording it starts, and how much of it is heard. The loop, when one is marked, is
 * written out as repeats of the same plan rather than being special-cased anywhere else.
 */
export function planInstances(project, { from = 0 } = {}) {
  const list = [];
  const looping = !!project?.loop_on && Number(project?.loop_end) > Number(project?.loop_start);
  const loopStart = Number(project?.loop_start) || 0;
  const loopLength = looping ? Number(project.loop_end) - loopStart : 0;
  const passes = looping ? Math.min(32, Math.max(2, Math.ceil((Math.max(45, projectDuration(project)) - loopStart) / loopLength))) : 1;

  for (const track of project?.tracks || []) {
    if (!isAudible(project, track)) continue;
    for (const clip of track.clips || []) {
      const end = clipEnd(clip);
      if (looping) {
        for (let pass = 0; pass < passes; pass += 1) {
          const base = loopStart + pass * loopLength;
          const start = Math.max(clip.start, loopStart);
          const stop = Math.min(end, Number(project.loop_end));
          if (stop - start <= 0.01) break;
          const at = base + (start - loopStart);
          if (at + (stop - start) <= from) continue;
          list.push({
            track,
            clip,
            at,
            offset: (Number(clip.offset) || 0) + (start - clip.start),
            duration: stop - start,
          });
        }
      } else {
        if (end <= from) continue;
        list.push({ track, clip, at: clip.start, offset: Number(clip.offset) || 0, duration: clip.duration });
      }
    }
  }
  return list;
}

/** A clip's own level, brought up and let down over the fades the artist set. */
function clipGainNode(ctx, clip, at, duration) {
  const node = ctx.createGain();
  const level = clamp(clip.gain ?? 1, 0, 2);
  const fadeIn = Math.min(Number(clip.fade_in) || 0, duration / 2);
  const fadeOut = Math.min(Number(clip.fade_out) || 0, duration / 2);
  node.gain.setValueAtTime(fadeIn > 0 ? 0 : level, at);
  if (fadeIn > 0) node.gain.linearRampToValueAtTime(level, at + fadeIn);
  if (fadeOut > 0) {
    node.gain.setValueAtTime(level, at + duration - fadeOut);
    node.gain.linearRampToValueAtTime(0, at + duration);
  }
  return node;
}

/** A whole track: its own chain, then its level and its place across the stereo field. */
export function buildTrackGraph(ctx, project, track, dest) {
  const chain = buildChain(ctx, track.fx);
  const gain = ctx.createGain();
  gain.gain.value = trackGain(project, track);
  const panner = ctx.createStereoPanner();
  panner.pan.value = clamp(track.pan ?? 0, -1, 1);
  const meter = ctx.createAnalyser();
  meter.fftSize = 512;

  chain.output.connect(gain);
  gain.connect(panner);
  panner.connect(meter);
  meter.connect(dest);

  return {
    input: chain.input,
    meter,
    dispose() {
      chain.dispose();
      [gain, panner, meter].forEach((one) => {
        try {
          one.disconnect();
        } catch (err) {
          // already out of the graph
        }
      });
    },
  };
}

/** The master channel: its own level, its tone, and what keeps the song from clipping. */
export function buildMaster(ctx, master = {}) {
  const input = ctx.createGain();
  input.gain.value = clamp(master.volume ?? 1, 0, 2);
  const nodes = [input];
  let node = input;

  if (master.eq_low || master.eq_high) {
    const low = ctx.createBiquadFilter();
    low.type = "lowshelf";
    low.frequency.value = 110;
    low.gain.value = clamp(master.eq_low ?? 0, -12, 12);
    const high = ctx.createBiquadFilter();
    high.type = "highshelf";
    high.frequency.value = 7000;
    high.gain.value = clamp(master.eq_high ?? 0, -12, 12);
    node.connect(low);
    low.connect(high);
    node = high;
    nodes.push(low, high);
  }

  if (master.comp) {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;
    node.connect(comp);
    node = comp;
    nodes.push(comp);
  }

  if (master.limiter !== false) {
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = clamp(master.ceiling ?? -1, -9, 0);
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.08;
    limiter.knee.value = 0;
    node.connect(limiter);
    node = limiter;
    nodes.push(limiter);
  }

  const meter = ctx.createAnalyser();
  meter.fftSize = 1024;
  node.connect(meter);
  nodes.push(meter);

  return {
    input,
    out: meter,
    meter,
    dispose() {
      nodes.forEach((one) => {
        try {
          one.disconnect();
        } catch (err) {
          // already out of the graph
        }
      });
    },
  };
}

function levelOf(analyser, scratch) {
  if (!analyser) return 0;
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
}

/**
 * A song being heard. Every clip is laid into the graph the moment playing begins, which is what
 * lets the phone's own clock keep the time: the playhead follows the sound instead of the sound
 * chasing the playhead.
 */
export class StudioPlayer {
  constructor(project) {
    this.project = project;
    this.ctx = audioGraph();
    this.sources = [];
    this.graphs = [];
    this.master = null;
    this.meters = new Map();
    this.scratch = new Float32Array(1024);
    this.from = 0;
    this.startedAt = 0;
    this.playing = false;
    this.endAt = 0;
  }

  async start(from = 0, onEnd = null) {
    this.stop();
    const ctx = this.ctx;
    if (ctx.state === "suspended") await ctx.resume().catch(() => {});
    const project = this.project;
    const start = Math.max(0, from);

    this.master = buildMaster(ctx, project.master);
    this.master.out.connect(ctx.destination);

    const graphs = new Map();
    const at = ctx.currentTime + 0.09;
    this.from = start;
    this.startedAt = at;
    this.playing = true;

    for (const inst of planInstances(project, { from: start })) {
      const buffer = buffers.get(inst.clip.source_key);
      if (!buffer) continue;
      let graph = graphs.get(inst.track.id);
      if (!graph) {
        graph = buildTrackGraph(ctx, project, inst.track, this.master.input);
        graphs.set(inst.track.id, graph);
        this.meters.set(inst.track.id, graph.meter);
        this.graphs.push(graph);
      }
      const cut = Math.max(0, start - inst.at);
      const offset = Math.max(0, inst.offset + cut);
      const duration = inst.duration - cut;
      if (duration <= 0.01) continue;

      const when = at + Math.max(0, inst.at - start);
      const gain = clipGainNode(ctx, inst.clip, when, duration);
      gain.connect(graph.input);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      if (inst.clip.looping) source.loop = true;
      const spin = buffer.duration > 0.05 ? offset % buffer.duration : 0;
      source.connect(gain);
      try {
        source.start(when, spin, duration);
      } catch (err) {
        continue;
      }
      this.sources.push(source);
    }

    this.endAt = start + Math.max(0, projectDuration(project) - start) + 0.25;
    this.onEnd = onEnd;
  }

  /** Where the song stands right now, read from the phone's own clock. */
  position() {
    if (!this.playing) return this.from;
    return Math.max(this.from, this.from + (this.ctx.currentTime - this.startedAt));
  }

  /** How loud every track and the master are at this instant, read at each track's own meter. */
  levels() {
    const tracks = {};
    this.meters.forEach((meter, trackId) => {
      tracks[trackId] = levelOf(meter, this.scratch);
    });
    return { tracks, master: levelOf(this.master?.meter, this.scratch) };
  }

  stop() {
    this.playing = false;
    this.sources.forEach((source) => {
      try {
        source.stop();
      } catch (err) {
        // the clip had already finished
      }
      try {
        source.disconnect();
      } catch (err) {
        // already out of the graph
      }
    });
    this.sources = [];
    this.graphs.forEach((graph) => graph.dispose());
    this.graphs = [];
    this.meters = new Map();
    this.master?.dispose();
    this.master = null;
    return this.from;
  }
}

/* --- the metronome, so a count-in and a click can be kept to --- */

const clicks = new WeakMap();

export function clickBuffers(ctx) {
  const held = clicks.get(ctx);
  if (held) return held;
  const make = (freq, seconds, level) => {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = Math.sin((2 * Math.PI * freq * i) / ctx.sampleRate) * Math.pow(1 - i / length, 3) * level;
    }
    return buffer;
  };
  const made = { accent: make(1760, 0.06, 0.5), plain: make(1170, 0.05, 0.32) };
  clicks.set(ctx, made);
  return made;
}

/** Clicks from a moment on, counted in bars, so the artist can come in on the right beat. */
export function scheduleClicks(ctx, dest, { bpm, signature = "4/4", beats = 4, from = null }) {
  const { accent, plain } = clickBuffers(ctx);
  const perBar = Number(String(signature).split("/")[0]) || 4;
  const seconds = 60 / Math.max(30, Number(bpm) || 90);
  const at = from ?? ctx.currentTime + 0.05;
  const made = [];
  for (let i = 0; i < beats; i += 1) {
    const source = ctx.createBufferSource();
    source.buffer = i % perBar === 0 ? accent : plain;
    source.connect(dest);
    source.start(at + i * seconds);
    made.push(source);
  }
  return made;
}

/* --- the file that comes out --- */

/**
 * The whole song, or one track on its own, rendered into a buffer without being played — the real
 * mixdown, made by the same chain the artist was listening to.
 */
export async function renderProject({ project, sampleRate = 44100, from = 0, until = null, trackId = null }) {
  const scope = trackId ? { ...project, tracks: (project.tracks || []).filter((track) => track.id === trackId) } : project;
  const span = Math.max(1, (until ?? projectDuration(scope)) - from);
  const ctx = new OfflineAudioContext(2, Math.ceil(span * sampleRate), sampleRate);
  const master = buildMaster(ctx, scope.master);
  master.out.connect(ctx.destination);

  const decoded = new Map();
  const graphs = new Map();

  for (const inst of planInstances(scope, { from })) {
    let buffer = decoded.get(inst.clip.source_key);
    if (buffer === undefined) {
      const row = await getAudio(inst.clip.source_key);
      buffer = row?.blob ? await ctx.decodeAudioData(await row.blob.arrayBuffer()).catch(() => null) : null;
      decoded.set(inst.clip.source_key, buffer);
    }
    if (!buffer) continue;

    let graph = graphs.get(inst.track.id);
    if (!graph) {
      graph = buildTrackGraph(ctx, scope, inst.track, master.input);
      graphs.set(inst.track.id, graph);
    }

    const cut = Math.max(0, from - inst.at);
    const offset = Math.max(0, inst.offset + cut);
    const duration = inst.duration - cut;
    if (duration <= 0.01) continue;

    const at = Math.max(0, inst.at - from);
    const gain = clipGainNode(ctx, inst.clip, at, duration);
    gain.connect(graph.input);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    if (inst.clip.looping) source.loop = true;
    const spin = buffer.duration > 0.05 ? offset % buffer.duration : 0;
    source.connect(gain);
    source.start(at, spin, duration);
  }

  return ctx.startRendering();
}

/**
 * The mix recorded as it plays, in the format the phone itself writes. What comes back is a way to
 * stop, and how far along the recording is — a long song is a long wait, and the artist is shown it.
 */
export async function captureProject({ project, container = null }) {
  const ctx = audioGraph();
  if (ctx.state === "suspended") await ctx.resume().catch(() => {});
  const master = buildMaster(ctx, project.master);
  const dest = ctx.createMediaStreamDestination();
  master.out.connect(dest);
  master.out.connect(ctx.destination);

  const graphs = new Map();
  const sources = [];
  const at = ctx.currentTime + 0.12;
  const span = Math.max(1, projectDuration(project));

  for (const inst of planInstances(project, { from: 0 })) {
    const buffer = buffers.get(inst.clip.source_key);
    if (!buffer) continue;
    let graph = graphs.get(inst.track.id);
    if (!graph) {
      graph = buildTrackGraph(ctx, project, inst.track, master.input);
      graphs.set(inst.track.id, graph);
    }
    const when = at + inst.at;
    const gain = clipGainNode(ctx, inst.clip, when, inst.duration);
    gain.connect(graph.input);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    if (inst.clip.looping) source.loop = true;
    source.connect(gain);
    const spin = buffer.duration > 0.05 ? inst.offset % buffer.duration : 0;
    try {
      source.start(when, spin, inst.duration);
    } catch (err) {
      continue;
    }
    sources.push(source);
  }

  const mime = pickMime();
  const chunks = [];
  const recorder = new MediaRecorder(dest.stream, container ? { mimeType: container } : mime ? { mimeType: mime } : undefined);
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size) chunks.push(event.data);
  };
  const finished = new Promise((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime || "audio/webm" }));
  });
  recorder.start(500);

  const startedAt = Date.now();
  return {
    span,
    mime: mime || "audio/webm",
    elapsed: () => Math.min(span, (Date.now() - startedAt) / 1000),
    async stop() {
      await new Promise((resolve) => setTimeout(resolve, 120));
      try {
        recorder.stop();
      } catch (err) {
        // the recorder had already finished
      }
      const blob = await finished;
      sources.forEach((source) => {
        try {
          source.stop();
        } catch (err) {
          // already finished
        }
      });
      graphs.forEach((graph) => graph.dispose());
      master.dispose();
      return blob;
    },
  };
}

/** One recording, heard on its own — how a take is tried out before it is kept. */
export async function previewBlob(blob, { onEnd } = {}) {
  const ctx = audioGraph();
  if (ctx.state === "suspended") await ctx.resume().catch(() => {});
  const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  gain.gain.value = 1;
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(ctx.destination);
  source.onended = () => onEnd?.();
  source.start(0);
  return {
    buffer,
    stop() {
      try {
        source.stop();
      } catch (err) {
        // already finished
      }
    },
  };
}

/** How far behind the tap the sound comes out, as the phone itself reports it. */
export function estimateLatency() {
  try {
    const ctx = audioGraph();
    const seconds = (ctx.baseLatency || 0) + (ctx.outputLatency || 0);
    return Math.round(seconds * 1000);
  } catch (err) {
    return 0;
  }
}

/** A finished buffer as a file the phone can keep. */
export function bufferToWav(buffer) {
  return wavBlob(buffer);
}