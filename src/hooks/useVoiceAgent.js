import { useCallback, useEffect, useRef, useState } from "react";
import VoiceSocket from "@/lib/elevenLabsSocket";
import AvatarCall from "@/lib/avatarCall";
import { base44 } from "@/api/base44Client";
import { buildMemory } from "@/lib/agentMemory";
import { loadFreshMaterial, loadKnowledgeNote, withKnowledge } from "@/lib/knowledge";

// the knowledge note travels in blocks and needs a beat to settle before the
// question is put to him, so he reads it before he answers; the wait is shown as
// him working
const TYPED_HOLD_MS = 8000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

  const pushTurn = useCallback((role, text) => {
    if (role === "agent" && text) linesRef.current = [...linesRef.current, text];
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
        if (note && engine && !engine.silent) engine.sendMemory?.(note);
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
      if (material && engine && !engine.silent) engine.sendMemory?.(material);
    }, 350);
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
      onAgentAudioEnd: () => setSpeaking(false),
      onInterrupted: () => setSpeaking(false),
      onAgentAnswered: () => answeredRef.current?.(),
      onAutoEnd: ({ reason }) => {
        // a written exchange is already answered on screen, so it ends without a note
        if (quietRef.current) return;
        setNotice(
          reason === "silence"
            ? "Didn't hear anything — tap the orb to talk again."
            : "Nobody spoke — tap the orb to talk again."
        );
      },
    }),
    [pushTurn, reviewHeard, reviewWanted]
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
      // the line shows the moment it is sent, before the agent's own echo of it
      if (firstMessage) {
        sentRef.current = firstMessage.trim();
        pushTurn("user", firstMessage);
      }
      // a call already listening through the microphone carries on; a written session
      // gives way the moment the microphone is asked for
      if (existing?.connected && (!withMic || existing.micOn)) {
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
      const handlers = makeHandlers();
      // a session opened after he has spoken is a continuation of the same talk
      const said = linesRef.current;
      const laterTurn = said.length > 0;
      const memory = buildMemory(said);
      // a request for a story, news, a word or a fact is looked up online before the
      // session opens, so the material is already in hand when he answers it
      const asked = String(firstMessage || "").trim();
      // a fresh session starts with no lookup behind it, so a spoken turn is always
      // looked up for itself
      wantedRef.current.text = asked;
      const [note, fresh] = await Promise.all([
        loadKnowledgeNote(firstMessage),
        loadFreshMaterial(asked),
      ]);
      // both kinds of call are handed the admin's knowledge: the words the question
      // turns on, the guidance that goes with them, and anything just looked up
      const knowledge = withKnowledge(memory, withKnowledge(note, fresh));

      // when the owner's face is in place the call runs through it, with the same
      // ElevenLabs agent answering behind it. Typing is answered in writing, so it
      // never opens the face or the speaker
      if (!silent && faceReadyRef.current && videoRef?.current) {
        const call = new AvatarCall(handlers);
        socketRef.current = call;
        quietRef.current = false;
        setMicActive(withMic);
        try {
          await call.open({ withMic, videoEl: videoRef.current, memory: knowledge, laterTurn });
          setAvatarLive(true);
          if (firstMessage) call.sendText(firstMessage);
          return true;
        } catch (err) {
          // the face is a bonus: the conversation carries on by voice alone
          socketRef.current = null;
          setAvatarLive(false);
        }
      }

      const socket = new VoiceSocket(handlers);
      socketRef.current = socket;
      quietRef.current = silent;
      setMicActive(withMic);

      try {
        await socket.open({ withMic, silent, memory: knowledge, laterTurn });
        if (firstMessage) {
          // the question goes in once the note has settled, not the moment the
          // session opens
          await holdForKnowledge(socket);
          if (socketRef.current === socket) socket.sendText(firstMessage);
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