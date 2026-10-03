import React, { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { GIFTS } from "@/lib/coins";

export default function LiveChat({
  room,
  me,
  username,
  canChat,
  canGift,
  onGift,
  gifting,
  onOpenProfile,
}) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    let alive = true;
    base44.entities.LiveMessage.filter(
      { room_id: room.id },
      { sort: "-created_date", limit: 50 }
    ).then((page) => {
      if (alive) setMessages((page?.items || []).slice().reverse());
    });
    const unsubscribe = base44.entities.LiveMessage.subscribe((event) => {
      const line = event.data;
      if (!line || line.room_id !== room.id || event.type !== "create") return;
      setMessages((prev) => (prev.some((item) => item.id === line.id) ? prev : [...prev, line]));
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [room.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const sendGift = async (gift) => {
    const spent = await onGift(gift);
    if (!spent) return;
    const line = await base44.entities.LiveMessage.create({
      room_id: room.id,
      author_email: me.email,
      author_username: username || "viewer",
      kind: "gift",
      text: `${gift.emoji} sent a ${gift.name}`,
      gift_name: gift.name,
      gift_coins: gift.coins,
    });
    setMessages((prev) => (prev.some((item) => item.id === line.id) ? prev : [...prev, line]));
  };

  const send = async (event) => {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText("");
    const line = await base44.entities.LiveMessage.create({
      room_id: room.id,
      author_email: me.email,
      author_username: username || "viewer",
      kind: "chat",
      text: value,
    });
    setMessages((prev) => (prev.some((item) => item.id === line.id) ? prev : [...prev, line]));
  };

  return (
    <section className="flex flex-col gap-2">
      <div className="max-h-[30vh] min-h-[4.5rem] space-y-2 overflow-y-auto px-1">
        {messages.length ? (
          messages.map((line) =>
            line.kind === "gift" ? (
              <p
                key={line.id}
                className="rounded-2xl bg-accent/15 px-3 py-2 text-[13px] font-medium text-accent"
              >
                {line.text} · {line.gift_coins} coins
              </p>
            ) : (
              <p key={line.id} className="text-[13px] leading-snug text-white">
                <button
                  type="button"
                  onClick={() => onOpenProfile?.(line.author_email)}
                  className="font-semibold text-white/70 underline-offset-2 hover:underline"
                >
                  @{line.author_username || "friend"}
                </button>{" "}
                {line.text}
              </p>
            )
          )
        ) : (
          <p className="py-4 text-center text-[13px] text-white/40">No messages yet.</p>
        )}
        <div ref={endRef} />
      </div>

      {canChat ? (
        <div className="space-y-2">
          {canGift ? (
            <div className="flex gap-2">
              {GIFTS.map((gift) => (
                <button
                  key={gift.id}
                  type="button"
                  onClick={() => sendGift(gift)}
                  disabled={gifting}
                  className="flex-1 rounded-full bg-white/10 px-3 py-2 text-[12px] font-semibold text-white"
                >
                  {gift.emoji} {gift.name} · {gift.coins}
                </button>
              ))}
            </div>
          ) : null}
          <form onSubmit={send} className="flex items-center gap-2">
            <Input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Say something…"
              aria-label="Message the room"
              className="h-10 flex-1 border-white/15 bg-white/10 text-[14px] text-white"
            />
            <button
              type="submit"
              aria-label="Send"
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                text.trim() ? "bg-accent text-accent-foreground" : "bg-white/10 text-white/40"
              }`}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : (
        <p className="px-1 text-center text-[12px] text-white/40">
          This live has ended.
        </p>
      )}
    </section>
  );
}