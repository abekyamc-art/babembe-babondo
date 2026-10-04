import {
  AgentEventsEnum,
  ElevenLabsAgentSession,
  SessionEvent,
} from "@heygen/liveavatar-web-sdk";
import { base44 } from "@/api/base44Client";
import { guardAvatarHousekeeping } from "@/lib/avatarSessionGuard";
import { contextBlocks } from "@/lib/contextBlocks";

const OPEN_QUIET_MS = 20000;
// once his answer has finished, this much quiet ends the call, so the person can
// start it again whenever they are ready
const CLOSE_QUIET_MS = 15000;
// a turn that gets no answer is put to the face once more after this long, and if it
// is still unanswered this much later, the call closes as it always has — the question
// is kept for the next call
const RECOVER_MS = 15000;
const GIVE_UP_MS = 45000;
// a call that carries on is held from speaking until the person takes their turn;
// this is the longest that hold can last if nothing releases it
const HOLD_MAX_MS = 15000;
// his turn is marked as speaking but nothing has been heard from him for this long:
// the end signal was missed, so his turn is finished and the microphone comes back
const SILENT_END_MS = 2500;
// a soft voice at arm's length is a turn as much as a loud one
const VOICE_LEVEL = 0.03;

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
    // whether the answer being given right now has already been charged for
    this.spent = false;
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
    // a question carried over from the last call is being answered now: nothing is held
    this.resuming = false;
    // the turn waiting for its answer: what was said, and whether it has already been
    // put to him a second time
    this.lastUserText = "";
    this.turnAt = 0;
    this.recovered = false;
    // when his voice was last heard during the turn being spoken
    this.loudAt = 0;
  }

  get connected() {
    return !!this.session && this.session.state === "CONNECTED";
  }

  async open({ withMic = true, videoEl = null, memory = "", laterTurn = false, resuming = false } = {}) {
    this.answered = false;
    this.spent = false;
    this.userSpoke = false;
    this.heardVoice = false;
    this.withMic = withMic;
    this.resuming = !!resuming;
    // nothing of the last call rides into this one: no turn, no stale breath
    this.setAwaiting(false);
    this.lastUserText = "";
    this.turnAt = 0;
    this.recovered = false;
    // he has already introduced himself: this call is held quiet until the person
    // takes their turn, so the introduction never reaches their ears. A question
    // carried over is answered aloud straight away, so it is never held.
    this.laterTurn = !!laterTurn;
    this.holdQuiet = this.laterTurn && !this.resuming;
    clearTimeout(this.holdTimer);
    this.holdTimer = null;
    if (this.holdQuiet) this.holdTimer = setTimeout(() => this.releaseQuiet(), HOLD_MAX_MS);
    this.h.onStatus?.("connecting");

    const res = await base44.functions.invoke("liveAvatarSession", {});
    const token = res?.data?.session_token;
    if (!token) throw new Error(res?.data?.error || "Your face isn't connected yet.");

    // This endpoint always configures ElevenLabs; token claims are not a
    // reliable way to choose the SDK class across provider versions.
    const session = new ElevenLabsAgentSession(token, {
      autoKeepAlive: true,
      voiceChat: { defaultMuted: !withMic },
    });
    guardAvatarHousekeeping(session);
    this.session = session;

    session.on(SessionEvent.SESSION_STREAM_READY, () => this.showStream(videoEl));
    session.on(AgentEventsEnum.USER_SPEAK_STARTED, () => this.hearUser());
    session.on(AgentEventsEnum.USER_SPEAK_ENDED, () => {
      this.hearUser();
      // their turn is over: he reviews what he was given before he answers, and the
      // orb shows him at it
      this.turnAt = performance.now();
      this.recovered = false;
      this.setAwaiting(true);
    });
    session.on(AgentEventsEnum.USER_TRANSCRIPTION, (event) => {
      if (!event?.text) return;
      this.userSpoke = true;
      // a fresh turn: the answer coming for it is its own to spend
      this.spent = false;
      this.lastUserText = event.text;
      this.turnAt = performance.now();
      this.recovered = false;
      this.releaseQuiet();
      this.setAwaiting(true);
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
      // while his voice is playing the microphone is closed, so nothing of the
      // person's has been sent: an interruption in this moment can only be his own
      // voice coming back out of the phone, and it must never cut his answer short
      if (this.speaking) return;
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
    // every call carries the conversation's memory, the admin's knowledge and the
    // guidance as silent context, so a word he only heard is answered from the
    // saved vocabulary and he picks the talk up instead of starting over
    if (memory) this.sendMemory(memory);
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
    // the watchdog counts from the first voice it hears in this turn
    this.loudAt = 0;
    // his voice has begun, so the review is over
    this.setAwaiting(false);
    // the mic stays closed while the face answers, so its own voice coming out of
    // the phone can never be sent back as an interruption — except during the held
    // greeting, which is out of the room, so the person can take their turn over it
    if (this.withMic && !this.holdQuiet) this.session?.voiceChat?.mute?.().catch(() => {});
    this.h.onAgentAudioStart?.();
  }

  stopSpeaking() {
    this.speaking = false;
    this.answerEndAt = performance.now();
    // the microphone always comes back when his voice ends, whatever the hold was
    if (this.withMic) this.session?.voiceChat?.unmute?.().catch(() => {});
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

  // only a call the person took part in, and the agent answered, is spent — and
  // every answer is its own, so a turn taken after this one is spent as well
  noteAnswer() {
    if (!this.userSpoke || this.spent) return;
    this.spent = true;
    this.answered = true;
    // his words have landed; the working line stays until his voice actually begins
    this.h.onAgentAnswered?.();
  }

  /**
   * Silent context he reads before answering: the conversation so far, the words
   * the admin saved, and the guidance that goes with them.
   */
  sendMemory(text) {
    if (!this.connected) return false;
    try {
      contextBlocks(text).forEach((block) => this.session?.sendContextualUpdate?.(block));
      return true;
    } catch (err) {
      return false;
    }
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
   * Opening guard: twenty seconds of quiet before anything is said and the call hangs
   * up — a call that carries on greets nobody, so the person needs that long to take
   * their turn. Closing guard: once something has been said the call waits for the
   * answer to finish, then fifteen seconds of quiet, long enough to think over a
   * follow-up question.
   */
  watch() {
    const step = () => {
      if (this.autoEnding) return;
      const now = performance.now();

      // his turn is marked as speaking but nothing has been heard from him for a
      // spell: the end signal was missed, so his turn finishes here and the
      // microphone comes back instead of staying closed
      if (this.speaking && this.analyser) {
        if (this.level() > VOICE_LEVEL) this.loudAt = now;
        else if (this.loudAt && now - this.loudAt >= SILENT_END_MS) this.stopSpeaking();
      }

      // a turn that gets no answer is put to him once more; only if that brings nothing
      // does the turn stop waiting, so the call closes as it always has
      if (this.awaiting && !this.speaking) {
        const waited = now - this.turnAt;
        if (!this.recovered && this.lastUserText && waited >= RECOVER_MS) {
          this.recovered = true;
          this.turnAt = now;
          this.lastVoiceAt = now;
          this.answerEndAt = now;
          try {
            this.session?.sendUserMessage(this.lastUserText);
          } catch (err) {
            // the turn stays waiting for the next call
          }
        } else if (waited >= GIVE_UP_MS) {
          this.setAwaiting(false);
        }
      }

      // nothing closes the call while a turn is still waiting for its answer
      if (!this.speaking && !this.awaiting) {
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