import { primeAudio } from "@/lib/audioUnlock";

// What a spoken turn wants from the microphone, and what is asked for plainly when a phone refuses
// those settings themselves rather than refusing the microphone.
const WANTED = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
};

// A phone that never answers the ask — a permission left undecided — is given up on after this
// long, so a call is never left waiting on a prompt nobody is going to answer.
const ASK_MS = 30000;
const ASK_TIMEOUT = "MicAskTimedOut";
const UNSUPPORTED = "MicUnsupported";

/**
 * What to tell the person when the microphone cannot be opened. Each refusal is named for what it
 * actually is, so nobody is sent looking for a permission that was never the problem.
 */
const WHY = {
  NotAllowedError:
    "Microphone access is blocked. Allow the microphone for this site in your browser, then tap again — or type your message below.",
  SecurityError:
    "Microphone access is blocked. Allow the microphone for this site in your browser, then tap again — or type your message below.",
  NotFoundError:
    "No microphone was found on this phone. Type your message below instead — he answers those too.",
  NotReadableError:
    "Another app is holding the microphone. Close it and tap again — or type your message below.",
  OverconstrainedError:
    "This phone's microphone can't be opened that way. Tap again — or type your message below.",
  AbortError:
    "The microphone could not be started. Tap again — or type your message below.",
  [UNSUPPORTED]:
    "This browser can't reach the microphone. Type your message below — he answers those too.",
  [ASK_TIMEOUT]:
    "The microphone didn't answer — check the microphone permission for this site, then tap again.",
};

/** Why the microphone could not be opened, in words the person can act on. */
export function micMessage(err) {
  return (
    WHY[err?.name || ""] ||
    "The microphone could not be started. Tap again — or type your message below."
  );
}

/** One ask, given up on if the phone never answers it. */
function ask(constraints) {
  const asking = navigator.mediaDevices.getUserMedia({ audio: constraints });

  // a microphone that arrives after the wait was given up on is closed, never left listening
  let late = false;
  asking.then(
    (stream) => {
      if (late) stream.getTracks().forEach((track) => track.stop());
    },
    () => {}
  );

  const expiry = new Promise((_, reject) => {
    setTimeout(() => {
      late = true;
      const err = new Error("The microphone did not answer.");
      err.name = ASK_TIMEOUT;
      reject(err);
    }, ASK_MS);
  });

  return Promise.race([asking, expiry]);
}

/**
 * The microphone: opened with the settings a spoken turn wants, and — where the phone refuses
 * those settings themselves — opened again plainly rather than being given up on.
 */
async function open() {
  if (!navigator.mediaDevices?.getUserMedia) {
    const err = new Error("The microphone is not reachable here.");
    err.name = UNSUPPORTED;
    throw err;
  }

  try {
    return await ask(WANTED);
  } catch (err) {
    const name = err?.name || "";
    // permission, the browser's own refusal, and a prompt nobody answered are not about settings:
    // asking again plainly would change nothing
    if (name === "NotAllowedError" || name === "SecurityError" || name === ASK_TIMEOUT) throw err;
    return await ask(true);
  }
}

let tapAsk = null;
let tapStream = null;

/**
 * The tap that starts a call. The microphone is asked for here — the one moment a phone accepts the
 * ask, and the moment the sound is started too — and what the tap opens is handed to the call a
 * moment later, so a phone that wants a tap to listen sees one.
 */
export function primeMic() {
  primeAudio();
  if (tapAsk || tapStream || !navigator.mediaDevices?.getUserMedia) return;

  tapAsk = open()
    .then((stream) => {
      tapStream = stream;
      return stream;
    })
    .catch(() => null)
    .finally(() => {
      tapAsk = null;
    });
}

/**
 * The microphone this call listens through: the one the tap opened, waited for if the ask is still
 * in flight, and asked for here where the call was not begun by a tap or the tap's ask was refused.
 * Throws when the microphone cannot be opened at all, so the call can say why instead of opening a
 * conversation nobody can be heard in.
 */
export async function claimMic() {
  if (tapAsk) await tapAsk;
  if (tapStream) {
    const stream = tapStream;
    tapStream = null;
    return stream;
  }
  return open();
}

/** A microphone the tap opened for a call that never began is closed, never left listening. */
export function dropMic() {
  const stream = tapStream;
  tapStream = null;
  if (stream) stream.getTracks().forEach((track) => track.stop());
}