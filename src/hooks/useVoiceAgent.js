import { useCallback, useEffect, useRef, useState } from "react";
import VoiceSocket from "@/lib/elevenLabsSocket";
import AvatarCall from "@/lib/avatarCall";
import { base44 } from "@/api/base44Client";
import { buildMemory } from "@/lib/agentMemory";
import { loadKnowledgeNote, withKnowledge } from "@/lib/knowledge";

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
            : "Call ended — tap the orb to talk again."
        );
      },
    }),
    [pushTurn]
  );

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
        if (firstMessage) existing.sendText(firstMessage);
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

      // when the owner's face is in place the call runs through it, with the same
      // ElevenLabs agent answering behind it. Typing is answered in writing, so it
      // never opens the face or the speaker
      if (!silent && faceReadyRef.current && videoRef?.current) {
        const call = new AvatarCall(handlers);
        socketRef.current = call;
        quietRef.current = false;
        setMicActive(withMic);
        try {
          await call.open({ withMic, videoEl: videoRef.current, memory });
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

      // a typed message is answered from the owner's own knowledge — the written
      // entries, plus the passages of his long texts that match this message
      const written = silent
        ? withKnowledge(memory, await loadKnowledgeNote(firstMessage))
        : memory;

      try {
        await socket.open({ withMic, silent, memory: written, laterTurn });
        if (firstMessage) socket.sendText(firstMessage);
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
    [makeHandlers, pushTurn, videoRef]
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