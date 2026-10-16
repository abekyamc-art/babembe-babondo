import React, { useRef, useState } from "react";
import { Loader2 } from "lucide-react";

// how far the finger travels before the reload is taken, and the most the list moves
const TRIGGER = 64;
const MAX_PULL = 92;
// how far the finger must travel straight down before the pull is taken at all
const PULL_START = 10;

/**
 * A native-feeling pull-to-refresh around a scroll container: the list follows the
 * finger, a small spinner grows at the top, and letting go past the mark reloads.
 *
 * The pull is taken only when one finger travels straight down from the very top of the list:
 * a sideways swipe, a tap that shakes a little, and a second finger all leave the list where it
 * stands, and the pull is dropped the moment the list has been scrolled away from its top.
 */
export default function PullToRefresh({ onRefresh, className = "", children }) {
  const scroller = useRef(null);
  const content = useRef(null);
  const head = useRef(null);
  const dial = useRef(null);
  const startX = useRef(0);
  const startY = useRef(0);
  // a touch that has begun at the very top, before it has said whether it is a pull
  const tracking = useRef(false);
  const dragging = useRef(false);
  const pulled = useRef(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  // the list is moved by hand, so a long list never re-renders while the finger travels
  const paint = (value, smooth) => {
    pulled.current = value;
    if (content.current) {
      content.current.style.transition = smooth ? "transform 220ms ease-out" : "none";
      content.current.style.transform = value ? `translateY(${value}px)` : "";
    }
    if (head.current) {
      head.current.style.opacity = value > 6 ? "1" : "0";
      head.current.style.transform = `translateY(${Math.max(-30, value - 32)}px)`;
    }
    if (dial.current) dial.current.style.transform = `rotate(${value * 3}deg)`;
  };

  const begin = (event) => {
    if (busy || dragging.current || !scroller.current) return;
    // one finger only: a second one ends the gesture instead of taking the list over
    if (event.touches.length !== 1) return;
    if (scroller.current.scrollTop > 0) return;
    const touch = event.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    tracking.current = true;
  };

  const move = (event) => {
    if (!tracking.current || !scroller.current) return;

    const touch = event.touches[0];
    if (event.touches.length !== 1 || !touch) {
      tracking.current = false;
      dragging.current = false;
      if (pulled.current) paint(0, true);
      return;
    }

    const down = touch.clientY - startY.current;
    const across = Math.abs(touch.clientX - startX.current);

    // the pull is taken only once the finger has clearly gone downwards and not sideways, so a
    // sideways swipe across a card is never read as a pull
    if (!dragging.current) {
      if (down <= 0 || scroller.current.scrollTop > 0) {
        tracking.current = false;
        if (pulled.current) paint(0, true);
        return;
      }
      if (down < PULL_START || down < across) return;
      dragging.current = true;
    }

    // the list only gives way at its very top, and only downwards
    if (down <= 0 || scroller.current.scrollTop > 0) {
      dragging.current = false;
      if (pulled.current) paint(0, true);
      return;
    }
    paint(Math.min(MAX_PULL, down * 0.5), false);
  };

  const release = async () => {
    tracking.current = false;
    if (!dragging.current) return;
    dragging.current = false;
    if (pulled.current < TRIGGER) {
      paint(0, true);
      return;
    }
    paint(TRIGGER, true);
    setBusy(true);
    try {
      await onRefresh?.();
    } catch (err) {
      setNote("Couldn't refresh");
      setTimeout(() => setNote(""), 1800);
    } finally {
      setBusy(false);
      paint(0, true);
    }
  };

  return (
    <div
      ref={scroller}
      className={`relative ${className}`}
      onTouchStart={begin}
      onTouchMove={move}
      onTouchEnd={release}
      onTouchCancel={release}
    >
      <div
        ref={head}
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-8 items-center justify-center gap-2 opacity-0"
      >
        <span
          ref={dial}
          aria-hidden="true"
          className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card shadow-sm"
        >
          <Loader2 className={`h-4 w-4 text-accent${busy ? " animate-spin" : ""}`} />
        </span>
        {note ? (
          <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[12px] text-muted-foreground">
            {note}
          </span>
        ) : null}
      </div>
      <div ref={content} className="h-full w-full">
        {children}
      </div>
    </div>
  );
}