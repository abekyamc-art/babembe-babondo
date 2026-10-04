/**
 * One spoken turn off the microphone.
 *
 * The recording begins the moment the phone is listening and ends by itself: a beat after
 * the person stops talking, or, when nothing is said at all, once the call's own quiet
 * window has run out. What comes back is the turn alone, or nothing when the wait passed
 * without a word.
 */
// the loudness that counts as someone speaking, against the mic meter the orb already uses
const SPEECH_LEVEL = 0.06;
// quiet after speech that closes the turn, and the longest one turn may run
const QUIET_MS = 1500;
const MAX_TURN_MS = 15000;

function pickType() {
  const wanted = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  try {
    if (typeof MediaRecorder === "undefined") return "";
    return wanted.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  } catch (err) {
    return "";
  }
}

/** The turn that was spoken, or nothing when the window passed in silence. */
export function recordTurn({ stream, level, openMs }) {
  return new Promise((resolve) => {
    let recorder;
    try {
      const type = pickType();
      recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    } catch (err) {
      // a phone that cannot record at all is told apart from one that heard nothing
      resolve({ blob: null, broken: true });
      return;
    }

    const parts = [];
    const startedAt = performance.now();
    let heardAt = 0;
    let lastLoudAt = 0;
    let done = false;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size) parts.push(event.data);
    };
    recorder.onstop = () => {
      if (!heardAt || !parts.length) {
        resolve({ blob: null, broken: false });
        return;
      }
      resolve({ blob: new Blob(parts, { type: recorder.mimeType || "audio/webm" }), broken: false });
    };

    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(timer);
      try {
        recorder.stop();
      } catch (err) {
        resolve({ blob: null, broken: false });
      }
    };

    const tick = () => {
      const now = performance.now();
      if (level() >= SPEECH_LEVEL) {
        if (!heardAt) heardAt = now;
        lastLoudAt = now;
      }
      if (heardAt) {
        if (now - lastLoudAt >= QUIET_MS || now - heardAt >= MAX_TURN_MS) finish();
        return;
      }
      if (now - startedAt >= openMs) finish();
    };

    let timer = 0;
    try {
      recorder.start(200);
    } catch (err) {
      resolve({ blob: null, broken: true });
      return;
    }
    timer = setInterval(tick, 120);
    tick();
  });
}