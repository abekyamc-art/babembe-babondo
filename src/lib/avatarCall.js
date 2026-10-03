import {
  AgentEventsEnum,
  AgentType,
  ElevenLabsAgentSession,
  LiveAvatarSession,
  SessionEvent,
  parseAgentTypeFromToken,
} from "@heygen/liveavatar-web-sdk";
import { base44 } from "@/api/base44Client";
import { guardAvatarHousekeeping } from "@/lib/avatarSessionGuard";

const OPEN_QUIET_MS = 10000;
const CLOSE_QUIET_MS = 10000;
// a call that carries on is held from speaking until the person takes their turn;
// this is the longest that hold can last if nothing releases it
const HOLD_MAX_MS = 15000;

/**
 * A call whose face is the owner's LiveAvatar, with the same ElevenLabs agent
 * answering behind it. It mirrors VoiceSocket, so the assistant screen does not
 * care which of the two is running the conversation.
 */
export default class AvatarCall {
  constructor(handlers = {}) {
    this.h = handlers;
    this.session = null;
    this.el = null;
    this.ctx = null;
    this.analyser = null;
    this.levelBuf = null;
    this.tap = null;
    this.sink = null;
    this.speaking = false;
    this.closing = false;
    this.answered = false;
    this.userSpoke = false;
    this.heardVoice = false;
    this.withMic = false;
    this.autoEnding = false;
    this.lastVoiceAt = 0;
    this.answerEndAt = 0;
    this.watchStart = 0;
    this.watchId = 0;
    // a written turn that has been sent and not yet answered: the orb shows it
    this.awaiting = false;
    // carrying on: the face is heard only once the person has taken their turn
    this.holdQuiet = false;
    this.holdTimer = null;
    this.laterTurn = false;
  }

  get connected() {
    return !!this.session && this.session.state === "CONNECTED";
  }

  async open({ withMic = true, videoEl = null, memory = "", laterTurn = false } = {}) {
    guardAvatarHousekeeping();
    this.answered = false;
    this.userSpoke = false;
    this.heardVoice = false;
    this.withMic = withMic;
    // he has already introduced himself: this call is held quiet until the person
    // takes their turn, so the introduction never reaches their ears
    this.laterTurn = !!laterTurn;
    this.holdQuiet = this.laterTurn;
    clearTimeout(this.holdTimer);
    this.holdTimer = null;
    if (this.holdQuiet) this.holdTimer = setTimeout(() => this.releaseQuiet(), HOLD_MAX_MS);
    this.h.onStatus?.("connecting");

    const res = await base44.functions.invoke("liveAvatarSession", {});
    const token = res?.data?.session_token;
    if (!token) throw new Error(res?.data?.error || "Your face isn't connected yet.");

    // an ElevenLabs agent session carries the connector's transcripts and commands
    const kind = parseAgentTypeFromToken(token);
    const Session =
      kind === AgentType.FULL || kind === AgentType.OPENAI_REALTIME || kind === AgentType.GEMINI_REALTIME
        ? LiveAvatarSession
        : ElevenLabsAgentSession;

    const session = new Session(token, {
      autoKeepAlive: true,
      voiceChat: { defaultMuted: !withMic },
    });
    this.session = session;

    session.on(SessionEvent.SESSION_STREAM_READY, () => this.showStream(videoEl));
    session.on(AgentEventsEnum.USER_SPEAK_STARTED, () => this.hearUser());
    session.on(AgentEventsEnum.USER_SPEAK_ENDED, () => this.hearUser());
    session.on(AgentEventsEnum.USER_TRANSCRIPTION, (event) => {
      if (!event?.text) return;
      this.userSpoke = true;
      this.releaseQuiet();
      this.h.onUserText?.(event.text);
    });
    session.on(AgentEventsEnum.AVATAR_TRANSCRIPTION, (event) => {
      if (!event?.text) return;
      this.noteAnswer();
      // the greeting of a call that carries on is held out of the room, so its
      // words are not shown either
      if (this.holdQuiet) return;
      this.h.onAgentText?.(event.text);
    });
    session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => this.startSpeaking());
    session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => {
      // the held greeting is over, so nothing after it may be silenced
      this.stopSpeaking();
      this.releaseQuiet();
    });
    session.on(AgentEventsEnum.ELEVENLABS_AGENT_EVENT, (event) => {
      if (event?.elevenlabs_event_type !== "interruption") return;
      this.stopSpeaking();
      this.releaseQuiet();
      this.setAwaiting(false);
      this.h.onInterrupted?.();
    });
    session.on(SessionEvent.SESSION_DISCONNECTED, () => {
      this.session = null;
      this.teardown();
      if (!this.closing) this.h.onStatus?.("closed");
    });

    try {
      await session.start();
    } catch (error) {
      this.session = null;
      this.teardown();
      throw error;
    }

    this.h.onStatus?.("live");
    // a call that follows an earlier exchange carries the conversation's memory as
    // silent context, so he picks it up instead of starting over
    if (memory) {
      try {
        session.sendContextualUpdate?.(memory);
      } catch (err) {
        // the call carries on without the reminder
      }
    }
    this.watchStart = performance.now();
    this.watch();
  }

  /** The picture is attached once the room actually carries it. */
  showStream(el) {
    if (!el) return;
    this.el = el;
    // held quiet: the greeting plays out of the room until the person takes their turn
    el.muted = this.holdQuiet;
    try {
      this.session?.attach(el);
    } catch (err) {
      // a missing picture never stops the voice
    }
    this.tapAudio(el);
  }

  /**
   * The ring pulses with the answer. The element keeps playing the sound
   * itself, so this only listens in on the same stream.
   */
  tapAudio(el) {
    if (this.ctx || !el) return;
    const stream = el.srcObject;
    if (!stream || !stream.getAudioTracks?.().length) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.levelBuf = new Uint8Array(this.analyser.fftSize);
      this.tap = this.ctx.createMediaStreamSource(stream);
      this.sink = this.ctx.createGain();
      this.sink.gain.value = 0;
      this.tap.connect(this.analyser);
      this.analyser.connect(this.sink);
      this.sink.connect(this.ctx.destination);
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    } catch (err) {
      // the ring falls back to its resting pulse
    }
  }

  hearUser() {
    this.userSpoke = true;
    this.heardVoice = true;
    this.lastVoiceAt = performance.now();
    this.releaseQuiet();
  }

  startSpeaking() {
    this.speaking = true;
    // the mic stays closed while the face answers, so its own voice coming out of
    // the phone can never be sent back as an interruption — except during the held
    // greeting, which is out of the room, so the person can take their turn over it
    if (this.withMic && !this.holdQuiet) this.session?.voiceChat?.mute?.().catch(() => {});
    this.h.onAgentAudioStart?.();
  }

  stopSpeaking() {
    this.speaking = false;
    this.answerEndAt = performance.now();
    if (this.withMic && !this.holdQuiet) this.session?.voiceChat?.unmute?.().catch(() => {});
    this.h.onAgentAudioEnd?.();
  }

  /** The person has taken their turn: the face is heard from here on. */
  releaseQuiet() {
    if (!this.holdQuiet) return;
    this.holdQuiet = false;
    clearTimeout(this.holdTimer);
    this.holdTimer = null;
    if (this.el) this.el.muted = false;
  }

  /** A written turn is waited on: shown from the send until its answer lands. */
  setAwaiting(next) {
    if (this.awaiting === next) return;
    this.awaiting = next;
    this.h.onThinking?.(next);
  }

  // only a call the person took part in, and the agent answered, is spent
  noteAnswer() {
    if (!this.userSpoke || this.answered) return;
    this.answered = true;
    this.setAwaiting(false);
    this.h.onAgentAnswered?.();
  }

  sendText(text) {
    if (!this.connected) return false;
    // a fresh message is its own turn, so its answer is its own to spend
    this.userSpoke = true;
    this.answered = false;
    this.releaseQuiet();
    try {
      this.session.sendUserMessage(text);
      this.setAwaiting(true);
      return true;
    } catch (err) {
      return false;
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

  /**
   * Opening guard: ten seconds of quiet before anything is said and the call hangs
   * up — a call that carries on greets nobody, so the person needs that long to take
   * their turn. Closing guard: once something has been said the call waits for the
   * answer to finish, then ten seconds of quiet.
   */
  watch() {
    const step = () => {
      if (this.autoEnding) return;
      const now = performance.now();

      if (!this.speaking) {
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
    const session = this.session;
    this.session = null;
    this.teardown();
    if (session) session.stop().catch(() => {});

    this.h.onStatus?.("ended");
    this.h.onAutoEnd?.({ reason, answered });
  }

  teardown() {
    this.setAwaiting(false);
    clearTimeout(this.holdTimer);
    this.holdTimer = null;
    this.holdQuiet = false;
    if (this.watchId) cancelAnimationFrame(this.watchId);
    this.watchId = 0;

    [this.tap, this.analyser, this.sink].forEach((node) => {
      if (!node) return;
      try {
        node.disconnect();
      } catch (err) {
        // already detached
      }
    });
    this.tap = null;
    this.analyser = null;
    this.sink = null;
    this.levelBuf = null;

    if (this.ctx && this.ctx.state !== "closed") this.ctx.close().catch(() => {});
    this.ctx = null;

    if (this.el) {
      try {
        this.el.srcObject = null;
      } catch (err) {
        // the element is already gone
      }
      this.el = null;
    }

    this.speaking = false;
  }

  async stop() {
    this.closing = true;
    const session = this.session;
    this.session = null;
    this.teardown();
    if (session) await session.stop().catch(() => {});
    this.h.onStatus?.("ended");
  }
}