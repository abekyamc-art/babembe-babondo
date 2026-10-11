import { secrets } from "base44:runtime";
import jpeg from "npm:jpeg-js@0.4.4";
import pngjs from "npm:pngjs@7.0.0";

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
 *
 * The app speaks through the owner's own accounts, one group of features to each, so that no single
 * account's daily allowance has to carry the whole app: reading on the first three — the live
 * assistant with its knowledge, every look at a picture or a photograph, and the writing of songs —
 * and the drawing of every picture on accounts of its own, because a picture drawn is the heaviest,
 * most limited thing this app asks for. Each call names the group it belongs to; a group whose account
 * has not been set is named plainly in the error it raises, so a missing account is never silently
 * paid out of another account's allowance.
 */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";

/** The reading asked for when the caller names no model of this service. */
const READ_MODEL = "gemini-3.8-flash";

/**
 * Which of the owner's accounts a group of features is paid out of — the whole routing map of the app,
 * in one place. Reading stands on the first three accounts: the live assistant and the reading of its
 * knowledge, every look at a picture or a photograph, and the writing of songs. Drawing stands on the
 * next five, one family of pictures to an account: the lettered pictures of the dictionary, the edited
 * copy of a puzzle, the two photographs of a prize pair, and the season trophies. The last account
 * (GEMINI_API_KEY9) draws the season covers of the differences game, the last family that asks for pictures.
 */
const KEYS: Record<string, string> = {
  answer: "GEMINI_API_KEY",
  pictures: "GEMINI_API_KEY2",
  song: "GEMINI_API_KEY3",
  drawing: "GEMINI_API_KEY4",
  puzzledraw: "GEMINI_API_KEY5",
  sceneone: "GEMINI_API_KEY6",
  scenetwo: "GEMINI_API_KEY7",
  trophies: "GEMINI_API_KEY8",
  covers: "GEMINI_API_KEY9",
};

/**
 * The account a call is paid out of. A group is never paid out of another group's account, and an
 * account that has not been set is said plainly rather than passed over: a missing account must never
 * be mistaken for a reading that failed, and no other account's allowance is spent in its place. A
 * call that names no group at all stands on the first account, exactly as it always has.
 */
function keyFor(group: any): string {
  const named = String(group || "").trim();
  if (!named) {
    const first = secrets.get(KEYS.answer);
    if (!first) throw new Error(`The account every reading stands on is not set (${KEYS.answer}).`);
    return first;
  }
  const secretName = KEYS[named];
  if (!secretName) throw new Error(`No account stands for the "${named}" group of features.`);
  const value = secrets.get(secretName);
  if (!value) throw new Error(`The account for the "${named}" group of features is not set (${secretName}).`);
  return value;
}

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

/** One picture, fetched and made small: the bytes themselves, and what kind of picture they are. */
async function imageBytes(url: string, size: number) {
  const res = await fetch(smaller(url, size), { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`A picture could not be read (${res.status}).`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  for (let at = 0; at < bytes.length; at += 8192) {
    binary += String.fromCharCode(...bytes.subarray(at, at + 8192));
  }
  return { data: btoa(binary), mimeType: (res.headers.get("content-type") || "image/jpeg").split(";")[0] };
}

/** One picture, carried in a reading the way this service takes one. */
async function carried(url: string, size: number) {
  const { data, mimeType } = await imageBytes(url, size);
  return { type: "image", data, mime_type: mimeType };
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
  group = "answer",
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
        headers: { "x-goog-api-key": keyFor(group), "Content-Type": "application/json" },
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

/** Where a picture is asked for, and the two models the app asks it of. */
const DRAW_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
export const DRAW_MODEL = "gemini-2.5-flash-image";
export const DRAW_BIG = "gemini-3-pro-image-preview";

/** How wide and tall a picture that came back is: its longest side, or nothing when it cannot be read. */
function drawnSide(bytes: Uint8Array, mime: string) {
  try {
    if (/png/i.test(mime)) {
      const png = pngjs.PNG.sync.read(Buffer.from(bytes));
      return Math.max(png.width, png.height);
    }
    const photo = jpeg.decode(bytes, { useTArray: true });
    return Math.max(photo.width, photo.height);
  } catch {
    return 0;
  }
}

/**
 * A picture, drawn — or one already there, changed — through the owner's own account.
 *
 * The call names the group of features the picture belongs to, exactly as a reading does, and the
 * account that group keeps pays for the drawing. A picture that is to be changed rather than newly
 * drawn carries the photograph it stands on in the request itself, so the very same scene comes back
 * with only what was asked for moved.
 *
 * Some pictures must be large — the photographs a prize puzzle is played on — so a call may name the
 * least side it will accept. A picture smaller than that is refused rather than passed on, and the
 * caller is left to draw it its own way, so a level is never quietly played on a small picture.
 *
 * Either way the bytes that come back are put into the app's own public storage, and it is that
 * picture's address that is returned.
 */
export async function geminiImage({
  base44,
  group = "drawing",
  prompt,
  reference_urls = [],
  model = DRAW_MODEL,
  aspect = null,
  imageSize = null,
  least = 0,
  size = SHOWN,
}: any = {}) {
  if (!prompt) throw new Error("No picture was asked for.");

  const parts: any[] = [{ text: prompt }];
  for (const url of (Array.isArray(reference_urls) ? reference_urls : []).map(String).filter(Boolean)) {
    const { data, mimeType } = await imageBytes(url, size);
    parts.push({ inlineData: { mimeType, data } });
  }

  const shape: any = { responseModalities: ["IMAGE"] };
  if (aspect || imageSize) {
    shape.imageConfig = {
      ...(aspect ? { aspectRatio: aspect } : {}),
      ...(imageSize ? { imageSize } : {}),
    };
  }

  const res = await fetch(`${DRAW_ENDPOINT}/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": keyFor(group), "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: shape }),
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) {
    const said = await res.text().catch(() => "");
    throw new Error(`The picture service answered ${res.status}. ${said.slice(0, 200)}`);
  }

  const answer = await res.json();
  const drawn = (answer?.candidates?.[0]?.content?.parts || []).find((part: any) => part?.inlineData?.data);
  if (!drawn) throw new Error("The picture service returned no picture.");

  const mime = String(drawn.inlineData.mimeType || "image/png");
  const bytes = Uint8Array.from(atob(drawn.inlineData.data), (char) => char.charCodeAt(0));
  if (least && drawnSide(bytes, mime) < least) {
    throw new Error(`The picture drawn was smaller than the ${least} pixels a side this picture needs.`);
  }

  const file = new File([bytes], `glory-picture.${/jpe?g/i.test(mime) ? "jpg" : "png"}`, { type: mime });
  const { file_url } = await base44.asServiceRole.integrations.Core.UploadPublicFile({ file });
  return String(file_url || "");
}