import { useCallback, useEffect, useRef, useState } from "react";
import VoiceSocket from "@/lib/elevenLabsSocket";
import Base44Call from "@/lib/base44Call";
import AvatarCall from "@/lib/avatarCall";
import { useVoiceMode, voiceMode } from "@/lib/voiceMode";
import { base44 } from "@/api/base44Client";
import { buildMemory } from "@/lib/agentMemory";
import { loadFreshMaterial, loadKnowledgeNote, withKnowledge } from "@/lib/knowledge";
import { emptyStory, nextStory, withStory } from "@/lib/storyState";

// the knowledge note travels in blocks and needs a beat to settle before the
// question is put to him, so he reads it before he answers; the wait is shown as
// him working
const TYPED_HOLD_MS = 8000;

// knowledge held back while he is answering is kept to this much, so an answer that never
// ends can never let what is waiting grow without bound
const HELD_LIMIT = 4000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One session's handlers. Every report they carry is checked against the number the session
 * was opened under, so a session the admin has already switched away from — including one
 * still finishing an answer it began before the switch — says nothing on screen and is never
 * charged for.
 */
function forSession(handlers, gen, live) {
  const wrapped = {};
  Object.keys(handlers).forEach((key) => {
    wrapped[key] = (...args) => {
      if (gen !== live.current) return;
      handlers[key](...args);
    };
  });
  return wrapped;
}

export default function useVoiceAgent({ videoRef } = {}) {
  const socketRef = useRef(null);
  const levelRef = useRef(0);
  const rafRef = useRef(0);
  // the answer is always charged through the handler as the allowance stands right
  // now, not the one captured when the conversation first opened
  const answeredRef = useRef(null);
  // whether the owner's face is available at all; the answer arrives once, on load
  const faceReadyRef = useRef(false);
  // whether the session on air is a written one, which ends without call language
  const quietRef = useRef(false);
  // everything he has already said, in order, so a later session is never a blank one
  const linesRef = useRef([]);
  // the typed line already on screen, so the agent's own echo of it is not shown twice
  const sentRef = useRef("");
  // the spoken turn already looked up, so one turn is never read twice
  const heardRef = useRef({ text: "", timer: 0 });
  // the request for fresh material already looked up, so one turn is never searched for twice
  const wantedRef = useRef({ text: "", timer: 0 });
  // knowledge that landed while he was answering, waiting for his voice to stop
  const heldRef = useRef("");
  // the last turn the person took that no answer followed: the next call opens by
  // answering it
  const pendingRef = useRef("");
  // the story being told in parts, so a call that opens later continues it instead
  // of starting it over
  const storyRef = useRef(emptyStory());
  // which session is the one on air. Every engine reports through handlers stamped with the
  // number they were opened under, and anything arriving under an older number is dropped, so
  // a provider the admin has switched away from cannot answer, charge, or speak again.
  const sessionRef = useRef(0);

  // the mode in force, kept in step with the admin's switch: a switch ends whatever
  // session is on air, so the mode that was chosen is the only one left answering
  const mode = useVoiceMode();
  const [status, setStatus] = useState("idle");
  const [speaking, setSpeaking] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [turns, setTurns] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [avatarReady, setAvatarReady] = useState(false);
  const [avatarLive, setAvatarLive] = useState(false);

  useEffect(() => {
    let alive = true;
    base44.functions
      .invoke("liveAvatarSession", { probe: true })
      .then((res) => {
        if (!alive) return;
        const ready = !!res?.data?.ready;
        faceReadyRef.current = ready;
        setAvatarReady(ready);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // The admin's switch takes the other provider out of the room. Whichever session is on
  // air was opened under the mode that is no longer in force, so it is ended right here:
  // nothing said before the switch is answered by the provider that was just turned off,
  // and every turn after it is answered by the mode that was chosen.
  useEffect(() => {
    // Everything from before the switch belongs to the mode that is no longer in force: the
    // session on air is orphaned first, so none of its reports can land any more, and ended
    // straight after, so the provider just turned off stops talking — including one still
    // writing or speaking an answer it began before the switch.
    sessionRef.current += 1;
    const engine = socketRef.current;
    socketRef.current = null;
    heldRef.current = "";
    setSpeaking(false);
    setThinking(false);
    setMicActive(false);
    setAvatarLive(false);
    setStatus("idle");
    if (engine) Promise.resolve(engine.stop?.()).catch(() => {});
  }, [mode]);

  const pushTurn = useCallback((role, text) => {
    // a turn is answered by the reply that follows it, so the last unanswered one is
    // always the newest turn with no reply after it
    if (role === "user") pendingRef.current = text;
    if (role === "agent") pendingRef.current = "";
    if (role === "agent" && text) linesRef.current = [...linesRef.current, text];
    storyRef.current = nextStory(storyRef.current, role, text);
    setTurns((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role) {
        return [...prev.slice(0, -1), { role, text }];
      }
      return [...prev, { role, text }];
    });
  }, []);

  /**
   * A word he only heard is looked up as it lands — against the whole saved list,
   * including the words too long to ride along with the note — and what turns up
   * reaches the session before his answer, so a word that sounds close to a saved
   * one is answered from its meaning instead of being corrected.
   */
  const reviewHeard = useCallback((text) => {
    const said = String(text || "").trim();
    const state = heardRef.current;
    if (said.length < 3 || said === state.text) return;

    clearTimeout(state.timer);
    state.timer = setTimeout(async () => {
      state.text = said;
      try {
        const res = await base44.functions.invoke("assistantKnowledge", { heard: said });
        const note = res?.data?.note;
        const engine = socketRef.current;
        if (!note || !engine || engine.silent) return;
        // He is answering right now: the note is held instead of being lost, and handed
        // over the moment his voice stops, so it shapes the turn that follows — the one
        // that would otherwise be answered without the words he just said.
        if (engine.speaking) {
          heldRef.current = `${heldRef.current}\n${note}`.slice(-HELD_LIMIT);
          return;
        }
        engine.sendMemory?.(note);
      } catch (err) {
        // the answer carries on without the extra words
      }
    }, 350);
  }, []);

  /**
   * A request that needs material from outside the saved knowledge — a story, news, a
   * word, a fact — is looked up as it lands, once, and what comes back reaches the
   * session before the answer. The lookup itself decides whether anything is needed,
   * saves what it finds for next time, and hands back only the material.
   */
  const reviewWanted = useCallback((text) => {
    const said = String(text || "").trim();
    const state = wantedRef.current;
    if (said.length < 3 || said === state.text) return;

    clearTimeout(state.timer);
    state.timer = setTimeout(async () => {
      state.text = said;
      const material = await loadFreshMaterial(said);
      const engine = socketRef.current;
      // material that arrives once he has started goes no further: it is saved for the
      // answers that follow instead of being pushed over the one being given
      if (material && engine && !engine.silent && !engine.speaking) engine.sendMemory?.(material);
    }, 350);
  }, []);

  /**
   * Knowledge that landed while he was answering is handed over the moment his voice
   * stops — never over the answer being given — so the turn that follows is answered
   * with the words just heard, and the language they were spoken in, already in hand.
   */
  const flushHeld = useCallback(() => {
    const held = heldRef.current;
    if (!held) return;
    const engine = socketRef.current;
    if (!engine || engine.silent || engine.speaking) return;
    heldRef.current = "";
    engine.sendMemory?.(held);
  }, []);

  // both kinds of call report back through the same set of handlers
  const makeHandlers = useCallback(
    () => ({
      onStatus: (next) => {
        if (next === "live") setStatus("live");
        if (next === "closed" || next === "ended") {
          setStatus("idle");
          setSpeaking(false);
          setThinking(false);
          setMicActive(false);
          setAvatarLive(false);
          heldRef.current = "";
          socketRef.current = null;
        }
      },
      onUserText: (text) => {
        // the typed line was put on screen as it was sent, so its echo is not a second one
        if (sentRef.current && text.trim() === sentRef.current) {
          sentRef.current = "";
          return;
        }
        pushTurn("user", text);
        reviewHeard(text);
        reviewWanted(text);
      },
      onAgentText: (text) => pushTurn("agent", text),
      onAgentAudioStart: () => setSpeaking(true),
      onThinking: (on) => setThinking(on),
      onAgentAudioEnd: () => {
        setSpeaking(false);
        flushHeld();
      },
      onInterrupted: () => {
        setSpeaking(false);
        flushHeld();
      },
      onAgentAnswered: () => answeredRef.current?.(),
      // a call answered by the app's own AI says plainly when an answer did not come
      onError: (message) => setError(message),
      // a turn he could make nothing of is asked again in the status line, and the call
      // keeps listening instead of closing
      onReask: (message) => setNotice(message),
      onAutoEnd: ({ reason }) => {
        // a written exchange is already answered on screen, so it ends without a note
        if (quietRef.current) return;
        // a turn he never answered is kept, so the next call opens by answering it
        if (pendingRef.current) {
          setNotice("Tap call again and he'll answer your last question.");
          return;
        }
        setNotice(
          reason === "silence"
            ? "Didn't hear anything — tap the orb to talk again."
            : "Nobody spoke — tap the orb to talk again."
        );
      },
    }),
    [pushTurn, reviewHeard, reviewWanted, flushHeld]
  );

  // a written question is held back while the knowledge he was handed settles, and
  // the hold is shown as him working
  const holdForKnowledge = useCallback(async (engine) => {
    engine.setAwaiting?.(true);
    await wait(TYPED_HOLD_MS);
  }, []);

  const start = useCallback(
    async ({ withMic = true, firstMessage = "", onAnswered, silent = false } = {}) => {
      const existing = socketRef.current;
      if (onAnswered) answeredRef.current = onAnswered;
      const asked = String(firstMessage || "").trim();
      // a question that was left unanswered is the one he answers as the call opens
      const pending = pendingRef.current;
      const opening = asked || pending;
      const resuming = !asked && !!pending;
      // the line shows the moment it is sent, before the agent's own echo of it; a
      // question carried over is already on screen, so only its echo is filtered out
      if (asked) {
        sentRef.current = asked;
        pushTurn("user", asked);
      } else if (resuming) {
        sentRef.current = opening;
      }
      // a call already listening through the microphone carries on — so long as it is the
      // session of the mode in force; a session left over from the other mode is never
      // spoken into, it is ended first so the turn goes to the chosen mode
      if (existing?.connected && (!withMic || existing.micOn) && existing.mode === voiceMode()) {
        if (firstMessage) {
          if (silent) await holdForKnowledge(existing);
          existing.sendText(firstMessage);
        }
        return true;
      }
      if (existing?.connected) {
        socketRef.current = null;
        await existing.stop();
      }

      setError("");
      setNotice("");
      setStatus("connecting");
      // this attempt's own number, and the mode it is being made under: a switch taken while
      // the knowledge is still being read orphans the attempt here, so nothing opens under a
      // mode that is no longer the one in force
      const gen = ++sessionRef.current;
      const openingMode = voiceMode();
      const handlers = forSession(makeHandlers(), gen, sessionRef);
      // a session opened after he has spoken is a continuation of the same talk
      const said = linesRef.current;
      const laterTurn = said.length > 0;
      const memory = withStory(buildMemory(said), storyRef.current);
      // a request for a story, news, a word or a fact is looked up online before the
      // session opens, so the material is already in hand when he answers it, and a
      // fresh session starts with no lookup behind it
      wantedRef.current.text = opening;
      // a note held back belonged to the session being left behind
      heldRef.current = "";
      const [note, fresh] = await Promise.all([
        loadKnowledgeNote(opening),
        loadFreshMaterial(opening),
      ]);
      // both kinds of call are handed the admin's knowledge: the words the question
      // turns on, the guidance that goes with them, and anything just looked up
      const knowledge = withKnowledge(memory, withKnowledge(note, fresh));

      // the mode changed while the knowledge was being read: this call is not the one the
      // admin asked for, so it is left unopened and nothing of it reaches the room
      if (gen !== sessionRef.current || voiceMode() !== openingMode) return false;

      // The admin's own switch decides who answers, and each mode with an account of its own
      // answers on that account and nowhere else: Base44 mode's spoken voice on the admin's
      // second, separate account — its own key and its own agent, so Base44 is left to text and
      // chat alone — and Mbondo on his own third account, for everything he is asked, written or
      // spoken. Every other call keeps the original outside voice's standing account.
      const account =
        openingMode === "base44" && withMic
          ? "second"
          : openingMode === "mbondo"
            ? "third"
            : "";
      const ownVoice = account !== "";
      if (openingMode === "base44" && !ownVoice) {
        const call = new Base44Call(handlers);
        // the mode this session answers under, so a later switch knows to end it
        call.mode = openingMode;
        socketRef.current = call;
        quietRef.current = silent;
        setMicActive(withMic);
        try {
          await call.open({ withMic, silent, memory: knowledge });
          if (opening) call.sendText(opening, { speak: withMic });
          return true;
        } catch (err) {
          setError(
            err?.response?.data?.error || err?.message || "Could not start the conversation."
          );
          setStatus("idle");
          setMicActive(false);
          socketRef.current = null;
          await call.stop();
          return false;
        }
      }

      // when the owner's face is in place the call runs through it, with the same
      // ElevenLabs agent answering behind it. Typing is answered in writing, so it
      // never opens the face or the speaker — and neither does a call answered on an
      // account of its own: the face belongs to the original outside voice, so Base44
      // mode's spoken call and every Mbondo call run without it
      if (!silent && !ownVoice && faceReadyRef.current && videoRef?.current) {
        const call = new AvatarCall(handlers);
        call.mode = openingMode;
        socketRef.current = call;
        quietRef.current = false;
        setMicActive(withMic);
        try {
          await call.open({
            withMic,
            videoEl: videoRef.current,
            memory: knowledge,
            laterTurn,
            resuming,
          });
          setAvatarLive(true);
          if (opening) call.sendText(opening);
          return true;
        } catch (err) {
          // Keep voice available, but explain why the face could not start.
          await call.stop();
          socketRef.current = null;
          setAvatarLive(false);
          setNotice(`${err?.response?.data?.error || err?.message || "Live avatar unavailable."} Continuing with voice only.`);
        }
      }

      const socket = new VoiceSocket(handlers);
      socket.mode = openingMode;
      socketRef.current = socket;
      quietRef.current = silent;
      setMicActive(withMic);

      try {
        await socket.open({
          withMic,
          silent,
          memory: knowledge,
          laterTurn,
          resuming,
          // the account this mode answers on: the second for Base44's spoken call, the third
          // for Mbondo, and the standing one otherwise
          account,
        });
        if (opening) {
          // a typed question goes in once the note has settled, not the moment the
          // session opens; a question carried over from the last call is answered
          // straight away, since the note was handed over as the session opened
          if (!resuming) await holdForKnowledge(socket);
          if (socketRef.current === socket) socket.sendText(opening);
        }
        return true;
      } catch (err) {
        setError(
          err?.response?.data?.error || err?.message || "Could not start the conversation."
        );
        setStatus("idle");
        setMicActive(false);
        socketRef.current = null;
        await socket.stop();
        return false;
      }
    },
    [holdForKnowledge, makeHandlers, pushTurn, videoRef]
  );

  const stop = useCallback(async () => {
    // the session being ended is orphaned, so a reply already on its way is dropped rather
    // than put on screen and charged for after the person has stopped the call
    sessionRef.current += 1;
    const socket = socketRef.current;
    socketRef.current = null;
    setSpeaking(false);
    setThinking(false);
    setMicActive(false);
    setAvatarLive(false);
    setStatus("idle");
    if (socket) await socket.stop();
  }, []);

  const sendText = useCallback(
    (text) => {
      sentRef.current = text.trim();
      pushTurn("user", text);
      return socketRef.current?.sendText(text);
    },
    [pushTurn]
  );

  useEffect(() => {
    if (status !== "live") {
      levelRef.current = 0;
      return undefined;
    }
    const tick = () => {
      levelRef.current = socketRef.current?.level?.() || 0;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [status]);

  useEffect(
    () => () => {
      if (socketRef.current) socketRef.current.stop();
    },
    []
  );

  return {
    status,
    speaking,
    thinking,
    micActive,
    turns,
    error,
    notice,
    levelRef,
    avatarReady,
    avatarLive,
    connected: status === "live",
    start,
    stop,
    sendText,
  };
}