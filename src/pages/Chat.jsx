import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { otherMember, sendPhoto, sendText, threadMessages } from "@/lib/chat";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatComposer from "@/components/chat/ChatComposer";

export default function Chat() {
  const { threadId } = useParams();
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [thread, setThread] = useState(null);
  const [other, setOther] = useState(null);
  const [messages, setMessages] = useState([]);
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    base44.auth
      .me()
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    if (!me) return undefined;
    let alive = true;
    (async () => {
      const loaded = await base44.entities.ChatThread.get(threadId).catch(() => null);
      if (!alive) return;
      setThread(loaded);
      if (!loaded) {
        setReady(true);
        return;
      }
      const peer = otherMember(loaded, me.email);
      const [lines, found] = await Promise.all([
        threadMessages(threadId),
        base44.entities.Profile.filter({ user_email: peer }, { limit: 1 }),
      ]);
      if (!alive) return;
      setMessages(lines);
      setOther(found?.items?.[0] || { user_email: peer, username: peer.split("@")[0] });
      setReady(true);
    })();

    const unsubscribe = base44.entities.ChatMessage.subscribe((event) => {
      const line = event?.data;
      if (!line || line.thread_id !== threadId || event.type !== "create") return;
      setMessages((prev) => (prev.some((item) => item.id === line.id) ? prev : [...prev, line]));
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [me, threadId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const add = (line) =>
    setMessages((prev) => (prev.some((item) => item.id === line.id) ? prev : [...prev, line]));

  const sendLine = async (text) => {
    setSending(true);
    try {
      add(await sendText(thread, me.email, text));
    } finally {
      setSending(false);
    }
  };

  const sendPhotoLine = async (file) => {
    setSending(true);
    try {
      add(await sendPhoto(thread, me.email, file));
    } finally {
      setSending(false);
    }
  };

  if (!ready) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="text-[15px] text-muted-foreground">This conversation is no longer here.</p>
        <button
          type="button"
          onClick={() => navigate("/messages")}
          className="rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background"
        >
          Back to messages
        </button>
      </div>
    );
  }

  const username = other?.username || (other?.user_email || "").split("@")[0] || "friend";

  return (
    <div className="flex h-full w-full flex-col bg-background">
      <header className="flex shrink-0 items-center gap-2.5 border-b border-border px-4 pb-2.5 pt-[max(0.6rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => navigate("/messages")}
          aria-label="Back"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-card/70"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => navigate(`/u/${other?.user_email}`)}
          aria-label={`Open @${username}'s profile`}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-[13px] font-semibold uppercase text-muted-foreground">
            {other?.avatar_url ? (
              <Image
                src={other.avatar_url}
                alt=""
                focalPointX={other.avatar_crop_x}
                focalPointY={other.avatar_crop_y}
                className="h-9 w-9"
              />
            ) : (
              username.slice(0, 1)
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-medium">@{username}</span>
            <span className="block text-[11px] text-muted-foreground">Tap for profile</span>
          </span>
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-none px-4 py-4">
        {messages.length ? (
          messages.map((line) => (
            <MessageBubble key={line.id} message={line} mine={line.sender_email === me.email} />
          ))
        ) : (
          <p className="py-10 text-center text-[13px] text-muted-foreground">
            Say hello to @{username}.
          </p>
        )}
        <div ref={endRef} />
      </div>

      <div className="shrink-0 px-3 pb-[max(0.7rem,env(safe-area-inset-bottom))] pt-1">
        <ChatComposer onSendText={sendLine} onSendPhoto={sendPhotoLine} sending={sending} />
      </div>
    </div>
  );
}