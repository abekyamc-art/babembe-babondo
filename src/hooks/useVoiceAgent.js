import { useCallback, useEffect, useRef, useState } from "react";
import VoiceSocket from "@/lib/elevenLabsSocket";

export default function useVoiceAgent() {
  const socketRef = useRef(null);
  const levelRef = useRef(0);
  const rafRef = useRef(0);

  const [status, setStatus] = useState("idle");
  const [speaking, setSpeaking] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [turns, setTurns] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const pushTurn = useCallback((role, text) => {
    setTurns((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role) {
        return [...prev.slice(0, -1), { role, text }];
      }
      return [...prev, { role, text }];
    });
  }, []);

  const start = useCallback(
    async ({ withMic = true, firstMessage = "", onAnswered } = {}) => {
      const existing = socketRef.current;
      if (existing?.connected) {
        if (firstMessage) existing.sendText(firstMessage);
        return true;
      }

      setError("");
      setNotice("");
      setStatus("connecting");

      const socket = new VoiceSocket({
        onStatus: (next) => {
          if (next === "live") setStatus("live");
          if (next === "closed" || next === "ended") {
            setStatus("idle");
            setSpeaking(false);
            setMicActive(false);
            socketRef.current = null;
          }
        },
        onUserText: (text) => pushTurn("user", text),
        onAgentText: (text) => pushTurn("agent", text),
        onAgentAudioStart: () => setSpeaking(true),
        onAgentAudioEnd: () => setSpeaking(false),
        onInterrupted: () => setSpeaking(false),
        onAgentAnswered: () => onAnswered?.(),
        onAutoEnd: ({ reason, answered }) => {
          if (answered) return;
          setNotice(
            reason === "timeout"
              ? "Didn't hear anything — tap the orb to talk again."
              : "Call ended — tap the orb to talk again."
          );
        },
      });

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
    [pushTurn]
  );

  const stop = useCallback(async () => {
    const socket = socketRef.current;
    socketRef.current = null;
    setSpeaking(false);
    setMicActive(false);
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
    connected: status === "live",
    start,
    stop,
    sendText,
  };
}