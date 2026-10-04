import { keyMatches } from "./answerKey.ts";

/**
 * The material a turn needs from outside the admin's saved knowledge — a story, the news, who
 * someone is, a word, what is happening somewhere — looked up once on the internet and saved
 * for the next time it is asked.
 *
 * The lookup lives in one place, so every provider is handed the same thing: the phone fetches
 * it before a turn is put to an agent, and the app's own AI fetches it while it writes its
 * answer. Either way no answer is ever written while the search for it is still running, and a
 * search that finds nothing says so plainly instead of letting an answer be invented.
 */

// These words are the door to the lookup; the saved answer to a question the admin has already
// written is the one thing that keeps it closed, so a question the app knows is never searched
// for, and a question it does not know never comes back as "I don't know".
const WANTS =
  /(hadithi|habari|historia|story|stories|news|simulia|nieleze|niambie|maelezo|eleza|describe|description|maneno|neno|misemo|msemo|tena|nyingine|nyingi|zaidi|fundisha|nifundishe|google|tafuta|search|legend|dunia|ulimwengu|matukio|kilitokea|linatokea|happening|more about|tell me more|ninani|nani|nini|wapi|vipi|gani|lini|kwa nini|msanii|msani|mwimbaji|mwanamuziki|mchezaji|mwandishi|jina|anaitwa|alizaliwa|alikufa|umri|wasifu|asili|nchi|mji|kijiji|familia|timu|who|what|where|when|why|which|whose|how|biography|born|died|singer|artist|musician|player|coach|team|club|country|origin|city|village|family)/i;

// an explicit call for more is never held back by a saved answer: "another story" asks for
// material the note it already has cannot give
const MORE =
  /(hadithi|story|stories|habari|news|nyingine|nyingi|zaidi|tena|simulia|endelea|more|another)/i;

// the saved questions are read once, on the turns that might need a lookup, to see whether the
// admin has already answered this one
const KEY_ROWS = 200;
// a saved question that shares its own words with what was asked is the answer to this turn
const COVER_SCORE = 2;

const MAX_QUERY = 600;
const MAX_TEXT = 8000;
const MAX_MATERIAL = 4000;

const HEAD =
  "\nMAARIFA MAPYA YA MTANDAONI — material that was just looked up for this request:\n" +
  "Tumia sehemu hii kwa ombi ambalo halina jibu kwenye maarifa ya admin: mtu ni nani, anatoka wapi, anafanya nini, habari zake, hadithi, tukio au jambo. " +
  "Toa alichoomba kikamilifu — usifanye muhtasari, na usiishie hapo: ongeza maneno mapya kadri anavyotaka. " +
  "Lugha: Ebembe kwanza, kisha Kiswahili. " +
  "Sema wazi kwamba jibu hili limetafutwa mtandaoni, na taja chanzo chake kama kilivyoandikwa. " +
  "Ikiwa taarifa haijathibitishwa au vyanzo vinapingana, sema wazi kwamba hujui kwa uhakika. " +
  "USISEME kwamba jibu halipo kwenye maarifa yako, wala kwamba hukijui: sema ulichokuta.\n";

// What an answer is told when the turn did need the internet and the search found nothing: the
// person is told plainly that nothing could be confirmed, and no other subject is brought in.
const MISS =
  "\nTAFUTA ILIYOSHINDWA — the search this request needed found nothing:\n" +
  "Ombi hili la mtu lilihitaji kutafutwa mtandaoni, lakini hakuna kilichopatikana kwa uhakika. " +
  "Sema kwa ufupi kwamba hukupata taarifa ya kuthibitishwa kuhusu hilo, kisha mwombe aeleze zaidi " +
  "au toa kilichohifadhiwa kwenye maarifa. Usijibu kwa jambo lingine lisilohusiana, na usiseme tu \"sijui\".\n";

// Google's own results for the request, read before the search is written down: the news desk
// Google keeps for a search costs nothing and needs no key, and every result keeps its site, its
// date and its link, so the material an answer is given stands on results it can name and follow.
const GOOGLE_NEWS = "https://news.google.com/rss/search?hl=en-US&gl=US&ceid=US:en&q=";
const GOOGLE_ITEMS = 5;
const GOOGLE_WAIT_MS = 6000;

type GoogleResult = { title: string; source: string; date: string; link: string };

/** One field of a result, with its markup taken out and its length bounded. */
function fieldOf(item: string, tag: string, limit: number) {
  const found = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  if (!found) return "";
  return found[1]
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, limit);
}

/**
 * What Google has for this request. A Google that does not answer, or answers with nothing, never
 * stops the lookup: the search simply goes on without the results.
 */
async function googleResults(query: string): Promise<GoogleResult[]> {
  try {
    const res = await fetch(GOOGLE_NEWS + encodeURIComponent(query), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BabembeApp/1.0)" },
      signal: AbortSignal.timeout(GOOGLE_WAIT_MS),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
      .slice(0, GOOGLE_ITEMS)
      .map((match) => ({
        title: fieldOf(match[1], "title", 140),
        source: fieldOf(match[1], "source", 80),
        date: fieldOf(match[1], "pubDate", 40),
        link: fieldOf(match[1], "link", 300),
      }))
      .filter((row) => row.title && row.link);
  } catch (error: any) {
    console.error("Could not read Google's results:", error?.message);
    return [];
  }
}

/** Google's own results as the block of the search prompt they ride in. */
function googleBlock(rows: GoogleResult[]) {
  if (!rows.length) return "";
  const lines = rows.map(
    (row) =>
      `- ${row.title} — ${row.source || "Google"}${row.date ? ` (${row.date})` : ""} — ${row.link}`
  );
  return `\nGOOGLE RESULTS for this very request, taken from Google — use them first:\n${lines.join("\n")}\n`;
}

const SCHEMA = {
  type: "object",
  properties: {
    needed: {
      type: "boolean",
      description: "true only when the request needs material from the internet",
    },
    no_result: {
      type: "boolean",
      description:
        "true only when it did need the internet but the search found nothing at all",
    },
    kind: {
      type: "string",
      enum: ["none", "story", "news", "word", "fact"],
      description: "which kind of material this is, or none",
    },
    title: {
      type: "string",
      description: "a short heading for a story, a piece of news or a fact",
    },
    text: {
      type: "string",
      description: "the material written out in full, in Swahili",
    },
    source: {
      type: "string",
      description: "where the material came from, named plainly (the site or organisation), or empty",
    },
    link: {
      type: "string",
      description: "the address (the link) of the page the material was taken from, or empty",
    },
    term: { type: "string", description: "the Ebembe word, on a word request" },
    meaning: { type: "string", description: "what the Ebembe word means" },
    guide: {
      type: "string",
      description: "how the Ebembe word is said, syllables joined by dashes, for the ear only",
    },
  },
  required: ["needed", "no_result", "kind"],
};

const PROMPT = (query: string, google: string) =>
  "You help an Ebembe village assistant in the Democratic Republic of Congo. A person has just said:\n" +
  `"""${query}"""` +
  google +
  "\n\nDecide whether this needs material from the internet:\n" +
  "- A request for a story, a folk tale or a legend → kind \"story\".\n" +
  "- A request for news, or what is happening somewhere → kind \"news\".\n" +
  "- A request to be taught an Ebembe or Swahili word, or for more words → kind \"word\".\n" +
  "- A question about who someone is, where they come from, what they do or what happened to them, and any other question about the world → kind \"fact\".\n" +
  "- A greeting, small talk, a question about the person themselves, thanks, or anything ordinary conversation covers → needed=false, no_result=false, kind=\"none\".\n" +
  "- One or two words alone, or a question asking what a word means → needed=false, no_result=false, kind=\"none\": the words the admin saved are the assistant's own list, and he answers from it.\n" +
  "- Only teach a word (kind \"word\") when the person plainly asks to be taught an Ebembe word that is not on the admin's list.\n\n" +
  "If it does need material: search Google, then write that material yourself and write it out in full.\n" +
  "The GOOGLE RESULTS above are real results from Google for this very request: where they answer it, the material must stand on them; what they do not cover, take from your own Google search.\n" +
  "- story: the whole story, told properly, ten to twenty sentences — never a summary, and never a description of the story.\n" +
  "- news: the real, recent news, with the place, the date and where it comes from.\n" +
  "- word: the Ebembe word in `term`, its meaning in `meaning`, how it is said in `guide` (syllables joined by dashes, like oh-leg-bile), and the explanation in `text`. If you cannot confirm the Ebembe word, set needed=false and no_result=true instead of inventing one.\n" +
  "- fact: what you actually found about the person, the place, the group or the thing — who they are, where they are from, what they do, and what is known about them.\n\n" +
  "Take it from sources that can be trusted: established news organisations, official organisations, universities, encyclopaedias. Ignore rumours, gossip and unconfirmed social posts.\n" +
  "Write the material in Swahili, adding Ebembe words wherever you know them, and put the source you took it from in `source`, named plainly — the site or the organisation — with that page's own address in `link`.\n" +
  "Never invent anything. When what you found is thin, or the sources disagree, write the material anyway and say plainly inside `text` that it is not confirmed. When the search gives you nothing at all, set needed=false and no_result=true, and write no material: an answer that says plainly that nothing could be found is better than an invented one.\n" +
  "Fill every field of the answer, using an empty string where a field does not apply.";

function textOf(value: any) {
  return typeof value === "string" ? value.trim() : "";
}

function rowsOf(page: any) {
  return Array.isArray(page) ? page : page?.items || [];
}

/**
 * Whether the admin has already saved the answer to this very question. Where they have, the
 * saved answer is the one to give and nothing is looked up for it; where they have not, the
 * question is one the app cannot answer by itself, so it is searched for.
 */
async function savedAnswer(base44: any, query: string) {
  try {
    const page = await base44.asServiceRole.entities.AssistantKnowledge.filter(
      { kind: "qa" },
      { sort: "created_date", limit: KEY_ROWS, fields: ["kind", "question", "answer"] }
    );
    const best = keyMatches(rowsOf(page), query, 1)[0];
    return !!best && best.score >= COVER_SCORE;
  } catch (error: any) {
    // a knowledge read that fails never stops the lookup
    console.error("Could not read the saved answers:", error?.message);
    return false;
  }
}

/**
 * What one turn needs from outside the saved knowledge.
 *
 * `material` is the text that rides with the turn: the looked-up material itself, or — when the
 * turn needed a search and nothing was found, or the search could not be made at all — the line
 * telling the answer to say plainly that nothing could be confirmed. It is empty for a turn that
 * asked for nothing new, and for one the admin's own saved answer already covers.
 */
export type Lookup = {
  material: string;
  needed: boolean;
  found: boolean;
};

export async function lookupForTurn(base44: any, rawQuery: any): Promise<Lookup> {
  const query = textOf(rawQuery).slice(0, MAX_QUERY);
  if (query.length < 4 || !WANTS.test(query)) return { material: "", needed: false, found: false };
  // the admin's own answer stands first: where they have already saved this question, its
  // answer is the one to give, so nothing is looked up — unless more was asked for outright
  if (!MORE.test(query) && (await savedAnswer(base44, query))) {
    return { material: "", needed: false, found: false };
  }

  // Google's own results for this request ride with it into the search, so the material stands on
  // results that can be named and followed
  const google = googleBlock(await googleResults(query));

  let out: any = {};
  try {
    const found = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: PROMPT(query, google),
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: SCHEMA,
    });
    out = found && typeof found === "object" ? found : {};
  } catch (error: any) {
    // a search that could not be made is told to the answer exactly as a search that found
    // nothing: the person hears that it is not confirmed instead of hearing something invented
    console.error("Could not look anything up:", error?.message);
    return { material: MISS, needed: true, found: false };
  }

  const kind = textOf(out.kind);
  if (!out.needed || !kind || kind === "none") {
    return { material: out.no_result ? MISS : "", needed: true, found: false };
  }

  const title = textOf(out.title).slice(0, 120);
  const text = textOf(out.text).slice(0, MAX_TEXT);
  const term = textOf(out.term).slice(0, 80);
  const meaning = textOf(out.meaning).slice(0, 400);
  const guide = textOf(out.guide).slice(0, 120);
  const source = textOf(out.source).slice(0, 160);
  const link = textOf(out.link).slice(0, 300);

  let material = "";

  if (kind === "word" && term) {
    // a word he was taught is saved as a word, so he may say it from here on
    const page = await base44.asServiceRole.entities.AssistantKnowledge.filter(
      { kind: "word", term },
      { limit: 1 }
    );
    if (!rowsOf(page).length) {
      await base44.asServiceRole.entities.AssistantKnowledge.create({
        kind: "word",
        term,
        guide,
        meaning,
        usage: "",
      });
    }
    material =
      `${HEAD}\nNeno jipya: ${term}` +
      (meaning ? ` = ${meaning}` : "") +
      (guide ? `\nMatamshi (kwa sikio lako pekee): ${guide}` : "") +
      (text ? `\n${text}` : "");
  } else if (text) {
    // a story, a piece of news or a fact is saved as a world note for next time, with where it
    // came from written beside it, so a later answer can name its source too
    const headline = title || text.slice(0, 60);
    const saved = source
      ? `${text}\n(Chanzo: ${source}${link ? ` — ${link}` : ""})`
      : text;
    const page = await base44.asServiceRole.entities.AssistantKnowledge.filter(
      { kind: "note", title: headline },
      { limit: 1 }
    );
    if (!rowsOf(page).length) {
      await base44.asServiceRole.entities.AssistantKnowledge.create({
        kind: "note",
        title: headline,
        text: saved,
      });
    }
    material = `${HEAD}\n${headline} — ${saved}`;
  }

  if (!material) return { material: MISS, needed: true, found: false };
  // only the material for this answer goes back; the entry itself stays on the server
  return { material: material.slice(0, MAX_MATERIAL), needed: true, found: true };
}