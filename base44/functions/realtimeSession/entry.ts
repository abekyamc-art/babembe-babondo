import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { earsKnowledge, earsPrompt } from '../../shared/openAiEars.ts';

/**
 * The voice call's own credential. The browser never sees the account's OpenAI key: it asks here,
 * on the server, for a short-lived credential made from that key, and the key itself stays in
 * Secrets and never leaves this function.
 *
 * Nothing of the assistant's rules or its Word Bank is here. The answers are always written by
 * chatWithKibembeAssistant, read from the Word Bank, and this session only speaks them.
 */

// the voice model the call runs on, and the voice that speaks it
const MODEL = 'gpt-realtime';
const VOICE = 'marin';

// The session reads, it never converses. It is set here, on the server, as the session is made:
// voice activity only decides that a person's turn has ended, and it never starts an answer of its
// own — every answer is written first by chatWithKibembeAssistant, read from the Kibembe Word Bank,
// and handed to this session only to be read aloud exactly as it was written.
const INSTRUCTIONS = [
  'You are only a voice. You never answer questions, never translate, never explain, never greet,',
  'never introduce yourself and never comment on anything.',
  'Every message you receive has already been written and verified for you. Read that message aloud',
  'exactly as it is written — the same words, in the same order, in the same language — and then stop.',
  'Add nothing, remove nothing, change nothing, and never speak in any other language.',
].join(' ');

const SESSION_URL = 'https://api.openai.com/v1/realtime/client_secrets';

// Every spoken turn of this call is written down by OpenAI too: the same reader the other voice
// features listen through, pointed at the admin's own words before it listens. Kiswahili is the
// nearest language the reader knows, so the person's Kibembe comes back as Bantu sounds — the
// sounds the saved words are written in — instead of being forced into English nobody spoke.
const TRANSCRIBE_MODEL = 'gpt-4o-transcribe';
const TRANSCRIBE_FALLBACK = 'whisper-1';
const TRANSCRIBE_LANG = 'sw';
// as much of the app's own spelling as this session's own reader is handed
const TRANSCRIBE_PROMPT_MAX = 400;

function sessionFor(prompt: string, model: string) {
  return {
    type: 'realtime',
    model: MODEL,
    instructions: INSTRUCTIONS,
    audio: {
      input: {
        transcription: {
          model,
          language: TRANSCRIBE_LANG,
          ...(prompt ? { prompt } : {}),
        },
        turn_detection: {
          type: 'server_vad',
          create_response: false,
          interrupt_response: false,
          silence_duration_ms: 700,
        },
      },
      output: { voice: VOICE },
    },
  };
}

/** The credential the browser opens the call with: made from the account's key, never the key. */
function makeSession(apiKey: string, prompt: string, model: string) {
  return fetch(SESSION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ session: sessionFor(prompt, model) }),
  });
}

const NO_KEY = 'The voice service is not connected yet — an admin needs to add the OpenAI key.';
const REFUSED = 'The voice service refused to open a call.';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = secrets.get('OPENAI_API_KEY');
    if (!apiKey) return Response.json({ error: NO_KEY });

    // the reader is pointed at the admin's own words before it listens, so a Kibembe turn comes
    // back in the app's own letters rather than as the English or Kiswahili word it sounds like
    const { terms } = await earsKnowledge(base44).catch(() => ({ terms: [], rows: [] }));
    const prompt = earsPrompt(terms).slice(0, TRANSCRIBE_PROMPT_MAX);

    let response = await makeSession(apiKey, prompt, TRANSCRIBE_MODEL);
    let data: any = await response.json().catch(() => ({}));
    // An account not allowed the newer reader is read by the older one: the same turn written in
    // the same letters, rather than a call that never opens over which model wrote it down.
    if (!response.ok && /model|not found|unsupported|invalid/i.test(String(data?.error?.message || ''))) {
      response = await makeSession(apiKey, prompt, TRANSCRIBE_FALLBACK);
      data = await response.json().catch(() => ({}));
    }
    if (!response.ok) {
      // the reason stays in the app's own logs, and only a short, key-free wording of it is passed on
      const detail = String(data?.error?.message || '').slice(0, 160);
      console.error(
        'The voice credential could not be made:',
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
      console.error('The voice credential came back empty.');
      return Response.json({ error: REFUSED });
    }

    return Response.json({
      client_secret,
      expires_at: data?.expires_at || 0,
      model: MODEL,
    });
  } catch (error: any) {
    console.error('The voice session could not be started:', error?.message);
    return Response.json({ error: REFUSED }, { status: 500 });
  }
}