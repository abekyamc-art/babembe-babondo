import { primedAudio } from "@/lib/audioUnlock";

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
// answer is begun the moment the knowledge is handed in; where it never arrives, the seat still
// answers on its own rather than a call sitting silent on a turn nobody answered.
const ANSWER_WAIT_MS = 6000;

/** A failure named by the stage it happened at, so the screen says what really went wrong. */
function stageError(stage, message) {
  const err = new Error(message);
  err.stage = stage;
  return err;
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
        this.h.onThinking?.(true);
        return;

      case "response.output_audio_transcript.done":
        this.h.onAgentText?.(String(msg.transcript || ""));
        return;

      case "output_audio_buffer.started":
        this.markSpeaking(true);
        return;

      // the answer has drained: it has been spoken out in full, and this is the moment the call may
      // move on from this voice
      case "output_audio_buffer.stopped":
        this.markSpeaking(false);
        return;

      case "response.done": {
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
        if (!this.voiceHeard) this.h.onAgentAudioEnd?.();
        return;
      }

      case "error":
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
   * The seat is held here until the knowledge is handed in, and the wait is bounded so a search that
   * never arrives still leaves the person answered.
   */
  armAnswer(text) {
    this.pendingText = String(text || "");
    clearTimeout(this.gateTimer);
    this.gateTimer = setTimeout(() => this.answer("", this.pendingText), ANSWER_WAIT_MS);
  }

  /**
   * The app's own knowledge for the turn that just ended, put in front of the seat before its answer
   * begins. A turn that has already been left behind — the person has said something else since —
   * changes nothing here.
   */
  answer(note = "", text = null) {
    const pending = this.pendingText;
    if (this.stopped || !pending) return;
    if (text !== null && String(text) !== pending) return;
    this.pendingText = "";
    clearTimeout(this.gateTimer);
    this.gateTimer = null;
    const said = String(note || "").trim();
    if (said) {
      this.send({
        type: "conversation.item.create",
        item: { type: "message", role: "system", content: [{ type: "input_text", text: said }] },
      });
    }
    this.send({ type: "response.create" });
  }

  /**
   * Whether the answer is being spoken right now. Its beginning is what the screen shows, and its
   * end is what the call is told: an answer read out in full is reported here and nowhere else.
   */
  markSpeaking(on) {
    if (this.speaking === on) return;
    if (on) {
      this.voiceHeard = true;
      this.speaking = true;
      this.h.onThinking?.(false);
      this.h.onAgentAudioStart?.();
      return;
    }
    this.speaking = false;
    this.h.onAgentAudioEnd?.();
  }

  async stop() {
    this.stopped = true;
    this.waits.forEach((id) => clearTimeout(id));
    this.waits = [];
    clearTimeout(this.gateTimer);
    this.gateTimer = null;
    this.pendingText = "";

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