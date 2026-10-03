import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// A request for material the saved knowledge does not hold — a story, a piece of news,
// a word, a fact — is looked up on the internet once and saved for next time. Ordinary
// talk is never searched for: these words are the only door to the lookup.
const WANTS =
  /(hadithi|habari|historia|story|stories|news|simulia|nieleze|niambie|maelezo|eleza|describe|description|maneno|neno|misemo|msemo|tena|nyingine|nyingi|zaidi|fundisha|nifundishe|google|tafuta|search|legend|dunia|ulimwengu|matukio|kilitokea|linatokea|happening|more about|tell me more)/i;

const MAX_QUERY = 600;
const MAX_TEXT = 8000;
const MAX_MATERIAL = 4000;

const HEAD =
  "\nMAARIFA MAPYA YA MTANDAONI — material that was just looked up for this request:\n" +
  "Tumia sehemu hii kama ombi linahitaji hadithi, habari, neno au jambo ambalo halina jibu kwenye maarifa ya admin. " +
  "Simulia kikamilifu — usifanye muhtasari — na usiishie hapo: ongeza hadithi nyingine na maneno mapya kadri anavyotaka. " +
  "Lugha: Ebembe kwanza, kisha Kiswahili. Sema wazi kwamba jibu hili limetafutwa mtandaoni.\n";

const SCHEMA = {
  type: "object",
  properties: {
    needed: {
      type: "boolean",
      description: "true only when the request needs material from the internet",
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
    term: { type: "string", description: "the Ebembe word, on a word request" },
    meaning: { type: "string", description: "what the Ebembe word means" },
    guide: {
      type: "string",
      description: "how the Ebembe word is said, syllables joined by dashes, for the ear only",
    },
  },
  required: ["needed", "kind"],
};

const PROMPT = (query: string) =>
  "You help an Ebembe village assistant in the Democratic Republic of Congo. A person has just said:\n" +
  `"""${query}"""\n\n` +
  "Decide whether this needs material from the internet:\n" +
  "- A request for a story, a folk tale or a legend → kind \"story\".\n" +
  "- A request for news, or what is happening somewhere → kind \"news\".\n" +
  "- A request to be taught an Ebembe or Swahili word, or for more words → kind \"word\".\n" +
  "- A request for a general fact about the world → kind \"fact\".\n" +
  "- A greeting, small talk, a question about the person, thanks, or anything ordinary conversation covers → needed=false, kind=\"none\".\n\n" +
  "If it does need material: search the internet, then write that material yourself and write it out in full.\n" +
  "- story: the whole story, told properly, ten to twenty sentences — never a summary, and never a description of the story.\n" +
  "- news: the real, recent news, with the place, the date and where it comes from.\n" +
  "- word: the Ebembe word in `term`, its meaning in `meaning`, how it is said in `guide` (syllables joined by dashes, like oh-leg-bile), and the explanation in `text`. If you cannot confirm the Ebembe word, set needed=false instead of inventing one.\n" +
  "- fact: the facts, plainly.\n\n" +
  "Write the material in Swahili, adding Ebembe words wherever you know them. Never invent anything: when the search gives you nothing, set needed=false.\n" +
  "Fill every field of the answer, using an empty string where a field does not apply.";

function textOf(value: any) {
  return typeof value === "string" ? value.trim() : "";
}

function rowsOf(page: any) {
  return Array.isArray(page) ? page : page?.items || [];
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    let payload: any = {};
    try {
      payload = await req.json();
    } catch (err) {
      payload = {};
    }

    const query =
      typeof payload?.query === "string" ? payload.query.trim().slice(0, MAX_QUERY) : "";
    // the cheapest gate first: a line that asks for nothing new never reaches a search
    if (query.length < 4 || !WANTS.test(query)) return Response.json({ material: "" });

    const found = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: PROMPT(query),
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: SCHEMA,
    });

    const out: any = found && typeof found === "object" ? found : {};
    const kind = textOf(out.kind);
    if (!out.needed || !kind || kind === "none") return Response.json({ material: "" });

    const title = textOf(out.title).slice(0, 120);
    const text = textOf(out.text).slice(0, MAX_TEXT);
    const term = textOf(out.term).slice(0, 80);
    const meaning = textOf(out.meaning).slice(0, 400);
    const guide = textOf(out.guide).slice(0, 120);

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
      // a story, a piece of news or a fact is saved as a world note for next time
      const headline = title || text.slice(0, 60);
      const page = await base44.asServiceRole.entities.AssistantKnowledge.filter(
        { kind: "note", title: headline },
        { limit: 1 }
      );
      if (!rowsOf(page).length) {
        await base44.asServiceRole.entities.AssistantKnowledge.create({
          kind: "note",
          title: headline,
          text,
        });
      }
      material = `${HEAD}\n${headline} — ${text}`;
    }

    // only the material for this answer goes back; the entry itself stays on the server
    return Response.json({ material: material.slice(0, MAX_MATERIAL) });
  } catch (error: any) {
    console.error("Could not look anything up:", error.message);
    return Response.json({ error: "The lookup is unavailable right now." }, { status: 500 });
  }
}