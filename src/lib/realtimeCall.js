import { base44 } from "@/api/base44Client";

/**
 * The voice call itself: a WebRTC link straight from this browser to OpenAI's Realtime service.
 * The browser asks the app's own backend for a short-lived credential — the account's key never
 * comes near this file — and hands its connection description to OpenAI with that credential.
 *
 * The session is deliberately not allowed to answer anything. Every answer is written first by
 * chatWithKibembeAssistant, read from the Kibembe Word Bank, and handed here to be read aloud
 * exactly as it was written. The session's own rules — what it may speak and when — are set on the
 * server as the session is made, so this file never writes them; and a response nobody asked for
 * is stopped here before it can be heard.
 */

const CALLS_URL = "https://api.openai.com/v1/realtime/calls";

// how long the session and the connection are given to come up, and how long one line may take
const CONNECT_MS = 20000;
const SPEAK_MS = 60000;

// the stage a failure happened at, said plainly on screen
const STAGES = {
  mic: "Microphone",
  credential: "Voice login",
  signaling: "Connection",
  connection: "Connection",
  playback: "Sound",
  response: "Voice",
};

export function stageLabel(stage) {
  return STAGES[stage] || "Voice";
}

function stageError(stage, message) {
  const err = new Error(message);
  err.stage = stage;
  return err;
}

export default class RealtimeCall {
  constructor(handlers = {}) {
    this.h = handlers;
    this.pc = null;
    this.dc = null;
    this.stream = null;
    this.audioEl = null;
    this.track = null;
    this.remoteStream = null;
    this.sessionReady = false;
    this.speaking = false;
    this.userMuted = false;
    this.pendingSpeak = false;
    this.speakResolve = null;
    this.stopped = false;
    this.waits = [];
    this.speakTimer = 0;
  }

  /** Whether the session is up and the connection carrying it is really open. */
  get connected() {
    return (
      !this.stopped &&
      this.sessionReady &&
      this.pc?.connectionState === "connected"
    );
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

  async open({ stream, audioEl }) {
    this.stream = stream || null;
    this.audioEl = audioEl || null;
    this.track = stream?.getAudioTracks?.()[0] || null;

    // 1. the credential: the app's own backend makes it, so the account's key stays on the server
    let res;
    try {
      res = await base44.functions.invoke("realtimeSession", {});
    } catch (err) {
      throw stageError(
        "credential",
        err?.response?.data?.error || err?.message || "The voice credential could not be fetched."
      );
    }
    const key = String(res?.data?.client_secret || "");
    if (!key) {
      throw stageError("credential", res?.data?.error || "No voice credential was returned.");
    }

    // 2. the peer connection: the microphone goes out on it, the voice comes back on it
    const pc = new RTCPeerConnection();
    this.pc = pc;
    pc.onconnectionstatechange = () => this.onConnectionState();
    pc.ontrack = (event) => this.attachAudio(event.streams?.[0] || new MediaStream([event.track]));
    if (this.track && stream) pc.addTrack(this.track, stream);

    const dc = pc.createDataChannel("oai-events");
    this.dc = dc;
    dc.onmessage = (event) => this.onEvent(event);

    // 3. the connection description is offered, and OpenAI answers it with the credential
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
        "The voice connection could not be reached — check the network and try again."
      );
    }
    if (!answer.ok) {
      const detail = String(await answer.text().catch(() => "")).slice(0, 160);
      throw stageError(
        "signaling",
        detail
          ? `The voice connection was refused (${answer.status}: ${detail})`
          : `The voice connection was refused (${answer.status}).`
      );
    }
    const sdp = await answer.text();
    await pc.setRemoteDescription({ type: "answer", sdp });

    // 4. nothing is called live until the session has really opened and the audio path exists
    await this.waitFor(
      () => this.sessionReady,
      CONNECT_MS,
      stageError("connection", "The voice session did not finish opening — please try again.")
    );
    await this.waitFor(
      () => this.remoteStream,
      CONNECT_MS,
      stageError("playback", "The voice channel opened without sound — please try again.")
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

  /** The voice that comes back is played through the element the tap already opened. */
  attachAudio(stream) {
    this.remoteStream = stream;
    this.readyAudio();
  }

  readyAudio() {
    const el = this.audioEl;
    const stream = this.remoteStream;
    if (!el) return Promise.resolve();
    if (!stream) return Promise.resolve();
    if (el.srcObject !== stream) el.srcObject = stream;
    return el.play().catch(() => {
      // the phone is holding the sound back: the panel says so, and the next touch starts it
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

  onConnectionState() {
    if (this.stopped) return;
    const state = this.pc?.connectionState;
    if (state === "failed") {
      this.h.onError?.(
        "connection",
        "The voice connection dropped — end the call and start it again."
      );
    }
    if (state === "closed") this.h.onEnded?.();
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
        return;

      case "conversation.item.input_audio_transcription.completed": {
        const said = String(msg.transcript || "").trim();
        if (said) this.h.onUserText?.(said);
        return;
      }

      case "conversation.item.input_audio_transcription.failed":
        this.h.onError?.("mic", "That turn could not be written down — say it again.");
        return;

      case "response.output_audio_transcript.done":
        this.h.onAgentText?.(String(msg.transcript || ""));
        return;

      case "response.created":
        // A response nobody asked for is the session answering by itself, and nothing it writes
        // on its own has been through the Word Bank: it is stopped before it can be heard.
        if (this.pendingSpeak) {
          this.pendingSpeak = false;
          this.markSpeaking(true);
        } else {
          this.send({ type: "response.cancel" });
        }
        return;

      case "response.done": {
        const status = msg.response?.status;
        if (status === "failed" || status === "cancelled") {
          this.h.onError?.(
            "response",
            String(msg.response?.status_details?.error?.message || "").slice(0, 160) ||
              "The voice could not read that line out."
          );
        }
        this.settleSpeak(status !== "failed");
        return;
      }

      case "output_audio_buffer.started":
        this.markSpeaking(true);
        return;

      case "output_audio_buffer.stopped":
        this.markSpeaking(false);
        return;

      case "error":
        this.h.onError?.(
          this.speaking ? "response" : "connection",
          String(msg.error?.message || "").slice(0, 160) || "The voice session reported an error."
        );
        this.settleSpeak(false);
        return;

      default:
        return;
    }
  }

  /**
   * One line, read aloud. The line is already the verified answer, so nothing here writes it: it is
   * handed to the session whole, and the session's own rules say it is read and not answered.
   */
  speak(text) {
    const line = String(text || "").trim();
    if (!line) return Promise.resolve(false);
    if (!this.connected) return Promise.resolve(false);

    return new Promise((resolve) => {
      this.speakResolve = resolve;
      this.pendingSpeak = true;
      clearTimeout(this.speakTimer);
      this.speakTimer = setTimeout(() => this.settleSpeak(false), SPEAK_MS);

      this.send({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: line }],
        },
      });
      if (!this.send({ type: "response.create" })) {
        this.pendingSpeak = false;
        this.settleSpeak(false);
      }
    });
  }

  settleSpeak(ok) {
    clearTimeout(this.speakTimer);
    this.speakTimer = 0;
    this.pendingSpeak = false;
    const done = this.speakResolve;
    this.speakResolve = null;
    if (done) done(!!ok);
  }

  /** While the voice is speaking the microphone is closed, so it never hears the phone's speaker. */
  markSpeaking(on) {
    if (this.speaking === on) return;
    this.speaking = on;
    this.setMicEnabled(!on && !this.userMuted);
    this.h.onSpeaking?.(on);
  }

  setMicEnabled(on) {
    if (this.track) this.track.enabled = on;
  }

  mute(on) {
    this.userMuted = !!on;
    this.setMicEnabled(!on && !this.speaking);
  }

  async stop() {
    this.stopped = true;
    this.waits.forEach((id) => clearTimeout(id));
    this.waits = [];
    clearTimeout(this.speakTimer);
    this.speakTimer = 0;
    this.settleSpeak(false);

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
    this.remoteStream = null;
    this.track = null;
    this.stream = null;
    this.sessionReady = false;
    this.speaking = false;
  }
}