import { useEffect } from "react";

/**
 * What a page says about itself: the line the browser's tab shows, the description a search result
 * stands on, and — for a page that is nobody else's business — the note that keeps it out of results.
 * A page clears its own line again when it is left, so the next page's own line shows.
 */
function metaTag(name) {
  let el = document.head.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  return el;
}

export default function usePageMeta({ title, description, noindex = false }) {
  useEffect(() => {
    const wasTitle = document.title;
    if (title) document.title = title;

    const line = metaTag("description");
    const wasLine = line.getAttribute("content") || "";
    if (description) line.setAttribute("content", description);

    // a page that needs signing in is never offered to a search engine
    const robots = noindex ? metaTag("robots") : null;
    const wasRobots = robots ? robots.getAttribute("content") : null;
    if (robots) robots.setAttribute("content", "noindex, nofollow");

    return () => {
      document.title = wasTitle;
      line.setAttribute("content", wasLine);
      if (robots) {
        if (wasRobots) robots.setAttribute("content", wasRobots);
        else robots.remove();
      }
    };
  }, [title, description, noindex]);
}