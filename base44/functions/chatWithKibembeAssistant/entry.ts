import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

// The model that answers, and the bounds on one turn: a message is never longer than a
// paragraph, and an answer is never longer than a few sentences.
const MODEL = 'gpt-4o-mini';
const MAX_MESSAGE = 2000;
const MAX_REPLY_TOKENS = 400;

// The assistant's own standing orders: the Word Bank is read before every answer, and nothing
// Kibembe is ever written that the Word Bank does not confirm.
const INSTRUCTIONS = [
  'You are the Kibembe assistant of Village Voice, a helper for the Kibembe (Ebembe) language.',
  'Before you answer, read the Kibembe Word Bank in the attached file search store: search it for',
  'every Kibembe word, meaning, spelling, grammar pattern and pronunciation that your answer uses.',
  'Rules:',
  '- Answer in Kibembe (Ebembe) only. Never mix in English, Kiswahili, French or any other language.',
  '- Use only words, meanings and grammar the Word Bank confirms. Never invent, guess, translate or',
  '  re-spell a Kibembe word, and never state a pronunciation the Word Bank does not carry.',
  '- If the Word Bank does not confirm what was asked, say briefly in Kibembe that you do not have it,',
  '  instead of guessing.',
  '- Keep the reply to one or two plain sentences.',
  '- Write plain text only: no headings, no lists, no markdown, and nothing about your own working.',
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

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        instructions: INSTRUCTIONS,
        input: message,
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
    return Response.json({ reply });
  } catch (error) {
    console.error('The Kibembe assistant failed:', error?.message);
    return Response.json({ error: NO_REPLY }, { status: 500 });
  }
}