import VoiceSocket from "@/lib/elevenLabsSocket";

/**
 * Sadiki AI's reading of one Kibembe answer, before the person is given it.
 *
 * The answer itself is written by the Kibembe assistant from the app's own saved Word Bank; Sadiki
 * is asked, in writing and in the quiet, to read it and hand it back. Nothing here writes Kibembe of
 * its own: the reviewer is told in the same line that an answer already right is repeated exactly as
 * it stands, letter for letter, and that it may never add, change or re-spell an Ebembe word.
 *
 * The reading is asked for on Sadiki's own account, on a session opened for this one answer and hung
 * up the moment it lands. Where he cannot be asked at all — the account not set up, the service
 * unreachable — nothing at all is returned, and the answer the assistant wrote stands as it is.
 */
const ACCOUNT = "fourth";

/** A reading is one written answer: it is waited for for a moment and never held on to. */
const REVIEW_WAIT_MS = 25000;

/** How much of a reading is ever taken: a rewritten answer is not an essay. */
const MAX_REVIEW = 600;

const INSTRUCTIONS = [
  "You are checking one answer of the Kibembe assistant of Village Voice before a person is given it.",
  "The answer is written in Kibembe (Ebembe) from the app's own saved Word Bank, and it answers the",
  "question below it. Check only what is before you: that the answer says what the question asked,",
  "that it stays in the language the question was asked in, and that its Kibembe is written the way",
  "the saved words are spelled. Never add, change, re-spell, translate or invent an Ebembe word, and",
  "never add knowledge of your own; an answer that is already right is repeated exactly as it stands,",
  "letter for letter. Answer with that answer itself and nothing else: no greeting, no explanation of",
  "your checking, no note about what you changed, no lists, no headings, no brackets. One or two plain",
  "sentences.",
].join(" ");

/** The reading as it is used: the surrounding quotation and any label taken off, the words left. */
function asAnswer(value) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_REVIEW);
  return text
    .replace(/^["'“”«]+|["'“”»]+$/g, "")
    .replace(/^(jibu|answer|kibembe|ebembe)\s*:\s*/i, "")
    .trim();
}

/**
 * The answer as Sadiki hands it back, or nothing at all when he could not be asked. The draft is
 * handed over whole, with the question it answers, so what is read is the answer the assistant really
 * wrote rather than a summary of it.
 */
export async function reviewAnswer(question, draft) {
  const asked = String(question || "").trim();
  const answer = String(draft || "").trim();
  if (!asked || !answer) return "";

  let waiting = null;
  let timer = 0;
  const settle = (text) => {
    clearTimeout(timer);
    timer = 0;
    const done = waiting;
    waiting = null;
    if (done) done(text);
  };

  const socket = new VoiceSocket({
    onAgentText: (text) => settle(text),
    onStatus: (status) => {
      if (status === "closed" || status === "ended") settle("");
    },
    onError: () => settle(""),
  });

  try {
    await socket.open({ withMic: false, silent: true, laterTurn: true, account: ACCOUNT });
    const reply = await new Promise((resolve) => {
      waiting = resolve;
      clearTimeout(timer);
      timer = setTimeout(() => settle(""), REVIEW_WAIT_MS);
      const line = [INSTRUCTIONS, `Swali: ${asked}`, `Jibu: ${answer}`].join("\n\n");
      if (!socket.sendText(line)) settle("");
    });
    return asAnswer(reply);
  } catch (err) {
    // the account is not set up, or the service could not be reached: the answer stands as written
    return "";
  } finally {
    await socket.stop();
  }
}