import React, { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PictureThumb from "@/components/knowledge/PictureThumb";

/**
 * The pictures saved beside the words of the knowledge document.
 *
 * An imported package brings its pictures with it, and each one stays here beside the word it was
 * found with, so the admin can see at a glance which words have a picture and which do not. The
 * pictures are kept privately, shown through short-lived links, and a word's own line in the
 * document reads exactly as it always did — the picture is not written into the knowledge the AIs read.
 */
export default function WordPictures() {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    let alive = true;
    base44.entities.KnowledgeImage.list({ sort: "-created_date", limit: 50 })
      .then((page) => {
        if (alive) setRows(Array.isArray(page) ? page : page?.items || []);
      })
      .catch(() => {
        if (alive) setRows([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const drop = async (id) => {
    setBusy(id);
    try {
      await base44.entities.KnowledgeImage.delete(id);
      setRows((prev) => (prev || []).filter((row) => row.id !== id));
    } finally {
      setBusy("");
    }
  };

  if (!rows || !rows.length) {
    return (
      <span className="knowledge-meter-text">
        Pictures saved beside words stand here. Import a ZIP or a Word file and each picture it holds
        is kept beside the word it stood next to.
      </span>
    );
  }

  return (
    <div className="knowledge-field">
      <span className="knowledge-label">
        Pictures saved beside words · {rows.length}
      </span>
      <div className="flex flex-col">
        {rows.map((row) => (
          <div key={row.id} className="knowledge-row">
            <div className="knowledge-body flex items-center gap-3">
              <PictureThumb picture={row} />
              <div className="flex min-w-0 flex-col">
                <span className="knowledge-title">{row.term}</span>
                <span className="knowledge-meter-text">
                  {row.name}
                  {row.how ? ` · ${row.how}` : ""}
                </span>
              </div>
            </div>
            <div className="knowledge-tools">
              <button
                type="button"
                onClick={() => drop(row.id)}
                disabled={busy === row.id}
                aria-label={`Take away the picture of ${row.term || "this word"}`}
                className="knowledge-tool knowledge-tool-danger"
              >
                {busy === row.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}