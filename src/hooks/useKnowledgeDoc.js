import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

/**
 * The one knowledge document, as the admin's panel holds it: what the server keeps, and what is
 * being written right now. The two are kept apart on purpose — a word that has been typed in is not
 * a word the AIs use until the admin saves it and then publishes it.
 */
export default function useKnowledgeDoc() {
  const [doc, setDoc] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  const open = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("knowledgeDoc", { action: "open" });
      const data = res?.data || {};
      if (data.error) {
        setError(data.error);
      } else {
        setDoc(data);
        setText(String(data.draft || ""));
      }
    } catch (err) {
      setError("The knowledge document could not be opened.");
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    open();
  }, [open]);

  const send = async (action) => {
    if (busy) return;
    setBusy(action);
    setError("");
    try {
      const res = await base44.functions.invoke("knowledgeDoc", { action, draft: text });
      const data = res?.data || {};
      if (data.error) {
        setError(data.error);
        return;
      }
      setDoc(data);
      setText(String(data.draft || ""));
    } catch (err) {
      setError("That could not be done just now. Try again.");
    } finally {
      setBusy("");
    }
  };

  // A working copy written back as it stands. An import writes the document this way, a bounded
  // piece at a time, so a long file is never sent in one lump and each piece that has gone in stays
  // in even if a later one fails.
  const writeDraft = async (next) => {
    const res = await base44.functions.invoke("knowledgeDoc", {
      action: "saveDraft",
      draft: next,
    });
    const data = res?.data || {};
    if (data.error) throw new Error(data.error);
    setDoc(data);
    setText(String(data.draft || ""));
    return data;
  };

  // The document an import came from, kept beside the document for the admin's own reference.
  const recordSource = async (source) => {
    const res = await base44.functions.invoke("knowledgeDoc", { action: "source", source });
    const data = res?.data || {};
    if (data.error) throw new Error(data.error);
    setDoc(data);
    return data;
  };

  return {
    doc,
    text,
    setText,
    busy,
    error,
    ready,
    reload: open,
    saveDraft: () => send("saveDraft"),
    writeDraft,
    recordSource,
    publish: () => send("publish"),
    restore: () => send("restore"),
    // what has been typed but not yet saved, and what is saved but not yet approved
    unsaved: !!doc && text !== String(doc.draft || ""),
    unpublished: !!doc && String(doc.draft || "") !== String(doc.published || ""),
  };
}