import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import KnowledgeTabs from "@/components/knowledge/KnowledgeTabs";
import KnowledgeDocPanel from "@/components/knowledge/KnowledgeDocPanel";
import StoriesPanel from "@/components/knowledge/StoriesPanel";

/**
 * The admin's knowledge, in two places: the one document everything is written in, and the stories,
 * which stay a collection of their own — each with its own picture, video, audio or link.
 */
export default function KnowledgeSheet({ open, onClose }) {
  const [tab, setTab] = useState("doc");
  // what the server counts of the stories, read only while the stories are on screen
  const [stories, setStories] = useState(null);

  useEffect(() => {
    if (!open || tab !== "story") return undefined;
    let alive = true;
    base44.entities.Story.count({})
      .then((count) => {
        if (alive) setStories(Number(count));
      })
      .catch(() => {
        if (alive) setStories(null);
      });
    return () => {
      alive = false;
    };
  }, [open, tab]);

  if (!open) return null;

  // drawn over the whole screen, so the tab bar never shows through the panel
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div aria-hidden className="account-backdrop absolute inset-0" />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Assistant knowledge"
        className="account-sheet"
      >
        <div className="account-top">
          <span className="account-brand">Assistant knowledge</span>
          <div className="account-tools">
            {tab === "story" && stories !== null ? (
              <span className="account-usage">{stories.toLocaleString()} saved</span>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close knowledge"
              className="account-icon"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="account-panel">
          <KnowledgeTabs kind={tab} onPick={setTab} />

          {tab === "story" ? <StoriesPanel /> : <KnowledgeDocPanel />}
        </div>
      </section>
    </div>,
    document.body
  );
}