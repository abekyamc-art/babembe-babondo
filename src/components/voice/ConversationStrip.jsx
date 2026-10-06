import React, { useEffect, useRef } from "react";
import ThinkingLine from "@/components/voice/ThinkingLine";
import HeardTurn from "@/components/voice/HeardTurn";

// only the newest lines stay on screen: ten at most, both sides counted together
const SHOWN = 10;

export default function ConversationStrip({ turns, pending, onCorrectTurn }) {
  const ref = useRef(null);
  // the writing line is a line too, so it takes one of the ten places
  const shown = turns.slice(-(pending ? SHOWN - 1 : SHOWN));
  // what is on screen is the end of the talk, so a line's own place in the whole of it is counted
  // from there — which is what makes the person's newest turn the one they can put right
  const offset = turns.length - shown.length;

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, pending]);

  if (!shown.length && !pending) return null;

  return (
    <div ref={ref} className="h-full w-full overflow-y-auto overscroll-none px-1">
      <div className="flex flex-col gap-2.5 pb-1">
        {shown.map((turn, index) => {
          const at = offset + index;
          // the newest line of the talk being the person's own one means it is the turn the voice has
          // not answered yet, so it is the one they can put right
          const editable = turn.role === "user" && at === turns.length - 1 && !!onCorrectTurn;
          return (
            <div
              key={`${turn.role}-${at}`}
              className={turn.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              {turn.role === "user" ? (
                <HeardTurn
                  text={turn.text}
                  editable={editable}
                  onCorrect={(text) => onCorrectTurn(at, text)}
                />
              ) : (
                <p className="conversation-text max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-card px-3.5 py-2 text-[13px] leading-snug text-foreground">
                  {turn.text}
                </p>
              )}
            </div>
          );
        })}
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