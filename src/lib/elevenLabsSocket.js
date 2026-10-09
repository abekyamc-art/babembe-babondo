import { base44 } from "@/api/base44Client";
import { isRepeatIntro } from "@/lib/agentMemory";
import { contextBlocks } from "@/lib/contextBlocks";
import { primedAudio, primeAudio, resumeAudioOnTouch } from "@/lib/audioUnlock";
import { claimMic, micMessage } from "@/lib/micAccess";

const IN_RATE = 16000;
// The capture is lifted before it is sent, so ordinary speech at arm's length arrives as loud
// as speech close to the phone. The lift is kept gentle: a capture squashed flat loses the
// shape of the words, and the hearing service works the letters out from that shape.
const MIC_GAIN = 1.6;
// his first words after the person's turn wait only this long, so his answer begins
// as soon as the words he was just handed have landed
const BEAT_MS = 300;
// once his voice has drained, this much quiet ends his turn: a breath between two
// chunks of the same answer is not the end of it, so the microphone stays closed
// instead of opening onto his own voice
const ANSWER_GAP_MS = 700;
const OPEN_QUIET_MS = 20000;
// once his answer has finished, this much quiet ends the call, so the person can
// start it again whenever they are ready
const CLOSE_QUIET_MS = 15000;
// a turn that gets no answer is put to him once more after this long, and if it is
// still unanswered this much later, the call closes as it always has — the question
// is kept for the next call
const RECOVER_MS = 15000;
const GIVE_UP_MS = 45000;
// A soft voice at arm's length is a turn as much as a loud one, and no two phones report the same
// voice the same way, so the bar for hearing one is set low: what is captured is only ever read
// once it has been written down, and a sound with no words in it comes back empty and is dropped.
const VOICE_LEVEL = 0.012;
// a session that carries on is held from speaking until the person takes their
// turn; this is the longest that hold can last if nothing releases it
const HOLD_MAX_MS = 15000;
// a written session has no microphone to listen to: it hangs up a few seconds after
// the written answer has landed, or once it has waited long enough for one to arrive
const WRITTEN_CLOSE_MS = 5000;
const WRITTEN_WAIT_MS = 25000;
// Where the app's own ears do the listening, a turn runs from the first sound heard until this
// much quiet has passed, and is never kept longer than one turn is allowed to run.
const TURN_END_MS = 1000;
const TURN_MAX_MS = 30000;
// how long the sound is given to start before the person is asked to touch the screen for it
const START_WAIT_MS = 1500;
// The app's own ears are given this long to write a turn down, and they are given it generously: a
// Kibembe turn read properly is worth the wait, so the reading is allowed to take its time rather
// than being cut short into a guess at another language. Ears that hang longer than this are ears
// the call does without: the AI hears the person itself rather than the conversation sitting in
// silence.
const HEAR_MS = 20000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

/** A held turn as a WAV file, so the app's own ears can open it. */
function wavBytes(samples, rate) {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const tag = (at, text) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(at + i, text.charCodeAt(i));
  };
  tag(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  tag(8, "WAVE");
  tag(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  tag(36, "data");
  view.setUint32(40, samples.length * 2, true);
  const pcm = new DataView(bytes.buffer, 44);
  for (let i = 0; i < samples.length; i += 1) pcm.setInt16(i * 2, samples[i], true);
  return bytes;
}

/**
 * The captured signal, lifted: quiet speech at arm's length comes up to the loudness of
 * speech at the phone, while tanh rounds off the loudest peaks instead of clipping them,
 * so a shout is still understood.
 */
function lift(samples) {
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) out[i] = Math.tanh(samples[i] * MIC_GAIN);
  return out;
}

/**
 * The microphone's own rate down to the rate the service listens at. Every output sample is the
 * mean of the sound it spans rather than one point of it: a downsample that reads single points
 * folds everything above the new rate back into the words, and the hearing service reads those
 * folds as letters that were never said.
 */
function resample(input, fromRate, toRate) {
  if (!input.length || fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const len = Math.floor(input.length / ratio);
  if (len < 1) return new Float32Array(0);
  const span = Math.max(1, Math.round(ratio));
  const out = new Float32Array(len);
  for (let i = 0; i < len; i += 1) {
    const at = Math.min(Math.round(i * ratio), input.length - 1);
    const end = Math.min(at + span, input.length);
    let sum = 0;
    for (let pos = at; pos < end; pos += 1) sum += input[pos];
    out[i] = sum / (end - at);
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
    // the app's own Ebembe words, handed to the hearing service as the call opens
    this.keywords = [];
    // carrying on: nothing is heard from him until the person takes their turn
    this.holdQuiet = false;
    this.holdTimer = null;
    // the breath before his answer: when the person's turn ended, and whether the
    // answer to it is still waiting to take it
    this.turnAt = 0;
    this.beatDue = false;
    this.voiceTimer = null;
    // the turn waiting for its answer: what was said, and whether it has already been
    // put to him a second time
    this.lastUserText = "";
    this.recovered = false;
    // a question carried over from the last call is being answered now: nothing is held
    this.resuming = false;
    // the app's own ears: the sound of the person's turn is kept here and written down, and
    // nothing of it is spoken into the session itself
    this.ears = false;
    this.captureOn = false;
    this.captureFrom = 0;
    this.captureFrames = [];
    this.hearing = false;
    this.reviewPending = false;
    // turns in a row the app's own ears could make nothing of
    this.misses = 0;
    // whether the reason the cleanup is unavailable has already been said in this call
    this.cleanupNoted = false;
    // a helper session is asked again on the next turn, so it is never hung up on its own
    this.keepOpen = false;
    // while the phone is holding the sound back, this waits for the touch that starts it
    this.offTouch = null;
  }

  get connected() {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // a written session never opened the microphone, so it can't carry a spoken call
  get micOn() {
    return !!this.stream;
  }

  /**
   * Whether the person has taken their turn in this call. Nothing he says counts before then: the
   * talk is the person's to open, so a greeting — or any other turn nobody asked for — is neither
   * heard nor shown, and it is never counted as an answer.
   */
  get engaged() {
    return this.userSpoke || this.resuming;
  }

  async open({ withMic, silent, memory, laterTurn, resuming, account, ears, keepOpen, audio } = {}) {
    // a written message is answered in writing: no microphone, nothing on the speaker
    this.silent = !withMic && !!silent;
    // the app's own ears listen for this call: the sound stays on the phone and is written
    // down by the helper, and the words it comes back with are what goes into the session
    this.ears = !!ears && withMic;
    this.keepOpen = !!keepOpen;
    this.laterTurn = !!laterTurn;
    this.resuming = !!resuming;
    // which ElevenLabs account answers: "second" is the account Base44 mode's spoken call runs on,
    // "third" is Mbondo's own, "fourth" is Sadiki's own; every other call keeps the standing account
    this.account = account || "";
    // Nothing he says before the person has taken their turn is heard or shown: the session is
    // held quiet from the moment it opens, so a greeting nobody asked for never reaches their ears
    // or their screen. A question carried over from the last call is answered aloud straight away,
    // since that one was asked; it is never held.
    this.holdQuiet = !this.resuming;
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
    // nothing of the last session rides into this one: no turn, no stale breath
    this.setAwaiting(false);
    this.cleanupNoted = false;
    this.lastUserText = "";
    this.turnAt = 0;
    this.beatDue = false;
    this.recovered = false;
    this.h.onStatus?.("connecting");

    // The call runs on the sound the tap that began it already started: a context the phone is
    // still holding runs nothing at all — not his voice, and not the microphone's own capture — so
    // the one the tap started is the one used here. That context is the app's own and it outlives
    // the call: a voice never closes it, so the voice standing down can never leave the voice that
    // follows it playing its answer into a context that is already going away, which is heard as
    // noise instead of speech.
    this.ctx =
      audio || primedAudio() || primeAudio() || new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === "suspended") {
      // never block the connection on this — the tap that started it resumes playback
      this.ctx.resume().catch(() => {});
    }

    if (withMic) {
      // the microphone the tap opened is the one this call listens through; where the tap could
      // not open one it is opened here, and what went wrong is said for what it actually was
      try {
        this.stream = await claimMic();
      } catch (err) {
        throw new Error(micMessage(err));
      }
    }

    const res = await base44.functions.invoke("elevenLabsSession", { account: this.account });
    const signedUrl = res?.data?.signed_url;
    if (!signedUrl) {
      throw new Error(res?.data?.error || "Your agent could not be reached.");
    }
    this.intro = res.data.intro || "";
    this.keywords = Array.isArray(res.data.asr_keywords) ? res.data.asr_keywords : [];
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
        const overrides = {};
        const spoken = {};
        if (this.laterTurn && canMuteIntro) spoken.first_message = "";
        // His own language setting is left exactly as the admin gave it. The person's turn is written
        // down by the app's own ears and handed to him as words, so nothing about the call has to be
        // switched for him to hear them — and switching it made him read the person's Kibembe as some
        // other language and answer something they never said.
        if (Object.keys(spoken).length) overrides.agent = spoken;
        // The admin's saved words ride with the call, so the hearing service comes back with
        // the person's own Ebembe words instead of the English ones they nearly sound like.
        if (this.keywords.length) overrides.asr = { keywords: this.keywords };
        if (Object.keys(overrides).length) init.conversation_config_override = overrides;
        this.send(init);
        if (memory) this.sendMemory(memory);
        settle(resolve);
      };
      ws.onerror = () => {
        if (!opened) settle(reject, new Error("Could not connect to your agent."));
      };
      ws.onclose = (event) => {
        if (!opened) {
          settle(reject, new Error("Could not connect to your agent."));
          return;
        }
        // a session that dies before it is ever answered is written down for what it was, so the
        // reason is never left to be guessed at
        console.error("The voice session closed:", event?.code, event?.reason || "");
        this.teardown();
        if (!this.closing) this.h.onStatus?.("closed");
      };
    });

    // the sound is made sure of before the call is called live, so a phone that is holding it back
    // is said plainly instead of the answer going out into a sound that plays nothing
    if (this.ctx.state === "suspended") {
      await Promise.race([this.ctx.resume().catch(() => {}), wait(START_WAIT_MS)]);
    }
    // the microphone is listening before the call is called live, so a phone that cannot start it
    // says so plainly instead of leaving a call that hears nothing
    if (withMic) await this.startMic();
    if (this.silent) this.watchWritten();
    // A session the service closed the moment it opened — an account that refused it, a plan that is
    // out, settings it took back — is not a call at all. It is said plainly here, so the voice is
    // passed over and the ring moves on to the next one, instead of a call nobody can hear being
    // shown as live and never taking its turn.
    if (!this.connected) throw new Error("Your agent could not be reached.");
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
    this.lastUserText = text;
    this.turnAt = performance.now();
    this.recovered = false;
    // a fresh message is its own turn, so its answer is its own to spend
    this.answered = false;
    this.spent = false;
    this.releaseQuiet();
    const sent = this.send({ type: "user_message", text });
    if (sent) this.setAwaiting(true);
    return sent;
  }

  setReviewPending(pending) {
    this.reviewPending = pending;
    this.captureOn = false;
    this.captureFrames = [];
    this.lastUserText = "";
    this.lastVoiceAt = performance.now();
    if (pending) this.setAwaiting(false);
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
    // a written exchange is answered on screen, so its wait ends with the words; a
    // spoken one keeps showing him working until his voice is heard
    if (this.silent) this.setAwaiting(false);
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
      // a voice that has not been asked for stays out of the room altogether: until the person has
      // taken their turn nothing he says is played — not even silently — so an unasked greeting is
      // never heard, never shown, and never counted as an answer
      if (chunk && this.engaged) {
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
        this.recovered = false;
        this.lastUserText = text;
        this.beatDue = true;
        this.releaseQuiet();
        // he is working on this turn until his voice is actually heard
        this.setAwaiting(true);
        this.h.onUserText?.(text);
      }
      return;
    }

    if (msg.type === "agent_response" || msg.type === "agent_response_correction") {
      const text =
        msg.agent_response_event?.agent_response ||
        msg.agent_response_correction_event?.corrected_agent_response;
      if (text) {
        // nothing he writes before the person has taken their turn is shown: an unasked greeting
        // is not a reply to anything, and the first turn of the talk is the person's own
        if (!this.engaged) return;
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
      // while his voice is playing the microphone is closed, so nothing of the
      // person's has been sent: an interruption in this moment can only be his own
      // voice coming back out of the phone, and it must never cut his answer short
      if (this.speaking) return;
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

  /**
   * The microphone starts here. The capture below runs only on a sound context the phone has
   * actually started, so the sound is given its moment to start first; where the phone still holds
   * it back, the call says so and starts listening on the person's next touch, which is the one
   * thing that starts it.
   */
  async startMic() {
    if (!this.stream) throw new Error(micMessage(null));
    if (!this.ctx) {
      this.ctx = primedAudio() || new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      await Promise.race([this.ctx.resume().catch(() => {}), wait(START_WAIT_MS)]);
    }

    this.source = this.ctx.createMediaStreamSource(this.stream);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.levelBuf = new Uint8Array(this.analyser.fftSize);
    this.source.connect(this.analyser);

    this.processor = this.ctx.createScriptProcessor(2048, 1, 1);
    this.processor.onaudioprocess = (event) => {
      // the mic stays closed while the assistant speaks, so its own voice coming out
      // of the phone can never be sent back as an interruption of that answer
      if (!this.connected || this.speaking || this.reviewPending || this.hearing) return;
      const chunk = event.inputBuffer.getChannelData(0);
      const pcm = floatToPcmBytes(lift(resample(chunk, this.ctx.sampleRate, IN_RATE)));
      if (!pcm.length) return;
      // with the app's own ears listening, the sound of the turn stays on the phone until it
      // has been written down: he is handed the words, never the room
      if (this.ears) {
        this.hold(new Int16Array(pcm.buffer, pcm.byteOffset, pcm.byteLength >> 1));
        return;
      }
      this.send({ user_audio_chunk: bytesToB64(pcm) });
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
    this.captureOn = false;
    this.captureFrames = [];
    this.watch();

    // the phone's hold on the sound: nothing above is heard until it is started, and a touch is
    // what starts it
    if (this.ctx.state !== "running") {
      this.h.onReask?.("Touch the screen and he'll start listening.");
      this.offTouch = resumeAudioOnTouch(() => this.h.onReask?.(""));
    }
  }

  /**
   * The person's turn, kept while it is being said. Nothing is kept until a voice is actually
   * heard, so the quiet of an idle room is never sent anywhere to be read.
   */
  hold(samples) {
    if (!this.captureOn) {
      if (this.level() <= VOICE_LEVEL) return;
      this.captureOn = true;
      this.captureFrom = performance.now();
      this.captureFrames = [];
      // the turn being said now is the one an answer is coming for, so nothing carried over
      // from the turn before it can be taken for it
      this.lastUserText = "";
    }
    this.captureFrames.push(samples);
  }

  /**
   * The turn is over, so it is written down: the room is taken out of the sound first — the noise
   * cleanup keeps only the voice in it — and what is left goes to the app's own ears. The words
   * that come back, with the language they were spoken in, are handed to whoever answers; those
   * words are what is put into the session, so the answer is spoken and the room itself is never
   * listened to, nor answered as though the person had asked something.
   */
  async readTurn() {
    // one turn is written down at a time: a person who begins again while the turn before is still
    // being read is one turn behind and never a second one, so the same words are never put to the AI
    // twice and never counted as two turns
    if (!this.captureOn || this.hearing) return;
    const frames = this.captureFrames;
    this.captureOn = false;
    this.captureFrames = [];
    const total = frames.reduce((count, frame) => count + frame.length, 0);
    // a tap, a cough or a door is not a turn
    if (total < IN_RATE * 0.4) return;

    const samples = new Int16Array(total);
    let at = 0;
    frames.forEach((frame) => {
      samples.set(frame, at);
      at += frame.length;
    });

    this.hearing = true;
    this.setAwaiting(true);
    try {
      const res = await Promise.race([
        base44.functions.invoke("helperListen", {
          audio: bytesToB64(wavBytes(samples, IN_RATE)),
        }),
        wait(HEAR_MS).then(() => null),
      ]);
      // the ears never answered: the AI hears the person itself from here on, so a service that
      // hangs can never leave the call silent
      if (!res) {
        this.fallbackToOwnEars();
        return;
      }
      const text = String(res?.data?.text || "").trim();
      const language = String(res?.data?.language || "").trim();
      // the cleanup could not be made this time: the turn was read exactly as it was before it,
      // and the reason is said once in this call so nobody is left wondering whether the room is
      // being cleaned at all
      const cleanup = String(res?.data?.cleanup || "").trim();
      if (cleanup && !this.cleanupNoted) {
        this.cleanupNoted = true;
        // The room cleanup is a helper and not the call: where it cannot be made, the turn is read
        // exactly as it always was. That is said once on the line under the conversation and never as
        // an error — an error raised here stayed on the screen for the rest of the call and hid the
        // line the call itself says ("say it again", "tap the phone to continue", whose turn is
        // next), which is what left a talk voice looking as though it had gone dead.
        this.h.onReask?.(cleanup);
      }
      // nothing was said — or what was said carried no word — so there is nothing to put to him:
      // the turn is said plainly instead of the call going quiet on it, and the microphone stays
      // open so the person can simply say it again
      if (!text) {
        // One turn the ears could make nothing of is simply said again. Ears that cannot read two
        // turns running are ears this call does without: the AI hears the person itself, so a turn
        // is never lost to ears that cannot read it.
        this.misses += 1;
        this.setAwaiting(false);
        if (this.misses < 2) {
          this.h.onReask?.("Didn't catch that — say it again.");
          return;
        }
        this.fallbackToOwnEars();
        return;
      }
      this.misses = 0;
      await this.h.onHeard?.(text, language, this);
    } catch (err) {
      // The app's own ears could not read the turn at all — a key they are not allowed to use, a
      // service that cannot answer — so the listening is handed to the AI itself rather than the
      // conversation going silent over ears that cannot hear.
      console.error("The ears could not read the turn:", err?.response?.data?.error || err?.message);
      this.fallbackToOwnEars();
    } finally {
      this.hearing = false;
    }
  }

  /**
   * The app's own ears cannot read this conversation, so the AI hears the person itself from here
   * on: the sound of a turn goes straight into the session instead of being written down on the
   * phone first. The turn that was lost can never be brought back, so the person is told plainly and
   * asked to say it once more — and the error line is cleared, since nothing is wrong any more.
   */
  fallbackToOwnEars() {
    this.ears = false;
    this.captureOn = false;
    this.captureFrames = [];
    this.misses = 0;
    this.setAwaiting(false);
    this.h.onError?.("");
    this.h.onReask?.("He couldn't read that turn — he's listening to you himself now. Say it again.");
  }

  /**
   * Opening guard: twenty seconds of quiet before anything is said and the call hangs
   * up — a session that carries on greets nobody, so the person needs that long to
   * take their turn. Closing guard: once something has been said the call waits for
   * the answer to finish playing, then fifteen seconds of quiet, long enough to think
   * over a follow-up question. Nothing at all hangs
   * up, and no playback is cleared, while the assistant still has something to say.
   */
  watch() {
    const step = () => {
      if (!this.analyser || this.autoEnding) return;
      if (this.reviewPending || this.hearing) {
        this.watchId = requestAnimationFrame(step);
        return;
      }
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
        // hearing the person is a turn taken, so nothing may hold him silent any more
        this.releaseQuiet();
      }

      // the app's own ears: the person's turn is over once a breath of quiet has passed, or
      // once it has run longer than one turn is allowed to
      if (this.ears && this.captureOn && !answering) {
        const quietFor = now - Math.max(this.lastVoiceAt, this.captureFrom);
        if (quietFor >= TURN_END_MS || now - this.captureFrom >= TURN_MAX_MS) this.readTurn();
      }

      // a turn that gets no answer is put to him once more; only if that brings nothing
      // does the turn stop waiting, so the call closes as it always has
      if (this.awaiting && !answering) {
        const waited = now - this.turnAt;
        if (!this.recovered && this.lastUserText && waited >= RECOVER_MS) {
          this.recovered = true;
          this.turnAt = now;
          this.lastVoiceAt = now;
          this.answerEndAt = now;
          this.send({ type: "user_message", text: this.lastUserText });
        } else if (waited >= GIVE_UP_MS) {
          this.setAwaiting(false);
        }
      }

      // the wait starts when the assistant stops talking, so it always gets to finish,
      // and nothing closes the call while a turn is still waiting for its answer
      if (!answering && !this.awaiting) {
        if (!this.heardVoice) {
          // the greeting of a call that carries on is delivered out of the room, so
          // that spell is not silence: the guard waits until the person takes their turn
          const quietSince = Math.max(this.watchStart, this.answerEndAt, this.holdQuiet ? now : 0);
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

  /** The microphone track: closed while he speaks, open again the moment he stops. */
  setMicOpen(open) {
    if (!this.stream) return;
    this.stream.getAudioTracks().forEach((track) => {
      track.enabled = open;
    });
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
    // The voice is played exactly as the service speaks it. The pace of his answer is set on his own
    // agent, and taking any more of it here meant playing the sound back quicker than it was recorded
    // — a voice played that way rides up in pitch and comes out scratchy instead of like a person.
    // What is heard now is his own voice, at the pace he was given, clean.

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
    // the next piece of his voice follows this one exactly where it ends
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
      // the microphone closes by itself for as long as he is speaking
      this.setMicOpen(false);
      this.h.onAgentAudioStart?.();
    };

    if (lead) {
      clearTimeout(this.voiceTimer);
      this.voiceTimer = setTimeout(begins, lead * 1000);
    } else {
      begins();
    }

    // a chunk always puts the end off: his turn is over only once a breath has passed
    // with nothing more arriving, so a gap inside one answer is never mistaken for its end
    clearTimeout(this.endTimer);
    const remainingMs =
      Math.max(0, (this.playHead - this.ctx.currentTime) * 1000) + ANSWER_GAP_MS;
    this.endTimer = setTimeout(() => {
      this.answerEndAt = performance.now();
      if (this.speaking) {
        this.speaking = false;
        // the answer has been read out: the microphone opens by itself again
        this.setMicOpen(true);
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
      // a helper session is asked again on the next turn, so it is never hung up by itself
      if (this.keepOpen) {
        this.watchId = requestAnimationFrame(step);
        return;
      }
      const now = performance.now();

      // A written turn that gets no answer is put to him once more, exactly as a spoken turn is: one
      // quiet miss never loses the question, and the same words are simply asked again once — never
      // twice, and never as a second question. Once that has been done the session waits only a
      // short while longer, so a question that is not going to be answered ends the wait here
      // instead of leaving the words on the screen with nothing after them.
      if (this.awaiting && !this.answered && this.lastUserText) {
        const waited = now - this.turnAt;
        if (!this.recovered && waited >= RECOVER_MS) {
          this.recovered = true;
          this.turnAt = now;
          this.silentWaitAt = now;
          this.send({ type: "user_message", text: this.lastUserText });
        } else if (waited >= GIVE_UP_MS) {
          this.setAwaiting(false);
        }
      }

      const waitFor = this.answered
        ? WRITTEN_CLOSE_MS
        : this.recovered
          ? RECOVER_MS
          : WRITTEN_WAIT_MS;
      const idleSince = Math.max(this.silentWaitAt, this.answerEndAt || 0);
      if (now - idleSince >= waitFor) {
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
    // an interruption hands the turn back: the microphone is open again for it
    this.setMicOpen(true);
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
    this.captureOn = false;
    this.captureFrames = [];
    clearTimeout(this.holdTimer);
    this.holdTimer = null;
    if (this.offTouch) {
      this.offTouch();
      this.offTouch = null;
    }
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

    // opened once more before it is stopped, so the next call starts listening
    this.setMicOpen(true);
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    // The sound belongs to the app and is never closed here: it outlives every call, so the voice
    // standing down can never leave the next voice playing into a sound that is already going away.
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