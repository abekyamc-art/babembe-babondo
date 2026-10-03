import React from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { formatLength } from "@/lib/knowledgeTexts";

export default function TextEntry({ row, busy, onEdit, onDelete }) {
  return (
    <div className="knowledge-row">
      <div className="knowledge-body">
        <div className="knowledge-title">{row.title}</div>
        <div className="knowledge-text">{formatLength(row.word_count)}</div>
      </div>
      <div className="knowledge-tools">
        <button
          type="button"
          onClick={() => onEdit(row)}
          disabled={busy}
          aria-label="Open text"
          className="knowledge-tool"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => onDelete(row)}
          disabled={busy}
          aria-label="Delete text"
          className="knowledge-tool knowledge-tool-danger"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}