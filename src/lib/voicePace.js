/**
 * The pace his answers are played at on the phone.
 *
 * The voice service caps its own speaking speed at 1.2, so the rest of the pace is taken
 * here, on the phone: his answer runs quicker than the service itself allows. The quicker
 * pace keeps the voice's own pitch, so he sounds like a person talking a little faster.
 */
export const VOICE_RATE = 1.3;