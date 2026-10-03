import React, { useState } from "react";
import { ArrowUp, Mic } from "lucide-react";

export default function ChatInput({ onSend, onCall, inCall }) {
  const [text, setText] = useState("");
  const canSend = text.trim().length > 0;

  const submit = (event) => {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    onSend(value);
    setText("");
  };

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-1.5 rounded-[1.6rem] border border-border bg-card/80 p-1.5 pl-4 shadow-sm backdrop-blur-xl"
    >
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Write a message…"
        aria-label="Message"
        className="h-10 min-w-0 flex-1 bg-transparent px-0 text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
      />
      <button
        type="button"
        onClick={onCall}
        aria-label={inCall ? "End the voice call" : "Start a voice call"}
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors ${
          inCall
            ? "bg-destructive/10 text-destructive"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        }`}
      >
        <Mic className="h-[18px] w-[18px]" />
      </button>
      <button
        type="submit"
        disabled={!canSend}
        aria-label="Send message"
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-all ${
          canSend
            ? "bg-foreground text-background active:scale-95"
            : "bg-secondary text-muted-foreground"
        }`}
      >
        <ArrowUp className="h-[18px] w-[18px]" />
      </button>
    </form>
  );
}