import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { zipStore } from "../../shared/zipStore.ts";

/**
 * Every picture the admin saved beside a word, taken away for review at once.
 *
 * The pictures are kept privately, so a person cannot simply open the folder they live in: each one
 * is read here, on the server, through a short-lived link of its own, and handed back either as one
 * folder (a ZIP, built in the Worker) or a few at a time as the file itself, which the panel saves
 * under the reader's own name. Both are the admin's alone.
 *
 * Nothing of the storage is handed to the app but the finished folder's own short-lived link, and
 * every address is made for this one download and then expires.
 */

// bounds on one export: a folder is built from this many pictures and this much of them, and the
// one-by-one way hands over this many in all, a few per request
const MAX_PICTURES = 150;
const MAX_BYTES = 60 * 1024 * 1024;
const PAGE = 5;
const MAX_EACH = 120;
// how many are read at a time: the Worker holds a handful of connections, not a hundred
const BATCH = 5;
const READ_MS = 20000;

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
};

const rowsOf = (page: any): any[] => (Array.isArray(page) ? page : page?.items || []);

const tidy = (value: any, room = 80) =>
  String(value || "")
    .replace(/[\\/:*?"<>|\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, room);

/** What one picture is called when it is taken away: its word, its own name, and its place in line. */
function fileNameOf(row: any, at: number): string {
  const named = tidy(row?.name);
  const ext = (named.match(/\.(png|jpe?g|gif|webp|bmp|tiff?)$/i)?.[1] || "png").toLowerCase();
  const word = tidy(row?.term && row.term !== "?" ? row.term : "no word", 40) || "no word";
  const rest = tidy(named.replace(/\.[^.]+$/, ""), 40);
  const base = [word, rest && rest.toLowerCase() !== word.toLowerCase() ? rest : ""]
    .filter(Boolean)
    .join(" - ");
  return `${String(at + 1).padStart(3, "0")} ${base}.${ext}`;
}

function typeOf(name: string): string {
  const ext = (name.split(".").pop() || "").toLowerCase();
  return MIME[ext] || "image/png";
}

/**
 * The bytes of one picture: read at its own address when it has one, and otherwise through a
 * short-lived link made for this reading alone, because a picture that came in with a knowledge
 * package is kept privately and is never at a public address of its own.
 */
async function bytesOf(service: any, row: any): Promise<Uint8Array | null> {
  let url = String(row?.file_url || "").trim();
  if (!/^https:\/\//i.test(url)) {
    const uri = String(row?.file_uri || "").trim();
    if (!uri) return null;
    const signed = await service.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 900 });
    url = String(signed?.signed_url || "").trim();
  }
  if (!url) return null;
  const response = await fetch(url, { signal: AbortSignal.timeout(READ_MS) });
  if (!response.ok) return null;
  return new Uint8Array(await response.arrayBuffer());
}

/** The bytes of a run of pictures, read a handful at a time, each one either kept or counted out. */
async function readRun(service: any, rows: any[], from: number) {
  const kept: { row: any; name: string; bytes: Uint8Array }[] = [];
  let missed = 0;

  for (let at = 0; at < rows.length; at += BATCH) {
    const slice = rows.slice(at, at + BATCH);
    const done = await Promise.allSettled(
      slice.map(async (row: any, inside: number) => {
        const bytes = await bytesOf(service, row);
        if (!bytes) throw new Error("unreadable");
        return { row, name: fileNameOf(row, from + at + inside), bytes };
      })
    );
    done.forEach((out: any) => {
      if (out.status === "fulfilled") kept.push(out.value);
      else missed += 1;
    });
  }

  return { kept, missed };
}

/** The pictures the admin has saved, in a steady order. */
async function savedPictures(base44: any) {
  const page = await base44.entities.KnowledgeImage.list({
    sort: "created_date",
    limit: MAX_PICTURES,
    fields: ["term", "name", "file_uri", "file_url"],
  });
  return rowsOf(page).filter((row: any) => row?.file_uri || row?.file_url);
}

function base64(bytes: Uint8Array): string {
  let out = "";
  const chunk = 0x8000;
  for (let at = 0; at < bytes.length; at += chunk) {
    out += String.fromCharCode(...bytes.subarray(at, at + chunk));
  }
  return btoa(out);
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Ingia kwenye akaunti kwanza." }, { status: 401 });
    if (user.role !== "admin") {
      return Response.json({ error: "Ni admin tu anayeweza kuchukua picha za maarifa." }, { status: 403 });
    }

    let payload: any = {};
    try {
      payload = await req.json();
    } catch (err) {
      payload = {};
    }
    const action = typeof payload?.action === "string" ? payload.action : "page";
    const service = base44.asServiceRole;

    const rows = await savedPictures(base44);
    if (!rows.length) {
      return Response.json({ error: "No pictures are saved beside words yet." }, { status: 400 });
    }

    // How many pictures are saved in all. A folder is built from a bounded run of them, so the number
    // said here is the whole of what the panel holds, and whatever did not fit is counted out plainly
    // rather than quietly left behind.
    const whole = Math.max(
      rows.length,
      await base44.entities.KnowledgeImage.count({}).catch(() => rows.length)
    );
    const beyond = Math.max(0, whole - rows.length);

    // One folder of every picture, built here and kept privately, handed over as a link that lives
    // only long enough to be downloaded.
    if (action === "zip") {
      const { kept, missed } = await readRun(service, rows, 0);
      const items: { name: string; bytes: Uint8Array }[] = [];
      let held = 0;
      let over = 0;

      kept.forEach((one) => {
        if (held + one.bytes.length > MAX_BYTES) {
          over += 1;
          return;
        }
        items.push({ name: one.name, bytes: one.bytes });
        held += one.bytes.length;
      });

      if (!items.length) {
        return Response.json({ error: "None of the saved pictures could be read just now." }, { status: 400 });
      }

      const zip = zipStore(items);
      const name = `kibembe-knowledge-images-${new Date().toISOString().slice(0, 10)}.zip`;
      const saved = await service.integrations.Core.UploadPrivateFile({
        file: new File([zip], name, { type: "application/zip" }),
      });
      if (!saved?.file_uri) {
        return Response.json({ error: "The folder could not be kept just now." }, { status: 500 });
      }
      const link = await service.integrations.Core.CreateFileSignedUrl({
        file_uri: saved.file_uri,
        expires_in: 900,
      });
      if (!link?.signed_url) {
        return Response.json({ error: "The folder could not be handed over just now." }, { status: 500 });
      }

      return Response.json({
        url: link.signed_url,
        file_name: name,
        included: items.length,
        total: whole,
        failed: missed + over + beyond,
      });
    }

    // The same pictures, a few at a time, as the file itself — so each one is saved under its own
    // name rather than opened in a page.
    const from = Math.max(0, Math.min(Math.floor(Number(payload?.from) || 0), MAX_EACH));
    const want = Math.max(1, Math.min(Math.floor(Number(payload?.count) || PAGE), PAGE));
    const all = rows.slice(0, MAX_EACH);
    const slice = all.slice(from, from + want);

    const { kept, missed } = await readRun(service, slice, from);
    const items = kept.map((one: any) => ({
      term: tidy(one.row.term === "?" ? "" : one.row.term, 40),
      file_name: one.name,
      data_url: `data:${typeOf(one.name)};base64,${base64(one.bytes)}`,
    }));

    return Response.json({
      items,
      total: whole,
      next: from + slice.length,
      more: from + slice.length < all.length,
      failed: missed,
    });
  } catch (error: any) {
    console.error("The pictures could not be gathered:", error?.message);
    return Response.json({ error: "The pictures could not be gathered just now. Try again." }, { status: 500 });
  }
}