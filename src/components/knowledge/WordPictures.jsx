import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PictureThumb from "@/components/knowledge/PictureThumb";
import PictureDownload from "@/components/knowledge/PictureDownload";
import { findInDoc } from "@/lib/knowledgeDoc";

const tidy = (value) => String(value || "").trim();
const named = (row) => tidy(row?.term).replace(/[?\s]/g, "") !== "";

/** The word a line of the document is of: what stands before the = , without its reading. */
const termOfLine = (line) =>
  String(line || "")
    .split("=")[0]
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .trim();

/**
 * Every picture the admin has saved, standing beside the word it is of — in the document itself.
 *
 * A package imported with its pictures leaves each one saved beside the word it was found with, and
 * here the picture is read beside that very line of the working copy: the word, then the line the
 * document holds it on. Where the word stands the picture is opened through a short-lived link, so a
 * picture kept privately is still seen, and never at a public address.
 *
 * A picture whose word is not written in the document yet says so, so a pairing that came out of an
 * import is caught by eye before anything is published. A picture found with no word at all is given
 * one here, by hand, and the publishing waits for it.
 */
export default function WordPictures({ text = "" }) {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState("");
  const [words, setWords] = useState({});
  const checking = typeof text === "string" && text.length > 0;

  useEffect(() => {
    let alive = true;
    base44.entities.KnowledgeImage.list({ sort: "-created_date", limit: 100 })
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

  // where each picture's word stands in the working copy — the line the document holds it on
  const places = useMemo(() => {
    const map = new Map();
    (rows || []).forEach((row) => {
      const term = tidy(row?.term);
      if (term.length < 2) return;
      const hits = findInDoc(text, term, 40);
      // the line whose own word is this word stands before a line that merely mentions it
      map.set(
        row.id,
        hits.find((hit) => termOfLine(hit.line).toLowerCase() === term.toLowerCase()) || hits[0] || null
      );
    });
    return map;
  }, [rows, text]);

  const drop = async (id) => {
    setBusy(id);
    try {
      await base44.entities.KnowledgeImage.delete(id);
      setRows((prev) => (prev || []).filter((row) => row.id !== id));
    } finally {
      setBusy("");
    }
  };

  // a picture found with no word beside it is given one here, by the admin's own hand
  const keep = async (row) => {
    const term = tidy(words[row.id]);
    if (!term) return;
    setBusy(row.id);
    try {
      const how = "chosen by hand";
      await base44.entities.KnowledgeImage.update(row.id, { term, how });
      setRows((prev) => (prev || []).map((item) => (item.id === row.id ? { ...item, term, how } : item)));
    } finally {
      setBusy("");
    }
  };

  if (!rows || !rows.length) {
    return (
      <>
        <span className="knowledge-meter-text">
          Pictures saved beside words stand here, each one beside the line of your document that holds its
          word. Import a ZIP or a Word file and every picture it carries is kept beside the word it stood
          next to.
        </span>

        <PictureDownload count={0} />
      </>
    );
  }

  const unnamed = rows.filter((row) => !named(row)).length;
  const missing = checking
    ? rows.filter((row) => named(row) && tidy(row.term).length >= 2 && !places.get(row.id)).length
    : 0;
  const busyHere = (id) => busy === id;

  return (
    <div className="knowledge-field">
      <span className="knowledge-label">
        Pictures saved beside words · {rows.length}
        {unnamed ? ` · ${unnamed} still with no word` : ""}
        {missing ? ` · ${missing} whose word is not in the document` : ""}
      </span>

      <div className="flex flex-col">
        {rows.map((row) => {
          const place = places.get(row.id) || null;
          const word = named(row);
          return (
            <div key={row.id} className="knowledge-row">
              <div className="knowledge-body flex items-start gap-3">
                <PictureThumb picture={row} />
                <div className="flex min-w-0 flex-col">
                  <span className="knowledge-title">{word ? tidy(row.term) : "No word beside it yet"}</span>

                  {place ? (
                    <>
                      <span className="knowledge-meter-text">{place.heading}</span>
                      <span className="knowledge-text">{place.line}</span>
                    </>
                  ) : word && checking && tidy(row.term).length >= 2 ? (
                    <span className="knowledge-meter-text is-over">
                      This word is not written in the document yet — write its line, or give the picture
                      the word that is written there.
                    </span>
                  ) : null}

                  <span className="knowledge-meter-text">
                    {row.name}
                    {row.how ? ` · ${row.how}` : ""}
                  </span>

                  {word ? null : (
                    <div className="account-edit mt-2">
                      <input
                        value={words[row.id] || ""}
                        onChange={(event) =>
                          setWords((prev) => ({ ...prev, [row.id]: event.target.value }))
                        }
                        placeholder="the word this picture is of"
                        aria-label={`The word the picture ${row.name || ""} is of`}
                        className="account-input"
                      />
                      <button
                        type="button"
                        onClick={() => keep(row)}
                        disabled={busyHere(row.id) || !tidy(words[row.id])}
                        className="account-save"
                      >
                        {busyHere(row.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="knowledge-tools">
                <button
                  type="button"
                  onClick={() => drop(row.id)}
                  disabled={busyHere(row.id)}
                  aria-label={`Take away the picture of ${tidy(row.term) || "this word"}`}
                  className="knowledge-tool knowledge-tool-danger"
                >
                  {busyHere(row.id) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <PictureDownload count={rows.length} />
    </div>
  );
}