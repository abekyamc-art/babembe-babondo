import { useCallback, useEffect, useRef, useState } from "react";
import VoiceSocket from "@/lib/elevenLabsSocket";
import AvatarCall from "@/lib/avatarCall";
import { base44 } from "@/api/base44Client";

export default function useVoiceAgent({ videoRef } = {}) {
  const socketRef = useRef(null);
  const levelRef = useRef(0);
  const rafRef = useRef(0);
  // the answer is always charged through the handler as the allowance stands right
  // now, not the one captured when the conversation first opened
  const answeredRef = useRef(null);
  // whether the owner's face is available at all; the answer arrives once, on load
  const faceReadyRef = useRef(false);

  const [status, setStatus] = useState("idle");
  const [speaking, setSpeaking] = useState(false);
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
          setMicActive(false);
          setAvatarLive(false);
          socketRef.current = null;
        }
      },
      onUserText: (text) => pushTurn("user", text),
      onAgentText: (text) => pushTurn("agent", text),
      onAgentAudioStart: () => setSpeaking(true),
      onAgentAudioEnd: () => setSpeaking(false),
      onInterrupted: () => setSpeaking(false),
      onAgentAnswered: () => answeredRef.current?.(),
      onAutoEnd: ({ reason }) => {
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
    async ({ withMic = true, firstMessage = "", onAnswered } = {}) => {
      const existing = socketRef.current;
      if (onAnswered) answeredRef.current = onAnswered;
      if (existing?.connected) {
        if (firstMessage) existing.sendText(firstMessage);
        return true;
      }

      setError("");
      setNotice("");
      setStatus("connecting");
      const handlers = makeHandlers();

      // when the owner's face is in place the call runs through it, with the same
      // ElevenLabs agent answering behind it
      if (faceReadyRef.current && videoRef?.current) {
        const call = new AvatarCall(handlers);
        socketRef.current = call;
        setMicActive(withMic);
        try {
          await call.open({ withMic, videoEl: videoRef.current });
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
      setMicActive(withMic);

      try {
        await socket.open({ withMic });
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
    [makeHandlers, videoRef]
  );

  const stop = useCallback(async () => {
    const socket = socketRef.current;
    socketRef.current = null;
    setSpeaking(false);
    setMicActive(false);
    setAvatarLive(false);
    setStatus("idle");
    if (socket) await socket.stop();
  }, []);

  const sendText = useCallback((text) => socketRef.current?.sendText(text), []);

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