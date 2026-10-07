import { useEffect, useRef, useState } from "react";
import { isStoryAsk } from "@/lib/storyState";
import { findStory } from "@/lib/stories";

/**
 * The admin's story for what the person asks.
 *
 * Every one of the person's own turns is read as it is made, and a turn that asks for a story is
 * put to the saved library: when the admin has written that story, it is brought on screen with its
 * media and its links. A turn that asks for nothing like it leaves the screen as it was, and the
 * assistant answers from what it has of its own.
 */
export default function useStoryTurn(turns) {
  const [story, setStory] = useState(null);
  // the person's own turns already read, counted rather than remembered one by one
  const seenRef = useRef(0);

  useEffect(() => {
    const mine = (Array.isArray(turns) ? turns : []).filter((turn) => turn?.role === "user");
    if (mine.length <= seenRef.current) return undefined;

    const fresh = mine
      .slice(seenRef.current)
      .map((turn) => turn.text)
      .join(" ")
      .trim();
    seenRef.current = mine.length;
    if (!fresh || !isStoryAsk(fresh)) return undefined;

    let alive = true;
    findStory(fresh).then((found) => {
      if (alive && found) setStory(found);
    });
    return () => {
      alive = false;
    };
  }, [turns]);

  return { story, closeStory: () => setStory(null) };
}