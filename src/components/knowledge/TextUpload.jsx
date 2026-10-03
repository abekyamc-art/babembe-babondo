import React, { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { isPlainTextFile } from "@/lib/knowledgeTexts";

export default function TextUpload({ disabled, onLifted }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const take = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setBusy(true);
    setError("");
    try {
      if (isPlainTextFile(file)) {
        onLifted(await file.text(), "");
      } else {
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
        const res = await base44.functions.invoke("knowledgeTextFromFile", { file_uri });
        const lifted = res?.data?.text || "";
        if (!lifted) throw new Error("empty");
        onLifted(lifted, file_uri);
      }
    } catch (err) {
      setError("That document couldn't be read — paste its text into the box instead.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="knowledge-upload-wrap">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || busy}
        className="knowledge-upload"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
        {busy ? "Reading…" : "Upload a document"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md,.markdown,.csv,.pdf,.doc,.docx,application/pdf,text/plain"
        onChange={take}
        className="hidden"
      />
      {error ? <p className="knowledge-error">{error}</p> : null}
    </div>
  );
}