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
  try {
    held.el.pause();
  } catch (err) {
    // a recording that has already ended needs no setting back
  }
  held.finish();
}

/** One recording, played from beginning to end. It comes back when it has been heard or stopped. */
function play(url) {
  return new Promise((resolve) => {
    const el = new Audio(url);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.onended = null;
      el.onerror = null;
      if (playing && playing.el === el) playing = null;
      resolve();
    };
    el.preload = "auto";
    el.onended = finish;
    el.onerror = finish;
    playing = { el, finish };
    // a browser that refuses to start resolves the read rather than leaving it hanging
    el.play().catch(finish);
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