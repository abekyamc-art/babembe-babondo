import React, { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { playEffect } from "@/lib/soundEffects";

export default function LiveChat({
  room,
  me,
  username,
  canChat,
  onGift,
  giftRequest,
  effectRequest,
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
      if (line.kind === "effect" && line.author_email !== me.email) playEffect(line.effect_id);
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

  // a line is on screen the moment it is sent, and leaves again only if it could not be saved
  const showAtOnce = (line) => setMessages((prev) => [...prev, line]);

  const settle = (pending, line) =>
    setMessages((prev) => [
      ...prev.filter((item) => item.id !== pending && item.id !== line.id),
      line,
    ]);

  const withdraw = (pending) =>
    setMessages((prev) => prev.filter((item) => item.id !== pending));

  const sendGift = async (gift) => {
    const spent = await onGift(gift);
    if (!spent) return;
    const pending = `local-${Date.now()}`;
    const announcement = `${gift.emoji} sent a ${gift.name}`;
    showAtOnce({
      id: pending,
      room_id: room.id,
      author_email: me.email,
      author_username: username || "viewer",
      kind: "gift",
      text: announcement,
      gift_name: gift.name,
      gift_coins: gift.coins,
    });
    try {
      settle(
        pending,
        await base44.entities.LiveMessage.create({
          room_id: room.id,
          author_email: me.email,
          author_username: username || "viewer",
          kind: "gift",
          text: announcement,
          gift_name: gift.name,
          gift_coins: gift.coins,
        })
      );
    } catch (err) {
      withdraw(pending);
    }
  };

  const sendEffect = async (effect) => {
    playEffect(effect.id);
    const line = await base44.entities.LiveMessage.create({
      room_id: room.id,
      author_email: me.email,
      author_username: username || "viewer",
      kind: "effect",
      effect_id: effect.id,
      text: `${effect.emoji} played ${effect.name}`,
    });
    setMessages((prev) => (prev.some((item) => item.id === line.id) ? prev : [...prev, line]));
  };

  // the room's controls ask for a gift or a sound by handing over a new request
  useEffect(() => {
    if (giftRequest?.at) sendGift(giftRequest.gift);
  }, [giftRequest?.at]);

  useEffect(() => {
    if (effectRequest?.at) sendEffect(effectRequest.effect);
  }, [effectRequest?.at]);

  const send = async (event) => {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText("");
    const pending = `local-${Date.now()}`;
    showAtOnce({
      id: pending,
      room_id: room.id,
      author_email: me.email,
      author_username: username || "viewer",
      kind: "chat",
      text: value,
    });
    try {
      settle(
        pending,
        await base44.entities.LiveMessage.create({
          room_id: room.id,
          author_email: me.email,
          author_username: username || "viewer",
          kind: "chat",
          text: value,
        })
      );
    } catch (err) {
      withdraw(pending);
    }
  };

  return (
    <section className="flex flex-col gap-2">
      <div className="max-h-[30dvh] min-h-[4.5rem] space-y-2 overflow-y-auto overscroll-none px-1">
        {messages.length ? (
          messages.map((line) =>
            line.kind === "effect" ? (
              <p
                key={line.id}
                className="rounded-2xl bg-accent/10 px-3 py-2 text-[12px] font-semibold text-accent/90"
              >
                {line.text}
              </p>
            ) : line.kind === "gift" ? (
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