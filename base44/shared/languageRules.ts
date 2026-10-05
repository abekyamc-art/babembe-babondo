/**
 * Who the assistant is talking to, and in what language it answers.
 *
 * One text, read by every assistant the app runs itself — the Kibembe chat and its voice, the
 * written answers of Base44 mode, and the knowledge note the outside voices are handed before a
 * turn — so the same words decide the language everywhere. Cartesia AI answers from its own
 * account and its own instructions and is never handed any of this.
 *
 * The language is read from the person's own words rather than from a phone setting:
 * - words of Kibembe and Kiswahili mixed together are Kibembe being spoken, not Kiswahili;
 * - a plain request for a language is followed, whatever language the words around it are in;
 * - a Kibembe speaker asking for Kiswahili news or a story is looked up in Kiswahili first and
 *   explained in Kibembe — unless they ask for it in Kiswahili, and then it is Kiswahili alone.
 */

// Maneno yake yakiwa mchanganyiko wa Kibembe na Kiswahili, ni Kibembe anachosema.
export const MIXED_LANGUAGE =
  '- MCHANGANYIKO WA KIBEMBE NA KISWAHILI: maneno yake yakiwa ya Kibembe na ya Kiswahili pamoja — hata Kiswahili kikiwa kingi — lugha yake ni KIBEMBE, si Kiswahili: jibu linaongozwa na Kibembe, na Kibembe ndicho kinachosomwa kwa sauti. Mchanganyiko huo si Kiswahili.';

// Ombi la wazi la lugha linafuatwa, hata maneno yake yakiwa ya lugha nyingine.
export const ASKED_LANGUAGE =
  '- OMBI LA WAZI LA LUGHA: mtu akisema wazi anataka lugha fulani — "niambie kwa Kiswahili", "answer in English", "kwa Kibembe" — fuata ombi hilo: lugha hiyo ndiyo inayoongoza jibu, hata kama maneno yake mwenyewe ni ya lugha nyingine.';

// Habari au hadithi ya Kiswahili: tafuta kwa Kiswahili, kisha eleza kwa Kibembe.
export const SWAHILI_REQUEST =
  '- HABARI AU HADITHI YA KISWAHILI: mtu aliyeongea Kibembe akiomba habari, hadithi au maelezo ya Kiswahili, tafuta kwa Kiswahili kwanza, kisha mweleze kwa KIBEMBE. Akiomba wazi kwamba iwe kwa Kiswahili, jibu liwe kwa KISWAHILI PEKEE.';

/** The three rules above as they ride with one answer. */
export const ANSWER_LANGUAGE = [MIXED_LANGUAGE, ASKED_LANGUAGE, SWAHILI_REQUEST].join("\n");

/**
 * Where the material of an answer came from, when the turn needed the internet. The search itself
 * is made by the app's own lookup, which hands the answer the material it found; these are the
 * rules the answer follows about saying where it came from — and about saying plainly that nothing
 * could be confirmed, rather than speaking as if a search had been made.
 */
export const SOURCE_RULES = [
  "- MAARIFA YA MTANDAONI: ombi ambalo maarifa yaliyohifadhiwa hayajibu — habari, hadithi ya nje, mtu ni nani, tukio, kitu kinachotokea sasa — litafutwe mtandaoni (Google) kabla ya jibu.",
  "- CHANZO NA KIUNGO: sema wazi kwamba jibu limetafutwa mtandaoni, taja chanzo chake jinsi kilivyoandikwa, na uandike kiungo (link) yake kamili. Vyanzo vinavyotegemewa: taasisi za habari zinazojulikana, taasisi rasmi, vyuo, ensaiklopidia — puuza uvumi na maneno yasiyothibitishwa.",
  "- TAFUTA ISIPOWEZEKANA: kama kutafuta hakukuwezekana, au hakuna kilichopatikana kwa uhakika, sema wazi kwamba hukupata taarifa ya kuthibitishwa. USISEME kwamba umetafuta wakati hukutafuta, na usibuni jibu.",
].join("\n");