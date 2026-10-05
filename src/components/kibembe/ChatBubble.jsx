import React from "react";

/** One line of the talk: what the person wrote, or what the assistant answered. */
export default function ChatBubble({ role, text }) {
  const mine = role === "user";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <p
        className={
          mine
            ? "max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 font-body text-[15px] leading-relaxed text-primary-foreground"
            : "max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-card px-4 py-2.5 font-body text-[15px] leading-relaxed text-card-foreground"
        }
      >
        {text}
      </p>
    </div>
  );
}