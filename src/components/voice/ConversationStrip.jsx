import React, { useEffect, useRef } from "react";
import ThinkingLine from "@/components/voice/ThinkingLine";

// only the newest lines stay on screen: ten at most, both sides counted together
const SHOWN = 10;

export default function ConversationStrip({ turns, pending }) {
  const ref = useRef(null);
  // the writing line is a line too, so it takes one of the ten places
  const shown = turns.slice(-(pending ? SHOWN - 1 : SHOWN));

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, pending]);

  if (!shown.length && !pending) return null;

  return (
    <div ref={ref} className="h-full w-full overflow-y-auto overscroll-none px-1">
      <div className="flex flex-col gap-2.5 pb-1">
        {shown.map((turn, index) => (
          <div
            key={`${turn.role}-${index}`}
            className={turn.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <p
              className={`conversation-text max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] leading-snug ${
                turn.role === "user"
                  ? "rounded-br-md bg-foreground text-background"
                  : "rounded-bl-md border border-border bg-card text-foreground"
              }`}
            >
              {turn.text}
            </p>
          </div>
        ))}
        {pending ? (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-border bg-card px-3.5 py-2.5">
              <ThinkingLine className="text-foreground" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}