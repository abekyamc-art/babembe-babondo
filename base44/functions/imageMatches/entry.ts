import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { geminiText } from "../../shared/gemini.ts";
import { docWordRows, publishedDoc, readDocText, rowsOf } from "../../shared/knowledgeDoc.ts";

/**
 * The pictures the admin puts in, and the word each one is of.
 *
 * A picture is put in a bounded run at a time — never the whole lot in one lump — and each one is
 * filed the moment it arrives, so a run that is stopped half way keeps everything already in and can
 * be carried on from where it stopped.
 *
 * A word is found for each file name first, from the words of the knowledge document and then from
 * the words the admin handed in with the run. Whatever is left with no word is looked at by the AI
 * and named from the picture itself. Either way it is a suggestion: nothing reaches the knowledge
 * until the admin has looked twice — once to agree the word, and once to save it.
 */

// how much one run may carry: a chunk of pictures, a list of words, and a batch of rows at a time
const MAX_FILES = 40;
const MAX_LOOK = 10;
const MAX_WORDS = 200;
const MAX_IDS = 100;
const MAX_ROWS = 200;
const MAX_TERM = 40;
const MAX_VOCAB = 400;
const MAX_KEPT = 100;
const MAX_FOUND = 20;
const PAGE = 500;

const NO_WORD = "no word found in its name yet";
const FROM_DOC = "a word of your document stands in its file name";
const FROM_OWN = "the word you gave stands in its file name";
const BY_HAND = "you gave this word";
const BY_AI = "the AI named it from the picture";
const BY_DRAW = "drawn for the word — look it over";

const clean = (value: any, max: number): string =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

/** A name without its ending, and letters and numbers only — how two words are compared. */
const stemOf = (name: any): string => clean(name, 120).replace(/\.[a-z0-9]{1,5}$/i, "");

const plain = (value: any): string =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const isUrl = (value: any): boolean => /^https:\/\//i.test(String(value || "").trim());

const keyOf = (value: any): string => plain(value).replace(/ /g, "");

/** Whether a word stands in a name: as a word of its own, or written together with the rest of it. */
function holds(name: string, term: string): boolean {
  if (!name || !term) return false;
  if (` ${name} `.includes(` ${term} `)) return true;
  return keyOf(name).includes(keyOf(term));
}

/** The word a file name carries — the document's own words first, and then the admin's. */
function wordForFile(name: string, docTerms: string[], ownWords: string[]): { term: string; how: string } {
  const key = plain(name);
  if (!key) return { term: "", how: NO_WORD };

  const pick = (terms: string[]): string => {
    let best = "";
    terms.forEach((term) => {
      const word = plain(term);
      if (word.length < 2 || !holds(key, word)) return;
      if (!best || word.length > plain(best).length) best = term;
    });
    return best;
  };

  const fromDoc = pick(docTerms);
  if (fromDoc) return { term: clean(fromDoc, MAX_TERM), how: FROM_DOC };
  const fromOwn = pick(ownWords);
  if (fromOwn) return { term: clean(fromOwn, MAX_TERM), how: FROM_OWN };
  return { term: "", how: NO_WORD };
}

/** The words the document holds: the published document, and the working copy while nothing is published. */
async function docTerms(base44: any): Promise<string[]> {
  let text = "";
  try {
    text = await publishedDoc(base44);
  } catch (error: any) {
    text = "";
  }
  if (!String(text || "").trim()) {
    try {
      text = await readDocText(base44, "draft");
    } catch (error: any) {
      text = "";
    }
  }
  const seen = new Set<string>();
  const terms: string[] = [];
  docWordRows(text).forEach((row: any) => {
    const term = clean(row?.term, MAX_TERM);
    if (term.length < 2 || seen.has(term.toLowerCase())) return;
    seen.add(term.toLowerCase());
    terms.push(term);
  });
  return terms;
}

/** The words handed in with a run, each written once. */
function ownWordsOf(payload: any): string[] {
  const raw = Array.isArray(payload?.words) ? payload.words : [];
  const seen = new Set<string>();
  const words: string[] = [];
  raw.slice(0, MAX_WORDS).forEach((value: any) => {
    const term = clean(value, MAX_TERM);
    if (term.length < 2 || seen.has(term.toLowerCase())) return;
    seen.add(term.toLowerCase());
    words.push(term);
  });
  return words;
}

/** The pictures one run carries: an address a person may open, with the name it came in as. */
function filesOf(payload: any, most: number) {
  const raw = Array.isArray(payload?.files) ? payload.files : [];
  return raw
    .slice(0, most)
    .map((file: any) => ({
      name: clean(file?.name, 120) || "picture",
      url: String(file?.url || "").trim(),
    }))
    .filter((file: any) => isUrl(file.url));
}

/** The rows one call may act on. */
function idsOf(payload: any): string[] {
  const raw = Array.isArray(payload?.ids) ? payload.ids : [];
  return raw
    .slice(0, MAX_IDS)
    .map((id: any) => String(id || "").trim())
    .filter(Boolean);
}

/** The pictures waiting for the admin's word, the newest first. */
async function waitingRows(base44: any) {
  const page = await base44.entities.ImageMatch.list({
    sort: "-created_date",
    limit: MAX_ROWS,
    fields: ["name", "file_url", "term", "how", "stage", "in_doc", "batch", "drawn"],
  });
  return rowsOf(page);
}

/** The names and addresses already saved in the knowledge, so a picture is never filed twice. */
async function savedKeys(base44: any) {
  const names = new Set<string>();
  const urls = new Set<string>();
  const page = await base44.entities.KnowledgeImage.list({
    limit: PAGE,
    fields: ["name", "file_url"],
  });
  rowsOf(page).forEach((row: any) => {
    const name = keyOf(stemOf(row?.name));
    if (name) names.add(name);
    const url = String(row?.file_url || "").trim();
    if (url) urls.add(url);
  });
  return { names, urls };
}

/** The words already held by a saved picture or one waiting to be saved. */
async function heldTerms(base44: any) {
  const seen = new Set<string>();
  const page = await base44.entities.KnowledgeImage.list({ limit: PAGE, fields: ["term"] });
  rowsOf(page).forEach((row: any) => {
    const term = clean(row?.term, MAX_TERM);
    if (term) seen.add(term.toLowerCase());
  });
  (await waitingRows(base44)).forEach((row: any) => {
    const term = clean(row?.term, MAX_TERM);
    if (term) seen.add(term.toLowerCase());
  });
  return seen;
}

/** The words of the document that no picture stands beside yet. */
async function wordsNeedingPictures(base44: any) {
  const [terms, held, saved] = await Promise.all([
    docTerms(base44),
    heldTerms(base44),
    base44.entities.KnowledgeImage.count({}).catch(() => 0),
  ]);
  return {
    need: terms.filter((term) => !held.has(term.toLowerCase())).slice(0, MAX_ROWS),
    all: terms.length,
    saved: Number(saved) || 0,
  };
}

/**
 * What the panel reads: the pictures waiting for their two looks, the pictures already saved beside a
 * word — which a wrong word is put right from — and how many are saved in all.
 */
async function view(base44: any) {
  const [rows, saved, kept] = await Promise.all([
    waitingRows(base44),
    base44.entities.KnowledgeImage.count({}).catch(() => 0),
    base44.entities.KnowledgeImage
      .list({
        sort: "-created_date",
        limit: MAX_KEPT,
        fields: ["term", "name", "file_url", "how"],
      })
      .catch(() => []),
  ]);
  return { rows, saved, kept: rowsOf(kept) };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Ingia kwenye akaunti kwanza." }, { status: 401 });
    if (user.role !== "admin") {
      return Response.json({ error: "Ni admin tu anayeweza kusimamia picha." }, { status: 403 });
    }

    let payload: any = {};
    try {
      payload = await req.json();
    } catch (error: any) {
      payload = {};
    }
    const action = typeof payload?.action === "string" ? payload.action : "open";

    if (action === "open") {
      return Response.json(await view(base44));
    }

    // The words of the document, so a picture is put beside a word the document really holds: what is
    // written here is answered by the document's own words, and an empty question is answered by the
    // words no picture stands beside yet.
    if (action === "wordSearch") {
      const q = plain(payload?.q);
      const terms = await docTerms(base44);
      let found: string[] = [];
      if (!q) {
        const held = await heldTerms(base44);
        found = terms.filter((term: string) => !held.has(term.toLowerCase()));
      } else {
        const starts = terms.filter((term: string) => plain(term).startsWith(q));
        const inside = terms.filter(
          (term: string) => !plain(term).startsWith(q) && plain(term).includes(q)
        );
        found = [...starts, ...inside];
      }
      return Response.json({ words: found.slice(0, MAX_FOUND), all: terms.length });
    }

    // A run of pictures that has just been put in: a word is found for every one of them from the
    // document's own words and from the words handed in with the run, and each is filed at once.
    if (action === "suggest") {
      const files = filesOf(payload, MAX_FILES);
      if (!files.length) {
        return Response.json({ error: "No picture arrived with that run." }, { status: 400 });
      }
      const [terms, own, known, waiting] = await Promise.all([
        docTerms(base44),
        Promise.resolve(ownWordsOf(payload)),
        savedKeys(base44),
        waitingRows(base44),
      ]);
      const already = new Set<string>(waiting.map((row: any) => String(row?.file_url || "")));
      const batch = clean(payload?.batch, 60);

      const fresh: any[] = [];
      let skipped = 0;

      files.forEach((file: any) => {
        const stem = keyOf(stemOf(file.name));
        if (
          already.has(file.url) ||
          known.urls.has(file.url) ||
          (stem && known.names.has(stem))
        ) {
          skipped += 1;
          return;
        }
        const found = wordForFile(stemOf(file.name), terms, own);
        fresh.push({
          name: file.name,
          file_url: file.url,
          term: found.term,
          how: found.how,
          stage: "suggested",
          batch,
          drawn: false,
          in_doc: !!found.term && terms.some((term) => term.toLowerCase() === found.term.toLowerCase()),
        });
      });

      if (fresh.length) await base44.entities.ImageMatch.bulkCreate(fresh);

      return Response.json({
        added: fresh.length,
        skipped,
        matched: fresh.filter((row: any) => row.term).length,
        left: fresh.filter((row: any) => !row.term).length,
      });
    }

    // The pictures whose own names carry no word are looked at, and a word is named for each from
    // the picture itself — only ever a word the document or the admin already holds, never an
    // invented one, and only where the admin has not given a word already.
    if (action === "aiSuggest") {
      const files = filesOf(payload, MAX_LOOK);
      if (!files.length) {
        return Response.json({ error: "No picture arrived with that run." }, { status: 400 });
      }
      const [terms, own] = await Promise.all([
        docTerms(base44),
        Promise.resolve(ownWordsOf(payload)),
      ]);
      const vocab: string[] = [];
      const seen = new Set<string>();
      [...terms, ...own].forEach((term) => {
        const key = term.toLowerCase();
        if (seen.has(key) || vocab.length >= MAX_VOCAB) return;
        seen.add(key);
        vocab.push(term);
      });
      if (!vocab.length) {
        return Response.json(
          { error: "Your document holds no words yet — write your words first, then the pictures can be named." },
          { status: 400 }
        );
      }

      const answer: any = await geminiText({
        base44,
        size: 1024,
        prompt:
          "These pictures are for a Kibembe (Ebembe) picture dictionary of the Babembe people of the eastern " +
          "Democratic Republic of the Congo. For each picture, choose the one word from the list below that the " +
          "picture really shows, and answer with the file name exactly as it is given and the word exactly as it " +
          "is written in the list. If no word in the list fits a picture, give an empty word for it — never invent " +
          "a word, and never answer with a word that is not in the list.\n" +
          `The words: ${vocab.join(", ")}\n` +
          `The pictures, in the order they are attached: ${files
            .map((file: any, at: number) => `${at + 1}. ${file.name}`)
            .join("; ")}\n` +
          `Answer with one entry for each picture, naming the file it is for.`,
        file_urls: files.map((file: any) => file.url),
        response_json_schema: {
          type: "object",
          properties: {
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  term: { type: "string" },
                },
                required: ["name", "term"],
              },
            },
          },
          required: ["matches"],
        },
      });

      const said = Array.isArray(answer?.matches) ? answer.matches : [];
      const asked = await base44.entities.ImageMatch.filter(
        { file_url: { $in: files.map((file: any) => file.url) } },
        { limit: MAX_LOOK, fields: ["id", "term", "file_url", "stage"] }
      );
      const waiting = new Map<string, any>();
      rowsOf(asked).forEach((row: any) => {
        if (clean(row?.term, MAX_TERM)) return;
        waiting.set(String(row.file_url), row);
      });

      const changes: any[] = [];
      said.slice(0, MAX_LOOK).forEach((entry: any) => {
        const named = clean(entry?.term, MAX_TERM);
        if (!named) return;
        const found = files.find(
          (file: any) =>
            keyOf(stemOf(file.name)) === keyOf(stemOf(entry?.name)) ||
            file.name === clean(entry?.name, 120)
        );
        if (!found) return;
        const held = waiting.get(found.url);
        if (!held) return;
        // only a word the app already holds is ever taken from the answer
        const picked = vocab.find((term) => term.toLowerCase() === named.toLowerCase());
        if (!picked) return;
        waiting.delete(found.url);
        changes.push({
          id: held.id,
          term: picked,
          how: BY_AI,
          in_doc: terms.some((term) => term.toLowerCase() === picked.toLowerCase()),
        });
      });

      if (changes.length) await base44.entities.ImageMatch.bulkUpdate(changes);

      return Response.json({
        asked: files.length,
        named: changes.length,
        left: waiting.size,
      });
    }

    // The first look: the admin agrees the word a picture is of. The word is checked against the
    // document as it is agreed, so a word the document does not hold is caught here.
    if (action === "confirm") {
      const ids = idsOf(payload);
      if (!ids.length) return Response.json({ error: "No picture was named." }, { status: 400 });
      const given = payload?.terms && typeof payload.terms === "object" ? payload.terms : {};

      const rows = await base44.entities.ImageMatch.filter(
        { id: { $in: ids } },
        { limit: MAX_IDS, fields: ["id", "term", "how"] }
      );
      const terms = await docTerms(base44);
      const inDoc = new Set(terms.map((term) => term.toLowerCase()));

      const changes: any[] = [];
      rowsOf(rows).forEach((row: any) => {
        const was = clean(row?.term, MAX_TERM);
        const word = clean(given[row.id], MAX_TERM) || was;
        if (!word) return;
        changes.push({
          id: row.id,
          term: word,
          how: word.toLowerCase() === was.toLowerCase() ? clean(row?.how, 120) : BY_HAND,
          stage: "confirmed",
          in_doc: inDoc.has(word.toLowerCase()),
        });
      });

      if (changes.length) await base44.entities.ImageMatch.bulkUpdate(changes);

      return Response.json({
        confirmed: changes.length,
        not_in_doc: changes.filter((change: any) => !change.in_doc).length,
      });
    }

    // A word put right: a picture whose word is not the one it should be is written the word that is,
    // and it goes back to the first look with it — so the word it is finally saved beside has been
    // looked at twice like any other, and never slips into the knowledge on one look.
    if (action === "correct") {
      const ids = idsOf(payload);
      if (!ids.length) return Response.json({ error: "No picture was named." }, { status: 400 });
      const given = payload?.terms && typeof payload.terms === "object" ? payload.terms : {};

      const rows = await base44.entities.ImageMatch.filter(
        { id: { $in: ids } },
        { limit: MAX_IDS, fields: ["id", "term", "how"] }
      );
      const terms = await docTerms(base44);
      const inDoc = new Set(terms.map((term: string) => term.toLowerCase()));

      const changes: any[] = [];
      rowsOf(rows).forEach((row: any) => {
        const was = clean(row?.term, MAX_TERM);
        const word = clean(given[row.id], MAX_TERM);
        if (!word) return;
        changes.push({
          id: row.id,
          term: word,
          how: word.toLowerCase() === was.toLowerCase() ? clean(row?.how, 120) : BY_HAND,
          stage: "suggested",
          in_doc: inDoc.has(word.toLowerCase()),
        });
      });

      if (changes.length) await base44.entities.ImageMatch.bulkUpdate(changes);

      return Response.json({
        corrected: changes.length,
        not_in_doc: changes.filter((change: any) => !change.in_doc).length,
      });
    }

    // The second look, which is what saves a picture: only a picture whose word has been agreed can
    // be saved, and saving it writes it beside its word in the knowledge and takes it off the list.
    // A picture the knowledge already holds at that same address has the word written over rather than
    // a second copy of it being made, so one picture stands beside one word.
    if (action === "approve") {
      const ids = idsOf(payload);
      if (!ids.length) return Response.json({ error: "No picture was named." }, { status: 400 });

      const rows = await base44.entities.ImageMatch.filter(
        { id: { $in: ids } },
        { limit: MAX_IDS, fields: ["id", "name", "file_url", "term", "how", "stage"] }
      );
      const all = rowsOf(rows);
      const ready = all.filter((row: any) => row?.stage === "confirmed" && clean(row?.term, MAX_TERM));

      if (ready.length) {
        const urls = ready.map((row: any) => String(row.file_url || ""));
        const standing = await base44.entities.KnowledgeImage.filter(
          { file_url: { $in: urls } },
          { limit: MAX_IDS, fields: ["id", "file_url"] }
        );
        const held = new Map<string, string>();
        rowsOf(standing).forEach((row: any) => held.set(String(row.file_url || ""), String(row.id)));

        const fresh = ready.filter((row: any) => !held.has(String(row.file_url || "")));
        const again = ready.filter((row: any) => held.has(String(row.file_url || "")));

        if (fresh.length) {
          await base44.entities.KnowledgeImage.bulkCreate(
            fresh.map((row: any) => ({
              term: clean(row.term, MAX_TERM),
              name: clean(row.name, 160) || "picture",
              file_url: String(row.file_url || ""),
              how: clean(row.how, 120) || BY_HAND,
            }))
          );
        }
        if (again.length) {
          await base44.entities.KnowledgeImage.bulkUpdate(
            again.map((row: any) => ({
              id: held.get(String(row.file_url || "")),
              term: clean(row.term, MAX_TERM),
              name: clean(row.name, 160) || "picture",
              how: clean(row.how, 120) || BY_HAND,
            }))
          );
        }

        await base44.entities.ImageMatch.deleteMany({ id: { $in: ready.map((row: any) => row.id) } });
      }

      return Response.json({ saved: ready.length, waiting: all.length - ready.length });
    }

    // A picture already saved in the knowledge whose word is not the right one: it is taken back out
    // of the knowledge and stands on the list again with the word written for it, so it is looked at
    // twice before it is saved — and only then stands beside its word again, in its right place.
    if (action === "reopen") {
      const ids = idsOf(payload);
      if (!ids.length) return Response.json({ error: "No picture was named." }, { status: 400 });
      const given = payload?.terms && typeof payload.terms === "object" ? payload.terms : {};

      const rows = await base44.entities.KnowledgeImage.filter(
        { id: { $in: ids } },
        { limit: MAX_IDS, fields: ["id", "term", "name", "file_url"] }
      );
      const saved = rowsOf(rows);
      if (!saved.length) {
        return Response.json({ error: "That picture is not saved in your knowledge." }, { status: 400 });
      }

      const terms = await docTerms(base44);
      const inDoc = new Set(terms.map((term: string) => term.toLowerCase()));

      const fresh = saved
        .map((row: any) => {
          const word = clean(given[row.id], MAX_TERM) || clean(row?.term, MAX_TERM);
          return {
            name: clean(row?.name, 120) || "picture",
            file_url: String(row?.file_url || ""),
            term: word,
            how: BY_HAND,
            stage: "suggested",
            batch: "put back for another look",
            drawn: false,
            in_doc: !!word && inDoc.has(word.toLowerCase()),
          };
        })
        .filter((row: any) => isUrl(row.file_url));

      if (!fresh.length) {
        return Response.json({ error: "That picture has no address to open." }, { status: 400 });
      }

      await base44.entities.ImageMatch.bulkCreate(fresh);
      await base44.entities.KnowledgeImage.deleteMany({ id: { $in: saved.map((row: any) => row.id) } });

      return Response.json({
        reopened: fresh.length,
        not_in_doc: fresh.filter((row: any) => !row.in_doc).length,
      });
    }

    // A picture the admin does not want: taken off the list, never saved.
    if (action === "drop") {
      const ids = idsOf(payload);
      if (!ids.length) return Response.json({ error: "No picture was named." }, { status: 400 });
      await base44.entities.ImageMatch.deleteMany({ id: { $in: ids } });
      return Response.json({ dropped: ids.length });
    }

    // A picture drawn for a word that has none. It is drawn, given a public address the moment it is
    // made, and put on the list like any picture that was put in — the same two looks stand before it.
    if (action === "draw") {
      const term = clean(payload?.term, MAX_TERM);
      const meaning = clean(payload?.meaning, 110);
      if (term.length < 2) {
        return Response.json({ error: "Name the word the picture is to be drawn for." }, { status: 400 });
      }

      const drawn: any = await base44.asServiceRole.integrations.Core.GenerateImage({
        prompt:
          `A clear, warm, uncluttered picture for a Kibembe language lesson about the Ebembe word "${term}"` +
          (meaning ? ` (${meaning})` : "") +
          ". Show plainly what the word means, as it would be seen in the world of the Babembe people of the " +
          "eastern Democratic Republic of the Congo — one subject, centred, natural daylight, friendly and " +
          "teaching-simple. No letters, no words and no writing anywhere in the picture.",
      });
      const url = String(drawn?.url || "").trim();
      if (!isUrl(url)) {
        return Response.json(
          { error: "That picture could not be drawn just now. Try again." },
          { status: 502 }
        );
      }

      const terms = await docTerms(base44);
      const row = await base44.entities.ImageMatch.create({
        name: `drawn — ${term}`,
        file_url: url,
        term,
        how: BY_DRAW,
        stage: "suggested",
        batch: "drawn in the app",
        drawn: true,
        in_doc: terms.some((word) => word.toLowerCase() === term.toLowerCase()),
      });

      return Response.json({ drawn: { id: row.id, term, url } });
    }

    // The words of the document that no picture stands beside yet — the list the admin draws for.
    if (action === "wordList") {
      return Response.json(await wordsNeedingPictures(base44));
    }

    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (error: any) {
    console.error("The pictures could not be handled:", error?.message);
    return Response.json({ error: "The pictures could not be handled just now." }, { status: 500 });
  }
}