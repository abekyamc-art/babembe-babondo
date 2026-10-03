import React, { useRef, useState } from "react";
import { ArrowUp, ImagePlus, Loader2 } from "lucide-react";

export default function ChatComposer({ onSendText, onSendPhoto, sending }) {
  const [text, setText] = useState("");
  const fileRef = useRef(null);
  const canSend = text.trim().length > 0 && !sending;

  const submit = (event) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setText("");
    onSendText(value);
  };

  const pick = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onSendPhoto(file);
  };

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-1.5 rounded-[1.6rem] border border-border bg-card/80 p-1.5 pl-2 shadow-sm backdrop-blur-xl"
    >
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={sending}
        aria-label="Send a photo"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        {sending ? (
          <Loader2 className="h-[18px] w-[18px] animate-spin" />
        ) : (
          <ImagePlus className="h-[18px] w-[18px]" />
        )}
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Write a message…"
        aria-label="Message"
        className="h-10 min-w-0 flex-1 bg-transparent px-1 text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
      />
      <button
        type="submit"
        disabled={!canSend}
        aria-label="Send message"
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-all ${
          canSend ? "bg-foreground text-background active:scale-95" : "bg-secondary text-muted-foreground"
        }`}
      >
        <ArrowUp className="h-[18px] w-[18px]" />
      </button>
    </form>
  );
}