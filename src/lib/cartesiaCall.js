import { primedAudio } from "@/lib/audioUnlock";
import { bytesToBase64, floatToPcm16, resample } from "@/lib/pcmAudio";

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
    // The turn being answered right now, and the turns already counted. The service numbers every
    // turn — the person's and his — in one strictly increasing line, so those numbers say which
    // answers were given to the person, and no turn is ever counted twice.
    this.turn = 0;
    this.countedTurn = 0;
    // the person's own turns: the one they spoke last, and the one already answered
    this.userTurn = 0;
    this.answerTurn = 0;
    // whether the person has spoken at all, for a line that carries no turn numbering
    this.personTurned = false;
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

  async open({ stream, token, agentId }) {
    this.stream = stream || null;
    this.closing = false;
    this.h.onStatus?.("connecting");

    // the sound the tap that began the call already started: a context the phone is still holding
    // plays nothing at all, so the one the tap started is the one used here
    this.ctx = primedAudio() || new (window.AudioContext || window.webkitAudioContext)();
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
      this.play(msg.audio);
      return;
    }

    // the person has started speaking: whatever of his answer is still queued is dropped at once
    if (msg.type === "audio_output_clear") {
      this.stopPlayback();
      return;
    }

    if (msg.type === "turn_started") {
      // the person's own turn: an answer given on a later turn is an answer to them
      if (msg.role === "user") {
        this.personTurned = true;
        if (typeof msg.turn === "number") this.userTurn = Math.max(this.userTurn, msg.turn);
        return;
      }
      // he has taken the turn and is working on it
      this.h.onThinking?.(true);
      if (typeof msg.turn === "number") this.turn = msg.turn;
      this.draft = "";
      // his answer stays open until the service closes its turn, or until his voice has drained
      this.answerOpen = true;
      return;
    }

    // his answer as it is being written, kept while it arrives: the line is whole even where the
    // service closes the turn without carrying the text along with it
    if (msg.type === "turn_output_text_delta") {
      if (msg.role === "assistant" && msg.text) this.draft += msg.text;
      return;
    }

    if (msg.type === "turn_ended") {
      if (msg.role === "user") {
        this.personTurned = true;
        if (typeof msg.turn === "number") this.userTurn = Math.max(this.userTurn, msg.turn);
        const said = String(msg.text || "").trim();
        if (said) this.h.onUserText?.(said);
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
   * One answer given, counted against the turn it answered. The service numbers every turn — the
   * person's and his — in one strictly increasing line, so an answer counts for the person's turn
   * it follows and for that turn only: the greeting he opens with, and anything he says on his own,
   * is his own and never counts. A turn whose end is reported more than once — and the same turn's
   * voice draining after it — is still one answer.
   */
  countAnswer(turn) {
    const n = typeof turn === "number" && turn > 0 ? turn : this.countedTurn + 1;
    if (n <= this.countedTurn) return;
    if (this.userTurn) {
      if (this.userTurn >= n || this.userTurn <= this.answerTurn) return;
      this.answerTurn = this.userTurn;
    } else if (!this.personTurned) {
      // a line that carries no turn numbering at all: only an answer following the person's turn
      return;
    }
    this.personTurned = false;
    this.countedTurn = n;
    this.h.onAnswered?.();
  }

  /** His voice has drained with the turn still open: it is an answer given all the same. */
  finishAnswer() {
    if (!this.answerOpen) return;
    this.answerOpen = false;
    this.countAnswer(this.turn);
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
    };

    // keep the processor alive without playing the microphone back
    this.sink = this.capture.createGain();
    this.sink.gain.value = 0;
    this.source.connect(this.processor);
    this.processor.connect(this.sink);
    this.sink.connect(this.capture.destination);
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
    if (this.ctx && this.ctx.state !== "closed") this.ctx.close().catch(() => {});
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