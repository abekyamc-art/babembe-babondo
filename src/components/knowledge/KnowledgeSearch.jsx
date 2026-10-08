import React, { useEffect, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { searchKnowledge } from "@/lib/knowledgeSearch";

const MIN_TERM = 2;
// how long the typing rests before the whole knowledge is asked
const WAIT_MS = 350;

/**
 * One search over everything the knowledge holds, standing above the tabs so it is there whatever is
 * on screen: every line of the one document — the words, the phrases, the rules and the rest — and
 * every story, by its title, its tags, the name of a video the artist has published, or the telling
 * itself. Tapping a match takes the admin to the place it belongs to.
 */
export default function KnowledgeSearch({ onPickDoc, onPickStory }) {
  const [term, setTerm] = useState("");
  const [found, setFound] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const asked = term.trim();

  useEffect(() => {
    if (asked.length < MIN_TERM) {
      setFound(null);
      setBusy(false);
      setError("");
      return undefined;
    }

    let alive = true;
    setBusy(true);
    const timer = setTimeout(() => {
      searchKnowledge(asked)
        .then((data) => {
          if (!alive) return;
          setFound(data);
          setError("");
        })
        .catch(() => {
          if (!alive) return;
          setFound(null);
          setError("The knowledge could not be searched just now. Try again.");
        })
        .finally(() => {
          if (alive) setBusy(false);
        });
    }, WAIT_MS);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [asked]);

  const hits = found?.doc || [];
  const stories = found?.stories || [];
  const nothing = asked.length >= MIN_TERM && found && !hits.length && !stories.length;

  return (
    <div className="doc-search">
      <div className="doc-search-row">
        <input
          value={term}
          placeholder="Find a word, a story, a video, a rule…"
          aria-label="Search the knowledge"
          onChange={(event) => setTerm(event.target.value)}
          className="account-input"
        />

        {busy ? (
          <span className="account-icon" aria-hidden>
            <Loader2 className="h-4 w-4 animate-spin" />
          </span>
        ) : asked.length >= MIN_TERM ? (
          <button
            type="button"
            onClick={() => setTerm("")}
            aria-label="Clear the search"
            className="account-icon"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <span className="account-icon" aria-hidden>
            <Search className="h-4 w-4" />
          </span>
        )}
      </div>

      {error ? <p className="knowledge-error">{error}</p> : null}

      {asked.length < MIN_TERM ? (
        <span className="knowledge-meter-text">
          Two letters or more, and every place they stand comes up: the document's own words, phrases,
          rules and notes, and the stories — by title, by tag, or by the name of a video the artist has
          published. Tapping a match opens it.
        </span>
      ) : busy && !found ? (
        <span className="knowledge-meter-text">Looking through the knowledge…</span>
      ) : nothing ? (
        <p className="knowledge-empty">Nothing saved holds “{asked}”.</p>
      ) : (
        <>
          {hits.length ? (
            <div className="flex flex-col gap-2">
              <span className="knowledge-label">In the document</span>
              <div className="doc-hits">
                {hits.map((hit, index) => (
                  <button
                    key={`${hit.at}-${index}`}
                    type="button"
                    onClick={() => onPickDoc({ line: hit.line, term: asked })}
                    className="doc-hit"
                  >
                    <span className="doc-hit-head">{hit.heading}</span>
                    <span className="doc-hit-line">{hit.line}</span>
                  </button>
                ))}
              </div>
              {found.docMore ? (
                <span className="knowledge-meter-text">
                  More places than these hold it — narrow the search to see them.
                </span>
              ) : null}
            </div>
          ) : null}

          {stories.length ? (
            <div className="flex flex-col gap-2">
              <span className="knowledge-label">In the stories</span>
              <div className="doc-hits">
                {stories.map((story) => (
                  <button
                    key={story.id}
                    type="button"
                    onClick={() => onPickStory(story)}
                    className="doc-hit"
                  >
                    <span className="doc-hit-head">
                      {story.title} · {story.where}
                      {story.published ? "" : " · draft"}
                    </span>
                    {story.excerpt ? <span className="doc-hit-line">{story.excerpt}</span> : null}
                  </button>
                ))}
              </div>
              {found.storiesMore ? (
                <span className="knowledge-meter-text">
                  More stories than these hold it — narrow the search to see them.
                </span>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}