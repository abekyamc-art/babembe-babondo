import React from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { storyBody, storyHeadline } from "@/lib/stories";

export default function StoryEntry({ row, busy, onEdit, onDelete }) {
  return (
    <div className="knowledge-row">
      <div className="knowledge-body">
        <div className="knowledge-title">{storyHeadline(row)}</div>
        <div className="knowledge-text">{storyBody(row)}</div>
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