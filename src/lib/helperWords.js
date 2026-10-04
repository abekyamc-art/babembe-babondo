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

/** How much of the first answer is handed back for the second review. */
const REVIEW_ASK = 1200;

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
 * The second review: the helper reads its own first answer again against the phrase, finds the
 * Ebembe word that fits the place the person's words left open, and gives the phrase whole. It is
 * asked only when the person's own words left such a place — a place no saved word accounts for.
 */
function reviewAsk(asked, first) {
  return (
    `Rudia ombi hili kwa makini: "${asked}".\n` +
    `Majibu yako ya kwanza: ${String(first || "").slice(0, REVIEW_ASK)}\n` +
    "Maneno ya mtu yana mahali ambapo neno halipo kwenye orodha ya maneno yaliyohifadhiwa. " +
    "Orodhesha maneno ya Ebembe yanayoweza kufaa mahali hapo, kisha chagua linalofaa zaidi kwa " +
    "maana yake na matumizi yake, na uandike kishazi kizima kwa Ebembe kikiwa na neno hilo. " +
    "Usibuni neno lisilohifadhiwa, usionyeshe mwongozo wa matamshi, na usitumie Kiswahili wala " +
    "Kiingereza."
  );
}

/** One ask, settled by the helper's own answer, a beat's wait, or the session closing. */
function ask(text) {
  return new Promise((resolve) => {
    waiting = resolve;
    clearTimeout(timer);
    timer = setTimeout(() => settle(""), WORDS_WAIT_MS);
    if (!session?.sendText(text)) settle("");
  });
}

/**
 * The words this request should stand on. A turn never waits longer than a beat for them and
 * never fails over them: an answer given without them is better than a late one, and an unasked
 * question is not one at all.
 *
 * `first` is the words helper's own first answer: when it is given, this call is the second review
 * of the same turn — the helper reads those candidates again and says which saved Ebembe word fits
 * the place that was left open, so the phrase comes out whole.
 */
export async function wordsNote(text, { first = "" } = {}) {
  const asked = String(text || "").trim();
  if (!asked) return "";
  try {
    if (!session?.connected) session = await connect();
    if (!first) return await ask(asked);
    const again = await ask(reviewAsk(asked, first));
    return again || first;
  } catch (err) {
    session = null;
    return first || "";
  }
}

/** The words helper belongs to the conversation it was opened for. */
export async function closeWords() {
  const socket = session;
  session = null;
  settle("");
  if (socket) await socket.stop();
}