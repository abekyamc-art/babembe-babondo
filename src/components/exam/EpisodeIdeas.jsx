import React from "react";
import { themeOf } from "@/lib/examThemes";

/**
 * The ideas one season of ideas is met under, in the order the episodes stand: a hundred of them, one to
 * an episode, so the whole run of a season can be read before it is taken and every episode can be told
 * apart from the one beside it. A season whose papers are not met under ideas of their own shows nothing.
 */
export default function EpisodeIdeas({ seasonNo, next }) {
  const season = themeOf(seasonNo);
  if (!season) return null;

  return (
    <details className="exam-ideas">
      <summary className="exam-ideas-open">
        The {season.ideas.length} ideas of this season — one to an episode
      </summary>
      <ol className="exam-ideas-list">
        {season.ideas.map((idea, at) => (
          <li key={idea} className={next === at + 1 ? "is-next" : undefined}>
            <span className="exam-ideas-no">{at + 1}</span>
            <span>{idea}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}