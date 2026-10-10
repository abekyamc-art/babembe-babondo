import { secrets } from 'base44:runtime';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { appRulesBlock } from '../../shared/cartesiaRules.ts';
import { loadSavedMaterial } from '../../shared/voiceRules.ts';
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
 * session can carry. Everything the block says is already in front of it, so it answers from it there
 * and then — and nothing is ever invented, because the only words it may speak are the confirmed ones.
 */

// the model the call runs on, and the voice that speaks it
const MODEL = 'gpt-realtime';
// the voice that speaks it: the deeper of the two the service gave this model, so the first voice of
// the call is a man's — and this seat is only reached where AI 1's own voice has not been set up yet
const VOICE = 'cedar';
const SESSION_URL = 'https://api.openai.com/v1/realtime/client_secrets';

// How much of the app's own rules the session carries, and how much of the admin's document rides in
// them. A session reads its instructions from the front, so everything past the room is lost: what
// gives way is the document, and never the guide, the saved answers or the confirmed words.
const RULES_ROOM = 24000;
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
  'Everything this app holds for this call is written below and is already in front of you: the guide,',
  'the saved answers and the confirmed words. Answer from them here and now — nobody is being asked for',
  'anything and no turn is being handed anywhere — and never say that something is being looked up.',
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
        turn_detection: {
          type: 'server_vad',
          create_response: true,
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