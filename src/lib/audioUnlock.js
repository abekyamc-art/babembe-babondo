/**
 * The sound a call runs on. A phone only lets a page make sound — and only lets it listen at all —
 * once a tap has happened, and it holds the sound suspended until then. A context the phone is
 * holding runs nothing: no voice comes out of it, and the microphone's own capture never fires, so
 * a call on one neither hears nor is heard. It is therefore started inside the tap that begins a
 * call — the one moment a phone accepts it — and handed to the call that opens a moment later.
 */
let ctx = null;

function fresh() {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

/** Called inside the tap that starts a call: the sound is created and started here. */
export function primeAudio() {
  try {
    if (!ctx || ctx.state === "closed") ctx = fresh();
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  } catch (err) {
    return null;
  }
}

/** The sound the tap already started, for the call that follows it. */
export function primedAudio() {
  return ctx && ctx.state !== "closed" ? ctx : null;
}

/**
 * Start the sound again on the person's next touch — the only thing that starts a context the
 * phone is holding — and say so once it runs. Returns the way to stop waiting.
 */
export function resumeAudioOnTouch(onRunning) {
  const start = () => {
    if (!ctx || ctx.state === "closed") return false;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx.state === "running";
  };

  if (start()) return () => {};

  const touch = () => {
    if (!start()) return;
    off();
    onRunning?.();
  };
  const off = () => {
    window.removeEventListener("pointerdown", touch);
    window.removeEventListener("touchend", touch);
  };
  window.addEventListener("pointerdown", touch);
  window.addEventListener("touchend", touch);
  return off;
}