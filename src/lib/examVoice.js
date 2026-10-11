import { base44 } from "@/api/base44Client";

/**
 * The examination read aloud: a line of a question is spoken in the examination's own Cartesia voice.
 *
 * Each line is recorded once and kept for the sitting, so stepping back to a question already read costs
 * nothing and the same words are never asked of the voice twice. Only ever one line is heard at a time:
 * a new read, or a stop, ends the one in hand.
 */
const recorded = new Map();
let ticket = 0;
let playing = null;

/** Stop whatever is being read, and let the read in hand come to its end. */
export function stopReading() {
  ticket += 1;
  const held = playing;
  if (!held) return;
  playing = null;
  // a read that is ended on purpose is over, not failed: it is not reported as trouble
  held.stopped = true;
  try {
    held.el.pause();
  } catch (err) {
    // a recording that has already ended needs no setting back
  }
  held.finish();
}

/**
 * One recording, played from beginning to end. It comes back once it has been heard, and it comes back
 * as a failure when the recording cannot be played or the phone will not start it — a read that was
 * refused is not a read that happened, so the page is told of it and the line can be tried again.
 */
function play(url) {
  return new Promise((resolve, reject) => {
    const el = new Audio(url);
    // "stopped" says the read was ended on purpose, and is therefore over rather than failed
    const held = { el, stopped: false, finish: () => {} };
    let settled = false;

    const letGo = () => {
      el.onended = null;
      el.onerror = null;
      if (playing && playing.el === el) playing = null;
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      letGo();
      resolve();
    };
    const fail = (message) => {
      if (settled) return;
      if (held.stopped) return finish();
      settled = true;
      letGo();
      try {
        el.pause();
      } catch (err) {
        // a recording that never started needs no setting back
      }
      reject(new Error(message));
    };

    held.finish = finish;
    el.preload = "auto";
    el.onended = finish;
    el.onerror = () => fail("This question could not be heard — try the reading again.");
    playing = held;
    el.play().catch(() =>
      // the phone's own playback rule, or sound that is not allowed without a touch, is said plainly
      // instead of being taken for a reading that was heard
      fail("Your phone would not start the reading — tap the button to try it again.")
    );
  });
}

/**
 * Read one line aloud and come back when it has been heard. `kibembe` is the Kibembe form standing in the
 * line, so a voice that knows no Kibembe is handed how that form sounds rather than how it is spelled;
 * `onSpeak` is called the moment the recording begins, so the control can say it is reading. Nothing
 * happens on a line that is empty, and a read that was stopped while the voice was being made is dropped.
 */
export async function readAloud(text, kibembe = "", onSpeak = () => {}) {
  const line = String(text || "").trim();
  if (!line) return;
  const form = String(kibembe || "").trim();

  stopReading();
  const mine = ticket;

  const key = `${line}|${form}`;
  let url = recorded.get(key);
  if (!url) {
    const res = await base44.functions.invoke("examRead", { text: line, kibembe: form });
    if (mine !== ticket) return;
    url = res?.data?.audio_url;
    if (!url) throw new Error(res?.data?.error || "This question could not be read aloud.");
    recorded.set(key, url);
  }

  if (mine !== ticket) return;
  onSpeak();
  await play(url);
}