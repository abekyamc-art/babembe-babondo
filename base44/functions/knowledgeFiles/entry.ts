import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { MAX_MEANING, MAX_TERM, clean, knowledgeWordRows } from "../../shared/knowledgeWords.ts";

/**
 * The files the admin's language is kept in: the corpus itself, and the two dictionaries —
 * English to Kibembe, and Kibembe to English.
 *
 * A file is read twice over. The first reading only shows what the file holds, so the admin sees the
 * words before any of them is used: the file is saved as a draft and changes nothing. The second
 * reading is the admin's own approval, and only then are the file's words written into the app's own
 * knowledge, each one stamped with the file it came out of.
 *
 * That stamp is the whole point of the way this is done. The admin's one knowledge document stands
 * first and is never overwritten: a word the document already carries is left exactly as the document
 * writes it, and a file only ever adds words the app does not hold yet. And because every word a file
 * brought in carries the file's own name, removing the file takes back exactly what it brought in —
 * nothing of the admin's own writing is ever caught up in it.
 *
 * A Kibembe word is always the word in the pair, whichever way the dictionary is written: in the
 * English to Kibembe file it is the right-hand side, and in the Kibembe to English file it is the
 * left. Reading a pair the other way round would file English words as Kibembe ones, which is how a
 * dictionary ends up teaching the app the wrong language.
 */

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_CHARS = 600000;
// how many words one file may bring in: a dictionary larger than this is read up to here, and the
// file says so plainly rather than passing a part of it off as the whole of it
const MAX_PAIRS = 800;
const PREVIEW = 12;

const UNAUTHORIZED = "Ingia kwenye akaunti kwanza.";
const NOT_ADMIN = "Ni admin tu anayeweza kuhifadhi files hizi.";

type Pair = { term: string; meaning: string };

/** One side of a written pair as a Kibembe word, or nothing at all when it is not one. */
function asTerm(value: any): string {
  const term = clean(value, MAX_TERM).replace(/^[\s"'[\]()]+|[\s"'[\]()]+$/g, "");
  if (!term || term.split(/\s+/).length > 3) return "";
  if (!/^[\p{L}][\p{L}'’\- ]*$/u.test(term)) return "";
  return term.replace(/[^\p{L}]/gu, "").length >= 3 ? term : "";
}

/** One side of a written pair as a meaning, or nothing at all when there is none to take. */
function asMeaning(value: any): string {
  const meaning = clean(value, MAX_MEANING).replace(/^[\s"'[\]()]+|[\s"'[\]()]+$/g, "");
  if (!meaning) return "";
  return /[\p{L}]/u.test(meaning) ? meaning : "";
}

/**
 * The word pairs a file holds, with the Kibembe side decided by which dictionary the file is.
 * A JSON file may be an object of one side to the other, or a list of objects naming both sides.
 */
function pairsOf(text: string, kind: string): Pair[] {
  const out: Pair[] = [];
  const seen = new Set<string>();
  const englishFirst = kind === "dictionary_en_kb";

  const take = (left: any, right: any) => {
    if (out.length >= MAX_PAIRS) return;
    const term = asTerm(englishFirst ? right : left);
    const meaning = asMeaning(englishFirst ? left : right);
    if (!term || !meaning) return;
    const key = term.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ term, meaning });
  };

  const body = String(text || "").slice(0, MAX_CHARS);

  // a JSON dictionary: either one object of pairs, or a list of them
  const looksJson = /^\s*[[{]/.test(body);
  if (looksJson) {
    try {
      const data = JSON.parse(body);
      if (Array.isArray(data)) {
        data.forEach((row: any) => {
          if (!row || typeof row !== "object") return;
          take(row.ebembe ?? row.kibembe ?? row.word ?? row.left, row.meaning ?? row.english ?? row.right);
        });
      } else if (data && typeof data === "object") {
        Object.entries(data).forEach(([left, right]) => take(left, right));
      }
      if (out.length) return out;
    } catch (err) {
      // a file that only looks like JSON is read line by line, as it always was
    }
  }

  body.split(/\r?\n/).forEach((line) => {
    const said = line.trim();
    if (!said || said.startsWith("#") || said.startsWith("//")) return;
    // a pair is written with an equals sign, a bar, a tab, a semicolon or a comma — the first
    // separator that splits the line into exactly two sides is the one that stands
    const parts = said.split(/\s*[=|\t;]\s*|\s*,\s*/);
    if (parts.length < 2) return;
    take(parts[0], parts.slice(1).join(" "));
  });

  return out;
}

/** The readable text of an uploaded file, or a plain reason why it cannot be read. */
async function textOf(
  base44: any,
  fileUri: string
): Promise<{ text: string } | { error: string }> {
  const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
    file_uri: fileUri,
    expires_in: 600,
  });
  if (!signed?.signed_url) return { error: "That file could not be opened." };

  const res = await fetch(signed.signed_url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) return { error: "That file could not be read." };

  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length > MAX_BYTES) {
    return { error: `That file is larger than ${Math.round(MAX_BYTES / (1024 * 1024))} MB.` };
  }
  // a package — a Word file or a ZIP — is its own reading, and the document importer is where it
  // belongs: refusing it here is said plainly rather than read as a dictionary full of noise
  if (bytes.length > 3 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
    return {
      error:
        "A Word or ZIP file is read through the document import instead. Upload a plain .txt, .csv, .md or .json dictionary here.",
    };
  }

  const text =
    bytes.length > 1 && bytes[0] === 0xff && bytes[1] === 0xfe
      ? new TextDecoder("utf-16le").decode(bytes.subarray(2))
      : new TextDecoder("utf-8").decode(bytes);
  return { text };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: UNAUTHORIZED }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: NOT_ADMIN }, { status: 403 });

    let payload: any = {};
    try {
      payload = await req.json();
    } catch (err) {
      payload = {};
    }

    const service = base44.asServiceRole;
    const action = clean(payload?.action, 20) || "read";

    // Removing a file takes back exactly what it brought in: every word stamped with its name goes,
    // and the admin's own document and their own confirmed words are left untouched.
    if (action === "remove") {
      const id = clean(payload?.id, 60);
      const row = id ? await service.entities.KnowledgeFile.get(id).catch(() => null) : null;
      if (!row) return Response.json({ error: "That file is no longer saved." }, { status: 404 });

      const name = clean(row.name, 160);
      let taken = 0;
      if (name) {
        const back = await service.entities.AssistantKnowledge.deleteMany({ kind: "word", source: name });
        taken = Number(back?.deleted || back?.count || 0);
      }
      await service.entities.KnowledgeFile.delete(id);
      return Response.json({ removed: true, name, words_taken_back: taken });
    }

    const fileUri = typeof payload?.file_uri === "string" ? payload.file_uri.trim() : "";
    // a stored file only: this endpoint never fetches a web address for a caller
    if (!fileUri || /^https?:/i.test(fileUri)) {
      return Response.json({ error: "No file to read." }, { status: 400 });
    }

    const name = clean(payload?.name, 160) || "the dictionary";
    const kind = ["corpus", "dictionary_en_kb", "dictionary_kb_en"].includes(payload?.kind)
      ? payload.kind
      : "dictionary_en_kb";
    const note = clean(payload?.note, 200);

    const read = await textOf(base44, fileUri);
    if ("error" in read) return Response.json({ error: read.error }, { status: 400 });

    const pairs = pairsOf(read.text, kind);
    if (!pairs.length) {
      return Response.json(
        {
          error:
            "No word pairs were found in that file. Each line should hold the word and its meaning, written apart by = , | or a comma.",
        },
        { status: 400 }
      );
    }
    const capped = pairs.length >= MAX_PAIRS;
    const rows = await knowledgeWordRows(base44);
    const held = new Set(rows.map((row: any) => clean(row?.term, MAX_TERM).toLowerCase()));

    // what the file would add, told apart from what the app already holds: the document's own words
    // are never overwritten by a file
    const fresh = pairs.filter((pair) => !held.has(pair.term.toLowerCase()));

    const now = new Date().toISOString();
    const state = {
      name,
      kind,
      file_uri: fileUri,
      chars: read.text.length,
      note,
      uploaded_by: user.email,
      uploaded_at: now,
    };

    // the first reading only shows what the file holds: it is saved as a draft and changes nothing
    if (action !== "approve") {
      const existing = clean(payload?.id, 60)
        ? await service.entities.KnowledgeFile.get(clean(payload.id, 60)).catch(() => null)
        : null;
      if (existing) await service.entities.KnowledgeFile.update(existing.id, { ...state, status: "draft" });
      else await service.entities.KnowledgeFile.create({ ...state, status: "draft" });

      return Response.json({
        status: "draft",
        name,
        kind,
        chars: read.text.length,
        count: pairs.length,
        fresh_count: fresh.length,
        held_count: pairs.length - fresh.length,
        capped,
        preview: pairs.slice(0, PREVIEW),
      });
    }

    // The admin's approval: only now do the file's words reach an answer, and each one is written
    // with the file's own name on it, so what came from where is never a guess.
    let saved = 0;
    for (let at = 0; at < fresh.length; at += 200) {
      const slice = fresh.slice(at, at + 200);
      const made = await service.entities.AssistantKnowledge.bulkCreate(
        slice.map((pair) => ({
          kind: "word",
          term: pair.term,
          meaning: pair.meaning,
          heard: [],
          revisions: [],
          source: name,
        }))
      );
      saved += Array.isArray(made) ? made.length : slice.length;
    }

    const existing = clean(payload?.id, 60)
      ? await service.entities.KnowledgeFile.get(clean(payload.id, 60)).catch(() => null)
      : null;
    const approved = {
      ...state,
      status: "approved",
      entry_count: saved,
      approved_at: now,
      approved_by: user.email,
    };
    if (existing) await service.entities.KnowledgeFile.update(existing.id, approved);
    else await service.entities.KnowledgeFile.create(approved);

    return Response.json({
      status: "approved",
      name,
      kind,
      chars: read.text.length,
      count: pairs.length,
      saved,
      held_count: pairs.length - fresh.length,
      capped,
    });
  } catch (error: any) {
    console.error("The knowledge file could not be read:", error?.message);
    return Response.json(
      { error: "That file could not be read just now — try again in a moment." },
      { status: 500 }
    );
  }
}