import { base44 } from "@/api/base44Client";

/**
 * The two moments the app's marketing plan is measured on.
 *
 * The plan counts these events by their exact names, so each name is written once here and never
 * spelled anywhere else. Each is sent once for the moment it names: a Kibembe session fires on the
 * first turn asked of it — written or spoken — and a voice turn fires when a spoken answer has been
 * read out in full.
 */

const KIBEMBE_SESSION = "kibembe_session_started";
const VOICE_TURN = "voice_turn_completed";

/** A Kibembe session has begun: the first turn asked of it, written or spoken. */
export function noteKibembeSession() {
  base44.analytics.track({ eventName: KIBEMBE_SESSION });
}

/** A spoken answer has finished being read out: one voice turn, done. */
export function noteVoiceTurn() {
  base44.analytics.track({ eventName: VOICE_TURN });
}