import { secrets } from 'base44:runtime';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { AGENT_ROOM, appRulesBlock } from '../../shared/cartesiaRules.ts';
import { loadSavedMaterial } from '../../shared/voiceRules.ts';
import { TRUTH_RULES } from '../../shared/truthRules.ts';
import { earsKnowledge, earsPrompt } from '../../shared/openAiEars.ts';

/**
 * The credential that opens the app's own OpenAI seat — the first voice on a home call.
 *
 * The phone never sees the account's OpenAI key: it asks here, on the server, for a short-lived
 * credential made from that key, and the key itself stays in Secrets and never leaves this function.
 *
 * This seat is not the Kibembe screen's reader. It hears the person itself and answers on its own
 * account, in its own words, so it is given the app's whole rules block as its session: Gloire's
 * guide, the admin's answer key, the confirmed Kibembe words and as much of the admin's document as a
 * session can carry. It answers from that material and from what it knows, in Kibembe, Kiswahili or
 * English — and the three languages are the only rule that stands over it.
 */

// the model the call runs on, and the voice that speaks it
const MODEL = 'gpt-realtime';
// the voice that speaks it: the deeper of the two the service gave this model, so the first voice of
// the call is a man's
const VOICE = 'cedar';
const SESSION_URL = 'https://api.openai.com/v1/realtime/client_secrets';

// How much of the app's own rules the session carries, and how much of the admin's document rides in
// them. A session reads its instructions from the front, so everything past the room is lost: what
// gives way is the document, and never the guide, the saved answers or the confirmed words.
//
// The room is the app's own room for this whole block — the same one the Cartesia agents carry it in
// — because the same material has to fit: the guide alone is around 28,500 characters, so a smaller
// room is spent before the answer key and the confirmed words are ever reached, and the seat is left
// with the rules and no vocabulary at all — greeting in Kibembe and then falling into a language
// nobody here speaks, with nothing of the app's own knowledge to answer from.
const RULES_ROOM = AGENT_ROOM;
const DOC_ROOM = 6000;

// Every spoken turn of this call is written down by OpenAI too, pointed at the admin's own words
// before it listens: the nearest language the reader knows is Kiswahili, so a Kibembe turn comes back
// as Bantu sounds — the sounds the saved words are written in — instead of as English nobody spoke.
const TRANSCRIBE_MODEL = 'gpt-4o-transcribe';
const TRANSCRIBE_FALLBACK = 'whisper-1';
const TRANSCRIBE_LANG = 'sw';
const TRANSCRIBE_PROMPT_MAX = 400;

// What the seat is, before the app's own rules are written under it. It speaks on a live call, so it
// listens to a whole turn before answering, and it is told plainly that everything the app holds for
// this call is already in front of it — there is nobody to hand a turn to here.
const OPENING = [
  'You are GLOIRE SADIKI AI — a warm, accurate, Kibembe-first multilingual voice assistant, and you are',
  'on a live voice call. You hear the person yourself and you answer them yourself, out loud, in your own',
  'words and in a short sentence or two.',
  'Kibembe (Ebembe) is the language of this call: take every turn as Kibembe from its first sound, and',
  'read it as the confirmed Kibembe word or phrase it belongs to rather than as the English or Kiswahili',
  'word it nearly sounds like. Only when the person plainly asks for Kiswahili or English — or plainly',
  'uses one of them — does that language stand, and it stands from that very word on.',
  'Listen to the whole turn before you answer, never cut the person off, and never answer with one word',
  'or with a line you have already given in this call.',
  'Speak Kibembe the way a Babembe speaker does: every vowel opened and every syllable landing as the',
  'guide gives it, with the warmth and the rhythm of the language rather than an English reading of it.',
  'Everything this app holds for this call is written below: the guide, the saved answers and the',
  'confirmed words. As each turn of the person ends, the app searches the whole of its knowledge',
  'document and its confirmed Word Bank for the part that turn reaches, and hands that part to you',
  'before you answer. Use that material as your reference and answer the turn as it was asked, in your',
  'own words and from what you know. Never say that something is being looked up.',
  'Three languages exist here and no others — Kibembe (Ebembe), Kiswahili and English — and every',
  'answer is given in one of them, whole: never in a language outside them, and never in a mixture of',
  'your own making. Kibembe leads: a turn in Kibembe is answered in Kibembe only, and so is a turn in',
  'Kiswahili or English — the meaning the person gave is carried into Kibembe as you answer it. Only a',
  'plain ask for Kiswahili or English, or a plain turn in one of them that is being answered in it,',
  'puts another language in force, and then that one is answered in and nothing else is mixed into it.',
  'Carry the meaning across the three languages as you answer, never word for word, and never out of a',
  'language that is not one of them.',
  'That gate is permanent, and every line you say is checked against it: Lingala, French, Portuguese and',
  'every other language of the world are barred here outright, and so is every script that is not the',
  'Latin one. Not one such word is ever said inside a line — a line that carries one is cut at that word',
  'and replaced by the short line that names the three languages of this call.',
  'The forms written below are the ones the admin confirmed, and their spelling, their tense and their',
  'reading are the reference for every Kibembe line you say. Where the app holds nothing for one part of',
  'a line, carry that part with the nearest word a Babembe speaker would use — never in a language',
  'outside the three — so the line never runs dry and never falls into another tongue. A Kibembe turn is',
  'answered in Kibembe — and any part you supplied yourself is said plainly to be not confirmed by the',
  "app's knowledge, because the law of truth below stands over every line you say.",
  TRUTH_RULES,
  'When the app hands you a reply of its own with a turn, that reply is the whole answer: it is said',
  'exactly as it is written, in the language it is written in, with nothing added to it, nothing left',
  'out of it, and nothing said on top of it.',
  'The rules below stand above every other instruction you were given.',
].join(' ');

const NO_KEY = 'AI 1 is not set up yet — an admin needs to add the OpenAI key.';
const REFUSED = 'AI 1’s call could not be opened.';

function sessionFor(instructions: string, prompt: string, model: string) {
  return {
    type: 'realtime',
    model: MODEL,
    instructions,
    audio: {
      input: {
        transcription: {
          model,
          language: TRANSCRIBE_LANG,
          ...(prompt ? { prompt } : {}),
        },
        // the person's turn ends in the natural pause, and the seat answers on its own: this is a
        // conversation, not a reader, so the answer is started here and the person may speak over it
        // The answer is begun by the app, never by the service: the turn's own knowledge is searched
        // for and put in front of the seat first, and only then is the answer created — so AI 1
        // answers from the app's own knowledge rather than from its own memory. A person who speaks
        // over it still stops it, exactly as before.
        turn_detection: {
          type: 'server_vad',
          create_response: false,
          interrupt_response: true,
          silence_duration_ms: 700,
        },
      },
      output: { voice: VOICE },
    },
  };
}

/** The credential the browser opens the call with: made from the account's key, never the key. */
function makeSession(apiKey: string, session: any) {
  return fetch(SESSION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ session }),
    // a service that says nothing in its own time is one this call does without, rather than a tap
    // left waiting on it
    signal: AbortSignal.timeout(20000),
  });
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    // Who is signed in is never what holds a call back: the home screen is open to a visitor, and the
    // voices it hands over to open for one too. The read below is only so the app's own client is what
    // reads the saved rules, and a session that cannot be read is simply nobody signed in.
    try {
      await base44.auth.me();
    } catch (err) {
      // nobody is signed in on this device: the call still opens
    }

    // AI 1 answers on its own OpenAI account, kept in its own secret: the key the seat's calls are
    // made from is this one, and the account behind it is what the home call's first voice speaks on.
    const apiKey = secrets.get('OPENAI_API_KEY2');
    if (!apiKey) return Response.json({ error: NO_KEY });

    // the app's own rules for this call, whole, within the room a session can hold
    let instructions = OPENING;
    try {
      const { stamp, saved } = await loadSavedMaterial(base44, DOC_ROOM);
      const block = appRulesBlock(saved, stamp, RULES_ROOM);
      if (block) instructions = `${OPENING}\n\n${block}`;
      // A block that has filled its room gave something up — the admin's document goes first — and
      // what the seat answers from is then a part of the material rather than the whole of it. It is
      // said here rather than left to be guessed at when an answer comes back thin.
      if (block.length >= RULES_ROOM) {
        console.warn(
          `AI 1's rules filled their room (${block.length} of ${RULES_ROOM} characters): the admin's document is the part that gave way.`
        );
      }
    } catch (error: any) {
      // the rules are never a reason a call fails to open: the seat answers from the guide it already
      // carries, and what could not be read is written in the app's own logs
      console.error("The app's rules could not be read for AI 1's call:", error?.message);
    }

    // the reader is pointed at the admin's own words before it listens, so a Kibembe turn comes back
    // in the app's own letters rather than as the English or Kiswahili word it sounds like
    const { terms } = await earsKnowledge(base44).catch(() => ({ terms: [] }));
    const prompt = earsPrompt(terms).slice(0, TRANSCRIBE_PROMPT_MAX);

    let response = await makeSession(apiKey, sessionFor(instructions, prompt, TRANSCRIBE_MODEL));
    let data: any = await response.json().catch(() => ({}));
    // An account not allowed the newer reader is read by the older one: the same turn written in the
    // same letters, rather than a call that never opens over which model wrote it down.
    if (!response.ok && /model|not found|unsupported|invalid/i.test(String(data?.error?.message || ''))) {
      response = await makeSession(apiKey, sessionFor(instructions, prompt, TRANSCRIBE_FALLBACK));
      data = await response.json().catch(() => ({}));
    }
    if (!response.ok) {
      // the reason stays in the app's own logs, and only a short, key-free wording of it is passed on
      const detail = String(data?.error?.message || '').slice(0, 160);
      console.error(
        "AI 1's credential could not be made:",
        response.status,
        JSON.stringify(data).slice(0, 400),
      );
      return Response.json({
        error: detail ? `${REFUSED} (${response.status}: ${detail})` : `${REFUSED} (${response.status})`,
      });
    }

    // the GA response hands the credential back as `value`; the older shape nests it as client_secret
    const client_secret = String(data?.value || data?.client_secret?.value || '').trim();
    if (!client_secret) {
      console.error("AI 1's credential came back empty.");
      return Response.json({ error: REFUSED });
    }

    return Response.json({ client_secret, model: MODEL });
  } catch (error: any) {
    console.error("AI 1's session failed:", error?.message);
    return Response.json({ error: REFUSED }, { status: 500 });
  }
}