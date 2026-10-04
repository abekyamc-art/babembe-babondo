import React from "react";

/** The angles Base44 AI offers: the person picks one and it is written out in full. */
export default function RapIdeas({ ideas, picked, busy, onPick }) {
  return (
    <section className="rap-card">
      <div className="rap-ideas">
        {ideas.map((idea, index) => (
          <button
            key={`${idea.name}-${index}`}
            type="button"
            className={`rap-idea ${picked === index ? "is-active" : ""}`}
            disabled={busy}
            onClick={() => onPick(index)}
          >
            <span className="rap-idea-name">{idea.name || `Wazo ${index + 1}`}</span>
            <span className="rap-idea-hook">{idea.hook}</span>
            {idea.swahili ? <span className="rap-idea-swahili">{idea.swahili}</span> : null}
            <span className="rap-idea-meta">
              <span className="rap-idea-pick">
                {picked === index ? "Wazo lako" : "Chagua wazo"}
              </span>
              <span className="rap-idea-count">{idea.words_used?.length || 0} maneno</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}