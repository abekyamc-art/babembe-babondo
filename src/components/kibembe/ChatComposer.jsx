import React from "react";
import { Loader2, Send } from "lucide-react";

/** The message box and its send control. Enter sends; Shift+Enter starts a new line. */
export default function ChatComposer({ value, busy, onChange, onSend }) {
  const submit = () => {
    if (!busy && value.trim()) onSend();
  };

  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <textarea
        value={value}
        rows={1}
        placeholder="Andika ujumbe wako…"
        aria-label="Your message in Kibembe"
        className="max-h-32 min-h-[48px] flex-1 resize-none rounded-2xl border border-input bg-card px-4 py-3 font-body text-[15px] leading-snug text-card-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
      />
      <button
        type="submit"
        aria-label="Send"
        disabled={busy || !value.trim()}
        className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
      </button>
    </form>
  );
}