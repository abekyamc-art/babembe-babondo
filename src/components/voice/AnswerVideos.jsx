import React from "react";
import { ExternalLink, PlayCircle } from "lucide-react";
import { viewsText } from "@/lib/channelSync";

/**
 * The artist's own videos standing under the answer that named them: the same five the answer speaks,
 * the most watched first, each one a link that opens where it already stands.
 *
 * Nothing is added here and nothing is guessed: what stands is what the artist's own channel gave, and
 * a piece the channel gave no count for simply carries no count.
 */
export default function AnswerVideos({ videos = [] }) {
  const rows = (Array.isArray(videos) ? videos : []).filter((row) => row?.url);
  if (!rows.length) return null;
  const counted = rows.some((row) => Number(row.views) > 0);

  return (
    <div className="mt-2 flex flex-col gap-1.5 rounded-xl border border-border bg-muted/40 p-2.5">
      <span className="font-body text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {counted ? "Most watched · the artist's channel" : "The artist's own videos"}
      </span>

      {rows.map((row, index) => (
        <a
          key={`${row.url}-${index}`}
          href={row.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-start justify-between gap-2 text-[12px] leading-snug text-accent transition active:opacity-70"
        >
          <span className="flex min-w-0 items-start gap-1.5">
            <PlayCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate underline decoration-dotted underline-offset-2">
                {row.name || "A video by the artist"}
              </span>
              {viewsText(row.views) ? (
                <span className="block font-body text-[10px] text-muted-foreground">
                  {viewsText(row.views)}
                </span>
              ) : null}
            </span>
          </span>
          <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        </a>
      ))}
    </div>
  );
}