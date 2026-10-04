import VoiceSocket from "@/lib/elevenLabsSocket";
import { signalLine } from "@/lib/talkRotation";

/**
 * The fifth AI: the one kept for signals alone. It is asked in writing, on its own account and on
 * nobody else's, whose turn the next two questions are, and it answers with the id of one of the
 * four talk AIs. Nothing is heard and nothing is shown: its answer is a signal, and what it names
 * is checked on the server before any call is moved.
 */
const ACCOUNT = "coordinator";

/** A signal is a word, not a speech: it is waited for for a moment and never held on to. */
const SIGNAL_WAIT_MS = 8000;

let waiting = null;
let timer = 0;

/** Whatever the signal AI has just answered with, once, to whoever is waiting for it. */
function settle(text) {
  clearTimeout(timer);
  timer = 0;
  const done = waiting;
  waiting = null;
  if (done) done(text);
}

function handlers() {
  return {
    onAgentText: (text) => settle(text),
    onStatus: (status) => {
      if (status !== "closed" && status !== "ended") return;
      settle("");
    },
    onError: () => settle(""),
  };
}

/**
 * The coordinator's own answer, as it came back. A session that cannot be opened throws with what
 * is missing, so an account that is not set up is said plainly instead of being read as a signal
 * that named nobody.
 */
export async function askCoordinator(fromLabel) {
  const socket = new VoiceSocket(handlers());
  // written only, never heard, and hung up as soon as the signal is in
  await socket.open({ withMic: false, silent: true, laterTurn: true, account: ACCOUNT });
  try {
    const reply = await new Promise((resolve) => {
      waiting = resolve;
      clearTimeout(timer);
      timer = setTimeout(() => settle(""), SIGNAL_WAIT_MS);
      if (!socket.sendText(signalLine(fromLabel))) settle("");
    });
    return String(reply || "").trim();
  } finally {
    await socket.stop();
  }
}