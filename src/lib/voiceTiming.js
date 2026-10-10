import { base44 } from "@/api/base44Client";

/**
 * How long a voice turn really takes, for the seat that hears the person itself.
 *
 * The turn is measured from the moment the app has the person's words to the moment the three things
 * that follow have happened: the app's own knowledge for that turn has come back, and the voice's
 * answer has actually begun to be heard. So the two costs a person feels — the wait before the answer
 * can be begun, and the wait before they hear it — are told apart instead of being one silence.
 *
 * Nothing of the person is ever sent with them: the marks are times, and nothing else.
 */

let turn = null;

/** The person's turn has just been written down: the clock starts here. */
export function heardNow() {
  turn = { at: performance.now(), knowledge: 0 };
}

/** The app's own knowledge for the turn has come back and the answer is about to be begun. */
export function knowledgeNow() {
  if (turn && !turn.knowledge) turn.knowledge = Math.round(performance.now() - turn.at);
}

/** The voice has begun to be heard: the turn is measured, and the measuring is done. */
export function answerNow() {
  if (!turn) return;
  const heard_to_voice = Math.round(performance.now() - turn.at);
  const heard_to_knowledge = turn.knowledge;
  turn = null;
  base44.analytics.track({
    eventName: "voice_turn_latency",
    properties: { heard_to_knowledge, heard_to_voice },
  });
}