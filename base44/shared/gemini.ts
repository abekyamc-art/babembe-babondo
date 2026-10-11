import { secrets } from "base44:runtime";

/**
 * The app's own reading, through Google's Gemini service on the owner's own key.
 *
 * Every place that used to ask Base44's own AI asks here instead. A call keeps the very shape it
 * already had — `prompt`, `file_urls`, `response_json_schema`, `model`, `add_context_from_internet`
 * — so nothing around a call had to be rewritten: only the reading itself moved, and every answer
 * comes back in the same form it came back in before (a written answer, or the object the schema
 * asked for).
 *
 * Two things are true of this service and are handled here:
 *   · it takes a picture inside the request itself. A picture's public address is not something it
 *     reads by itself, so each picture is fetched, made small, and carried in.
 *   · it is paid for out of the owner's own allowance, and that allowance can run out. When it does
 *     — or when the service cannot be reached for a moment — the app's own AI stands behind the key,
 *     so a person is never left with nothing. When the key answers, no Base44 credits are spent.
 */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";

/** The reading asked for when the caller names no model of this service. */
const READ_MODEL = "gemini-3.8-flash";

/** How big the copy of a picture carried in the request is, by default. */
const SHOWN = 1600;

/** A name of this service's own is used; any other name — a name of the old service — is not sent. */
function engine(model: any): string {
  return typeof model === "string" && model.startsWith("gemini-") ? model : READ_MODEL;
}

/**
 * A smaller copy of the same picture. The reading needs the picture, not every pixel of a 4K file,
 * and the request has a size it must stay inside.
 */
function smaller(url: string, size: number): string {
  try {
    const at = new URL(url);
    if (at.hostname !== "media.base44.com" && at.hostname !== "static.wixstatic.com") return url;
    const cut = at.pathname.match(/^(.*?)\/v1\/(?:fill|fit)\//i);
    const basePath = cut ? cut[1] : at.pathname;
    const name = basePath.split("/").pop() || "picture.jpg";
    const outName = `${name.replace(/\.[a-z0-9]+$/i, "")}.jpg`;
    return `${at.origin}${basePath}/v1/fit/w_${size},h_${size},q_92,enc_jpg/${outName}`;
  } catch {
    return url;
  }
}

/** One picture, carried in the request the way this service takes one. */
async function carried(url: string, size: number) {
  const res = await fetch(smaller(url, size), { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`A picture could not be read (${res.status}).`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  for (let at = 0; at < bytes.length; at += 8192) {
    binary += String.fromCharCode(...bytes.subarray(at, at + 8192));
  }
  return {
    type: "image",
    data: btoa(binary),
    mime_type: (res.headers.get("content-type") || "image/jpeg").split(";")[0],
  };
}

/** Everything the service wrote, read out of the steps it answered in. */
function written(steps: any): string {
  const parts = (Array.isArray(steps) ? steps : []).flatMap((step: any) =>
    Array.isArray(step?.content) ? step.content : []
  );
  return parts
    .filter((part: any) => part?.type === "text" && typeof part.text === "string")
    .map((part: any) => part.text)
    .join("");
}

/** The app's own AI, standing behind the key when the key itself cannot answer. */
function behind(base44: any, asked: any) {
  return base44.asServiceRole.integrations.Core.InvokeLLM(asked);
}

export async function geminiText({
  base44,
  prompt,
  response_json_schema = null,
  file_urls = [],
  model = null,
  add_context_from_internet = false,
  size = SHOWN,
}: any = {}) {
  const pictures: string[] = (Array.isArray(file_urls) ? file_urls : []).map(String).filter(Boolean);

  if (!prompt) throw new Error("No question was put to the reading service.");

  try {
    const input: any[] = [{ type: "text", text: prompt }];
    for (const url of pictures) input.push(await carried(url, size));

    const body: any = { model: engine(model), input, store: false };
    if (response_json_schema) {
      body.response_format = { type: "text", mime_type: "application/json", schema: response_json_schema };
    }
    if (add_context_from_internet) body.tools = [{ type: "google_search" }];

    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "x-goog-api-key": secrets.get("GEMINI_API_KEY"), "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120000),
      });
    } catch {
      const gone: any = new Error("The reading service could not be reached.");
      gone.beforeTheKey = true;
      throw gone;
    }

    if (!res.ok) {
      const said = await res.text().catch(() => "");
      const error: any = new Error(`The reading service answered ${res.status}. ${said.slice(0, 300)}`);
      // an allowance that has run out, or a service that cannot answer for a moment, is not the
      // app's own fault: those are the moments the app's own AI stands behind this key
      error.beforeTheKey = res.status === 429 || res.status >= 500;
      throw error;
    }

    const text = written((await res.json())?.steps);
    if (!response_json_schema) return text;
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("The reading came back in a shape the app could not read.");
    }
  } catch (error: any) {
    if (!error?.beforeTheKey || !base44) throw error;
    const asked: any = { prompt };
    if (pictures.length) asked.file_urls = pictures;
    if (response_json_schema) asked.response_json_schema = response_json_schema;
    if (typeof model === "string" && model && !model.startsWith("gemini-")) asked.model = model;
    return await behind(base44, asked);
  }
}