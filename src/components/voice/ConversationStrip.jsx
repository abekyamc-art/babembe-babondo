import React, { useEffect, useRef } from "react";

// only the newest lines stay on screen: ten at most, both sides counted together
const SHOWN = 10;

export default function ConversationStrip({ turns }) {
  const ref = useRef(null);
  const shown = turns.slice(-SHOWN);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns]);

  if (!shown.length) return null;

  return (
    <div ref={ref} className="h-full w-full overflow-y-auto overscroll-contain px-1">
      <div className="flex flex-col gap-2.5 pb-1">
        {shown.map((turn, index) => (
          <div
            key={`${turn.role}-${index}`}
            className={turn.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <p
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] leading-snug ${
                turn.role === "user"
                  ? "rounded-br-md bg-foreground text-background"
                  : "rounded-bl-md border border-border bg-card text-foreground"
              }`}
            >
              {turn.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}