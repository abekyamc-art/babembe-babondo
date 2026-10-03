/**
 * The face SDK does its own housekeeping: it ends the session on LiveAvatar's side,
 * and it also asks the server to end it whenever the room drops. By then the session
 * is often already gone — an idle timeout, or the voice agent hanging up — and the
 * answer comes back "Session not found" on a promise the SDK never listens to, so it
 * surfaces as an app error long after the call is over.
 *
 * Ending a session that has already ended is nothing to worry about, so those two
 * housekeeping answers are taken as done. Anything else still fails as it should,
 * and starting a session is never touched.
 */
const HOUSEKEEPING = /\/v1\/sessions\/(stop|keep-alive)$/;
const GONE = /session not found/i;

let installed = false;

export function guardAvatarHousekeeping() {
  if (installed || typeof window === "undefined" || !window.fetch) return;
  installed = true;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const response = await nativeFetch(input, init);
    const url = typeof input === "string" ? input : input?.url || "";
    if (response.ok || !HOUSEKEEPING.test(url)) return response;

    let message = "";
    try {
      message = (await response.clone().json())?.message || "";
    } catch (err) {
      message = "";
    }
    if (!GONE.test(String(message))) return response;

    return new Response(JSON.stringify({ code: 1000, data: null, message: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}