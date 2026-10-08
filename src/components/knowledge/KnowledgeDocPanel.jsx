import React, { useRef } from "react";
import { Loader2 } from "lucide-react";
import useKnowledgeDoc from "@/hooks/useKnowledgeDoc";
import DocSearch from "@/components/knowledge/DocSearch";
import DocStatus from "@/components/knowledge/DocStatus";

/**
 * The one knowledge document: everything the AIs must know, in one text, under its own headings.
 *
 * What is written here is a working copy. It is saved as a draft, read over, and then published —
 * and the published version is the whole knowledge of the app: the words, the phrases, the rules and
 * the rest reach every AI from it, and a line that has not been published reaches none of them.
 */
export default function KnowledgeDocPanel() {
  const doc = useKnowledgeDoc();
  const areaRef = useRef(null);

  /** Opening the document at a line found by the search, with the words themselves chosen. */
  const jump = (hit) => {
    const node = areaRef.current;
    if (!node) return;
    node.focus();
    node.setSelectionRange(hit.index, hit.index + hit.length);
    const ratio = node.value.length ? hit.index / node.value.length : 0;
    node.scrollTop = Math.max(0, ratio * node.scrollHeight - node.clientHeight / 3);
  };

  if (!doc.ready) return <p className="knowledge-empty">Opening your knowledge document…</p>;

  return (
    <>
      <p className="account-hint">
        Everything the AIs must know stands here, in one document: the words and what they mean, the
        phrases, the rules of Kibembe, and anything else. What you publish is what all of them read —
        a word you have just typed in is not used until you publish it.
      </p>

      <DocSearch text={doc.text} onJump={jump} />

      <label className="knowledge-field">
        <span className="knowledge-label">The document</span>
        <textarea
          ref={areaRef}
          value={doc.text}
          spellCheck={false}
          onChange={(event) => doc.setText(event.target.value)}
          placeholder={
            "# WORDS\nole (oh-leh) = hello | greeting said on arriving\n\n# RULES\na = ah, e = eh, i = ee, o = oh, u = oo"
          }
          className="account-area doc-editor"
        />
      </label>

      <span className="knowledge-meter-text">
        A word: ebembe word (how it sounds) = meaning | how to use it — the reading between brackets
        is for the voice alone, never written or spoken to anyone. A rule: one line of how Kibembe is
        read, written and used. A line beginning with # is a note to you, and is never read as
        knowledge.
      </span>

      {doc.error ? <p className="knowledge-error">{doc.error}</p> : null}

      {doc.busy === "publish" ? (
        <p className="knowledge-meter-text">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Publishing — every AI reads this from the next word said
          </span>
        </p>
      ) : null}

      <DocStatus
        doc={doc.doc}
        busy={doc.busy}
        unsaved={doc.unsaved}
        unpublished={doc.unpublished}
        onSave={doc.saveDraft}
        onPublish={doc.publish}
        onRestore={doc.restore}
      />
    </>
  );
}