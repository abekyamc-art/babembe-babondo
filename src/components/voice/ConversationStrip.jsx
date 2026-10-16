import React, { useEffect, useRef } from "react";
import ThinkingLine from "@/components/voice/ThinkingLine";
import HeardTurn from "@/components/voice/HeardTurn";
import AnswerText from "@/components/kibembe/AnswerText";
import AnswerPictures from "@/components/kibembe/AnswerPictures";
import AskNames from "@/components/kibembe/AskNames";
import AnswerVideos from "@/components/voice/AnswerVideos";
import AnswerReport from "@/components/moderation/AnswerReport";

// only the newest lines stay on screen: ten at most, both sides counted together
const SHOWN = 10;

export default function ConversationStrip({ turns, pending, onCorrectTurn, onPick, onPlayVideo }) {
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
                  onCorrect={(text) => onCorrectTurn(at, text, turn.text)}
                />
              ) : (
                // an answer the admin gave a picture to stands with that picture at its own word, and
                // again in the strip beneath the words
                <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-card px-3.5 py-2 text-[13px] leading-snug text-foreground">
                  <p className="conversation-text">
                    <AnswerText text={turn.text} pictures={turn.pictures} />
                  </p>
                  <AnswerPictures pictures={turn.pictures} />
                  {/* the artist's own videos, when the answer named them: the same five links the
                      answer gives in its own words, standing here to be followed with a tap */}
                  <AnswerVideos videos={turn.videos} onPlay={onPlayVideo} />
                  {/* several people or artists came back under names that look alike: the names stand
                      here, and a tap names the one the person means */}
                  <AskNames names={turn.choices} onPick={onPick} />
                  {/* where an answer was given from something looked up on the internet, where it
                      came from is named with its own address, so it can be read and followed */}
                  {turn.source?.url ? (
                    <a
                      href={turn.source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1.5 block truncate text-[11px] text-muted-foreground underline decoration-dotted underline-offset-2"
                    >
                      Source: {turn.source.label || "online"} — {turn.source.url}
                    </a>
                  ) : null}
                  {/* the assistant's own words are the app's content, and a person may report them the
                      way they report anything else they meet in the app */}
                  <AnswerReport text={turn.text} className="font-body" />
                </div>
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