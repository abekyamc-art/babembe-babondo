import { base44 } from "@/api/base44Client";
import { primedAudio } from "@/lib/audioUnlock";
import { bytesToBase64, floatToPcm16, resample, wavBytes } from "@/lib/pcmAudio";

/**
 * A call with the Cartesia agent.
 *
 * It is the same shape as the app's other calls, so the screen does not know the difference: the
 * microphone is held open, and the answer comes back as sound. The difference is that nothing here
 * answers on the app's behalf — Cartesia listens, writes its own answer and speaks it, and the
 * events it reports are what the screen shows and what the turn on the line is counted from.
 */

const VERSION = "2026-08-14";
// the rate the session declares, in samples a second: 16-bit, single channel, as headerless PCM
const RATE = 44100;
// the session is given this long to report itself ready before the call is given up on
const OPEN_MS = 20000;
// a breath with nothing more arriving ends his turn: a pause inside one answer is not its end
const ANSWER_GAP_MS = 900;
// about 46ms of sound per chunk, at the short end of what the service asks for
const CHUNK = 2048;
// The app's own ears write the person's turn down — OpenAI, the one reader every voice feature
// listens through — so the turn is kept here while it is being said and handed over when it is
// over. Only sound above this floor opens a turn, a breath of quiet this long closes it, and no
// turn is kept longer than one turn is allowed to run.
//
// A room is never silent, and this floor is what keeps the room's own noise out of the talk: a fan,
// a door, a passing voice from another room all sit under it, and a turn of the person's own rises
// above it. It is kept low enough that a soft-spoken turn still opens one — and what keeps a sound
// that never really stood out of the talk is the length below.
const EARS_LEVEL = 0.02;
const EARS_END_MS = 1200;
const EARS_MAX_MS = 20000;
// the least sound above the floor that a turn of speech runs: a tap, a cough or a door is not one
const EARS_MIN_MS = 350;
// the rate the app's own ears are handed the turn in
const EARS_RATE = 16000;
// A turn he has taken and never answered: the wait is given up on and the call moves on rather than
// sitting on a voice that has gone quiet. It is kept short on purpose — an answer that has not begun
// by this long is not on its way, and waiting longer only leaves the person watching a working line
// instead of hearing a reply.
const ANSWER_GUARD_MS = 7000;

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

/** The sound he spoke, as samples the phone's own audio can play. */
function pcmToFloat(bytes) {
  const n = bytes.byteLength >> 1;
  const view = new DataView(bytes.buffer, bytes.byteOffset, n * 2);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) out[i] = view.getInt16(i * 2, true) / 32768;
  return out;
}

export default class CartesiaCall {
  constructor(handlers = {}) {
    this.h = handlers;
    this.ws = null;
    this.ctx = null;
    // the capture runs on its own context, started at the rate the session asked for
    this.capture = null;
    this.stream = null;
    this.source = null;
    this.processor = null;
    this.sink = null;
    this.ready = false;
    this.calling = false;
    this.speaking = false;
    this.closing = false;
    this.playHead = 0;
    this.sources = [];
    this.endTimer = null;
    this.micLevel = 0;
    this.callId = "";
    // the person's turn as the app's own ears keep it while it is being said
    this.earsOn = false;
    this.earsFrames = [];
    this.earsAt = 0;
    this.earsHeardAt = 0;
    // how much of that turn really stood above the room's own floor: a capture shorter than the least
    // a turn of speech runs is not a turn at all
    this.earsVoiced = 0;
    // the wait for an answer he has taken but never given
    this.answerGuard = null;
    // The turn being answered right now, and the last answer already counted: the service numbers
    // every turn — the person's and his — in one strictly increasing line, so a number that has
    // already been counted is never counted a second time.
    this.turn = 0;
    this.countedTurn = 0;
    // the person's own turn: the number it was given, and whether it has been heard out in full.
    // An answer is counted only for a turn of theirs that was heard through, so the greeting he
    // opens with, and anything he says on his own, is his own and never counts.
    this.userTurn = 0;
    this.userHeard = false;
    // whether his answer is still open — the service has not closed its turn yet
    this.answerOpen = false;
    // his answer as it is being written, kept while it arrives
    this.draft = "";
    // what the session reports itself ready with, while it is still being opened
    this.opened = null;
  }

  get connected() {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  get micOn() {
    return !!this.stream;
  }

  level() {
    return this.calling ? this.micLevel : 0;
  }

  async open({ stream, token, agentId, audio }) {
    this.stream = stream || null;
    this.closing = false;
    this.h.onStatus?.("connecting");

    // the sound the tap that began the call already started: a context the phone is still holding
    // plays nothing at all, so the one the tap started is the one used here. It is the app's own and
    // it outlives the call: it is never closed here, so the voice standing down can never leave the
    // next voice playing into a sound that is already going away
    this.ctx = audio || primedAudio() || new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === "suspended") {
      // never block the connection on this — the tap that started it resumes playback
      this.ctx.resume().catch(() => {});
    }

    const url =
      `wss://api.cartesia.ai/v1/agents/websocket/${encodeURIComponent(agentId)}` +
      `?cartesia_version=${VERSION}&access_token=${encodeURIComponent(token)}`;

    await new Promise((resolve, reject) => {
      let settled = false;
      const ws = new WebSocket(url);
      this.ws = ws;

      const settle = (err) => {
        if (settled) return;
        settled = true;
        this.opened = null;
        clearTimeout(timer);
        if (err) reject(err);
        else resolve();
      };
      this.opened = () => settle(null);

      // never leave the button stuck on "Connecting"
      const timer = setTimeout(() => {
        try {
          ws.close();
        } catch (err) {
          // socket already gone
        }
        settle(new Error("Cartesia AI didn't answer in time. Please try again."));
      }, OPEN_MS);

      ws.onopen = () => {
        // the session is described first and nothing else is sent before it: the service closes
        // the connection when any other event arrives first
        ws.send(
          JSON.stringify({
            type: "session_create",
            audio: { input_format: "pcm_44100", output_delivery: "speaking_pace" },
          })
        );
      };
      ws.onmessage = (event) => this.handleMessage(event);
      ws.onerror = () => settle(new Error("Cartesia AI could not be reached."));
      ws.onclose = (event) => {
        // a session that never opened is written down for what it was, so the reason is never left
        // to be guessed at
        if (!this.ready) {
          settle(new Error("Cartesia AI could not be reached."));
          return;
        }
        console.error("The Cartesia call closed:", event?.code, event?.reason || "");
        this.teardown();
        // a call this app ended itself is not reported: only one the service ended
        if (!this.closing) this.h.onStatus?.("closed");
      };
    });

    // the microphone starts only once the session can take its sound
    await this.startMic();
    // A session the service closed as it opened is not a call: it is said plainly here, so the voice
    // is passed over and the ring moves on to the next one, instead of a call nobody can hear being
    // shown as live and never taking its turn.
    if (!this.connected) throw new Error("Cartesia AI could not be reached.");
    this.calling = true;
    this.h.onStatus?.("live");
    return true;
  }

  handleMessage(event) {
    if (typeof event.data !== "string") return;
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch (err) {
      return;
    }

    if (msg.type === "session_ready") {
      this.ready = true;
      this.callId = msg.call_id || "";
      this.opened?.();
      return;
    }

    if (msg.type === "audio_output") {
      // his voice has arrived: the wait for an answer he never gave is called off
      this.clearAnswerGuard();
      this.play(msg.audio);
      return;
    }

    // the person has started speaking: whatever of his answer is still queued is dropped at once
    if (msg.type === "audio_output_clear") {
      this.stopPlayback();
      return;
    }

    if (msg.type === "turn_started") {
      // the person's own turn: an answer given after it is an answer to them. The turn is theirs from
      // the moment the service reports it, so the answer that follows is counted even where the
      // service never closes the turn it opened — a turn nobody closed is still a turn of theirs.
      if (msg.role === "user") {
        if (typeof msg.turn === "number") this.userTurn = Math.max(this.userTurn, msg.turn);
        this.userHeard = true;
        return;
      }
      // he has taken the turn and is working on it
      this.h.onThinking?.(true);
      if (typeof msg.turn === "number") this.turn = msg.turn;
      this.draft = "";
      // his answer stays open until the service closes its turn, or until his voice has drained
      this.answerOpen = true;
      // and it is waited on: a turn taken and never answered is given up on rather than left standing
      this.armAnswerGuard();
      // The answer is counted here, the moment he takes the turn that follows the person's own: it
      // is the one report every answer carries, so a voice whose turns the service never closes —
      // or whose voice is still sounding when the call is handed on — is still counted.
      this.countAnswer(this.turn);
      return;
    }

    // his answer as it is being written, kept while it arrives: the line is whole even where the
    // service closes the turn without carrying the text along with it
    if (msg.type === "turn_output_text_delta") {
      if (msg.role === "assistant" && msg.text) {
        // he is answering: the wait is called off
        this.clearAnswerGuard();
        this.draft += msg.text;
      }
      return;
    }

    if (msg.type === "turn_ended") {
      // the turn closed, his or the person's: nothing is left waiting on an answer from it
      this.clearAnswerGuard();
      if (msg.role === "user") {
        if (typeof msg.turn === "number") this.userTurn = Math.max(this.userTurn, msg.turn);
        // the person's turn is heard out in full: an answer to it may be counted from here on
        this.userHeard = true;
        // What the person said is written down by the app's own ears and never by the call's own
        // service: the words shown on the screen are the app's one reading of the turn, the same
        // reading every other voice feature is handed. The service's turn says only that it ended,
        // and the turn is written down from here at once rather than waiting on the quiet.
        if (this.earsOn) this.readTurn();
        // his answer is being worked out now
        this.h.onThinking?.(true);
        return;
      }
      // the turn the service closed is the one being counted, and the wait for his voice to drain
      // is called off with it so the same answer is never counted twice
      const text = String(msg.text || this.draft || "").trim();
      this.draft = "";
      if (typeof msg.turn === "number") this.turn = msg.turn;
      this.answerOpen = false;
      this.h.onThinking?.(false);
      if (text) this.h.onAgentText?.(text);
      // One answer given. A turn the service closes is counted here whether or not it carried the
      // words along with it — the answer was heard either way.
      this.countAnswer(this.turn);
      return;
    }

    if (msg.type === "error") {
      // a recoverable error is the service's own: it ignores that event and the call carries on
      if (msg.fatal) {
        this.h.onError?.(msg.message || "Cartesia AI's call ran into a problem.");
      } else {
        console.error("Cartesia AI reported:", msg.code, msg.message);
      }
    }
  }

  /**
   * One answer given. An answer is counted for the person's own turn that it answers, whichever of
   * the service's reports carries it here — the turn he takes, the text he writes, or his voice
   * finishing — and the same answer is never counted twice. The person's turn must have been heard
   * out first, so anything he says on his own, the greeting included, is his own and never counts.
   */
  countAnswer(turn) {
    if (!this.userHeard) return;
    const n = typeof turn === "number" && turn > 0 ? turn : 0;
    if (n && n === this.countedTurn) return;
    this.userHeard = false;
    if (n) this.countedTurn = n;
    this.h.onAnswered?.();
  }

  /** His voice has drained with the turn still open: it is an answer given all the same. */
  finishAnswer() {
    if (!this.answerOpen) return;
    this.answerOpen = false;
    this.countAnswer(this.turn);
  }

  /**
   * A turn he has taken is waited on. The wait runs from the moment he takes it, so a voice that
   * never comes back — a session gone quiet, an agent that dropped the turn — is reported plainly
   * instead of the call sitting there looking live with nothing ever said.
   */
  armAnswerGuard() {
    clearTimeout(this.answerGuard);
    this.answerGuard = setTimeout(() => {
      this.answerGuard = null;
      this.h.onNoAnswer?.();
    }, ANSWER_GUARD_MS);
  }

  clearAnswerGuard() {
    clearTimeout(this.answerGuard);
    this.answerGuard = null;
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
   * The microphone: the sound is sent as it is captured, silence included, since a steady stream is
   * what keeps the session open and the service itself decides where the person's turn ends.
   */
  async startMic() {
    if (!this.stream) return;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    try {
      this.capture = new Ctor({ sampleRate: RATE });
    } catch (err) {
      // a phone that will not open a context at that rate records at its own and it is
      // resampled on the way out
      this.capture = new Ctor();
    }
    if (this.capture.state === "suspended") this.capture.resume().catch(() => {});
    const rate = this.capture.sampleRate || RATE;

    this.source = this.capture.createMediaStreamSource(this.stream);
    this.processor = this.capture.createScriptProcessor(CHUNK, 1, 1);
    this.processor.onaudioprocess = (event) => {
      if (!this.connected) return;
      const chunk = event.inputBuffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < chunk.length; i += 1) sum += chunk[i] * chunk[i];
      this.micLevel = Math.min(1, Math.sqrt(sum / chunk.length) * 3.5);

      const sound = rate === RATE ? chunk : resample(chunk, rate, RATE);
      const pcm = floatToPcm16(sound);
      if (!pcm.length) return;
      this.send({ type: "audio_input", audio: bytesToBase64(new Uint8Array(pcm.buffer)) });
      // the same sound is what the app's own ears read the turn from
      this.hold(chunk);
    };

    // keep the processor alive without playing the microphone back
    this.sink = this.capture.createGain();
    this.sink.gain.value = 0;
    this.source.connect(this.processor);
    this.processor.connect(this.sink);
    this.sink.connect(this.capture.destination);
  }

  /**
   * The person's turn, kept while it is being said, so the app's own ears can write it down. Only
   * sound above the floor opens a turn, and nothing is kept while his voice is playing: the
   * microphone is open then, and what it hears is his own voice coming back out of the speaker.
   */
  hold(chunk) {
    const now = performance.now();
    if (this.speaking) {
      this.earsOn = false;
      this.earsFrames = [];
      this.earsVoiced = 0;
      return;
    }

    const loud = this.micLevel > EARS_LEVEL;
    if (loud) {
      this.earsHeardAt = now;
      this.earsVoiced += chunk.length;
    }
    if (!this.earsOn) {
      if (!loud) return;
      this.earsOn = true;
      this.earsAt = now;
      this.earsFrames = [];
      this.earsVoiced = chunk.length;
    }
    // the sound arrives in chunks the audio system reuses, so the turn is kept as its own copy
    this.earsFrames.push(chunk.slice());

    // a turn is over once a breath of quiet has passed, or once it has run longer than one turn is
    // allowed to — watched from here, since this is where the sound arrives
    if (now - this.earsHeardAt >= EARS_END_MS || now - this.earsAt >= EARS_MAX_MS) this.readTurn();
  }

  /**
   * The turn is over, so the app's own ears write it down. What comes back is the person's turn as
   * the screen shows it and as the answer is given to them — one reading, in one hand, the same one
   * every other voice feature is handed. A turn the ears could not read never stops the talk: it is
   * simply asked for again, and no other service writes down what the person said.
   */
  async readTurn() {
    if (!this.earsOn) return;
    const frames = this.earsFrames;
    const at = this.capture?.sampleRate || RATE;
    const total = frames.reduce((count, frame) => count + frame.length, 0);
    const voiced = (this.earsVoiced / at) * 1000;
    this.earsOn = false;
    this.earsFrames = [];
    this.earsVoiced = 0;

    // A tap, a cough, a door, a breath of the room: the sound never really stood above the floor, so
    // there is no turn here at all and nothing is written down from it. This is what keeps a line
    // nobody said from ever standing on the screen as the person's own.
    if (voiced < EARS_MIN_MS) return;

    const joined = new Float32Array(total);
    let put = 0;
    frames.forEach((frame) => {
      joined.set(frame, put);
      put += frame.length;
    });

    let res;
    try {
      res = await base44.functions.invoke("helperListen", {
        audio: bytesToBase64(wavBytes(floatToPcm16(resample(joined, at, EARS_RATE)), EARS_RATE)),
      });
    } catch (err) {
      this.h.onReask?.("Didn't catch that — say it again.");
      return;
    }

    const text = String(res?.data?.text || "").trim();
    if (!text) {
      this.h.onReask?.("Didn't catch that — say it again.");
      return;
    }
    this.h.onReask?.("");
    this.h.onUserText?.(text);
  }

  /** His answer, played as it arrives: each piece follows the one before it without a seam. */
  play(b64) {
    const ctx = this.ctx;
    if (!ctx || ctx.state === "closed" || !b64) return;
    const samples = pcmToFloat(b64ToBytes(b64));
    if (!samples.length) return;

    const buffer = ctx.createBuffer(1, samples.length, RATE);
    buffer.copyToChannel(samples, 0);

    const node = ctx.createBufferSource();
    node.buffer = buffer;
    node.connect(ctx.destination);

    const now = ctx.currentTime;
    if (this.playHead < now + 0.05) this.playHead = now + 0.05;
    node.start(this.playHead);
    this.playHead += buffer.duration;
    this.sources.push(node);
    node.onended = () => {
      this.sources = this.sources.filter((s) => s !== node);
    };

    // he is heard from the moment his voice actually begins: from here his answer is open, so one
    // whose turn the service never closes is still counted once its voice has drained
    if (!this.speaking) {
      this.speaking = true;
      this.answerOpen = true;
      this.h.onAgentAudioStart?.();
    }

    // a piece always puts the end off: his turn is over only once a breath has passed with nothing
    // more arriving
    clearTimeout(this.endTimer);
    const remainingMs = Math.max(0, (this.playHead - ctx.currentTime) * 1000) + ANSWER_GAP_MS;
    this.endTimer = setTimeout(() => {
      if (!this.speaking) return;
      this.speaking = false;
      // the answer is counted before its voice is reported drained, so a change the count asks for
      // is sent by that same report and never waits on the next answer's
      this.finishAnswer();
      this.h.onAgentAudioEnd?.();
    }, remainingMs);
  }

  stopPlayback() {
    clearTimeout(this.endTimer);
    this.endTimer = null;
    const wasSpeaking = this.speaking;
    this.speaking = false;
    this.sources.forEach((node) => {
      try {
        node.stop();
      } catch (err) {
        // already finished
      }
    });
    this.sources = [];
    this.playHead = 0;
    if (wasSpeaking) {
      // the person spoke over him: the answer was still given and is counted as one, counted before
      // its voice is reported drained so that report carries the change it asked for
      this.finishAnswer();
      this.h.onAgentAudioEnd?.();
    }
  }

  teardown() {
    this.calling = false;
    this.ready = false;
    this.earsOn = false;
    this.earsFrames = [];
    this.earsVoiced = 0;
    this.clearAnswerGuard();
    this.stopPlayback();
    [this.processor, this.source, this.sink].forEach((node) => {
      if (!node) return;
      try {
        node.disconnect();
      } catch (err) {
        // already detached
      }
    });
    this.processor = null;
    this.source = null;
    this.sink = null;
    if (this.capture && this.capture.state !== "closed") this.capture.close().catch(() => {});
    this.capture = null;
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.micLevel = 0;
    // the sound belongs to the app and is never closed here, so the voice standing down can never
    // leave the next voice playing into a sound that is already going away
    this.ctx = null;
    this.speaking = false;
  }

  async stop() {
    this.closing = true;
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      try {
        ws.close(1000, "session completed");
      } catch (err) {
        // socket already gone
      }
    }
    this.teardown();
  }
}