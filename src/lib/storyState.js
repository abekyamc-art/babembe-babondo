/**
 * The story he is in the middle of telling, kept across connections.
 *
 * A long story is told in parts, so a call that opens later has to know which story
 * is running and how many parts have already been told — otherwise he starts over.
 * The state is read from the conversation itself: the request that opened the story,
 * and the parts he has given since.
 */

// the words a person uses to ask for a story, in the languages he serves
const STORY_ASKS = /\b(hadithi|historia|stori|story|stories|habari|news|maelezo|description|salamu|greeting)\b/i;
// the words that ask for a different story rather than the next part of this one
const FRESH_ASKS = /\b(nyingine|ingine|mpya|different|new|another)\b/i;

const MAX_TOPIC = 90;

/** Whether a turn is asking for a story, so the admin's own saved stories are looked for. */
export function isStoryAsk(text) {
  return STORY_ASKS.test(String(text || ""));
}

export function emptyStory() {
  return { open: false, parts: 0, topic: "" };
}

/** One turn folded into the story: a request opens it, his replies are its parts. */
export function nextStory(state, role, text) {
  const said = String(text || "").trim();
  if (!said) return state;

  if (role === "user") {
    if (!STORY_ASKS.test(said)) return state;
    // a request for a different story clears the one running; "endelea" keeps it
    return { open: true, parts: 0, topic: FRESH_ASKS.test(said) ? "" : state.topic };
  }

  if (!state.open) return state;
  // his opening words of the first part are what name this story for the next call
  return {
    open: true,
    parts: state.parts + 1,
    topic: state.topic || said.slice(0, MAX_TOPIC),
  };
}

/** The story in progress, as a note he reads before answering. */
export function storyNote(state) {
  if (!state?.open || !state.parts) return "";
  const which = state.topic ? ` Hadithi unayoisimulia: "${state.topic}…".` : "";
  return (
    `Hadithi inaendelea: umekwisha simulia sehemu ${state.parts} ya hadithi hii.${which} ` +
    `Mtu akiomba zaidi, endelea sehemu ya ${state.parts + 1} mahali ilipoishia — ` +
    "usianze upya, usirudie sehemu iliyokwisha simuliwa, na usianze hadithi nyingine bila mtu kuomba. " +
    "Kila sehemu iwe na maneno mapya yanayotokea humo."
  );
}

/** The conversation's memory with the story in progress carried after it. */
export function withStory(memory, state) {
  const note = storyNote(state);
  if (!note) return memory || "";
  return memory ? `${memory}\n\n${note}` : note;
}