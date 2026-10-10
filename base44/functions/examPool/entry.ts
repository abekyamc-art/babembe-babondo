import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

/**
 * The confirmed words the examination asks about, read straight out of the app's own knowledge
 * document — the one place the language stands confirmed.
 *
 * Nothing is invented here: a pair is taken only where the document itself writes the Kibembe form
 * beside its meaning, and the section it stands under is kept with it, so the body and health terms are
 * told from the words of every day. The document is read with the service role because it belongs to the
 * admin, and only the pairs themselves are handed back to a signed-in student.
 */
const HEADING = /^[A-Z][A-Z0-9 &'’\-()/.]{4,70}$/;
const REFUSE = /[=→{}<>]|\bRULE\b|\bAssistant\b|\bUser\b|\bOutput\b|\bMODE\b|\bUse this\b|\bDo not\b|\bExample\b/i;

/** Every pair the document writes: a list line, the Kibembe form, a dash, the meaning. */
function pairsFrom(text) {
  const out = [];
  const seen = new Set();
  let section = '';
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    const hit = line.match(/^[-•*]\s+(.+?)\s+[—–]\s+(.+)$/);
    if (!hit) {
      if (!line.startsWith('-') && HEADING.test(line)) section = line;
      continue;
    }
    const kb = hit[1].replace(/^["“]|["”]$/g, '').trim();
    const en = hit[2].replace(/^["“]|["”]$/g, '').trim();
    if (!kb || !en || kb.length > 60 || en.length > 90) continue;
    if (REFUSE.test(`${kb} ${en}`) || /^[A-Z\s]{6,}$/.test(kb)) continue;
    const key = kb.toLowerCase().replace(/[.?!\s]+$/, '');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push([kb, en, section]);
  }
  return out;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const held = await base44.asServiceRole.entities.KnowledgeDoc.filter({ key: 'main' }, { limit: 40 });
    const rows = Array.isArray(held) ? held : held?.items || [];
    const published = rows
      .filter((row) => row.kind === 'published')
      .sort((a, b) => (a.part || 0) - (b.part || 0));
    const state = rows.find((row) => row.kind === 'state') || {};
    const pairs = pairsFrom(published.map((row) => row.text || '').join('\n'));

    if (!pairs.length) {
      return Response.json({ error: 'The knowledge document holds no confirmed word pairs yet.' }, { status: 409 });
    }
    return Response.json({ version: state.published_at || '', pairs });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}