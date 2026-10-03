import React from "react";
import { KINDS } from "@/lib/knowledge";

export default function KnowledgeTabs({ kind, onPick }) {
  return (
    <div className="knowledge-tabs" role="tablist" aria-label="Kind of entry">
      {KINDS.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={kind === item.id}
          onClick={() => onPick(item.id)}
          className={`knowledge-tab${kind === item.id ? " is-active" : ""}`}
        >
          {item.tab}
        </button>
      ))}
    </div>
  );
}