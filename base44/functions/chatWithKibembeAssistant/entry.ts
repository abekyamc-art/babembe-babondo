import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { bankRows, trimToLines, wordListBlock } from "../../shared/wordBank.ts";
import { docWholeBlock } from "../../shared/knowledgeDoc.ts";
import { rulesText } from "../../shared/knowledgeRules.ts";
import { lookupForTurn } from "../../shared/freshLookup.ts";
import { bestStory, storyNote } from "../../shared/storyMatch.ts";
import { storyCatalogueBlock } from "../../shared/storyCatalogue.ts";
import { ANSWER_LANGUAGE, SOURCE_RULES } from "../../shared/languageRules.ts";
import { KIBEMBE_GUIDE } from "../../shared/kibembeGuide.ts";
import { turnPictures } from "../../shared/answerPictures.ts";

// The model that answers, and the bounds on one turn: a message is never longer than a
// paragraph, and an answer is never longer than a few sentences.
const MODEL = 'gpt-4o-mini';
const MAX_MESSAGE = 2000;
const MAX_REPLY_TOKENS = 400;

// How much of the app's own saved knowledge rides with one turn: the rule book the admin keeps in
// force, and the words they have saved. The file search store is searched as before — this is the
// half of the Word Bank that changes the moment the admin pastes something in, so a word saved a
// minute ago answers now.
const RULES_BUDGET = 7000;
const WORD_BUDGET = 7000;
// and the admin's one knowledge document rides with them whole: its words, its phrases, its rules
// and everything else they wrote, so the answer never rests on a part of it
// and the catalogue of every story — its name and the names published with it — so a person who asks
// about a song or a video by its own name is answered about that name
const STORY_ROOM = 1500;

// The admin's own rule book, handed over ahead of the words: how Kibembe is read, pronounced,
// written and used is decided by it, and every answer follows it.
const RULES_HEAD =
  '\nSHERIA ZA LUGHA YA KIBEMBE — the admin\'s own rule book for reading, pronouncing, writing and ' +
  'using Kibembe, saved in this app. It is the highest authority on the language: where one of ' +
  'these rules and your own habit disagree, the rule wins. Never invent a word, a plural or a ' +
  'tense it does not confirm.\n';

// The assistant's own standing orders: the Word Bank is read before every answer, and nothing
// Kibembe is ever written that the Word Bank does not confirm.
const INSTRUCTIONS = [
  'You are the Kibembe assistant of Village Voice, a helper for the Kibembe (Ebembe) language.',
  'Before you answer, read the Kibembe Word Bank in the attached file search store: search it for',
  'every Kibembe word, meaning, spelling, grammar pattern and pronunciation that your answer uses.',
  KIBEMBE_GUIDE,
  'Rules:',
  '- Answer by the language rules below: Kibembe leads every conversation and a Kibembe answer is',
  '  Kibembe alone, and only Kibembe (Ebembe), Kiswahili and English exist in this app. Never mix two',
  '  languages into one answer, and never translate unless you are asked to.',
  ANSWER_LANGUAGE,
  SOURCE_RULES,
  '- Kibembe is written only from the Word Bank: use only words, meanings and grammar it confirms, and',
  '  never invent, guess, translate or re-spell a Kibembe word, and never state a pronunciation the',
  '  Word Bank does not carry. The words and the rules the admin has saved in this app are handed to',
  '  you with every message: they are part of the Word Bank, the newest part of it, and a word written',
  '  there is confirmed.',
  '- Where neither the Word Bank nor the material handed over confirms it, say briefly, in the language',
  '  the person used, that you do not have it — never guess, and never say nothing was found when',
  '  material was handed to you.',
  '- Keep the reply to one or two plain sentences.',
  '- Write plain text only: no headings, no lists and no markdown.',
].join('\n');

// What the person sees when the app is not set up yet, or when the answer could not be fetched.
// Nothing of the key, the store id, or the upstream error is ever in these.
const NO_KEY = 'The assistant is not connected yet — an admin needs to add the OpenAI key.';
const NO_STORE = 'The assistant is not connected yet — an admin needs to add the Kibembe Word Bank.';
const NO_REPLY = 'The assistant could not answer just now. Please try again.';

/** The reply text out of a Responses API answer, however the model handed it back. */
function replyText(data) {
  const direct = String(data?.output_text || '').trim();
  if (direct) return direct;
  const items = Array.isArray(data?.output) ? data.output : [];
  for (const item of items) {
    const parts = Array.isArray(item?.content) ? item.content : [];
    for (const part of parts) {
      const text = String(part?.text || '').trim();
      if (text) return text;
    }
  }
  return '';
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const message = String(body?.message || '').trim().slice(0, MAX_MESSAGE);
    if (!message) return Response.json({ error: 'Type a message first.' }, { status: 400 });

    // The key and the Word Bank live only in Secrets, and are read here on the server: neither is
    // ever sent to the app, and a missing one is said plainly rather than guessed at.
    const apiKey = secrets.get('OPENAI_API_KEY');
    if (!apiKey) return Response.json({ error: NO_KEY });
    const storeId = secrets.get('OPENAI_VECTOR_STORE_ID');
    if (!storeId) return Response.json({ error: NO_STORE });

    // What the admin has saved in this app rides with the message: the rule book in force first,
    // then every word they hold. Both are read here on the server and never sent to the app.
    const rules = trimToLines(await rulesText(base44), RULES_BUDGET);
    const words = wordListBlock(await bankRows(base44), message, WORD_BUDGET);
    // the rest of the document — the admin's notes, their questions and answers, and anything they
    // filed under a heading of their own — rides with the turn too
    // the document is handed over as the parts this message needs: its rules whole, the parts the
    // message itself names, and a slice of every other part — a document longer than one turn reads
    const doc = await docWholeBlock(base44, undefined, message);
    const saved = rules || words || doc ? `${RULES_HEAD}${rules}${words}${doc}` : '';

    // The admin's own stories ride with a turn that asks for one: the telling they wrote is what
    // the answer is given from, and the screen shows it with its picture, its video or its link as
    // the answer comes. The matching lives in one place, so the story found here is the story the
    // screen is given.
    const storyPage = await base44.entities.Story.filter(
      { published: true },
      {
        sort: '-updated_date',
        limit: 200,
        fields: ['title', 'text', 'tags', 'links', 'channel_url', 'artist_links'],
      }
    );
    const story = bestStory(storyPage?.items || [], message);
    const told = story ? storyNote(story) : '';
    // the catalogue of every story, and of every name published with one, rides with the message:
    // a question about a song, a video or a channel is answered from its own name
    const tales = await storyCatalogueBlock(base44, STORY_ROOM);

    // A request the saved knowledge does not answer — news, a story, who someone is — is looked up
    // on the internet before the answer is written, by the same lookup the app's other assistants
    // use, and the material rides with the message. A search that found nothing, or that could not
    // be made at all, is said plainly instead of being answered around.
    const lookup = await lookupForTurn(base44, message);

    const input = [saved, told, tales, lookup.material, `Mtu amesema: ${message}`]
      .filter(Boolean)
      .join('\n');
    console.log(
      'Saved knowledge handed over:',
      saved.length,
      'characters,',
      rules.length,
      'of them rules, and',
      lookup.material.length,
      'characters looked up'
    );

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        instructions: INSTRUCTIONS,
        input,
        // File Search alone: web search, tool search and function calling are all left off, and
        // the search is required, so the Word Bank is read before the answer is written.
        tools: [{ type: 'file_search', vector_store_ids: [storeId], max_num_results: 5 }],
        tool_choice: 'required',
        max_output_tokens: MAX_REPLY_TOKENS,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      // the real reason stays in the app's own logs; the person is told only that it did not work
      console.error('The Kibembe assistant could not answer:', response.status, JSON.stringify(data).slice(0, 400));
      return Response.json({ error: NO_REPLY });
    }

    const reply = replyText(data);
    if (!reply) return Response.json({ error: NO_REPLY });
    // The pictures the admin saved beside the words this answer is made of ride with it: the screen
    // stands each one where its word is said in the answer, and again below the answer, so a word the
    // admin gave a picture to is answered with that picture and not with words alone. An answer whose
    // words carry no picture comes back with none, which is most of them.
    const pictures = await turnPictures(base44, message, reply);
    return Response.json({ reply, pictures });
  } catch (error) {
    console.error('The Kibembe assistant failed:', error?.message);
    return Response.json({ error: NO_REPLY }, { status: 500 });
  }
}