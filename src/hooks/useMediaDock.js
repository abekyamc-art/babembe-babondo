import { useCallback, useEffect, useRef, useState } from "react";

// the tool the app's own selection answers through
const TOOL = "mediaSelection";

/**
 * The app's own media player, for the piece the app has chosen.
 *
 * The choice is never the voice's: the app's own selection stands behind every play request, and what
 * it chose rides back as the result of the tool the companion called. This reads that result off the
 * talk — the newest one that chose a piece — and stands the piece in the app's own player, with the
 * artist's other pieces behind it for the next one.
 *
 * Nothing is claimed before the player is really in place: `playing` is set only when the person has
 * brought the player in and the video is standing in it, so the live voice never says that a song is
 * playing before the app itself knows the player has started.
 *
 * A piece the app did not choose — an artist whose title is ambiguous, or one whose list holds
 * nothing of it — leaves the player as it stands: the question is the answer there, and the person's
 * own next word settles it.
 */

const parse = (value) => {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
};

/** The newest piece the app's own selection chose, read off the talk. */
function newestChoice(messages) {
  const talk = Array.isArray(messages) ? messages : [];
  for (let at = talk.length - 1; at >= 0; at -= 1) {
    const calls = talk[at]?.tool_calls;
    if (!Array.isArray(calls)) continue;
    for (let index = calls.length - 1; index >= 0; index -= 1) {
      const call = calls[index];
      if (call?.name !== TOOL) continue;
      const result = parse(call?.results);
      if (result?.chosen?.url) {
        return {
          key: call.id || `${result.chosen.url}|${at}`,
          chosen: result.chosen,
          others: Array.isArray(result.others) ? result.others : [],
        };
      }
    }
  }
  return null;
}

export default function useMediaDock(messages) {
  const [item, setItem] = useState(null);
  const [queue, setQueue] = useState([]);
  // the player is in place, and only then is anything said about it
  const [playing, setPlaying] = useState(false);
  // the choice already standing in the player, so it is never loaded twice over
  const standingRef = useRef("");

  useEffect(() => {
    const chosen = newestChoice(messages);
    if (!chosen || chosen.key === standingRef.current) return;
    standingRef.current = chosen.key;
    setItem(chosen.chosen);
    setQueue(chosen.others);
    setPlaying(false);
  }, [messages]);

  /** The next of the artist's own pieces, when one stands behind this one. */
  const next = useCallback(() => {
    setQueue((rest) => {
      if (!rest.length) return rest;
      setItem(rest[0]);
      setPlaying(false);
      return rest.slice(1);
    });
  }, []);

  /** The player is put away, and the piece with it. */
  const close = useCallback(() => {
    standingRef.current = "";
    setItem(null);
    setQueue([]);
    setPlaying(false);
  }, []);

  /** The person has brought the player in: the app now knows the player has started. */
  const began = useCallback(() => setPlaying(true), []);

  return { item, others: queue.length, playing, next, close, began };
}