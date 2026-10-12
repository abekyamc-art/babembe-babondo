/**
 * GLOIRE AI — THE EXAMINATION: the animals Gloire taught on 12 October 2026.
 *
 * This is a set of its own, taught on one day and kept apart from every earlier animal vocabulary: an
 * animal that was not spoken in that lesson stands nowhere here. Every spelling below is the form that
 * was spoken then, written exactly as it came out — its accents, its apostrophes, its capitals and its
 * spaces kept as they are, and never tidied up — and the Kiswahili beside it is the name the animal was
 * taught under.
 *
 * Where the lesson gave a plural, it stands with its animal, and the pair is asked both ways. Where a
 * form was corrected in the same lesson, the form that stood before it is kept with the record, so a
 * correction replaces a form without losing it. The rule of the plural is the one taught that day: a
 * name beginning with a vowel takes to-, and a name beginning with a consonant takes ma-; and the form
 * that was really spoken always stands above the pattern.
 */

/** The dated set itself: what it is called, when it was taught, and where it came from. */
export const ANIMAL_SET = {
  title: "Gloire Sadiki — Kibembe Animals: Today's Set",
  taught_on: '12 October 2026',
  status: "User-taught set from today only — keep it apart from all earlier animal vocabulary",
  source: "Gloire Sadiki: Kibembe Animals / seti ya leo (12 October 2026)",
  rule:
    'A name beginning with a vowel (A, E, I, O, U) takes the plural pattern to-. ' +
    'A name beginning with a consonant takes the plural pattern ma-. ' +
    'The exact spoken form always has priority over the pattern.',
};

/**
 * The animals of the lesson: the Kibembe name as it was spoken, the Kiswahili name it was taught
 * under, and the English it stands for. A form corrected in the lesson is said in its own row rather
 * than quietly replaced.
 */
export const ANIMAL_ROWS = [
  { kb: 'oo', sw: 'Kuku', en: 'chicken' },
  { kb: 'anyoni', sw: 'Ndege', en: 'bird' },
  { kb: 'ngwena', sw: 'Mamba', en: 'crocodile' },
  { kb: 'oo ya nlumi', sw: 'Jogoo', en: 'rooster' },
  { kb: "oo ya m'achi", sw: 'Kuku wa kike', en: 'hen' },
  { kb: 'ngolo be', sw: 'Nguruwe', en: 'pig' },
  { kb: 'MMO o', sw: 'Kondoo', en: 'sheep' },
  { kb: 'Mbúchi', sw: 'Mbuzi', en: 'goat' },
  { kb: 'Púnda', sw: 'Farasi', en: 'horse' },
  { kb: 'púnda', sw: 'Púnda', en: 'donkey' },
  { kb: 'i bata', sw: 'Bata', en: 'duck' },
  { kb: 'njiwa', sw: 'Njiwa', en: 'dove' },
  { kb: 'Tambwe', sw: 'Simba', en: 'lion' },
  { kb: 'ndioku', sw: 'Tembo', en: 'elephant' },
  { kb: 'amba', sw: 'Nyani', en: 'monkey' },
  { kb: 'sokomutu', sw: 'Sokwe', en: 'chimpanzee' },
  { kb: 'eboko', sw: 'Kiboko', en: 'hippopotamus' },
  { kb: 'ifaru', sw: 'Kifaru', en: 'rhinoceros' },
  { kb: 'amungu', sw: 'Fisi', en: 'hyena' },
  { kb: 'ndili', sw: 'Kobe', en: 'tortoise' },
  { kb: 'yola', sw: 'Chura', en: 'frog' },
  { kb: 'balene', sw: 'Papa', en: 'shark' },
  { kb: 'mbulu-suele', sw: 'Mjusi', en: 'lizard' },
  { kb: 'kasuku', sw: 'Kasuku', en: 'parrot' },
  { kb: 'asole', sw: 'Panya', en: 'rat' },
  { kb: 'popo', sw: 'Popo', en: 'bat' },
  { kb: 'ngioi', sw: 'Nyuki', en: 'bee' },
  { kb: 'ebebechi', sw: 'Kipepeo', en: 'butterfly' },
  { kb: 'lobo', sw: 'Mbu', en: 'mosquito' },
  { kb: 'bonyekele', sw: 'Siafu', en: 'army ant' },
];

/**
 * The animals whose singular and plural were both spoken in the lesson. Only these are asked as a
 * plural: what was said is asked, and nothing is worked out from the pattern in its place.
 */
export const ANIMAL_PLURALS = [
  { kb: 'oo', plural: 'ma oo', sw: 'Kuku', en: 'chicken' },
  { kb: 'anyoni', plural: "to'nyoni", sw: 'Ndege', en: 'bird' },
  { kb: 'ngwena', plural: 'mangwena', sw: 'Mamba', en: 'crocodile' },
];

/**
 * The forms a later correction of the same lesson replaced, kept with the record they once belonged to
 * so an older form can still be traced back to.
 */
export const ANIMAL_REVISIONS = {
  sokomutu: [
    { at: '2026-10-12', term: 'amba', meaning: 'Sokwe — the form that stood before today and is now Nyani' },
  ],
  ndili: [{ at: '2026-10-12', term: 'kobe', meaning: 'Kobe — the earlier spoken form, corrected today' }],
};

/** What an animal is called where a question or a choice names it: the Kiswahili name, its English beside it. */
export function animalName(row) {
  return row.en ? `${row.sw} (${row.en})` : row.sw;
}

/** The plural that belongs to an animal, where the lesson spoke one. */
export function animalPlural(row) {
  return ANIMAL_PLURALS.find((pair) => pair.kb === row.kb) || null;
}