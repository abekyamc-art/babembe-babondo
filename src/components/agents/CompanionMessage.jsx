import React from "react";
import ReactMarkdown from "react-markdown";
import ToolCallList from "@/components/agents/ToolCallList";
import AnswerReport from "@/components/moderation/AnswerReport";

/**
 * One line of the companion's talk: what the person wrote, or what the companion answered. An answer
 * is read as it was written — its lists, its headings and its links — and whatever it did to give the
 * answer stands beneath it.
 */
export default function CompanionMessage({ message }) {
  const mine = message.role === "user";
  const frame = mine
    ? "max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 font-body text-[15px] leading-relaxed text-primary-foreground"
    : "max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-card px-4 py-2.5 font-body text-[15px] leading-relaxed break-words text-card-foreground";

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={frame}>
        {mine ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="space-y-2 [&_a]:underline [&_a]:decoration-dotted [&_a]:underline-offset-2 [&_li]:ml-4 [&_li]:list-disc [&_ol>li]:list-decimal">
            <ReactMarkdown
              components={{
                a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
              }}
            >
              {message.content || ""}
            </ReactMarkdown>
          </div>
        )}
        <ToolCallList calls={message.tool_calls} />
        {/* the companion's own words are the app's content, and may be reported like anything else */}
        {mine ? null : <AnswerReport text={message.content || ""} />}
      </div>
    </div>
  );
}