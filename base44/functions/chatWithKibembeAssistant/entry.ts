import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { bankRows, trimToLines, wordListBlock } from "../../shared/wordBank.ts";
import { docWholeBlock } from "../../shared/knowledgeDoc.ts";
import { rulesText } from "../../shared/knowledgeRules.ts";
import { candidateList, lookupForTurn, lookupSource } from "../../shared/freshLookup.ts";
import { bestStory, storyNote } from "../../shared/storyMatch.ts";
import { storyCatalogueBlock } from "../../shared/storyCatalogue.ts";
import { ANSWER_LANGUAGE, SOURCE_RULES } from "../../shared/languageRules.ts";
import { KIBEMBE_GUIDE } from "../../shared/kibembeGuide.ts";
import { engineReply, engineTurn } from "../../shared/phraseEngine.ts";
import { turnPictures } from "../../shared/answerPictures.ts";
import { isRepeatAsk } from "../../shared/repeatAsk.ts";
import { wantsEbembeTranslation } from "../../shared/ebembeTranslation.ts";

// The model that answers, and the bounds on one turn: a message is never longer than a
// paragraph, and an answer is never longer than a few sentences.
// The model is the one that reads the rules before it writes: the smaller one answered from whatever
// came back from the search and asked the person which language to use, which is what the rules
// forbid. The reply is given room for the whole of an answer — three to six sentences with a source
// named and its address written out — rather than for a line of it.
const MODEL = 'gpt-4.1-mini';
const MAX_MESSAGE = 2000;
// the app's own last answer, sent back with a turn where the screen holding it has one
const MAX_LAST = 1200;
// a repeat ask with nothing yet said: the app asks quietly for the turn again rather than inventing a
// line nobody gave, and no answer is written for the ask at all
const REPEAT_NONE = "Sema tena, nakusikiliza.";
const MAX_REPLY_TOKENS = 900;

// How much of the app's own saved knowledge rides with one turn: the rule book the admin keeps in
// force, and the words they have saved. The file search store is searched as before — this is the
// half of the Word Bank that changes the moment the admin pastes something in, so a word saved a
// minute ago answers now.
const RULES_BUDGET = 7000;
const WORD_BUDGET = 7000;
// A turn that asks for a translation into Kibembe is answered word by word from the admin's own
// reviewed Word Bank, so far more of that list rides with that one turn than with an ordinary one:
// the translation has to be built from the words the admin has already confirmed and reviewed.
const TRANSLATE_WORD_BUDGET = 22000;
// and the admin's one knowledge document rides with them whole: its words, its phrases, its rules
// and everything else they wrote, so the answer never rests on a part of it
// and the catalogue of every story — its name and the names published with it — so a person who asks
// about a song or a video by its own name is answered about that name
const STORY_ROOM = 1500;

// How much of the admin's document rides with one written turn. The document is hundreds of
// thousands of characters long, and a turn handed more than the model reads is answered from
// whatever the file search happened to bring rather than from the rules — so the document rides as
// the parts this turn names, its rules whole, and a slice of every other part, inside a room the
// answer is written from.
const DOC_ROOM = 30000;

// The admin's own rule book, handed over ahead of the words: how Kibembe is read, pronounced,
// written and used is decided by it, and every answer follows it.
const RULES_HEAD =
  '\nSHERIA ZA LUGHA YA KIBEMBE — the admin\'s own rule book for reading, pronouncing, writing and ' +
  'using Kibembe, saved in this app. It is the reference for the language: where one of ' +
  'these rules and your own habit disagree, the rule wins.\n';

// The assistant's own standing orders: the Word Bank and the rule book are read before every answer,
// and they are the reference the Kibembe of that answer is written from.
const INSTRUCTIONS = [
  'You are GLOIRE SADIKI AI, the Kibembe (Ebembe) assistant of Village Voice.',
  'Before you answer, read the Kibembe Word Bank in the attached file search store: search it for',
  'every Kibembe word, meaning, spelling, grammar pattern and pronunciation that your answer uses.',
  KIBEMBE_GUIDE,
  'Rules:',
  '- Answer by the language rules below: Kibembe leads every conversation and a Kibembe answer is',
  '  Kibembe alone, and only Kibembe (Ebembe), Kiswahili and English exist in this app. Never mix two',
  '  languages into one answer, and never translate unless you are asked to.',
  ANSWER_LANGUAGE,
  SOURCE_RULES,
  '- The words and the rules the admin has saved in this app are your reference for Kibembe: where a',
  '  word stands there, write it as it is written. Where nothing there covers one part of what the',
  '  answer needs, answer anyway, in the Kibembe a Babembe speaker really uses.',
  '- Never tell the person that you do not have something. Answer from what was handed to you, and',
  '  where the material does not settle a thing, say plainly that it could not be confirmed — and never',
  '  say nothing was found when material was handed to you.',
  '- Keep the reply to one or two plain sentences.',
  '- Write plain text only: no headings, no lists and no markdown.',
].join('\n');

// What the person sees when the app is not set up yet, or when the answer could not be fetched.
// Nothing of the key, the store id, or the upstream error is ever in these.
const NO_KEY = 'The assistant is not connected yet — an admin needs to add the OpenAI key.';
const NO_STORE = 'The assistant is not connected yet — an admin needs to add the Kibembe Word Bank.';
// Each failure names the stage it belongs to, so what went wrong is said plainly instead of being
// answered around: where nothing could be read, nothing is answered from it.
const NO_REPLY = 'The answer could not be written just now — please try again.';
const KNOWLEDGE_DOWN =
  'The saved knowledge could not be read just now — please try again in a moment.';

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
    // The names the app itself put before the person on the turn before — the several people or
    // artists that came back under names that look alike — sent back with their answer, so this turn
    // is read as the choice it is.
    const asked = candidateList(body?.asked);
    // The app's own last answer, sent back with the turn where the screen holding it has one: it is
    // what a repeat ask gives back, word for word, and it is never guessed at.
    const lastAgent = String(body?.lastAgent || '').trim().slice(0, MAX_LAST);

    // The person has asked for their own last answer again — "Omo tenda bile?". That answer is already
    // in the app's own hand — the screen holds the line it gave them — so the same line goes back
    // exactly as it stands, and no answer is written for the ask at all. Nothing of it can then be
    // re-worded, shortened, translated or turned into a lesson. Where no line is held, nothing is
    // invented: the turn is answered as any other, with the ask laid out in front of the answer.
    const repeating = isRepeatAsk(message);
    if (repeating) {
      // The line the app holds, where it holds one. Where it holds none — the very first turn of a
      // conversation — nothing is invented to fill the place: the app's own quiet line asks for the
      // turn again. Either way no answer is written for the ask, so nothing of it can be re-worded,
      // translated or turned into a lesson.
      return Response.json({ reply: lastAgent || REPEAT_NONE, repeated: true });
    }

    // The key and the Word Bank live only in Secrets, and are read here on the server: neither is
    // ever sent to the app, and a missing one is said plainly rather than guessed at.
    const apiKey = secrets.get('OPENAI_API_KEY');
    if (!apiKey) return Response.json({ error: NO_KEY, stage: 'setup' });
    const storeId = secrets.get('OPENAI_VECTOR_STORE_ID');
    if (!storeId) return Response.json({ error: NO_STORE, stage: 'setup' });

    // What the admin has saved in this app rides with the message: the rule book in force first,
    // then every word they hold. Both are read here on the server and never sent to the app.
    // Everything this turn is answered from is gathered at once, never one piece after another. The
    // rule book, the Word Bank, the document, the stories and the internet lookup are independent of
    // each other, and reading them one after the other is what left a written turn standing on the
    // screen for seconds before its answer was even begun. Nothing is dropped and nothing is read in
    // less: they simply no longer wait on each other, so the answer starts the moment the last of
    // them lands rather than the moment all of their waits are added together.
    // a translation into Kibembe is built from the Word Bank itself: the whole of what the admin has
    // reviewed rides with that turn rather than the part an ordinary turn carries
    const translating = wantsEbembeTranslation(message);
    // Each piece stands on its own as well as beside the others. A read that fails takes nothing with
    // it: what the other pieces brought back still rides with the turn, and the one that failed is
    // named to the answer so it says plainly that it could not be read rather than answering as
    // though it had. Reading them with Promise.all was what made one failing piece — a story
    // catalogue, a document part — lose the whole Word Bank and leave the person with nothing.
    const reads = await Promise.allSettled([
      rulesText(base44).then((rows) => trimToLines(rows, RULES_BUDGET)),
      bankRows(base44).then((rows) =>
        wordListBlock(rows, message, translating ? TRANSLATE_WORD_BUDGET : WORD_BUDGET)
      ),
      // the rest of the document — the admin's notes, their questions and answers, and anything they
      // filed under a heading of their own — rides with the turn too
      // the document is handed over as the parts this message needs: its rules whole, the parts the
      // message itself names, and a slice of every other part — a document longer than one turn reads
      docWholeBlock(base44, DOC_ROOM, message),
      // The admin's own stories ride with a turn that asks for one: the telling they wrote is what
      // the answer is given from, and the screen shows it with its picture, its video or its link as
      // the answer comes.
      base44.entities.Story.filter(
        { published: true },
        {
          sort: '-updated_date',
          limit: 200,
          fields: ['title', 'text', 'tags', 'links', 'channel_url', 'artist_links'],
        }
      ),
      // the catalogue of every story, and of every name published with one, rides with the message:
      // a question about a song, a video or a channel is answered from its own name
      storyCatalogueBlock(base44, STORY_ROOM),
      // A request the saved knowledge does not answer — news, a story, who someone is — is looked up
      // on the internet, by the same lookup the app's other assistants use, and the material rides
      // with the message. A search that found nothing, or that could not be made at all, is said
      // plainly instead of being answered around. The lookup decides for itself whether a turn needs
      // one, so ordinary talk is not held by it.
      lookupForTurn(base44, message, asked),
      // The admin's own engine of asks and replies rides with the turn as well: the ask the person
      // said is found in it, and the replies saved for that ask are handed over — one of which is the
      // reply, given exactly as the engine writes it rather than a sentence written for the turn.
      engineTurn(base44, message),
    ]);
    // What each read is, named for the stage it belongs to: the name is what a failure is reported by.
    const STAGE_NAMES = [
      'the rule book',
      'the Word Bank',
      'the knowledge document',
      'the stories',
      'the story catalogue',
      'the internet lookup',
      'the reply engine',
    ];
    const missed: string[] = [];
    // A read that failed is written down by its stage and the turn carries on without it. The reason
    // stays in the app's own logs, named by that stage — nothing of the knowledge itself, and nothing
    // of the key, is ever logged.
    const took = (at: number, fallback: any) => {
      const result = reads[at];
      if (result.status === 'fulfilled') return result.value;
      missed.push(STAGE_NAMES[at]);
      console.error(
        `The ${STAGE_NAMES[at]} could not be read:`,
        result.reason?.message || result.reason
      );
      return fallback;
    };
    const rules = took(0, '');
    const words = took(1, '');
    const doc = took(2, '');
    const storyPage = took(3, null);
    const tales = took(4, '');
    const lookup = took(5, { material: '', needed: false, found: false, candidates: [] });
    const engineTurn_ = took(6, { ask: null, note: '' });
    const engine = engineTurn_.note || '';
    // the ask itself, kept so its own saved reply can be given whole rather than written for it
    const engineAsk = engineTurn_.ask || null;

    // Nothing of the saved knowledge could be read at all: the turn is stopped here and the stage is
    // named, rather than an answer being written from nothing and put before the person as the app's own.
    const CORE = ['the rule book', 'the Word Bank', 'the knowledge document'];
    if (CORE.every((one) => missed.includes(one))) {
      console.error('The saved knowledge could not be read for this turn:', missed.join(', '));
      return Response.json({ error: KNOWLEDGE_DOWN, stage: 'knowledge' });
    }

    const saved = rules || words || doc ? `${RULES_HEAD}${rules}${words}${doc}` : '';
    // A part that could not be read is named to the answer, so it says plainly that it could not reach
    // it: nothing is ever claimed from a read that failed.
    const unread = missed.length
      ? `\n- A part of the saved knowledge could not be read for this turn: ${missed.join(', ')}. ` +
        'The app could not reach it just now. Do not answer from it, do not claim anything it holds, ' +
        'and never say nothing was found: where this answer depends on it, say plainly that it could ' +
        'not be read just now and ask the person to try again.\n'
      : '';
    // The matching lives in one place, so the story found here is the story the screen is given.
    const story = bestStory(storyPage?.items || [], message);
    const told = story ? storyNote(story) : '';

    // A turn that needed the internet is answered from what was found, and given the room to be
    // answered properly: the whole of what the search brought — who the person is, their songs, their
    // history — with what could not be confirmed said plainly. Only the one or two sentences rule is
    // lifted here; every other rule stands.
    const FOUND =
      '- This turn was answered from a search of the internet, and what was found is handed to you ' +
      'above. Give the whole of what was found — who the person is, where they are from, their songs ' +
      'or their work by name, what is known about them — in three to six plain sentences rather than ' +
      'one, say where it came from, and say plainly where the sources do not settle a thing. ' +
      'Never say you do not know the person, and never say nothing was found, when the material above ' +
      'carries them.';

    // Several different people or artists under names that look alike: this turn is the app's own
    // question back to the person, so the answer names every one of them and asks which is meant.
    const ASK_NAMES =
      "- This turn answers a question of the app's own: several different people or artists were found " +
      'under names that look alike, and only the person can say which one they mean. Name every one of ' +
      'them, in full, one after another, with what tells each from the others, then ask which one they ' +
      'mean. Answer nothing about any of them yet, choose none of them yourself, and never say you do ' +
      'not know — say plainly that there are several by that name and ask which one. Your whole answer ' +
      'is that question and nothing else: no profile, no history, no songs, no source — the names, and ' +
      'the question which one they mean.';
    // ...and this turn is the person's own answer to that question: the one they chose is named back
    // to them, and everything given belongs to them and to nobody else.
    const CHOSEN = asked.length
      ? '- The person was asked which of these names they meant: ' +
        asked.map((one) => `${one.name}${one.detail ? ` (${one.detail})` : ''}`).join('; ') +
        '. Their turn now is their answer to that question. The first thing you write, as a statement ' +
        'and never as a question, in the language they used, is the confirmation of the one they chose ' +
        'by their full name — "Umemchagua <jina lake kamili>" in Kiswahili, and the same words in ' +
        'whatever language they spoke. Only after that confirmation do you answer about that one person ' +
        'alone: everything you give belongs to them and to nobody else. Never ask which one they mean ' +
        'again — they have chosen. Where their turn names none of the people listed above, name all of ' +
        'them again and ask once more which they mean.'
      : '';

    const asking = lookup.candidates.length >= 2;
    // Several names waiting on the person's choice: nothing that presents one of them as the answer —
    // no matched story and no catalogue of names — rides with this turn, so the answer is the
    // question itself and the person is left to say which one they mean.
    // One of the app's own asks, with replies saved for it: the app holds that reply itself, so it is
    // given whole — the same words and the same spelling the engine writes — rather than written fresh
    // for the turn, and the reply is never read out as a list of the forms saved for the ask. An ask
    // the engine keeps only its general replies for is answered naturally instead, in its own words.
    if (engineAsk && !engineAsk.general && engineAsk.replies.length) {
      const held = engineReply(engineAsk, lastAgent);
      if (held) {
        return Response.json({
          reply: held,
          pictures: await turnPictures(base44, message, held),
          source: null,
          candidates: [],
        });
      }
    }

    // Every turn is answered, whether or not the app's own knowledge holds a word of it: the saved
    // knowledge below is what the answer is written from, and a turn none of it reaches is answered
    // from what the model knows, in one of the app's three languages.

    const input = [
      saved,
      unread,
      asking ? '' : told,
      asking ? '' : tales,
      lookup.material,
      lookup.material ? (asking ? ASK_NAMES : FOUND) : '',
      CHOSEN,
      // the engine's own reply for this ask, where the turn is one of its asks: one of the replies it
      // saves is the reply, given exactly as it stands. A turn that is the app's own question back
      // answers that question and nothing else, so nothing of the engine rides with it.
      asking ? '' : engine,
      `Mtu amesema: ${message}`,
    ]
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
      return Response.json({ error: NO_REPLY, stage: 'answer' });
    }

    const reply = replyText(data);
    if (!reply) return Response.json({ error: NO_REPLY, stage: 'answer' });
    // The pictures the admin saved beside the words this answer is made of ride with it: the screen
    // stands each one where its word is said in the answer, and again below the answer, so a word the
    // admin gave a picture to is answered with that picture and not with words alone. An answer whose
    // words carry no picture comes back with none, which is most of them.
    const pictures = await turnPictures(base44, message, reply);
    // And where this answer stands on something looked up on the internet, where it came from goes
    // back with it — named, with its own address — so the screen can show the source of what it says
    // instead of the person having to take the answer on trust.
    // The names waiting on the person's choice ride back with the answer, so the screen can put them
    // before them as the names to choose between — and a question that has answered nothing yet names
    // no source.
    return Response.json({
      reply,
      pictures,
      source: asking ? null : lookupSource(lookup.material),
      candidates: lookup.candidates,
      // The artist's own videos, the most watched first, when the turn was about an artist: the reply
      // already names them and writes their addresses in its own words, and the same five ride back
      // here so the screen can stand them under that answer as well.
      videos: Array.isArray(lookup.videos) ? lookup.videos : [],
    });
  } catch (error) {
    console.error('The Kibembe assistant failed:', error?.message);
    return Response.json({ error: NO_REPLY, stage: 'answer' }, { status: 500 });
  }
}