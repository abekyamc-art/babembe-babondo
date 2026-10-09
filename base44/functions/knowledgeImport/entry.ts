import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import JSZip from "npm:jszip@3.10.1";

/**
 * Reading a package of Kibembe knowledge: a ZIP, or a Word file, brought in whole.
 *
 * The words are found in the documents it holds, and every picture is set beside the word it stood
 * next to — the picture written into the line with the word, the one standing on its line just above
 * it, or the one whose file is named after the word itself. Nothing is written into the knowledge
 * document here: what comes back is what was found, and the admin says which of it goes in.
 *
 * Pictures are kept in the app's own private storage, so each one is opened by the admin through a
 * short-lived link and never stands at a public address.
 */

const MAX_BYTES = 40 * 1024 * 1024;
const MAX_PICTURES = 100;
const MAX_ENTRIES = 2000;
const MAX_TEXT = 300000;
const MAX_TERM = 60;
const MAX_MEANING = 200;
const MAX_USAGE = 120;
const MAX_GUIDE = 90;

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp)$/i;
const TEXT_EXT = /\.(txt|text|md|markdown|csv|tsv|json|srt|vtt|html?|xml)$/i;
// a document package's own parts: a Word file inside the archive holds its words and its pictures
// under these paths, and they are read through the document itself rather than as files of their own
const PACKAGE_PATH = /^(word|xl|ppt|docProps|_rels|customXml)\//i;

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
};

/** Which part of a document a heading names, in the names an admin is likely to write. */
const SHAPES: [string, RegExp][] = [
  [
    "words",
    /^(?:the )?(?:words?|word list|vocabulary|maneno|maneno ya ebembe|ebembe words|kibembe words|misamiati)$/i,
  ],
  [
    "phrases",
    /^(?:the )?(?:phrases?|expressions?|sayings?|sentences?|proverbs?|misemo|msemo|sentensi|methali)$/i,
  ],
  [
    "rules",
    /^(?:the )?(?:rules?|rule book|grammar|reading|reading key|sheria|kanuni|sarufi|matamshi|namna ya kusoma)$/i,
  ],
  [
    "knowledge",
    /^(?:the )?(?:knowledge|notes?|questions?|questions and answers|q ?& ?a|qa|world|general|more|maarifa|maelezo|maswali|maswali na majibu)$/i,
  ],
];

type Found = { name: string; bytes: Uint8Array };
type Pic = { name: string; file_uri: string };
type Mark = { start: number; end: number; pic: Pic | null; key: string };

const clean = (value: any, max: number) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
const leafOf = (path: string) => String(path || "").split("/").pop() || String(path || "");
const norm = (value: any) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const stripExt = (name: string) => String(name || "").replace(/\.[a-z0-9]{1,5}$/i, "");

/** Whether a line opens a new part of a document, and which part it names. */
function headingId(line: string): string | null {
  const raw = String(line || "").trim();
  if (!raw || raw.length > 48) return null;
  const hashed = raw.match(/^#{1,6}\s*(.+?)\s*#*$/);
  const name = (hashed ? hashed[1] : raw).replace(/[:.\s]+$/, "").trim();
  if (!name) return null;
  if (!hashed && (name.includes("=") || name.includes("|"))) return null;

  const found = SHAPES.find(([, shape]) => shape.test(name));
  if (found) return found[0];
  if (hashed) return "knowledge";
  const letters = name.replace(/[^\p{L}]/gu, "");
  if (letters.length >= 3 && name === name.toUpperCase() && letters !== letters.toLowerCase()) {
    return "knowledge";
  }
  return null;
}

/** One written line as a word: its spelling, the reading that is the voice's alone, and its meaning. */
function termOf(raw: string, hasPicture: boolean, canStart: boolean) {
  const line = clean(raw, 400);
  if (!line) return null;

  const cut = line.indexOf("=");
  const left = cut >= 0 ? line.slice(0, cut) : line;
  const right = cut >= 0 ? line.slice(cut + 1) : "";

  const held = left.match(/\(([^()]*)\)/);
  const term = clean(
    left
      .replace(/\([^()]*\)/g, " ")
      .replace(/\[\[[^\]]*\]\]/g, " ")
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/\[[^\]]*$/, " ")
      .replace(/^[^\][]*\]/, " ")
      .replace(/^[\s,;:|/–—-]+/, ""),
    MAX_TERM
  );
  if (!term) return null;
  if (/^(?:https?:|www\.)/i.test(term)) return null;

  // A word stated with no meaning and no picture of its own reads as a word only where a word is
  // expected: it opens the line it stands on, it is short, and it does not end like a sentence.
  // Anything else reading that way is prose, and follows the word above it.
  if (cut < 0 && !hasPicture) {
    if (!canStart) return null;
    if (/[.!?;:,]$/.test(term)) return null;
    if (term.split(/\s+/).length > 4 || term.length > 40) return null;
  }

  const bar = right.indexOf("|");
  return {
    term,
    meaning: clean(bar >= 0 ? right.slice(0, bar) : right, MAX_MEANING),
    // how the word is used, when the document states it after the meaning
    usage: clean(bar >= 0 ? right.slice(bar + 1) : "", MAX_USAGE),
    guide: held ? clean(held[1], MAX_GUIDE) : "",
  };
}

/** The picture a written name points at, whether it is written as a path or as the file's own name. */
function picNamed(name: string, pics: Pic[]): Pic | null {
  const wanted = leafOf(String(name || "").replace(/^["'<]+|["'>]+$/g, "").trim()).toLowerCase();
  if (!wanted) return null;
  const plain = stripExt(wanted);
  return (
    pics.find((pic) => pic.name.toLowerCase() === wanted) ||
    pics.find((pic) => stripExt(pic.name).toLowerCase() === plain) ||
    null
  );
}

/**
 * Where a picture's name stands in a line: a mention written in brackets is the one taken — that is
 * a mark the file itself put there — and only where the name stands in no brackets at all is its
 * first plain mention used instead.
 */
function placeOfName(line: string, needle: string) {
  if (!needle) return -1;
  const said = line.toLowerCase();
  let plain = -1;
  let at = said.indexOf(needle);
  while (at >= 0) {
    const before = at > 0 ? line[at - 1] : " ";
    const after = at + needle.length < line.length ? line[at + needle.length] : " ";
    if (!/[\p{L}\p{N}]/u.test(before) && !/[\p{L}\p{N}]/u.test(after)) {
      if (/[\[(]/.test(before) || /[\])]/.test(after)) return at;
      if (plain < 0) plain = at;
    }
    at = said.indexOf(needle, at + 1);
  }
  return plain;
}

/**
 * The pictures a line names: a mark written round one, a markdown picture, or the file's own name
 * written plainly in the line. Each picture is taken once, so a name standing twice is one mark.
 */
function marksIn(line: string, pics: Pic[]): Mark[] {
  const marks: Mark[] = [];
  const claimed = new Set<string>();
  const add = (start: number, end: number, pic: Pic | null, key: string) => {
    if (key && claimed.has(key)) return;
    if (key) claimed.add(key);
    marks.push({ start, end, pic, key });
  };

  const written =
    /\[\[\s*image\s*:\s*([^\]]+)\]\]|!\[[^\]]*\]\(([^)]*)\)|\[([^\]]*)\]\(([^)]*)\)/gi;
  let hit: RegExpExecArray | null;
  while ((hit = written.exec(line))) {
    const name = hit[1] || hit[2] || hit[4] || hit[3] || "";
    const pic = picNamed(name, pics);
    add(hit.index, hit.index + hit[0].length, pic, pic ? pic.file_uri : `?${name.toLowerCase()}`);
  }

  // the file's own name written in a line, with no mark round it at all
  pics.forEach((pic) => {
    if (marks.some((mark) => mark.pic?.file_uri === pic.file_uri)) return;
    const said = line.toLowerCase();
    const full = pic.name.toLowerCase();
    const plain = stripExt(pic.name).toLowerCase();
    // the file's own name, or the name the picture goes by with no ending written on it
    const needle = full && said.includes(full) ? full : plain;
    const at = placeOfName(line, needle);
    if (at < 0) return;
    add(at, at + needle.length, pic, pic.file_uri);
  });

  // A bracket hugging the name is part of the mark: what is written round a picture is where the
  // picture stands, and never a word of the line.
  return marks
    .sort((a, b) => a.start - b.start)
    .map((mark) => {
      let start = mark.start;
      let end = mark.end;
      while (start > 0 && /[\[\]]/.test(line[start - 1])) start -= 1;
      while (end < line.length && /[\[\]]/.test(line[end])) end += 1;
      return { ...mark, start, end };
    });
}

/**
 * Every word a document holds, in the order it is written, each one with the picture that stood
 * beside it. A picture written into a line joins the word on that line; a picture standing on a line
 * of its own joins the word just above it, or waits for the word below.
 */
function readEntries(lines: string[], pics: Pic[], source: string) {
  const out: any[] = [];
  const waiting: Pic[] = [];
  let section = "words";
  let last: any = null;

  for (const raw of lines) {
    if (out.length >= MAX_ENTRIES) break;
    const line = clean(raw, 600);
    if (!line) continue;

    const id = headingId(line);
    if (id) {
      section = id;
      continue;
    }
    // the rules of the language are rules, not words
    if (section === "rules") continue;

    // The line as its parts: a picture mark closes a part, and — where the line states no meaning of
    // its own — a comma closes one too, so a list of words written on one line reads as its own
    // words. A word on its own may only open the line; whatever follows needs a picture or a meaning
    // of its own to be a word, so a sentence running on is prose.
    const chunks = line.includes("=") ? [line] : line.split(",");
    const parts: { text: string; pic: Pic | null }[] = [];
    chunks.forEach((chunk) => {
      const inner = marksIn(chunk, pics);
      let from = 0;
      inner.forEach((mark) => {
        parts.push({ text: chunk.slice(from, mark.end), pic: mark.pic });
        from = mark.end;
      });
      if (from < chunk.length) parts.push({ text: chunk.slice(from), pic: null });
    });

    parts.forEach((part, index) => {
      const row = termOf(part.text, !!part.pic, index === 0);
      if (row) {
        let pic = part.pic;
        let how = pic ? "the picture stood beside it in the document" : "";
        if (!pic && waiting.length) {
          pic = waiting.shift() as Pic;
          how = "the picture stood just above it";
        }
        out.push({
          term: row.term,
          meaning: row.meaning,
          usage: row.usage,
          guide: row.guide,
          source,
          line,
          picture: pic,
          how,
        });
        last = out[out.length - 1];
        return;
      }

      if (part.pic) {
        // a line that is only a picture: it belongs to the word above, or waits for the word below
        if (last && !last.picture) {
          last.picture = part.pic;
          last.how = "the picture stood beside it in the document";
          return;
        }
        if (!waiting.some((held) => held.file_uri === part.pic?.file_uri)) waiting.push(part.pic);
        return;
      }

      // anything else on the line that reads as prose follows the word above it as its meaning
      const prose = clean(part.text, MAX_MEANING);
      if (prose && last && !last.meaning) last.meaning = prose;
    });
  }

  // one word stands once: where a spelling is written twice, the one with a picture is the one kept
  const byKey = new Map<string, any>();
  out.forEach((row) => {
    const key = norm(row.term);
    const held = byKey.get(key);
    if (!held) {
      byKey.set(key, row);
      return;
    }
    if (!held.picture && row.picture) byKey.set(key, row);
  });

  return [...byKey.values()];
}

/** A picture whose file is named after the word itself belongs to that word. */
function matchByName(entries: any[], pics: Pic[]) {
  pics.forEach((pic) => {
    if (entries.some((row) => row.picture?.file_uri === pic.file_uri)) return;
    const key = norm(stripExt(pic.name));
    if (!key) return;
    const entry = entries.find(
      (row) =>
        !row.picture &&
        (norm(row.term) === key || norm(row.term).replace(/ /g, "") === key.replace(/ /g, ""))
    );
    if (!entry) return;
    entry.picture = pic;
    entry.how = "its file is named after the word";
  });
}

function decodeEntities(text: string) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (all, code) => String.fromCodePoint(Number(code) || 32))
    .replace(/&amp;/g, "&")
    .replace(/&[a-z]+;/gi, " ");
}

function decodeText(bytes: Uint8Array) {
  if (bytes.length > 1 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  }
  if (bytes.length > 1 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  }
  return new TextDecoder("utf-8").decode(bytes);
}

function stripTags(html: string) {
  return decodeEntities(
    String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<\s*(?:br|\/p|\/div|\/li|\/tr|\/h[1-6])\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  );
}

/**
 * A Word document read line by line: each paragraph as it stands, with every picture marked in the
 * very place it sits in the paragraph, so a picture standing beside a word joins that word.
 */
async function readDocx(bytes: Uint8Array) {
  const inner = await JSZip.loadAsync(bytes);
  const doc = inner.file("word/document.xml");
  const lines: string[] = [];
  const media: Found[] = [];

  if (doc) {
    const rels = inner.file("word/_rels/document.xml.rels");
    const targets: Record<string, string> = {};
    if (rels) {
      const xml = await rels.async("string");
      const each = /<Relationship\b[^>]*>/g;
      let row: RegExpExecArray | null;
      while ((row = each.exec(xml))) {
        const id = row[0].match(/Id="([^"]+)"/);
        const target = row[0].match(/Target="([^"]+)"/);
        if (id && target && /media\//i.test(target[1])) {
          targets[id[1]] = leafOf(decodeEntities(target[1]));
        }
      }
    }

    const xml = await doc.async("string");
    xml
      .replace(/<\/w:tc>/g, " ")
      .split(/<\/w:p>/)
      .forEach((paragraph) => {
        let said = "";
        const tokens =
          /<w:t[^>]*>([\s\S]*?)<\/w:t>|<a:blip[^>]*r:embed="([^"]+)"|<v:imagedata[^>]*r:id="([^"]+)"/g;
        let token: RegExpExecArray | null;
        while ((token = tokens.exec(paragraph))) {
          if (token[1] != null) {
            said += decodeEntities(token[1]);
            continue;
          }
          const name = targets[token[2] || token[3]];
          if (name) said += ` [[image:${name}]] `;
        }
        lines.push(said);
      });
  }

  const names = Object.keys(inner.files).filter((name) => !inner.files[name].dir);
  for (const name of names) {
    if (!/^word\/media\//i.test(name) || !IMAGE_EXT.test(name)) continue;
    media.push({ name: leafOf(name), bytes: await inner.files[name].async("uint8array") });
  }

  return { lines, media };
}

/** Everything readable in a ZIP: the documents it holds, and the pictures among them. */
async function readPackage(bytes: Uint8Array) {
  const zip = await JSZip.loadAsync(bytes);
  const texts: { name: string; text: string }[] = [];
  const pictures: Found[] = [];
  const read: string[] = [];
  const skipped: string[] = [];

  const names = Object.keys(zip.files).filter((name) => !zip.files[name].dir);
  for (const name of names) {
    const leaf = leafOf(name);
    if (!leaf || leaf.startsWith(".") || name.startsWith("__MACOSX/")) continue;

    if (/\.docx$/i.test(name)) {
      const inner = await readDocx(await zip.files[name].async("uint8array"));
      if (inner.lines.join("").trim()) texts.push({ name: leaf, text: inner.lines.join("\n") });
      inner.media.forEach((item) => pictures.push(item));
      read.push(leaf);
      continue;
    }
    if (PACKAGE_PATH.test(name)) continue;

    if (IMAGE_EXT.test(name)) {
      pictures.push({ name: leaf, bytes: await zip.files[name].async("uint8array") });
      read.push(leaf);
      continue;
    }
    if (TEXT_EXT.test(name)) {
      const text = decodeText(await zip.files[name].async("uint8array"));
      if (text.trim()) {
        texts.push({ name: leaf, text: /\.html?$/i.test(name) ? stripTags(text) : text });
      }
      read.push(leaf);
      continue;
    }
    skipped.push(leaf);
  }

  return { texts, pictures, read, skipped };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Ingia kwenye akaunti kwanza." }, { status: 401 });
    if (user.role !== "admin") {
      return Response.json({ error: "Ni admin tu anayeweza kuleta maarifa." }, { status: 403 });
    }

    let payload: any = {};
    try {
      payload = await req.json();
    } catch (err) {
      payload = {};
    }

    const fileUri = typeof payload?.file_uri === "string" ? payload.file_uri.trim() : "";
    const fileName = clean(payload?.name, 160) || "the package";
    // a stored file only: this endpoint never fetches a web address for a caller
    if (!fileUri || /^https?:/i.test(fileUri)) {
      return Response.json({ error: "No file to read." }, { status: 400 });
    }

    const service = base44.asServiceRole;
    const signed = await service.integrations.Core.CreateFileSignedUrl({
      file_uri: fileUri,
      expires_in: 600,
    });
    if (!signed?.signed_url) {
      return Response.json({ error: "That file could not be opened." }, { status: 400 });
    }

    const response = await fetch(signed.signed_url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) {
      return Response.json({ error: "That file could not be read." }, { status: 400 });
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > MAX_BYTES) {
      return Response.json(
        { error: `That file is larger than ${Math.round(MAX_BYTES / (1024 * 1024))} MB.` },
        { status: 400 }
      );
    }

    // a ZIP and a Word file are the same kind of thing: a package of files read through its own index
    const isZip = bytes.length > 3 && bytes[0] === 0x50 && bytes[1] === 0x4b;
    if (!isZip) {
      return Response.json(
        {
          error:
            "This reads a ZIP or a Word file (.docx). A plain text file is written straight into the working copy instead.",
        },
        { status: 400 }
      );
    }

    const pkg = /\.docx$/i.test(fileName)
      ? await (async () => {
          const inner = await readDocx(bytes);
          return {
            texts: inner.lines.join("").trim() ? [{ name: fileName, text: inner.lines.join("\n") }] : [],
            pictures: inner.media,
            read: inner.lines.join("").trim() ? [fileName] : [],
            skipped: [] as string[],
          };
        })()
      : await readPackage(bytes);

    if (!pkg.texts.length && !pkg.pictures.length) {
      return Response.json(
        { error: "Nothing readable was found in that file — no words, and no pictures." },
        { status: 400 }
      );
    }

    // every picture is kept in the app's own private storage, a few at a time
    const pics: Pic[] = [];
    let notKept = 0;
    const found = pkg.pictures.slice(0, MAX_PICTURES);
    notKept += pkg.pictures.length - found.length;
    for (let at = 0; at < found.length; at += 5) {
      const slice = found.slice(at, at + 5);
      const done = await Promise.allSettled(
        slice.map(async (item) => {
          const ext = (item.name.split(".").pop() || "").toLowerCase();
          const file = new File([item.bytes], item.name, { type: MIME[ext] || "image/png" });
          const saved = await service.integrations.Core.UploadPrivateFile({ file });
          return { name: item.name, file_uri: String(saved?.file_uri || "") };
        })
      );
      done.forEach((out) => {
        if (out.status === "fulfilled" && out.value.file_uri) pics.push(out.value);
        else notKept += 1;
      });
    }

    // the words, each with the picture that stood beside it, read from every document in the package
    const entries: any[] = [];
    pkg.texts.forEach((doc) => {
      readEntries(doc.text.replace(/\r/g, "").split("\n"), pics, doc.name).forEach((row) =>
        entries.push(row)
      );
    });
    matchByName(entries, pics);

    // the readable text of the package, as it stands, kept whole for the admin to write in if they
    // want it — the words above are what carries their pictures
    let text = "";
    pkg.texts.forEach((doc) => {
      if (text.length >= MAX_TEXT) return;
      const head = `# ${doc.name}\n`;
      const room = MAX_TEXT - text.length - head.length;
      if (room <= 0) return;
      text += `${text ? "\n\n" : ""}${head}${doc.text.slice(0, room)}`;
    });

    return Response.json({
      name: fileName,
      text,
      read: pkg.read,
      skipped: pkg.skipped,
      not_kept: notKept,
      entries: entries.map((row) => ({
        term: row.term,
        meaning: row.meaning,
        usage: row.usage || "",
        guide: row.guide,
        source: row.source,
        line: clean(row.line, 200),
        how: row.picture ? row.how : "",
        picture: row.picture ? { name: row.picture.name, file_uri: row.picture.file_uri } : null,
      })),
      pictures: pics.map((pic) => {
        const holder = entries.find((row) => row.picture?.file_uri === pic.file_uri);
        return { name: pic.name, file_uri: pic.file_uri, term: holder ? holder.term : "" };
      }),
    });
  } catch (error: any) {
    console.error("The package could not be read:", error?.message);
    return Response.json(
      { error: "That file could not be read — check that it is a ZIP or a Word file, then try again." },
      { status: 500 }
    );
  }
}