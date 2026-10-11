import { secrets } from "base44:runtime";

/**
 * The app's own drawing on the owner's own Replicate account.
 *
 * A picture is drawn here when the app's own accounts cannot draw it — an allowance that has run out, or
 * a service that will not take the key just then. The account is the owner's, so this drawing is paid out
 * of that account's own allowance rather than the app's credits.
 *
 * Two kinds of drawing are asked for: a picture made from words alone, and a picture made again from a
 * picture it is handed, with only what was asked for changed. Both are asked for once and then looked in
 * on until they stand. Every picture that comes back is put into the app's own public storage at once,
 * because the service's own address for a drawing is a short-lived one, and a picture a season is played
 * on must not go out from under it.
 */

const API = "https://api.replicate.com/v1";

/** The model that draws from words alone, and the one that draws a picture again from a picture it is handed. */
const FROM_WORDS = "black-forest-labs/flux-1.1-pro-ultra";
const FROM_PICTURE = "black-forest-labs/flux-kontext-pro";

/** How long one drawing is waited for, and how often it is looked in on while it is being made. */
const WAIT = 120000;
const LOOK = 3000;

export async function replicateImage({ base44, prompt, reference_url = null, aspect = null }: any = {}) {
  if (!prompt) throw new Error("No picture was asked for.");

  const token = secrets.get("REPLICATE_API_TOKEN");
  if (!token) throw new Error("The Replicate account is not set (REPLICATE_API_TOKEN).");

  const model = reference_url ? FROM_PICTURE : FROM_WORDS;
  const input: any = {
    prompt,
    output_format: "jpg",
    safety_tolerance: 2,
    // a picture drawn from words stands at the shape it is asked for; one drawn again from a picture
    // keeps the very framing it was handed, so the two copies stand as one picture
    aspect_ratio: aspect || (reference_url ? "match_input_image" : "16:9"),
  };
  if (reference_url) input.input_image = reference_url;

  let res: Response;
  try {
    res = await fetch(`${API}/models/${model}/predictions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait=60",
      },
      body: JSON.stringify({ input }),
      signal: AbortSignal.timeout(WAIT),
    });
  } catch {
    throw new Error("The Replicate account could not be reached.");
  }

  let held: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `The Replicate account answered ${res.status}. ${String(held?.detail || "").slice(0, 200)}`
    );
  }

  // a drawing may still be being made when the answer comes back: it is looked in on until it stands
  const until = Date.now() + WAIT;
  while (held?.status && !["succeeded", "failed", "canceled"].includes(held.status) && Date.now() < until) {
    await new Promise((rest) => setTimeout(rest, LOOK));
    const again = await fetch(held?.urls?.get, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30000),
    }).catch(() => null);
    if (again?.ok) held = await again.json().catch(() => held);
  }

  if (held?.status === "failed" || held?.status === "canceled") {
    throw new Error(
      `The Replicate account did not draw the picture: ${String(held?.error || "").slice(0, 200)}`
    );
  }
  if (held?.status !== "succeeded") {
    throw new Error(`The Replicate account was still drawing the picture when the wait ran out (${held?.status || "no answer"}).`);
  }

  const out = Array.isArray(held?.output) ? held.output[0] : held?.output;
  const url = typeof out === "string" ? out : "";
  if (!url) throw new Error("The Replicate account returned no picture.");

  // kept in the app's own storage, so the picture stands at an address that does not run out
  const drawn = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!drawn.ok) throw new Error("The picture the Replicate account drew could not be read back.");
  const file = new File([await drawn.arrayBuffer()], "glory-picture.jpg", { type: "image/jpeg" });
  const { file_url } = await base44.asServiceRole.integrations.Core.UploadPublicFile({ file });
  return String(file_url || "");
}