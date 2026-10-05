import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

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

const SESSION = {
  type: 'realtime',
  model: MODEL,
  instructions: INSTRUCTIONS,
  audio: {
    input: {
      transcription: { model: 'whisper-1' },
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

const NO_KEY = 'The voice service is not connected yet — an admin needs to add the OpenAI key.';
const REFUSED = 'The voice service refused to open a call.';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = secrets.get('OPENAI_API_KEY');
    if (!apiKey) return Response.json({ error: NO_KEY });

    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session: SESSION }),
    });

    const data: any = await response.json().catch(() => ({}));
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