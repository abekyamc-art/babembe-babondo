/**
 * What he has already said, handed back to him whenever a session opens afresh.
 *
 * A connection is not a conversation: he may be met again half-way through the
 * same talk, so the lines he has already given travel with every new session,
 * together with the fact that he has already introduced himself.
 */
const MAX_LINES = 6;
// a very short opening line would match the start of half of everything he says
const PREFIX_MIN = 12;

function normalise(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** The note that carries the conversation so far into a session that starts fresh. */
export function buildMemory(lines) {
  const said = (lines || []).map((line) => String(line || "").trim()).filter(Boolean);
  if (!said.length) return "";

  const quoted = said.slice(-MAX_LINES).map((line) => `"${line}"`).join(", ");
  return (
    "Kumbuka: umekwisha jitambulisha katika mazungumzo haya, hivyo usijitambulishe tena. " +
    `Pia umekwisha sema maneno haya: ${quoted}. ` +
    "Usirudie maneno hayo wala jambo lile lile ulilokwisha lisema — sema jambo jipya tu. " +
    "Fuata lugha aliyotumia mtu, kuanzia neno lako la kwanza: Kiswahili akisema, jibu kwa Kiswahili, neno la Ebembe linalofaa likiwa ndani ya sentensi; Ebembe akisema, neno la Ebembe kwanza kisha ufafanuzi mfupi kwa Kiswahili; Kiingereza kidogo tu ikiwa mtu amekwisha kusema Kiingereza. Usimwombe arudie."
  );
}

/** True when a line that has just arrived is his opening line coming round again. */
export function isRepeatIntro(text, intro) {
  const said = normalise(text);
  const opening = normalise(intro);
  if (!said || !opening) return false;
  if (said === opening) return true;
  if (opening.length < PREFIX_MIN) return false;
  return said.startsWith(opening) || opening.startsWith(said);
}