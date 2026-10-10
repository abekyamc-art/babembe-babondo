import { base44 } from "@/api/base44Client";
import { OPENAI_AI } from "@/lib/providerNames";

/**
 * AI 1's own voice.
 *
 * AI 1 — the first voice of a home call — is carried by a voice of its own: an ElevenLabs
 * conversational agent whose voice the admin chose and tuned, so the first voice of the call is a
 * real, hand-picked voice speaking Ebembe in its own accent instead of one service's fixed preset.
 *
 * Nothing about who AI 1 is changes. It keeps its own id, its own name on screen, its place at the
 * head of the ring and its six answers before the call moves on: only the voice speaking through the
 * seat changes, and the whole call is opened, counted, handed on and hung up by the same machinery
 * every talk AI already uses.
 *
 * The route is set up on the server and never guessed at here: the app asks for the voice's session
 * exactly as it asks every voice of the ring, and where that voice has not been set up — or its
 * account refuses the call — AI 1 opens on the app's own OpenAI seat exactly as it always has. So a
 * voice that is not yet configured costs the call nothing, and no key ever reaches this file.
 */

/** The account AI 1's own voice opens on, as the app's voice service names it. */
export const AI1_VOICE_ACCOUNT = "ai1voice";

/**
 * AI 1's own voice, asked for the session its call is opened with. What comes back is the
 * short-lived conversation link, or nothing at all where the voice has not been set up yet or its
 * account would not hand the call over.
 */
export async function ai1VoiceSession() {
  try {
    const res = await base44.functions.invoke("elevenLabsSession", { account: AI1_VOICE_ACCOUNT });
    const session = res?.data || {};
    return session.signed_url ? session : null;
  } catch (err) {
    // the voice could not be asked at all: AI 1 takes the call on the app's own seat instead, so a
    // voice that is not reachable is never a call that does not open
    return null;
  }
}

/**
 * AI 1 carried by its own voice: the seat itself, spoken through the account its own voice stands on.
 * Everything else about the seat — its id, its name, its place in the ring, its six answers — is left
 * exactly as it stands.
 */
export function withAi1Voice(seat) {
  return { ...seat, kind: "talk", account: AI1_VOICE_ACCOUNT, label: seat.label || OPENAI_AI };
}