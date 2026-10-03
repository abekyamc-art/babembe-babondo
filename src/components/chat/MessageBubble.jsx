import React from "react";
import { cn } from "@/lib/utils";
import ChatPhoto from "@/components/chat/ChatPhoto";

export default function MessageBubble({ message, mine }) {
  const photo = message.kind === "photo";

  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "conversation-text max-w-[78%] overflow-hidden rounded-2xl text-[14px] leading-snug",
          photo ? "p-1" : "px-3.5 py-2",
          mine ? "bg-foreground text-background" : "bg-secondary text-foreground"
        )}
      >
        {photo ? (
          <ChatPhoto fileUri={message.file_uri} />
        ) : (
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
        )}
      </div>
    </div>
  );
}