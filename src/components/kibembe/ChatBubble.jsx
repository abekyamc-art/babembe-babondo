import React from "react";
import AnswerText from "@/components/kibembe/AnswerText";
import AnswerPictures from "@/components/kibembe/AnswerPictures";

/**
 * One line of the talk: what the person wrote, or what the assistant answered — and, where the admin
 * saved a picture beside a word the answer is made of, that picture stands in the answer at its word
 * and again below it.
 */
export default function ChatBubble({ role, text, pictures = [], source = null }) {
  const mine = role === "user";
  const frame = mine
    ? "max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 font-body text-[15px] leading-relaxed text-primary-foreground"
    : "max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-card px-4 py-2.5 font-body text-[15px] leading-relaxed text-card-foreground";

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={frame}>
        <p>{mine ? text : <AnswerText text={text} pictures={pictures} />}</p>
        {mine ? null : <AnswerPictures pictures={pictures} />}
        {/* where an answer was given from something looked up on the internet, where it came from is
            named with its own address, so it can be read and followed */}
        {!mine && source?.url ? (
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block truncate font-body text-[11px] text-muted-foreground underline decoration-dotted underline-offset-2"
          >
            Source: {source.label || "online"} — {source.url}
          </a>
        ) : null}
      </div>
    </div>
  );
}