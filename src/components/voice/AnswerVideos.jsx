import React from "react";
import { ExternalLink, PlayCircle } from "lucide-react";
import { viewsText } from "@/lib/channelSync";

/**
 * The artist's own videos standing under the answer that named them: the same five the answer speaks,
 * the most watched first.
 *
 * Where the app's own player is reachable — `onPlay` — a piece is played inside the app: the row is a
 * button that stands the piece in the app's own player and starts it there, with the artist's other
 * listed pieces waiting behind it, and the player keeps its own way out to YouTube. Nowhere else, and
 * on a screen that holds no player of the app's own, the rows keep opening where the artist's videos
 * already stand.
 *
 * Nothing is added here and nothing is guessed: what stands is what the artist's own channel gave, and
 * a piece the channel gave no count for simply carries no count.
 */
export default function AnswerVideos({ videos = [], onPlay }) {
  const rows = (Array.isArray(videos) ? videos : []).filter((row) => row?.url);
  if (!rows.length) return null;
  const counted = rows.some((row) => Number(row.views) > 0);
  const line =
    "flex w-full items-start justify-between gap-2 text-left text-[12px] leading-snug text-accent transition active:opacity-70";

  const named = (row) => (
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
  );

  return (
    <div className="mt-2 flex flex-col gap-1.5 rounded-xl border border-border bg-muted/40 p-2.5">
      <span className="font-body text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {counted ? "Most watched · the artist's channel" : "The artist's own videos"}
      </span>

      {rows.map((row, index) =>
        onPlay ? (
          <button
            key={`${row.url}-${index}`}
            type="button"
            onClick={() => onPlay(row, rows)}
            className={line}
          >
            {named(row)}
            <span className="mt-0.5 shrink-0 font-body text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Play here
            </span>
          </button>
        ) : (
          <a
            key={`${row.url}-${index}`}
            href={row.url}
            target="_blank"
            rel="noreferrer"
            className={line}
          >
            {named(row)}
            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          </a>
        )
      )}
    </div>
  );
}