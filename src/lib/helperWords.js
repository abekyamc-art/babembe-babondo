import VoiceSocket from "@/lib/elevenLabsSocket";

/**
 * The words helper: the admin's own account, asked in writing. It reads whatever the person
 * wants — said out loud or typed — and hands back the words and meanings the answer should
 * stand on, which ride with the turn into the session that answers it. One session serves the
 * whole conversation, so the words come back in a beat instead of after a fresh greeting every
 * time, and it is closed with the conversation it was opened for.
 */
const ACCOUNT = "helper-words";

/** How long a turn waits for the words before it is answered without them. */
const WORDS_WAIT_MS = 2500;

let session = null;
let waiting = null;
let timer = 0;

/** Whatever the words helper has just answered with, once, to whoever is waiting for it. */
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
      session = null;
      settle("");
    },
    onError: () => settle(""),
  };
}

async function connect() {
  const socket = new VoiceSocket(handlers());
  // written only, never heard, and never hung up between turns
  await socket.open({
    withMic: false,
    silent: true,
    keepOpen: true,
    laterTurn: true,
    account: ACCOUNT,
  });
  return socket;
}

/**
 * The words this request should stand on. A turn never waits longer than a beat for them and
 * never fails over them: an answer given without them is better than a late one, and an
 * unasked question is not one at all.
 */
export async function wordsNote(text) {
  const asked = String(text || "").trim();
  if (!asked) return "";
  try {
    if (!session?.connected) session = await connect();
    const note = await new Promise((resolve) => {
      waiting = resolve;
      clearTimeout(timer);
      timer = setTimeout(() => settle(""), WORDS_WAIT_MS);
      if (!session.sendText(asked)) settle("");
    });
    return String(note || "").trim();
  } catch (err) {
    session = null;
    return "";
  }
}

/** The words helper belongs to the conversation it was opened for. */
export async function closeWords() {
  const socket = session;
  session = null;
  settle("");
  if (socket) await socket.stop();
}