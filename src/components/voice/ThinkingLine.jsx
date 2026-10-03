import React from "react";
import TypingDots from "@/components/voice/TypingDots";

/**
 * The one way the app shows him working: the dots he has always had, with the word
 * beside them. It is drawn twice while a question is being answered — in the
 * conversation, and just above the message box — so the progress is never missed.
 */
export default function ThinkingLine({ className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-[12px] font-medium text-muted-foreground ${className}`}
    >
      <TypingDots />
      Thinking…
    </span>
  );
}