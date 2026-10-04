import { base44 } from "@/api/base44Client";
import { recordTurn } from "@/lib/voiceTurn";
import { VOICE_RATE } from "@/lib/voicePace";

/**
 * The call the app's own AI answers.
 *
 * It keeps the same shape as the two agent calls, so the screen does not know the
 * difference: the microphone is held open, and each spoken turn is heard, answered from the
 * admin's saved knowledge, and spoken back out in the platform's own voice. The call stays
 * open between questions — the person can keep talking as long as they like — and closes
 * itself only after a long quiet.
 */
// quiet before a turn is expected, and quiet after an answer before the call closes itself
const OPEN_QUIET_MS = 20000;
const CLOSE_QUIET_MS = 15000;
const MAX_MEMORY = 12000;
const MAX_HISTORY = 6;
const MAX_LINE = 240;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default class Base44Call {
  constructor(handlers = {}) {
    this.h = handlers;
    this.connected = false;
    this.micOn = false;
    this.silent = false;
    this.speaking = false;
    this.stopped = false;
    this.busy = false;
    this.answers = 0;
    this.memory = "";
    this.log = [];
    this.stream = null;
    this.ctx = null;
    this.analyser = null;
    this.levelBuf = null;
    this.node = null;
    this.audio = null;
    this.recorderBroken = false;
  }

  async open({ withMic = true, silent = false, memory = "" } = {}) {
    this.silent = !!silent;
    this.memory = String(memory || "").slice(0, MAX_MEMORY);
    this.connected = true;
    this.micOn = !!withMic;

    if (this.micOn) {
      await this.openMic();
      this.loop();
    }

    this.h.onStatus?.("live");
    return true;
  }

  /** The microphone, and the meter the orb pulses with while the person talks. */
  async openMic() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.levelBuf = new Uint8Array(this.analyser.fftSize);
      this.tap = this.ctx.createMediaStreamSource(this.stream);
      this.tap.connect(this.analyser);
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    } catch (err) {
      // the orb falls back to its resting pulse
    }
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

  /** One turn after another, for as long as the call is open. */
  async loop() {
    while (this.connected && !this.stopped) {
      // a written question being answered holds the microphone still
      while (this.busy && this.connected && !this.stopped) await wait(150);
      if (!this.connected || this.stopped) return;

      const heard = await recordTurn({
        stream: this.stream,
        level: () => this.level(),
        openMs: this.answers ? CLOSE_QUIET_MS : OPEN_QUIET_MS,
      }).catch(() => ({ blob: null, broken: true }));

      if (!this.connected || this.stopped) return;
      if (heard.broken) {
        this.h.onError?.("Kifaa hiki hakiwezi kurekodi sauti. Jaribu kwenye simu nyingine.");
        return this.autoEnd("failed");
      }
      if (!heard.blob) return this.autoEnd("silence");

      const done = await this.answer(heard.blob);
      if (!done) return this.autoEnd("failed");
    }
  }

  /** What was said, answered, kept on screen and read back out. */
  async answer(blob) {
    this.busy = true;
    this.h.onThinking?.(true);
    let url = "";
    try {
      const res = await base44.functions.invoke("base44Answer", {
        audio: { b64: await toBase64(blob), type: blob.type || "audio/webm" },
        memory: this.memory,
        history: this.history(),
      });
      const data = res?.data || {};
      if (!data.answer) throw new Error(data.error || "Jibu halikukamilika. Jaribu tena.");

      if (data.transcript) {
        this.log.push({ role: "user", text: data.transcript });
        this.h.onUserText?.(data.transcript);
      }
      this.log.push({ role: "agent", text: data.answer });
      this.h.onAgentText?.(data.answer);
      this.h.onAgentAnswered?.();
      this.answers += 1;
      url = data.audio_url || "";
    } catch (err) {
      this.h.onError?.(
        err?.response?.data?.error || err?.message || "Jibu halikukamilika. Jaribu tena."
      );
      return false;
    } finally {
      this.busy = false;
      this.h.onThinking?.(false);
    }

    // his voice follows the working line, so the orb shows him speaking rather than thinking
    if (url && !this.silent) await this.speak(url);
    return true;
  }

  /** His answer read out loud, at the phone's own quicker pace. */
  async speak(url) {
    this.speaking = true;
    this.h.onAgentAudioStart?.();
    try {
      await this.throughCtx(url).catch(() => this.throughElement(url));
    } catch (err) {
      // the words stay on screen when the voice cannot be played
    } finally {
      this.node = null;
      this.audio = null;
      this.speaking = false;
      this.h.onAgentAudioEnd?.();
    }
  }

  /** The quickest route: the answer decoded onto the call's own audio, at the phone's pace. */
  async throughCtx(url) {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const res = await fetch(url);
    const buffer = await this.ctx.decodeAudioData(await res.arrayBuffer());

    const node = this.ctx.createBufferSource();
    node.buffer = buffer;
    node.playbackRate.value = VOICE_RATE;
    node.connect(this.ctx.destination);
    this.node = node;

    await new Promise((resolve) => {
      node.onended = resolve;
      try {
        node.start();
      } catch (err) {
        resolve();
      }
    });
  }

  /** The same answer off the file itself, for a phone that will not hand the bytes over. */
  async throughElement(url) {
    const audio = new Audio(url);
    audio.playbackRate = VOICE_RATE;
    // the quicker voice rides up in pitch, as a voice speaking faster does
    audio.preservesPitch = false;
    audio.mozPreservesPitch = false;
    audio.webkitPreservesPitch = false;
    this.audio = audio;
    await new Promise((resolve) => {
      audio.onended = resolve;
      audio.onerror = resolve;
      audio.play().catch(resolve);
    });
  }

  /** A written reply, answered by the same AI, with no voice unless a call asked for one. */
  async ask(text, speak = false) {
    const said = String(text || "").trim();
    if (!said) return false;
    this.busy = true;
    this.h.onThinking?.(true);
    try {
      this.log.push({ role: "user", text: said });
      const res = await base44.functions.invoke("base44Answer", {
        text: said,
        memory: this.memory,
        history: this.history(),
      });
      const data = res?.data || {};
      if (!data.answer) throw new Error(data.error || "Jibu halikukamilika. Jaribu tena.");

      this.log.push({ role: "agent", text: data.answer });
      this.h.onAgentText?.(data.answer);
      this.h.onAgentAnswered?.();

      if (speak && data.audio_url && !this.silent) await this.speak(data.audio_url);
      return true;
    } catch (err) {
      this.h.onError?.(
        err?.response?.data?.error || err?.message || "Jibu halikukamilika. Jaribu tena."
      );
      return false;
    } finally {
      this.busy = false;
      this.h.onThinking?.(false);
    }
  }

  sendText(text, options = {}) {
    if (!this.connected) return false;
    this.ask(text, !!options.speak).catch(() => {});
    return true;
  }

  /** Silent knowledge handed over as the call runs: it rides with the next question. */
  sendMemory(text) {
    const extra = String(text || "").trim();
    if (!extra || this.memory.length + extra.length > MAX_MEMORY) return false;
    this.memory = this.memory ? `${this.memory}\n\n${extra}` : extra;
    return true;
  }

  setAwaiting(next) {
    this.h.onThinking?.(!!next);
  }

  history() {
    return this.log
      .slice(-MAX_HISTORY)
      .map((row) => `${row.role === "user" ? "Mtu" : "Wewe"}: ${row.text.slice(0, MAX_LINE)}`)
      .join("\n");
  }

  autoEnd(reason) {
    if (this.stopped) return;
    const answered = this.answers > 0;
    this.stop();
    this.h.onAutoEnd?.({ reason, answered });
  }

  async stop() {
    this.stopped = true;
    this.connected = false;
    this.micOn = false;
    this.speaking = false;
    if (this.node) {
      try {
        this.node.stop();
      } catch (err) {
        // the answer had already finished
      }
      this.node = null;
    }
    if (this.audio) {
      try {
        this.audio.pause();
      } catch (err) {
        // the answer had already finished
      }
      this.audio = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    try {
      this.ctx?.close();
    } catch (err) {
      // the audio context was already closed
    }
    this.ctx = null;
    this.analyser = null;
    this.h.onStatus?.("ended");
  }
}

/** The recording of one turn, as the words of a data URL the function can read back. */
function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.onerror = () => reject(new Error("turn-unreadable"));
    reader.readAsDataURL(blob);
  });
}