import { primedAudio } from "@/lib/audioUnlock";
import { LANGUAGE_FALLBACK, NOT_HELD, redFlag, spokenFlag } from "@/lib/languageGate";

/**
 * The call AI 1 answers on: a WebRTC link straight from this browser to OpenAI's Realtime service.
 *
 * The browser asks the app's own backend for a short-lived credential — the account's key never comes
 * near this file — and hands its connection description to OpenAI with that credential.
 *
 * This is a conversation and not a reader: the seat hears the person itself and answers on its own
 * account, so a response nobody asked for is never stopped here. What the app is told is what really
 * happened — the words the person said, the words of the answer as it was spoken, that the answer has
 * begun and that it has drained — so the screen follows the call and a hand-off waits on the answer's
 * own end rather than on a reading of the screen.
 *
 * The session's own rules — who it is, what it may speak, and that the app's whole rules block is
 * already in front of it — are set on the server as the session is made, so this file never writes
 * them.
 */

const CALLS_URL = "https://api.openai.com/v1/realtime/calls";

// how long the session and the sound are given to come up
const CONNECT_MS = 20000;
// How long the turn that has just ended is held while the app searches its own knowledge for it. The
// answer is begun the moment the knowledge is handed in; where it never arrives, that turn is left
// unanswered — the app says so plainly and the call listens again, and the seat is never asked to
// speak for itself, which is where an answer in a language nobody here speaks comes from.
const ANSWER_WAIT_MS = 6000;

/** A failure named by the stage it happened at, so the screen says what really went wrong. */
function stageError(stage, message) {
  const err = new Error(message);
  err.stage = stage;
  return err;
}

/**
 * The order that makes one line of the app's own the whole reply: said exactly as it stands, in the
 * language it is written in, and nothing said on top of it. It rides in with the turn, so the seat
 * reads it before it answers.
 */
function fixedLine(line) {
  return (
    "THE APP HOLDS THIS REPLY ITSELF — IT IS THE WHOLE ANSWER\n" +
    `The reply, word for word: "${line}"\n` +
    "- Say that line exactly as it stands, in the language it is written in, and then stop. Add nothing to it and leave nothing out of it: no greeting, no second sentence, no translation, no meaning in another language, no syllable reading, and no explanation of it.\n"
  );
}

/**
 * The same order as the response's own instructions. It is read in place of everything the session
 * carries, so the seat is given no rule to weigh that line against and nothing of its own to add — which
 * is what keeps a saved reply the app's own words rather than a line started well and then carried on
 * in a language nobody here speaks.
 */
function onlyLine(line) {
  return (
    "Say exactly and only this line, word for word, and then stop. Add nothing to it and leave nothing out of it — no greeting, no second sentence, no translation, no explanation:\n" +
    line
  );
}

export default class OpenAiTalkCall {
  constructor(handlers = {}) {
    this.h = handlers;
    this.pc = null;
    this.dc = null;
    this.stream = null;
    this.track = null;
    this.remoteStream = null;
    this.audioEl = null;
    this.sessionReady = false;
    this.speaking = false;
    // whether the answer being spoken has already reported that its sound began
    this.voiceHeard = false;
    this.stopped = false;
    this.waits = [];
    this.analyser = null;
    this.source = null;
    this.buf = null;
    // The turn that has just ended, waiting on the app's own knowledge for it, and the bound on that
    // wait. The service never answers on its own here: the answer is created by the app.
    this.pendingText = "";
    this.gateTimer = null;
    // the line the app is making the seat say, when a reply it holds itself is being spoken: set as
    // that answer is asked for, and emptied the moment the answer begins or the order is refused
    this.forced = "";
    // What the answer being heard has said so far, read as it comes: a line that turns into a language
    // this app does not speak is stopped at that very word rather than heard out.
    this.answerText = "";
    // whether the answer being heard was stopped for its language: what it said is not an answer, it is
    // not shown, and it is not counted as a spoken turn
    this.blockedSpeech = false;
    // whether the answer being heard is a line of the app's own, handed over whole — the app has already
    // read that line, so it is never read again as it is said
    this.appLine = false;
  }

  /** Whether the session is up and the connection carrying it is really open. */
  get connected() {
    return !this.stopped && this.sessionReady && this.pc?.connectionState === "connected";
  }

  send(payload) {
    if (this.dc?.readyState !== "open") return false;
    try {
      this.dc.send(JSON.stringify(payload));
      return true;
    } catch (err) {
      return false;
    }
  }

  async open({ clientSecret, stream }) {
    this.stream = stream || null;
    this.track = stream?.getAudioTracks?.()[0] || null;

    // the sound the tap already started is the one this call is played through, and the same sound
    // is what the meter below reads the voice from
    this.audioEl = new Audio();
    this.audioEl.autoplay = true;
    this.audioEl.setAttribute("playsinline", "");

    const key = String(clientSecret || "");
    if (!key) throw stageError("credential", "AI 1's voice login came back empty — tap and try again.");

    // 1. the peer connection: the microphone goes out on it, the voice comes back on it
    const pc = new RTCPeerConnection();
    this.pc = pc;
    pc.onconnectionstatechange = () => this.onConnectionState();
    pc.ontrack = (event) => this.attachAudio(event.streams?.[0] || new MediaStream([event.track]));
    if (this.track && stream) pc.addTrack(this.track, stream);

    const dc = pc.createDataChannel("oai-events");
    this.dc = dc;
    dc.onmessage = (event) => this.onEvent(event);
    // a session the service closed by itself is reported as a call that ended, so the turn it leaves
    // behind is never lost
    dc.onclose = () => {
      if (!this.stopped) this.h.onStatus?.("ended");
    };

    // 2. the connection description is offered, and OpenAI answers it with the credential
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    let answer;
    try {
      answer = await fetch(CALLS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });
    } catch (err) {
      throw stageError(
        "signaling",
        "AI 1's voice connection could not be reached — check the network and try again."
      );
    }
    if (!answer.ok) {
      const detail = String(await answer.text().catch(() => "")).slice(0, 160);
      throw stageError(
        "signaling",
        detail
          ? `AI 1's voice connection was refused (${answer.status}: ${detail})`
          : `AI 1's voice connection was refused (${answer.status}).`
      );
    }
    await pc.setRemoteDescription({ type: "answer", sdp: await answer.text() });

    // 3. nothing is called live until the session has really opened and the sound path exists
    await this.waitFor(
      () => this.sessionReady,
      CONNECT_MS,
      stageError("connection", "AI 1's voice session did not finish opening — please try again.")
    );
    await this.waitFor(
      () => this.remoteStream,
      CONNECT_MS,
      stageError("playback", "AI 1's voice channel opened without sound — please try again.")
    );
    await this.readyAudio();
  }

  waitFor(check, ms, failure) {
    if (check()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const tick = () => {
        if (this.stopped) {
          reject(stageError("connection", "The call was ended."));
          return;
        }
        if (check()) {
          resolve();
          return;
        }
        if (Date.now() - started > ms) {
          reject(failure);
          return;
        }
        this.waits.push(setTimeout(tick, 120));
      };
      tick();
    });
  }

  /** The voice that comes back is played through the sound the tap already started. */
  attachAudio(stream) {
    this.remoteStream = stream;
    this.startMeter();
    this.readyAudio();
  }

  readyAudio() {
    const el = this.audioEl;
    const stream = this.remoteStream;
    if (!el || !stream) return Promise.resolve();
    if (el.srcObject !== stream) el.srcObject = stream;
    return el.play().catch(() => {
      // the phone is holding the sound back: the screen says so, and the next touch starts it
      this.h.onPlaybackBlocked?.();
    });
  }

  /** Called on the person's next touch, when the phone held the sound back at the start. */
  resumeAudio() {
    const el = this.audioEl;
    if (!el) return Promise.resolve();
    if (this.remoteStream && el.srcObject !== this.remoteStream) el.srcObject = this.remoteStream;
    return el.play().catch(() => {});
  }

  /** The meter the orb pulses with: the voice coming back, read as it is heard. */
  startMeter() {
    const ctx = primedAudio();
    if (!ctx || !this.remoteStream || this.analyser) return;
    try {
      this.source = ctx.createMediaStreamSource(this.remoteStream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.buf = new Float32Array(this.analyser.fftSize);
      this.source.connect(this.analyser);
    } catch (err) {
      this.analyser = null;
      this.source = null;
      this.buf = null;
    }
  }

  /** How loud the voice is right now, from nothing to all of it. */
  level() {
    if (!this.analyser || !this.buf) return 0;
    try {
      this.analyser.getFloatTimeDomainData(this.buf);
    } catch (err) {
      return 0;
    }
    let sum = 0;
    for (let i = 0; i < this.buf.length; i += 1) sum += this.buf[i] * this.buf[i];
    return Math.min(1, Math.sqrt(sum / this.buf.length) * 3);
  }

  onConnectionState() {
    if (this.stopped) return;
    const state = this.pc?.connectionState;
    if (state === "failed") {
      this.h.onError?.("AI 1's voice connection dropped — end the call and start it again.");
    }
    if (state === "closed") this.h.onStatus?.("ended");
  }

  onEvent(event) {
    if (typeof event.data !== "string") return;
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch (err) {
      return;
    }

    switch (msg.type) {
      case "session.created":
      case "session.updated":
        this.sessionReady = true;
        this.h.onStatus?.("live");
        return;

      case "conversation.item.input_audio_transcription.completed": {
        const said = String(msg.transcript || "").trim();
        if (said) {
          // the turn goes on the screen, and the app's own knowledge for it is what the answer waits
          // on: the seat is held here until that knowledge is handed in — see armAnswer/answer
          this.h.onUserText?.(said);
          this.armAnswer(said);
        }
        return;
      }

      case "conversation.item.input_audio_transcription.failed":
        this.h.onError?.("That turn could not be written down — say it again.");
        return;

      // the seat is working out its answer: the sound of it has not begun yet
      case "response.created":
        this.voiceHeard = false;
        // the order was taken, so there is nothing left to fall back on
        this.forced = "";
        this.answerText = "";
        this.h.onThinking?.(true);
        return;

      // the answer as it is being written, word by word: a line that turns into another language is
      // stopped here, before the person has heard it out
      case "response.output_audio_transcript.delta":
        if (!this.appLine) {
          this.answerText += String(msg.delta || "");
          this.checkAnswer();
        }
        return;

      case "response.output_audio_transcript.done": {
        // the answer has already been stopped for its language: what it said is never shown as an answer
        if (this.blockedSpeech) return;
        const line = String(msg.transcript || "");
        // A line of the app's own has already been read by the app before it was handed over, so it is
        // never read again here; what the seat writes of its own accord is read, and a line carrying
        // another language is stopped rather than shown.
        if (!this.appLine && redFlag(line)) {
          this.blockAnswer();
          return;
        }
        this.h.onAgentText?.(line);
        return;
      }

      case "output_audio_buffer.started":
        this.markSpeaking(true);
        return;

      // the answer has drained: it has been spoken out in full, and this is the moment the call may
      // move on from this voice
      case "output_audio_buffer.stopped":
        this.markSpeaking(false);
        return;

      case "response.done": {
        // the app's own line, if that is what this answer was, has been said out: from here the seat's
        // own answers are read again
        this.appLine = false;
        const status = msg.response?.status;
        if (status === "failed" || status === "cancelled") {
          const why = String(msg.response?.status_details?.error?.message || "").slice(0, 160);
          if (status === "failed") {
            this.h.onError?.(why || "AI 1's voice could not answer that turn.");
          }
          // a response that gave no sound leaves nothing to wait behind: the call listens again
          this.markSpeaking(false);
          return;
        }
        // one answer has been given: it is counted against this voice's turn. The sound of an answer
        // reports its own end; an answer that came back with no sound at all settles here, so a voice
        // that answered nothing is never waited on.
        this.h.onAnswered?.();
        // An answer that came back with no sound at all settles here — but only where it really left the
        // person something: a response that said nothing at all is not a reply, and it is never charged
        // for. A line cut for its language has already settled the way it had to.
        if (!this.voiceHeard && !this.blockedSpeech && String(this.answerText || "").trim()) {
          this.h.onAgentAudioEnd?.();
        }
        return;
      }

      case "error":
        // A reply the app fixed to one line can be refused by a service that does not take a
        // response's own instructions. The turn is never left unanswered for it: the app's knowledge
        // for that turn is already in front of the seat, so a plain answer is asked for instead.
        if (this.forced) {
          this.forced = "";
          this.send({ type: "response.create" });
          return;
        }
        this.h.onError?.(
          String(msg.error?.message || "").slice(0, 160) || "AI 1's voice session reported an error."
        );
        return;

      default:
        return;
    }
  }

  /**
   * The turn has just ended, and the app is searching its own knowledge for what that turn reaches.
   * The seat is held here until the knowledge is handed in. The wait is bounded, and the bound is
   * where the turn settles: a turn whose knowledge never arrives is left unanswered rather than
   * handed to the seat to answer on its own.
   */
  armAnswer(text) {
    this.pendingText = String(text || "");
    clearTimeout(this.gateTimer);
    this.gateTimer = setTimeout(() => this.askPlain(this.pendingText), ANSWER_WAIT_MS);
  }

  /**
   * The app's own knowledge for the turn that just ended, put in front of the seat before its answer
   * begins. A turn that has already been left behind — the person has said something else since —
   * changes nothing here.
   *
   * Where the app holds the reply itself — a saved ask with the replies saved for it, a saved question
   * with its own answer, or the line a "what did you say?" is asking for — that line is handed over as
   * the reply, and the answer is made to say it and nothing else. The seat is given no room to write a
   * sentence of its own around it, which is what keeps the reply the app's own words word for word.
   *
   * A turn the app holds nothing of is answered all the same: the answer is asked for with nothing put
   * in front of the seat, so the person is never left in silence. What keeps such an answer to the
   * three languages of this call is the rules of the call and the reading of the answer as it is
   * spoken — a line that turns into another language is stopped at that very word, and the app's own
   * line takes its place.
   */
  answer(note = "", text = null, say = "") {
    const pending = this.pendingText;
    if (this.stopped || !pending) return;
    if (text !== null && String(text) !== pending) return;
    const wrote = String(note || "").trim();
    const line = String(say || "").trim();
    // The app holds nothing confirmed for this turn: what is said is the app's own confirmed line,
    // whole, and the seat writes nothing for it. Letting an answer run on its own account here is where
    // a Kibembe form nobody confirmed reaches the person's ears.
    if (!wrote && !line) {
      this.pendingText = "";
      clearTimeout(this.gateTimer);
      this.gateTimer = null;
      this.speakLine(NOT_HELD);
      return;
    }
    // The turn is answered in every case: whatever the app knows of it rides in front of the seat, and
    // where the app knows nothing of it the seat answers from the person's own words under the rules of
    // the call. Asking for no answer at all is what left a person who spoke with nothing back, and
    // silence is never the right answer to a turn somebody said.
    this.pendingText = "";
    clearTimeout(this.gateTimer);
    this.gateTimer = null;
    // a line of the app's own, handed over whole: it has been read by the app already, so it is not read
    // again as it is said
    this.appLine = !!line;
    this.answerText = "";
    this.forced = line;
    const said = [wrote, line ? fixedLine(line) : ""].filter(Boolean).join("\n\n");
    if (said) {
      this.send({
        type: "conversation.item.create",
        item: { type: "message", role: "system", content: [{ type: "input_text", text: said }] },
      });
    }
    // the reply is fixed: this response carries only that order, so there is nothing of the seat's own
    // to add to it and nothing to weigh it against
    this.send(
      line
        ? { type: "response.create", response: { instructions: onlyLine(line) } }
        : { type: "response.create" }
    );
  }

  /**
   * The app's own reading of the turn never arrived — the bound on that wait is up, so the app holds
   * nothing confirmed for this turn and its own line is what is said. The answer is never let run on
   * the seat's own account here: that is where a Kibembe form nobody confirmed is spoken as though it
   * were taught, and silence is never an answer either.
   */
  askPlain(text = null) {
    const pending = this.pendingText;
    if (this.stopped || !pending) return;
    if (text !== null && String(text) !== pending) return;
    this.pendingText = "";
    clearTimeout(this.gateTimer);
    this.gateTimer = null;
    this.forced = "";
    this.appLine = false;
    this.answerText = "";
    this.speakLine(NOT_HELD);
  }

  /**
   * The answer being heard, read as it is written: a line that turns into a language this app does not
   * speak — Lingala, French, or any other — is stopped at that very word. Nothing of it is heard out,
   * nothing of it is shown as an answer, and the app's own line takes its place. Only a little of what
   * has been said is read at a time, so a word arriving in pieces is still read whole.
   */
  checkAnswer() {
    if (this.stopped || this.blockedSpeech) return;
    if (!spokenFlag(this.answerText)) return;
    this.blockAnswer();
  }

  /**
   * The answer has turned into another language: it is stopped where it stands, what has not been heard
   * yet is thrown away, and the app's own line says plainly which three languages this call speaks — so
   * no line in another language is ever heard out, and the person is never left with nothing. The turn
   * is not counted as one that was answered.
   */
  blockAnswer() {
    if (this.stopped || this.blockedSpeech) return;
    this.blockedSpeech = true;
    this.send({ type: "response.cancel" });
    this.send({ type: "output_audio_buffer.clear" });
    this.h.onBlockedSpeech?.(LANGUAGE_FALLBACK);
    this.speakLine(LANGUAGE_FALLBACK);
  }

  /** One line of the app's own, said whole and nothing else. */
  speakLine(line) {
    const text = String(line || "").trim();
    if (!text || this.stopped) return;
    this.answerText = "";
    this.appLine = true;
    this.forced = text;
    this.send({
      type: "conversation.item.create",
      item: { type: "message", role: "system", content: [{ type: "input_text", text: fixedLine(text) }] },
    });
    this.send({ type: "response.create", response: { instructions: onlyLine(text) } });
  }

  /**
   * Whether the answer is being spoken right now. Its beginning is what the screen shows, and its
   * end is what the call is told: an answer read out in full is reported here and nowhere else.
   */
  markSpeaking(on) {
    if (this.speaking === on) return;
    // An answer stopped for the language it was turning into is not an answer that was given: its own
    // end is reported as a stopped line, so nothing is counted for it and no change is carried on from
    // it as though the turn had been answered. The flag is read once and cleared here, so the app's own
    // line that takes its place is measured like any other.
    const cut = on ? false : this.blockedSpeech;
    if (!on) this.blockedSpeech = false;
    // The microphone is shut for as long as the seat's own voice is playing. Left open, the phone's
    // speaker feeds the answer straight back into the microphone as the person's turn, and a reply
    // nobody asked for is what that echo becomes. It is opened again the moment the answer has
    // drained, so the person's own next turn is heard exactly as it always was.
    this.setMicEnabled(!on);
    if (on) {
      this.voiceHeard = true;
      this.speaking = true;
      this.h.onThinking?.(false);
      this.h.onAgentAudioStart?.();
      return;
    }
    this.speaking = false;
    this.h.onAgentAudioEnd?.(cut);
  }

  /**
   * The microphone this call listens through: shut while the seat's own voice is playing, open
   * again the moment it has drained. The sound of the call itself is never turned off here — only
   * what the microphone sends — so the answer the person is hearing is never touched.
   */
  setMicEnabled(on) {
    if (this.track) this.track.enabled = on;
  }

  async stop() {
    this.stopped = true;
    this.waits.forEach((id) => clearTimeout(id));
    this.waits = [];
    clearTimeout(this.gateTimer);
    this.gateTimer = null;
    this.pendingText = "";
    this.forced = "";
    this.answerText = "";
    this.appLine = false;
    this.blockedSpeech = false;

    if (this.dc) {
      try {
        this.dc.close();
      } catch (err) {
        // already closed
      }
    }
    this.dc = null;

    const pc = this.pc;
    this.pc = null;
    if (pc) {
      try {
        pc.onconnectionstatechange = null;
        pc.ontrack = null;
        pc.close();
      } catch (err) {
        // already gone
      }
    }

    if (this.source) {
      try {
        this.source.disconnect();
      } catch (err) {
        // already gone
      }
    }
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch (err) {
        // already gone
      }
    }
    this.source = null;
    this.analyser = null;
    this.buf = null;

    const el = this.audioEl;
    this.audioEl = null;
    if (el) {
      try {
        el.pause();
      } catch (err) {
        // nothing playing
      }
      el.srcObject = null;
    }

    // the microphone this call was handed is released with it, so the voice that takes the next turn
    // is never waiting on a phone another call is still listening through
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.track = null;
    this.remoteStream = null;
    this.sessionReady = false;
    this.speaking = false;
  }
}