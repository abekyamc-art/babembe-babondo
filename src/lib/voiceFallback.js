import { base44 } from "@/api/base44Client";
import { LANGUAGE_FALLBACK } from "@/lib/languageGate";

/**
 * The app's own line, said in the app's own voice over a voice service's own.
 *
 * The seats that answer on their own accounts — the talk AIs and Cartesia AI — cannot be told what to
 * say: their settings are their own, and nothing of the app's is put to them. So when one of them
 * turns into a language this app does not speak, the app answers for itself: the line it already says
 * when a language is not one of its three is read out in the app's own voice, while the seat's own
 * line is cut where it stands.
 *
 * The line is asked for once and kept for the rest of the session — it is the same words every time —
 * and where the voice cannot be made at all, the line stays on the screen by itself rather than the
 * call going quiet on it.
 */

let asked = null;
let speaker = null;

function lineUrl() {
  if (!asked) {
    asked = base44.functions
      .invoke("kibembeVoice", { text: LANGUAGE_FALLBACK })
      .then((res) => String(res?.data?.audio_url || ""))
      .catch(() => "");
  }
  return asked;
}

/**
 * The app's own line, read out loud. Its beginning and its end are reported exactly as the call's own
 * voice reports them, so the call follows the app's line the way it follows any answer — and where the
 * sound cannot be played at all, the end is reported at once rather than the call sitting on it.
 */
export function sayFallback({ onStart, onEnd } = {}) {
  lineUrl().then((url) => {
    if (!url) {
      onEnd?.();
      return;
    }
    if (!speaker) speaker = new Audio();
    speaker.src = url;
    speaker.onplay = () => onStart?.();
    speaker.onended = () => onEnd?.();
    speaker.onerror = () => onEnd?.();
    speaker.play().catch(() => onEnd?.());
  });
}