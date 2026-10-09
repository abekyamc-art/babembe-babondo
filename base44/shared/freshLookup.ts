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
  /(hadithi|habari|historia|story|stories|news|simulia|nieleze|niambie|maelezo|eleza|describe|description|maneno|neno|misemo|msemo|tena|nyingine|nyingi|zaidi|fundisha|nifundishe|google|tafuta|search|legend|dunia|ulimwengu|matukio|kilitokea|linatokea|happening|more about|tell me more|ninani|nani|nini|wapi|vipi|gani|lini|kwa nini|nauliza|ninauliza|nataka kujua|nijue|kuhusu|youtube|youtuber|anaimba|anacheza|msanii|msani|mwimbaji|mwanamuziki|mchezaji|mwandishi|jina|anaitwa|alizaliwa|alikufa|umri|wasifu|asili|nchi|mji|kijiji|familia|timu|who|what|where|when|why|which|whose|how|biography|born|died|singer|artist|musician|player|coach|team|club|country|origin|city|village|family)/i;

// The second door into the lookup: a request that asks *about* something — how many, how much, their
// songs, their records, their followers, their views. None of the asking words above stands in a
// question like "gasper boy wa marekani ana hit ngapi?", and a turn that never reaches the lookup is
// never searched for: the answer comes back as "nothing in the saved knowledge", which is the one
// thing this lookup exists to prevent. Every word here is matched whole, so an ordinary word that
// merely contains one — "anahitaji" for "hit" — never opens the door.
const ASKS_ABOUT =
  /\b(?:(?:w|n)?ngapi|hits?|views?|subscribers?|followers?|likes?|streams?|albums?|songs?|tracks?|singles?|discography|mixtapes?|music|records?|nyimbo|wimbo|albamu|muziki|mashabiki|watazamaji|kiasi)\b/i;

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

/**
 * The source the looked-up material names, and its own address, exactly as the lookup wrote them
 * down: the line it puts beside what it saved, or the first address the material carries. Nothing is
 * read from the answer itself, and material that names no address carries no source. Every answer
 * that stands on something looked up hands this back with it, so the screen can show where it came
 * from instead of leaving the person to take it on trust.
 */
export function lookupSource(material: any): { label: string; url: string } | null {
  const text = String(material || "");
  const named = text.match(/Chanzo:\s*([^\n(]{2,80}?)\s*[—-]\s*(https?:\/\/\S+)/i);
  if (named) return { label: named[1].trim(), url: named[2].replace(/[),.\]]+$/, "") };
  const any = text.match(/https?:\/\/\S+/);
  if (!any) return null;
  return { label: "mtandaoni", url: any[0].replace(/[),.\]]+$/, "") };
}

const HEAD =
  "\nMAARIFA MAPYA YA MTANDAONI — material that was just looked up for this request:\n" +
  "Tumia sehemu hii kwa ombi ambalo halina jibu kwenye maarifa ya admin: mtu ni nani, anatoka wapi, anafanya nini, habari zake, hadithi, tukio au jambo. " +
  "Toa alichoomba kikamilifu — usifanye muhtasari, na usiishie hapo: ongeza maneno mapya kadri anavyotaka. " +
  "Lugha: jibu kwa lugha ya mtu. Mtu aliyeongea Kibembe akiomba habari, hadithi au maelezo ya Kiswahili, eleza kwa Kibembe; akiomba wazi kwamba iwe kwa Kiswahili, jibu kwa Kiswahili pekee. " +
  "Sema wazi kwamba jibu hili limetafutwa mtandaoni, taja chanzo chake kama kilivyoandikwa, na uandike kiungo (link) chake kamili. " +
  "Ikiwa taarifa haijathibitishwa au vyanzo vinapingana, sema wazi kwamba hujui kwa uhakika. " +
  "USISEME kwamba jibu halipo kwenye maarifa yako, wala kwamba hukijui: sema ulichokuta.\n";

// What an answer is told when the turn did need the internet and the search found nothing: the
// person is told plainly that nothing could be confirmed, and no other subject is brought in.
const MISS =
  "\nTAFUTA ILIYOSHINDWA — the search this request needed found nothing:\n" +
  "Ombi hili la mtu lilihitaji kutafutwa mtandaoni, lakini hakuna kilichopatikana kwa uhakika — au kutafuta hakukuwezekana kabisa. " +
  "Sema kwa ufupi kwamba hukupata taarifa ya kuthibitishwa kuhusu hilo, kisha mwombe aeleze zaidi " +
  "au toa kilichohifadhiwa kwenye maarifa. Usijibu kwa jambo lingine lisilohusiana, na usiseme tu \"sijui\" — na usiseme kwamba umetafuta wakati hukutafuta.\n";

// Video results for the request, read before the search is written down: a search of YouTube is
// what this app's own network can reach, and it is where its subjects live.

// YouTube is where this app's own subjects live — the artists and their songs — and it is the one
// search the app's own network is allowed to reach, so the videos a search hands back ride with the
// request into the search. A search that cannot be made, or that finds nothing, never stops the
// lookup.
const VIDEO_SEARCH = "https://www.youtube.com/results?search_query=";
const VIDEO_ITEMS = 6;
const VIDEO_WAIT_MS = 9000;
const VIDEO_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

type WebResult = { title: string; url: string; snippet: string };

/** Text as a person reads it: the markup and the escapes taken out, the length bounded. */
function plainOf(html: string, limit: number) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, limit);
}

/** What the open web has for this request, nearest first. */
/** The videos a search of YouTube hands back for this request. */
async function webResults(query: string): Promise<WebResult[]> {
  try {
    const res = await fetch(VIDEO_SEARCH + encodeURIComponent(query), {
      headers: { "User-Agent": VIDEO_UA, "Accept-Language": "sw,en;q=0.8" },
      signal: AbortSignal.timeout(VIDEO_WAIT_MS),
    });
    if (!res.ok) {
      console.error("The video search was refused:", res.status);
      return [];
    }
    const html = await res.text();
    const rows: WebResult[] = [];
    const channels = new Set<string>();

    // each video keeps its own title, the channel behind it and its own address
    html
      .split('"videoRenderer":{"videoId":"')
      .slice(1, VIDEO_ITEMS + 3)
      .forEach((part) => {
        const id = (part.match(/^([\w-]{6,})/) || [])[1] || "";
        const title = plainOf(
          (part.match(/"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.){2,200})"/) || [])[1] || "",
          120
        );
        const channel = plainOf(
          (part.match(/"(?:ownerText|longBylineText)":\{"runs":\[\{"text":"((?:[^"\\]|\\.){1,120})"/) ||
            [])[1] || "",
          70
        );
        if (!id || !title || rows.length >= VIDEO_ITEMS) return;
        if (channel) channels.add(channel);
        rows.push({
          title,
          url: `https://www.youtube.com/watch?v=${id}`,
          snippet: channel ? `YouTube · ${channel}` : "YouTube",
        });
      });

    // the channels the search itself offers, so a person it knows is named as a channel of their own
    html
      .split('"channelRenderer":{"channelId":"')
      .slice(1, 3)
      .forEach((part) => {
        const id = (part.match(/^([\w-]{6,})/) || [])[1] || "";
        const title = plainOf(
          (part.match(/"title":\{"simpleText":"((?:[^"\\]|\\.){2,120})"/) || [])[1] || "",
          80
        );
        if (!id || !title || channels.has(title)) return;
        rows.push({
          title: `${title} — YouTube channel`,
          url: `https://www.youtube.com/channel/${id}`,
          snippet: "YouTube",
        });
      });

    return rows;
  } catch (error: any) {
    console.error("Could not read the video results:", error?.message);
    return [];
  }
}

/** The videos a search of YouTube handed back, as the block of the search prompt they ride in. */
function webBlock(rows: WebResult[]) {
  if (!rows.length) return "";
  const lines = rows.map(
    (row) => `- ${row.title} — ${row.url}${row.snippet ? `\n  ${row.snippet}` : ""}`
  );
  return (
    "\nVIDEO RESULTS for this very request, taken from YouTube — use them when the request is about a person, an artist, their songs or their videos:\n" +
    "Jina la mtu linaonekana kwenye chanzo kilichoandikwa chini ya kila video: taja alichoonyeshwa — jina, nyimbo, chanzo — na usichanganye msanii mwingine aliye kwenye orodha.\n" +
    `${lines.join("\n")}\n`
  );
}

// A search that found nothing is not knowledge: the model is asked to flag that with no_result, and
// where it writes the finding-nothing out as the material instead, it is read here — so nothing is
// saved, and the answer is told plainly that nothing could be confirmed.
// A request that names somebody is searched with the name as its first words, and only what carries
// that name is theirs: another artist whose name merely looks like it — "Gasper" for "Gaspa Boy" —
// is not what was asked about and never rides along with them. Where nothing carries the name the
// search is left as it stands, since not every request is about a person.
function namedRows(rows: WebResult[], terms: string) {
  const wanted = terms.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 2);
  if (wanted.length < 2) return rows;
  const kept = rows.filter((row) => {
    const text = `${row.title} ${row.snippet}`.toLowerCase();
    return wanted.every((word) => text.includes(word));
  });
  return kept.length ? kept : rows;
}

const NO_RESULT =
  /(hatukuweza kupata|hatujapata|hatukupata|hakupata|sikupata|sijapata|hatuna taarifa|hakuna taarifa|hakuna vyanzo|hakuna kilichopatikana|haukupatikana|no reliable information|no information (was )?found|no results?( were)? found|nothing (was )?found|could ?n[o']?t find|could not find|unable to find|not been able to find)/i;

// The words a request is made with that give a search nothing to hold on to: the ask itself, the
// filler of both languages, and the words naming the kind of thing rather than the thing. A whole
// spoken sentence has to be cut back to the few words worth searching — "Nauliza Gaspa Boy ni
// msanii wa Kibembe ambaye anaimba nyimbo za YouTube" is the name, and the land it belongs to.
const SEARCH_SKIP = new Set([
  "nauliza", "ninauliza", "kuhusu", "niambie", "nieleze", "eleza", "nataka", "kujua", "nijue",
  "tafuta", "google", "je", "ni", "wa", "ya", "za", "la", "cha", "na", "kwa", "ambaye", "ambao",
  "ana", "anaimba", "mtu", "jina", "kama", "sana", "huyu", "hawa", "yule", "mimi", "wewe", "yeye",
  "msanii", "msani", "mwimbaji", "mwanamuziki", "mchezaji", "mwandishi", "nyimbo", "wimbo",
  "muziki", "youtube", "youtuber", "video", "videos", "habari", "nini", "nani", "tell", "about",
  "the", "is", "who", "what", "singer", "artist", "musician", "song", "songs", "you", "me", "and",
  "of", "for", "please",
  // What is asked *for* rather than what it is about: how many, and how they are counted. A search is
  // made with the name and the subject, never with these — so "gasper boy wa marekani ana hit ngapi?"
  // searches for the name and the land it belongs to, and not for "hit" and "ngapi".
  "ngapi", "wangapi", "nngapi", "kiasi", "hits", "hit", "views", "view", "subscribers", "followers",
  "likes", "streams", "albums", "album", "tracks", "track", "singles", "single", "discography",
  "mixtape", "records", "record", "music", "albamu", "mashabiki", "watazamaji",
]);

/** The few words a search is made with, out of a whole spoken sentence. */
function searchTerms(query: string) {
  const words = String(query || "").split(/[^\p{L}\p{N}']+/u).filter(Boolean);
  const kept: string[] = [];
  for (const word of words) {
    const lower = word.toLowerCase();
    if (SEARCH_SKIP.has(lower) || kept.some((had) => had.toLowerCase() === lower)) continue;
    kept.push(word);
    if (kept.length >= 4) break;
  }
  return (kept.length ? kept.join(" ") : String(query || "")).slice(0, 120);
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
  "- A person's name said as a statement rather than a question — \"nauliza Gaspa Boy ni msanii wa Kibembe ambaye anaimba nyimbo za YouTube\", \"X ni mwimbaji wa Kibembe\", \"ninauliza kuhusu X\", \"nilisikiliza X\" — is a request about the world: kind \"fact\". Someone the app was asked to be told about is somebody to look up, never small talk to pass over — and a name you do not recognise is exactly the name that must be searched for.\n" +
  "- A greeting, small talk, a question about the person themselves, thanks, or anything ordinary conversation covers → needed=false, no_result=false, kind=\"none\".\n" +
  "- One or two words alone, or a question asking what a word means → needed=false, no_result=false, kind=\"none\": the words the admin saved are the assistant's own list, and he answers from it.\n" +
  "- Only teach a word (kind \"word\") when the person plainly asks to be taught an Ebembe word that is not on the admin's list.\n\n" +
  "If it does need material: search Google, then write that material yourself and write it out in full.\n" +
  "A NAME IN THE RESULTS IS A FINDING: when the results above carry the person's own name — in a video's title, or in the channel behind it, as \"By Gaspa boy - Topic\" carries Gaspa Boy — that channel is theirs and those songs are theirs. Write that as the material: who the search shows them to be, the songs by name, the channel, the language they sing in; put the channel or the platform in `source` and the video's own address in `link`. Never answer that nothing was found when the results carry the person's name — a person whose songs are on YouTube is a person who has been found.\n" +
  "The VIDEO RESULTS above are real results from YouTube for this very request. Where they show the person the request names — their own songs, their own channel — the material must stand on them: say what they show (the name, the songs, the language, the channel) and put that video's own address in `link`. What they do not cover — the news, the stories, who someone is beyond their music — take from your own Google search.\n" +
  "- story: the whole story, told properly, ten to twenty sentences — never a summary, and never a description of the story.\n" +
  "- news: the real, recent news, with the place, the date and where it comes from.\n" +
  "- word: the Ebembe word in `term`, its meaning in `meaning`, how it is said in `guide` (syllables joined by dashes, like oh-leg-bile), and the explanation in `text`. If you cannot confirm the Ebembe word, set needed=false and no_result=true instead of inventing one.\n" +
  "- fact: what you actually found about the person, the place, the group or the thing — who they are, where they are from, what they do, and what is known about them.\n\n" +
  "Where the request names a person — an artist, a singer, a player, a YouTuber — search every platform they may live on and name what you find: YouTube (their videos and their own channel), Facebook, TikTok, Instagram, and the music platforms their songs are published on. The person's own pages there count as sources: write what they show — the name, the songs by name, the language they sing in, the place, the channel — and put that platform's name in `source` with that page's own address in `link`. Beyond that, take it from sources that can be trusted: established news organisations, official organisations, universities, encyclopaedias. Ignore rumours, gossip and unconfirmed social posts.\n" +
  "Someone written about only on those platforms is still someone to answer about: a person found only there is a result, not a reason to say nothing was found.\n" +
  "Write the material in Swahili, adding Ebembe words wherever you know them, and put the source you took it from in `source`, named plainly — the site or the organisation — with that page's own address in `link`.\n" +
  "Never invent anything. When what you found is thin, or the sources disagree, write the material anyway and say plainly inside `text` that it is not confirmed. When the search gives you nothing at all — and a person found on their own YouTube channel, page or music platform is not nothing — set no_result=true and leave `text` empty: never write a finding-nothing out as the material.\n" +
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
  if (query.length < 4 || !(WANTS.test(query) || ASKS_ABOUT.test(query))) {
    return { material: "", needed: false, found: false };
  }
  // the admin's own answer stands first: where they have already saved this question, its
  // answer is the one to give, so nothing is looked up — unless more was asked for outright
  if (!MORE.test(query) && (await savedAnswer(base44, query))) {
    return { material: "", needed: false, found: false };
  }

  // Google's own results, and the open web's, for this request ride with it into the search, so the
  // material stands on results that can be named and followed
  // what the search hands back for this request rides with it into the search
  const terms = searchTerms(query);
  const web = namedRows(await webResults(terms), terms);
  const results =
    (terms ? `\nSEARCH FOR THIS FIRST: "${terms}" — the name and the subject, without the sentence around it.\n` : "") +
    webBlock(web);
  console.log("Looking up:", terms, "→", web.length, "result(s)");

  let out: any = {};
  try {
    const found = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: PROMPT(query, results),
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
    // the search did answer even though the request was passed over: what it handed back rides
    if (out.no_result && web.length) {
      return { material: `${HEAD}\n${webBlock(web)}`.slice(0, MAX_MATERIAL), needed: true, found: true };
    }
    return { material: out.no_result ? MISS : "", needed: true, found: false };
  }

  const title = textOf(out.title).slice(0, 120);
  const text = textOf(out.text).slice(0, MAX_TEXT);
  // A search that found nothing is never saved as knowledge — but where the search did answer and
  // the finding was refused anyway, what it handed back rides to the answer as it stands, so a
  // person the search found is never reported as a person nothing is known about.
  if (kind !== "word" && NO_RESULT.test(text)) {
    if (!web.length) return { material: MISS, needed: true, found: false };
    return { material: `${HEAD}\n${webBlock(web)}`.slice(0, MAX_MATERIAL), needed: true, found: true };
  }
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