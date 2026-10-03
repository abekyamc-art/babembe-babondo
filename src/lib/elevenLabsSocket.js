import { base44 } from "@/api/base44Client";

const IN_RATE = 16000;

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

function pcmToFloat(bytes) {
  const n = bytes.byteLength >> 1;
  const view = new DataView(bytes.buffer, bytes.byteOffset, n * 2);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) out[i] = view.getInt16(i * 2, true) / 32768;
  return out;
}

function floatToPcmBytes(samples) {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return new Uint8Array(out.buffer);
}

function resample(input, fromRate, toRate) {
  if (!input.length || fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const len = Math.floor(input.length / ratio);
  if (len < 1) return new Float32Array(0);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i += 1) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, input.length - 1);
    out[i] = input[i0] + (input[i1] - input[i0]) * (pos - i0);
  }
  return out;
}

/**
 * Live audio + text link to an ElevenLabs conversational agent.
 */
export default class VoiceSocket {
  constructor(handlers = {}) {
    this.h = handlers;
    this.ws = null;
    this.ctx = null;
    this.stream = null;
    this.source = null;
    this.processor = null;
    this.sink = null;
    this.analyser = null;
    this.levelBuf = null;
    this.outRate = IN_RATE;
    this.playHead = 0;
    this.sources = [];
    this.endTimer = null;
    this.speaking = false;
    this.closing = false;
  }

  get connected() {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  async open({ withMic } = {}) {
    this.h.onStatus?.("connecting");

    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === "suspended") {
      // never block the connection on this — the tap that started it resumes playback
      this.ctx.resume().catch(() => {});
    }

    if (withMic) {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
    }

    const res = await base44.functions.invoke("elevenLabsSession", {});
    const signedUrl = res?.data?.signed_url;
    if (!signedUrl) {
      throw new Error(res?.data?.error || "Your agent could not be reached.");
    }

    await new Promise((resolve, reject) => {
      let opened = false;
      const ws = new WebSocket(signedUrl);
      this.ws = ws;
      ws.onmessage = (event) => this.handleMessage(event);
      ws.onopen = () => {
        opened = true;
        resolve();
      };
      ws.onerror = () => {
        if (!opened) reject(new Error("Could not connect to your agent."));
      };
      ws.onclose = () => {
        if (!opened) {
          reject(new Error("Could not connect to your agent."));
          return;
        }
        this.teardown();
        if (!this.closing) this.h.onStatus?.("closed");
      };
    });

    if (withMic) this.startMic();
    this.h.onStatus?.("live");
  }

  send(payload) {
    if (!this.connected) return false;
    try {
      this.ws.send(JSON.stringify(payload));
      return true;
    } catch (err) {
      return false;
    }
  }

  sendText(text) {
    this.stopPlayback();
    return this.send({ type: "user_message", text });
  }

  handleMessage(event) {
    if (typeof event.data !== "string") return;
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch (err) {
      return;
    }

    if (msg.type === "conversation_initiation_metadata") {
      const fmt = msg.conversation_initiation_metadata_event?.agent_output_audio_format || "";
      const rate = parseInt(String(fmt).split("_")[1], 10);
      if (rate) this.outRate = rate;
      return;
    }

    if (msg.type === "audio") {
      const chunk = msg.audio_event?.audio_base_64;
      if (chunk) this.play(chunk);
      return;
    }

    if (msg.type === "user_transcript") {
      const text = msg.user_transcription_event?.user_transcript;
      if (text) this.h.onUserText?.(text);
      return;
    }

    if (msg.type === "agent_response" || msg.type === "agent_response_correction") {
      const text =
        msg.agent_response_event?.agent_response ||
        msg.agent_response_correction_event?.corrected_agent_response;
      if (text) this.h.onAgentText?.(text);
      return;
    }

    if (msg.type === "interruption") {
      this.stopPlayback();
      this.h.onInterrupted?.();
      return;
    }

    if (msg.type === "ping") {
      this.send({ type: "pong", event_id: msg.ping_event?.event_id });
    }
  }

  startMic() {
    if (!this.ctx || !this.stream) return;
    this.source = this.ctx.createMediaStreamSource(this.stream);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.levelBuf = new Uint8Array(this.analyser.fftSize);
    this.source.connect(this.analyser);

    this.processor = this.ctx.createScriptProcessor(2048, 1, 1);
    this.processor.onaudioprocess = (event) => {
      if (!this.connected) return;
      const chunk = event.inputBuffer.getChannelData(0);
      const pcm = floatToPcmBytes(resample(chunk, this.ctx.sampleRate, IN_RATE));
      if (pcm.length) this.send({ user_audio_chunk: bytesToB64(pcm) });
    };

    // keep the processor alive without playing the mic back
    this.sink = this.ctx.createGain();
    this.sink.gain.value = 0;
    this.source.connect(this.processor);
    this.processor.connect(this.sink);
    this.sink.connect(this.ctx.destination);
  }

  level() {
    if (!this.analyser || !this.levelBuf || !this.connected) return 0;
    this.analyser.getByteTimeDomainData(this.levelBuf);
    let sum = 0;
    for (let i = 0; i < this.levelBuf.length; i += 1) {
      const v = (this.levelBuf[i] - 128) / 128;
      sum += v * v;
    }
    return Math.min(1, Math.sqrt(sum / this.levelBuf.length) * 3.5);
  }

  play(b64) {
    if (!this.ctx || this.ctx.state === "closed") return;
    const samples = pcmToFloat(b64ToBytes(b64));
    if (!samples.length) return;

    const buffer = this.ctx.createBuffer(1, samples.length, this.outRate);
    buffer.copyToChannel(samples, 0);

    const node = this.ctx.createBufferSource();
    node.buffer = buffer;
    node.connect(this.ctx.destination);

    const now = this.ctx.currentTime;
    if (this.playHead < now + 0.04) this.playHead = now + 0.04;
    node.start(this.playHead);
    this.playHead += buffer.duration;
    this.sources.push(node);
    node.onended = () => {
      this.sources = this.sources.filter((s) => s !== node);
    };

    if (!this.speaking) {
      this.speaking = true;
      this.h.onAgentAudioStart?.();
    }

    clearTimeout(this.endTimer);
    const remainingMs = Math.max(0, (this.playHead - this.ctx.currentTime) * 1000) + 240;
    this.endTimer = setTimeout(() => {
      this.speaking = false;
      this.h.onAgentAudioEnd?.();
    }, remainingMs);
  }

  stopPlayback() {
    clearTimeout(this.endTimer);
    this.sources.forEach((node) => {
      try {
        node.stop();
      } catch (err) {
        // already finished
      }
    });
    this.sources = [];
    this.playHead = 0;
  }

  teardown() {
    this.stopPlayback();
    [this.processor, this.source, this.analyser, this.sink].forEach((node) => {
      if (node) {
        try {
          node.disconnect();
        } catch (err) {
          // already detached
        }
      }
    });
    this.processor = null;
    this.source = null;
    this.analyser = null;
    this.sink = null;
    this.levelBuf = null;

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.ctx && this.ctx.state !== "closed") {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
    this.speaking = false;
  }

  async stop() {
    this.closing = true;
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      try {
        ws.close();
      } catch (err) {
        // socket already gone
      }
    }
    this.teardown();
    this.h.onStatus?.("ended");
  }
}