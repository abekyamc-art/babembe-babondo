import React, { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import useKnowledgeDoc from "@/hooks/useKnowledgeDoc";
import DocStatus from "@/components/knowledge/DocStatus";
import DocImport from "@/components/knowledge/DocImport";
import WordPictures from "@/components/knowledge/WordPictures";

/**
 * The one knowledge document: everything the AIs must know, in one text, under its own headings.
 *
 * What is written here is a working copy. It is saved as a draft, read over, and then published —
 * and the published version is the whole knowledge of the app: the words, the phrases, the rules and
 * the rest reach every AI from it, and a line that has not been published reaches none of them.
 */
export default function KnowledgeDocPanel({ focus }) {
  const doc = useKnowledgeDoc();
  const areaRef = useRef(null);
  // while a document is being imported nothing else writes to the working copy: a save or a publish
  // made in the middle of one would act on half of it
  const [importing, setImporting] = useState(false);

  /**
   * Opening the document where the search found a thing, with the words themselves chosen: the line
   * is looked for in what is written here right now, so a match the server named is still opened at
   * the place it stands even if a line has been typed in since it was found.
   */
  useEffect(() => {
    if (!doc.ready || focus?.kind !== "doc") return;

    const node = areaRef.current;
    if (!node) return;

    const text = doc.text;
    const line = String(focus.line || "");
    let at = line ? text.indexOf(line) : -1;
    let length = line.length;

    if (at < 0) {
      const term = String(focus.term || "");
      at = term ? text.toLowerCase().indexOf(term.toLowerCase()) : -1;
      length = term.length;
    }
    if (at < 0) return;

    node.focus();
    node.setSelectionRange(at, at + length);
    const ratio = text.length ? at / text.length : 0;
    node.scrollTop = Math.max(0, ratio * node.scrollHeight - node.clientHeight / 3);
    node.scrollIntoView?.({ block: "center" });
  }, [focus, doc.ready]);

  if (!doc.ready) return <p className="knowledge-empty">Opening your knowledge document…</p>;

  return (
    <>
      <p className="account-hint">
        Everything the AIs must know stands here, in one document: the words and what they mean, the
        phrases, the rules of Kibembe, and anything else. What you publish is what all of them read —
        a word you have just typed in is not used until you publish it.
      </p>

      <label className="knowledge-field">
        <span className="knowledge-label">The document</span>
        <textarea
          ref={areaRef}
          value={doc.text}
          spellCheck={false}
          readOnly={importing}
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

      <DocImport doc={doc} onState={setImporting} />

      <WordPictures />

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
        busy={importing ? "import" : doc.busy}
        unsaved={doc.unsaved}
        unpublished={doc.unpublished}
        onSave={doc.saveDraft}
        onPublish={doc.publish}
        onRestore={doc.restore}
      />
    </>
  );
}