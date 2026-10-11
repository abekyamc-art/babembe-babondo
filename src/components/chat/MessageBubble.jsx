import React from "react";
import { cn } from "@/lib/utils";
import ChatPhoto from "@/components/chat/ChatPhoto";

export default function MessageBubble({ message, mine }) {
  const photo = message.kind === "photo";

  return (
    <div className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
      <div
        className={cn(
          "conversation-text max-w-[78%] overflow-hidden rounded-2xl text-[14px] leading-snug",
          photo ? "p-1" : "px-3.5 py-2",
          mine ? "bg-foreground text-background" : "bg-secondary text-foreground"
        )}
      >
        {photo ? (
          <ChatPhoto fileUri={message.file_uri} localUrl={message.local_url} />
        ) : (
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
        )}
      </div>

      {message.pending ? (
        <span className="mt-1 px-1 text-[11px] text-muted-foreground">Sending…</span>
      ) : null}
      {message.failed ? (
        <span className="mt-1 px-1 text-[11px] text-destructive">Not sent</span>
      ) : null}
    </div>
  );
}