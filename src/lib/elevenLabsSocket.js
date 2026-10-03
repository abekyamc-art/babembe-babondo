import { base44 } from "@/api/base44Client";
import { isRepeatIntro } from "@/lib/agentMemory";
import { contextBlocks } from "@/lib/contextBlocks";

const IN_RATE = 16000;
// his first words after the person's turn wait this long, so the words he was just
// handed have a moment to land before he answers
const BEAT_MS = 2000;
const OPEN_QUIET_MS = 10000;
// once his answer has finished, this much quiet ends the call, so the person can
// start it again whenever they are ready
const CLOSE_QUIET_MS = 4000;
const VOICE_LEVEL = 0.06;
// a session that carries on is held from speaking until the person takes their
// turn; this is the longest that hold can last if nothing releases it
const HOLD_MAX_MS = 15000;
// a written session has no microphone to listen to: it hangs up a few seconds after
// the written answer has landed, or once it has waited long enough for one to arrive
const WRITTEN_CLOSE_MS = 5000;
const WRITTEN_WAIT_MS = 25000;

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
    // a written turn that has been sent and not yet answered: the orb shows it
    this.awaiting = false;
    this.closing = false;
    this.answered = false;
    // whether the answer being given right now has already been charged for
    this.spent = false;
    this.userSpoke = false;
    this.heardVoice = false;
    this.lastVoiceAt = 0;
    this.answerEndAt = 0;
    this.watchStart = 0;
    this.watchId = 0;
    this.autoEnding = false;
    this.silent = false;
    this.silentWaitAt = 0;
    this.muteGain = null;
    // a session opened after he has already spoken is not a first meeting
    this.laterTurn = false;
    this.intro = "";
    // carrying on: nothing is heard from him until the person takes their turn
    this.holdQuiet = false;
    this.holdTimer = null;
    // the breath before his answer: when the person's turn ended, and whether the
    // answer to it is still waiting to take it
    this.turnAt = 0;
    this.beatDue = false;
    this.voiceTimer = null;
  }

  get connected() {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // a written session never opened the microphone, so it can't carry a spoken call
  get micOn() {
    return !!this.stream;
  }

  async open({ withMic, silent, memory, laterTurn } = {}) {
    // a written message is answered in writing: no microphone, nothing on the speaker
    this.silent = !withMic && !!silent;
    this.laterTurn = !!laterTurn;
    // he has already introduced himself, so this session is held quiet until the
    // person takes their turn: the introduction never reaches their ears
    this.holdQuiet = this.laterTurn;
    clearTimeout(this.holdTimer);
    this.holdTimer = null;
    if (this.holdQuiet) {
      this.holdTimer = setTimeout(() => this.releaseQuiet(), HOLD_MAX_MS);
    }
    this.silentWaitAt = performance.now();
    this.answered = false;
    this.spent = false;
    this.userSpoke = false;
    this.autoEnding = false;
    this.h.onStatus?.("connecting");

    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === "suspended") {
      // never block the connection on this — the tap that started it resumes playback
      this.ctx.resume().catch(() => {});
    }

    if (withMic) {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("This browser can't reach the microphone. Type a message instead.");
      }
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        });
      } catch (err) {
        throw new Error(
          "Microphone access is blocked. Allow the microphone for this site in your browser, then tap again — or type your message below."
        );
      }
    }

    const res = await base44.functions.invoke("elevenLabsSession", {});
    const signedUrl = res?.data?.signed_url;
    if (!signedUrl) {
      throw new Error(res?.data?.error || "Your agent could not be reached.");
    }
    this.intro = res.data.intro || "";
    const canMuteIntro = !!res.data.allow_intro_override;

    await new Promise((resolve, reject) => {
      let opened = false;
      let settled = false;
      const ws = new WebSocket(signedUrl);
      this.ws = ws;

      // never leave the button stuck on "Connecting"
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try {
          ws.close();
        } catch (err) {
          // socket already gone
        }
        reject(new Error("Your agent didn't answer in time. Please try again."));
      }, 20000);

      const settle = (done, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        done(value);
      };

      ws.onmessage = (event) => this.handleMessage(event);
      ws.onopen = () => {
        opened = true;
        // the opening note goes first, before a word is sent into the session: his
        // automatic greeting is switched off where his agent allows the switch, and
        // what he has already said is handed over as context for the answer
        const init = { type: "conversation_initiation_client_data" };
        if (this.laterTurn && canMuteIntro) {
          init.conversation_config_override = { agent: { first_message: "" } };
        }
        this.send(init);
        if (memory) this.sendMemory(memory);
        settle(resolve);
      };
      ws.onerror = () => {
        if (!opened) settle(reject, new Error("Could not connect to your agent."));
      };
      ws.onclose = () => {
        if (!opened) {
          settle(reject, new Error("Could not connect to your agent."));
          return;
        }
        this.teardown();
        if (!this.closing) this.h.onStatus?.("closed");
      };
    });

    if (withMic) this.startMic();
    if (this.silent) this.watchWritten();
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

  /**
   * The note is handed over in blocks of the size one update carries, so a whole
   * word list rides along without any single update being oversized.
   */
  sendMemory(text) {
    for (const block of contextBlocks(text)) {
      if (!this.send({ type: "contextual_update", text: block })) return false;
    }
    return true;
  }

  sendText(text) {
    this.stopPlayback();
    // every written message starts its own wait for its answer
    this.silentWaitAt = performance.now();
    this.userSpoke = true;
    // a fresh message is its own turn, so its answer is its own to spend
    this.answered = false;
    this.spent = false;
    this.releaseQuiet();
    const sent = this.send({ type: "user_message", text });
    if (sent) this.setAwaiting(true);
    return sent;
  }

  /** A written turn is waited on: shown from the send until its answer lands. */
  setAwaiting(next) {
    if (this.awaiting === next) return;
    this.awaiting = next;
    this.h.onThinking?.(next);
  }

  /**
   * The person has taken their turn, so he may speak aloud from here on. Until
   * that happens on a session that carries on, his voice stays out of the room.
   */
  releaseQuiet() {
    if (!this.holdQuiet) return;
    this.holdQuiet = false;
    clearTimeout(this.holdTimer);
    this.holdTimer = null;
  }

  // only a call the person took part in, and the agent answered, is spent — and
  // every answer is its own, so a turn taken after this one is spent as well
  noteAnswer() {
    if (!this.userSpoke || this.spent) return;
    this.spent = true;
    this.answered = true;
    this.setAwaiting(false);
    this.h.onAgentAnswered?.();
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
      if (chunk) {
        // a written answer's audio is silent and only carries its timing: the wait
        // ends when the written line lands, not when the first silent chunk arrives
        if (!this.silent) this.noteAnswer();
        this.play(chunk);
      }
      return;
    }

    if (msg.type === "user_transcript") {
      const text = msg.user_transcription_event?.user_transcript;
      if (text) {
        this.userSpoke = true;
        // a fresh turn: the answer coming for it is its own to spend
        this.spent = false;
        this.turnAt = performance.now();
        this.beatDue = true;
        this.releaseQuiet();
        this.h.onUserText?.(text);
      }
      return;
    }

    if (msg.type === "agent_response" || msg.type === "agent_response_correction") {
      const text =
        msg.agent_response_event?.agent_response ||
        msg.agent_response_correction_event?.corrected_agent_response;
      if (text) {
        this.noteAnswer();
        // a session that opened mid-conversation: his greeting coming round again is
        // something he has already said, so it is not shown a second time
        if (this.laterTurn && isRepeatIntro(text, this.intro)) return;
        this.releaseQuiet();
        this.h.onAgentText?.(text);
      }
      return;
    }

    if (msg.type === "interruption") {
      this.stopPlayback();
      this.releaseQuiet();
      this.setAwaiting(false);
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
      // the mic stays closed while the assistant speaks, so its own voice coming out
      // of the phone can never be sent back as an interruption of that answer
      if (!this.connected || this.speaking) return;
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

    this.watchStart = performance.now();
    this.lastVoiceAt = 0;
    this.answerEndAt = 0;
    this.heardVoice = false;
    this.watch();
  }

  /**
   * Opening guard: ten seconds of quiet before anything is said and the call hangs
   * up — a session that carries on greets nobody, so the person needs that long to
   * take their turn. Closing guard: once something has been said the call waits for
   * the answer to finish playing, then four seconds of quiet. Nothing at all hangs
   * up, and no playback is cleared, while the assistant still has something to say.
   */
  watch() {
    const step = () => {
      if (!this.analyser || this.autoEnding) return;
      const now = performance.now();
      // while the answer is playing, whatever the microphone picks up is the
      // assistant's own voice coming back out of the speaker
      const answering = this.speaking;

      if (!answering && this.level() > VOICE_LEVEL) {
        this.heardVoice = true;
        this.userSpoke = true;
        this.lastVoiceAt = now;
        this.turnAt = now;
        this.beatDue = true;
      }

      // the wait starts when the assistant stops talking, so it always gets to finish
      if (!answering) {
        if (!this.heardVoice) {
          const quietSince = Math.max(this.watchStart, this.answerEndAt);
          if (now - quietSince >= OPEN_QUIET_MS) {
            this.autoEnd("silence");
            return;
          }
        } else {
          const quietSince = Math.max(this.lastVoiceAt, this.answerEndAt, this.watchStart);
          if (now - quietSince >= CLOSE_QUIET_MS) {
            this.autoEnd("done");
            return;
          }
        }
      }

      this.watchId = requestAnimationFrame(step);
    };
    this.watchId = requestAnimationFrame(step);
  }

  autoEnd(reason) {
    if (this.autoEnding) return;
    this.autoEnding = true;
    if (this.watchId) cancelAnimationFrame(this.watchId);
    this.watchId = 0;

    const answered = this.answered;
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
    this.h.onAutoEnd?.({ reason, answered });
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
    // on a session that carries on, his voice stays in the silent sink until the
    // person takes their turn, so the introduction is never heard
    node.connect(this.silent || this.holdQuiet ? this.silencer() : this.ctx.destination);

    // his first words after the person's turn wait a breath, so the words he was
    // just handed have a moment to land; the orb shows him reviewing while they do
    let lead = 0;
    if (this.beatDue && !this.silent && !this.holdQuiet) {
      this.beatDue = false;
      lead = Math.max(0, (BEAT_MS - (performance.now() - this.turnAt)) / 1000);
      if (lead <= 0.05) lead = 0;
      if (lead) this.setAwaiting(true);
    }

    const now = this.ctx.currentTime;
    if (this.playHead < now + 0.04) this.playHead = now + 0.04;
    this.playHead += lead;
    node.start(this.playHead);
    this.playHead += buffer.duration;
    this.sources.push(node);
    node.onended = () => {
      this.sources = this.sources.filter((s) => s !== node);
    };

    // he is heard when his voice actually begins, not when the breath before it does
    const begins = () => {
      if (this.silent || this.holdQuiet || this.speaking) return;
      this.setAwaiting(false);
      this.speaking = true;
      this.h.onAgentAudioStart?.();
    };

    if (lead) {
      clearTimeout(this.voiceTimer);
      this.voiceTimer = setTimeout(begins, lead * 1000);
    } else {
      begins();
    }

    clearTimeout(this.endTimer);
    const remainingMs = Math.max(0, (this.playHead - this.ctx.currentTime) * 1000) + 240;
    this.endTimer = setTimeout(() => {
      this.answerEndAt = performance.now();
      if (this.speaking) {
        this.speaking = false;
        this.h.onAgentAudioEnd?.();
      }
    }, remainingMs);
  }

  // the answer to a written message is read, not heard: its audio is played into a
  // silent sink, so the speaker stays quiet while the answer keeps its exact timing
  silencer() {
    if (!this.muteGain) {
      this.muteGain = this.ctx.createGain();
      this.muteGain.gain.value = 0;
      this.muteGain.connect(this.ctx.destination);
    }
    return this.muteGain;
  }

  /**
   * Written guard: with no microphone there is no voice to listen for, so the
   * session waits for the written answer to arrive and finish, then hangs up a few
   * seconds later. Waiting too long for an answer ends it as well.
   */
  watchWritten() {
    const step = () => {
      if (this.autoEnding || !this.connected) return;
      const now = performance.now();
      const idleSince = Math.max(this.silentWaitAt, this.answerEndAt || 0);
      if (now - idleSince >= (this.answered ? WRITTEN_CLOSE_MS : WRITTEN_WAIT_MS)) {
        this.autoEnd(this.answered ? "done" : "silence");
        return;
      }
      this.watchId = requestAnimationFrame(step);
    };
    this.watchId = requestAnimationFrame(step);
  }

  stopPlayback() {
    clearTimeout(this.endTimer);
    clearTimeout(this.voiceTimer);
    this.voiceTimer = null;
    this.beatDue = false;
    this.answerEndAt = performance.now();
    if (this.speaking) {
      this.speaking = false;
      this.h.onAgentAudioEnd?.();
    }
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
    this.setAwaiting(false);
    clearTimeout(this.holdTimer);
    this.holdTimer = null;
    this.holdQuiet = false;
    if (this.watchId) cancelAnimationFrame(this.watchId);
    this.watchId = 0;
    this.stopPlayback();
    [this.processor, this.source, this.analyser, this.sink, this.muteGain].forEach((node) => {
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
    this.muteGain = null;

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