import React from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { storyBody, storyHeadline } from "@/lib/stories";
import { storyMarkCounts } from "@/lib/storyMarks";

const WORD = { image: "picture", video: "video", audio: "audio", link: "link" };

/** What a story carries, in one line, so the studio's list says where to look before opening it. */
function carries(row) {
  const counts = storyMarkCounts(row?.text);
  const held = row?.media_kind && row.media_kind !== "none" ? row.media_kind : "";
  if (held && counts[held] !== undefined) counts[held] += 1;

  return Object.keys(counts)
    .filter((kind) => counts[kind] > 0)
    .map((kind) => `${counts[kind]} ${WORD[kind]}${counts[kind] > 1 ? "s" : ""}`)
    .join(" · ");
}

export default function StoryEntry({ row, busy, onEdit, onDelete }) {
  const inside = carries(row);

  return (
    <div className="knowledge-row">
      <div className="knowledge-body">
        <div className="knowledge-title">{storyHeadline(row)}</div>
        <div className="knowledge-text">{storyBody(row)}</div>
        {inside ? <div className="knowledge-meter-text">Inside: {inside}</div> : null}
      </div>
      <div className="knowledge-tools">
        <button
          type="button"
          onClick={() => onEdit(row)}
          aria-label="Edit story"
          className="knowledge-tool"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(row)}
          disabled={busy}
          aria-label="Delete story"
          className="knowledge-tool knowledge-tool-danger"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}