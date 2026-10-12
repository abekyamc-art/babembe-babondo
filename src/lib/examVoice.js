import { base44 } from "@/api/base44Client";

/**
 * The examination read aloud: a line of a question is spoken in the examination's own voice.
 *
 * A phone lets a page make sound only inside a tap, and only once the page has really played something.
 * So the page is opened to sound inside the tap that asks for a reading (see unlockReading) — a reading
 * asked for on its own is refused by the phone and heard by nobody — and every reading then goes through
 * one sound element, kept for the whole sitting, so a line already made is never asked of the voice twice.
 *
 * Only ever one line is heard at a time: a new read, a stop, or leaving the question ends the one in hand.
 */
const recorded = new Map();
let ticket = 0;
let playing = null;
let reader = null;
let opened = false;

/** A moment of silence, so the page's own sound is started without anything being heard. */
function silence(seconds = 0.2, rate = 8000) {
  const samples = Math.round(seconds * rate);
  const bytes = new ArrayBuffer(44 + samples);
  const view = new DataView(bytes);
  const put = (at, word) => {
    for (let i = 0; i < word.length; i += 1) view.setUint8(at + i, word.charCodeAt(i));
  };
  put(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  put(8, "WAVE");
  put(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  put(36, "data");
  view.setUint32(40, samples, true);
  // an eight-bit recording stands silent at its own middle, not at nothing
  new Uint8Array(bytes, 44).fill(128);
  return URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
}

/** The one sound every reading of the paper goes through, kept for the whole sitting. */
function readerEl() {
  if (!reader) {
    reader = new Audio();
    reader.preload = "auto";
  }
  return reader;
}

/**
 * Open the page to sound, inside the tap that asks for a reading. Returns at once: the silence is played
 * while the voice is still being made, so a phone that was holding its sound lets the reading through.
 */
export function unlockReading() {
  if (opened) return;
  opened = true;
  try {
    const probe = new Audio(silence());
    const step = probe.play();
    if (step && step.catch) {
      step.catch(() => {
        opened = false;
      });
    }
  } catch (err) {
    opened = false;
  }
}

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
 * One recording, played from beginning to end on the sound element the page already plays through. It
 * comes back once it has been heard, and it comes back as a failure when the recording cannot be played
 * or the phone will not start it — a read that was refused is not a read that happened, so the page is
 * told of it and the line can be tried again.
 */
function play(url) {
  return new Promise((resolve, reject) => {
    const el = readerEl();
    // "stopped" says the read was ended on purpose, and is therefore over rather than failed
    const held = { el, stopped: false, finish: () => {} };
    let settled = false;

    const letGo = () => {
      el.onended = null;
      el.onerror = null;
      if (playing === held) playing = null;
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
    el.onended = finish;
    el.onerror = () => fail("This question could not be heard — try the reading again.");
    playing = held;

    el.src = url;
    try {
      el.currentTime = 0;
    } catch (err) {
      // a recording that has not loaded yet needs no setting back
    }
    const step = el.play();
    if (step && step.catch) {
      // the phone's own playback rule, or sound that is not allowed at this moment, is said plainly
      // instead of being taken for a reading that was heard
      step.catch(() =>
        fail("Your phone would not start the reading — tap the button to try it again.")
      );
    }
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
  try {
    await play(url);
  } catch (err) {
    // a recording that would not play is not kept: the line is asked of the voice afresh on the next try
    recorded.delete(key);
    throw err;
  }
}