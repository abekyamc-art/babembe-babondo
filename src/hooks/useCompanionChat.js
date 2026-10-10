import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { noteKibembeSession } from "@/lib/kpiEvents";

/** The agent the companion screen talks to: Gloire AI's own live Kibembe companion. */
const AGENT = "gloire-kibembe-live-companion";
// the standing talk is remembered on the phone, so the screen opens on the conversation it left
const STORE_KEY = "gloire-companion-conversation";

/**
 * The companion's own conversation: the app's Gloire AI agent answers it — with the complete confirmed
 * Word Bank, the languages it is asked for, and its approved tools — and the talk stands from one
 * visit to the next. Nothing is held back while an answer is written: what is on the screen is the
 * conversation itself, streamed in as it is written.
 */
export default function useCompanionChat() {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  // the conversation as it stands, kept because the message is added to the whole object
  const conversationRef = useRef(null);
  // the session is counted once, on the first turn asked of it
  const countedRef = useRef(false);

  const open = useCallback(async (id) => {
    setError("");
    setSending(false);
    try {
      let conversation = null;
      if (id) {
        // a conversation that has been cleared away is never an error: a new one is simply begun
        try {
          conversation = await base44.agents.getConversation(id);
        } catch (err) {
          conversation = null;
        }
      }
      if (!conversation) {
        conversation = await base44.agents.createConversation({
          agent_name: AGENT,
          metadata: { name: "Kibembe companion", description: "Live Kibembe conversation" },
        });
      }
      conversationRef.current = conversation;
      window.localStorage.setItem(STORE_KEY, conversation.id);
      setMessages(conversation.messages || []);
      setConversationId(conversation.id);
    } catch (err) {
      setError("The companion couldn't be opened just now — please try again.");
    }
  }, []);

  // the standing talk is opened once, when the screen arrives
  useEffect(() => {
    open(window.localStorage.getItem(STORE_KEY) || "");
  }, [open]);

  // every answer is streamed in as it is written, so the screen is the conversation itself
  useEffect(() => {
    if (!conversationId) return undefined;
    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      if (data?.messages) conversationRef.current = { ...conversationRef.current, ...data };
      setMessages(data?.messages || []);
      setSending(false);
    });
    return () => unsubscribe();
  }, [conversationId]);

  /** One turn of the person's, put to the companion. */
  const send = useCallback(
    async (text) => {
      const message = String(text || "").trim();
      const conversation = conversationRef.current;
      if (!message || !conversation || sending) return;
      if (!countedRef.current) {
        countedRef.current = true;
        noteKibembeSession();
      }
      setError("");
      setSending(true);
      try {
        await base44.agents.addMessage(conversation, { role: "user", content: message });
      } catch (err) {
        setSending(false);
        setError("That message didn't go through — please try again.");
      }
    },
    [sending]
  );

  /** A new talk is begun, and the standing one is left behind. */
  const restart = useCallback(async () => {
    setMessages([]);
    setConversationId("");
    await open("");
  }, [open]);

  return { messages, sending, error, send, restart };
}