import { ANIMAL_PLURALS, ANIMAL_ROWS, ANIMAL_SET } from "./examAnimals";

/**
 * GLOIRE AI — THE EXAMINATION: the teaching sets of 12 October 2026, kept as Gloire taught them.
 *
 * Every Kibembe form below stands exactly as it was taught — its spaces, its apostrophes, its hyphens,
 * its capitals and the mark the lesson wrote at its end — and the Kiswahili and the English beside it
 * are the words it was taught under. Nothing is tidied up, nothing is moved and nothing is invented: a
 * word that was not taught that day stands nowhere here.
 *
 * Two things are read off one record. A set's own page in the examination shows it as it was written,
 * so the lesson can be read before it is asked; and the papers of the seasons cut from it are built out
 * of the same rows, so what a student is asked is what the lesson holds. The mark the lesson wrote at
 * the end of a form — `?` for a question's final rise, `.` for a calm falling statement, `!` for
 * emphasis — says how the form is said rather than how it is spelled: it is kept here, and left out of
 * a question's own line, where it would read as the question's punctuation.
 *
 * The animals of that same lesson stand as a season of their own — the season of the names of the world
 * — and the lesson is kept here as the reading that season is studied on, so all four sets taught on
 * 12 October 2026 can be read in the examination itself.
 *
 * The food board of that lesson was taught in Kiswahili alone, so the English beside each of its foods is
 * the examination's own English name for it — added for the seasons of the sets, which are asked in
 * Kibembe and English. The Kiswahili the lesson was taught under stands beside it untouched, exactly as
 * it was taught.
 */

/** A form stripped of the sound mark the lesson wrote at its end, never of anything else. */
export function marksOff(text) {
  return String(text || "").replace(/[.?!]+$/, "").trim();
}

/** The Kiswahili a pair was taught under, with the English the lesson gave beside it where it gave one. */
export function taughtMeaning(row) {
  if (!row) return "";
  const sw = marksOff(row.sw);
  const en = marksOff(row.en);
  if (!en || en === sw) return sw;
  return `${sw} (${row.en ? row.en.trim() : en})`;
}

/** The animals of the lesson, read off the season's own record of them. */
const ANIMAL_READING = {
  id: "animals",
  title: ANIMAL_SET.title,
  english: "The names of the world",
  taught_on: ANIMAL_SET.taught_on,
  source: ANIMAL_SET.source,
  note: ANIMAL_SET.status,
  rules: [ANIMAL_SET.rule],
  sections: [
    {
      title: "Wanyama wa somo la leo",
      label: "Animals",
      rows: ANIMAL_ROWS.map((row) => ({ kb: row.kb, sw: row.sw, en: row.en })),
    },
    {
      title: "Jozi zilizosemwa pamoja",
      label: "Singular and plural",
      rows: ANIMAL_PLURALS.map((pair) => ({
        kb: `${pair.kb} → ${pair.plural}`,
        sw: pair.sw,
        en: pair.en,
      })),
    },
  ],
  asides: [
    {
      title: "Marekebisho ya somo la leo",
      text: "amba → sokomutu (Sokwe), na kobe → ndili (Kobe). Umbo lililotangulia linahifadhiwa katika kumbukumbu ya somo.",
    },
  ],
};

/** The sets themselves, in the order they were taught on 12 October 2026. */
export const TEACHING_SETS = [
  {
    id: "watu",
    title: "Watu, mahali na kazi",
    english: "People, place and work",
    taught_on: "12 October 2026",
    source: "Gloire Sadiki — Kibembe Voice-Captured Set, 12 October 2026",
    note: "Maneno yaliyofundishwa moja kwa moja na Gloire kwa sauti.",
    rules: [
      "Andika Kibembe kwa umbo la kawaida; hakuna matamshi ya Kiingereza na hakuna kugawa neno kwa kubahatisha.",
      "Nafasi, apostrofi na hyphen zimehifadhiwa kama zilivyofundishwa — mfano `Mu-mo-i-ana-ole`.",
      "`?` ni swali lenye mpandio wa mwisho; `.` ni kauli yenye kushuka kwa utulivu; `!` ni msisitizo.",
      "Alama ya toni haijaongezwa mahali ambapo Gloire hakuifundisha moja kwa moja.",
    ],
    sections: [
      {
        title: "Mtu na utambulisho",
        label: "Who we are",
        rows: [
          { sw: "wewe", en: "you — singular", kb: "Obe." },
          { sw: "ninyi", en: "you all — plural", kb: "Ibeni." },
          { sw: "Wewe ni nani?", en: "Who are you?", kb: "Obe olebeni?" },
          { sw: "Ninyi ni akina nani?", en: "Who are you all?", kb: "Benu muleba beni?" },
          { sw: "Mimi ni nani?", en: "Who am I?", kb: "Ine nile beni?" },
        ],
      },
      {
        title: "Mahali na makazi",
        label: "Where we live",
        rows: [
          { sw: "Niko wapi?", en: "Where am I?", kb: "Ni le ole?" },
          { sw: "Tuko wapi?", en: "Where are we?", kb: "Tole ole?" },
          { sw: "Yeye yuko wapi?", en: "Where is he or she?", kb: "Ewe ale ole?" },
          { sw: "Wao wako wapi?", en: "Where are they?", kb: "Ebo bale ole?" },
          { sw: "Kiko wapi?", en: "Where is it?", kb: "Ele ole?" },
          { sw: "Unaishi wapi?", en: "Where do you live?", kb: "Umuiana ole?" },
          { sw: "Unaishi wapi?", en: "Where do you live?", kb: "Umukanda ole?" },
          { sw: "Unaishi wapi?", en: "Where do you live?", kb: "Umuishi ole?" },
          { sw: "Mnaishi wapi?", en: "Where do you all live?", kb: "Mu-mo-i-ana-ole?" },
        ],
      },
      {
        title: "Kazi na mahitaji",
        label: "Work and needs",
        rows: [
          { sw: "Ninahitaji kazi", en: "I need a job", kb: "Na taka achi." },
          { sw: "Ninahitaji kazi", en: "I need a job", kb: "Ni mo londa achi." },
          { sw: "Ninahitaji kupata kazi", en: "I need to get a job", kb: "Ni mo taka ipata achi." },
          { sw: "Unahitaji kazi", en: "You need a job", kb: "Wa taka ipata achi." },
          { sw: "Unahitaji kazi", en: "You need a job", kb: "Wa taka achi." },
          { sw: "Unahitaji kupata kazi", en: "You need to get a job", kb: "Wa taki wa ipata achi." },
          { sw: "Ninyi mnahitaji kazi", en: "You all need jobs", kb: "Benu boze mwa-onda achi." },
          { sw: "Ninyi mnahitaji kazi", en: "You all need jobs", kb: "Benu boze mwa taka achi." },
          { sw: "Ninyi mnahitaji kazi", en: "You all need jobs", kb: "Benu boze mwa itaji achi." },
          { sw: "Yeye anahitaji kazi", en: "He or she needs a job", kb: "A-onda achi." },
          { sw: "Yeye anahitaji kazi", en: "He or she needs a job", kb: "Ataka achi." },
          { sw: "Yeye anahitaji kupata kazi", en: "He or she needs to get a job", kb: "Ataka ipata achi." },
          { sw: "Tunahitaji kazi", en: "We need jobs", kb: "Twa taka achi." },
          { sw: "Wao wanahitaji kazi", en: "They need jobs", kb: "Ba taka achi." },
          { sw: "Ninahitaji kupata kazi", en: "I need to get a job", kb: "Na taka ipata achi." },
          { sw: "Nina kazi", en: "I have a job", kb: "Ni e te achi." },
          { sw: "Sina kazi", en: "I do not have a job", kb: "Shi e te achi." },
          { sw: "Una kazi?", en: "Do you have a job?", kb: "O e te achi?" },
          { sw: "Una kazi?", en: "Do you have a job?", kb: "Omotumia achi?" },
        ],
      },
      {
        title: "Kufanya kazi na kwenda kazini",
        label: "At work",
        rows: [
          { sw: "Ninafanya kazi", en: "I work", kb: "Ni mo amba." },
          { sw: "Ninafanya kazi", en: "I work", kb: "Ni motumia achi." },
          { sw: "Ninafanya kazi", en: "I work", kb: "Ni e motumii a." },
          { sw: "Unafanya kazi", en: "You work", kb: "O mu e te achi." },
          { sw: "Unafanya kazi", en: "You work", kb: "O mu amba achi." },
          { sw: "Tunafanya kazi", en: "We work", kb: "Tomu e te achi." },
          { sw: "Wao wanafanya kazi", en: "They work", kb: "Ba mu e te achi." },
          { sw: "Unafanya kazi wapi?", en: "Where do you work?", kb: "O mu e te achi ole?" },
          { sw: "Unafanya kazi wapi?", en: "Where do you work?", kb: "O motumi ela achi ole?" },
          { sw: "Ninaenda kazini", en: "I am going to work", kb: "Ni mo oya o achi." },
          { sw: "Ninaenda kazini", en: "I am going to work", kb: "Na aya o achi." },
          { sw: "Unaenda kazini", en: "You are going to work", kb: "O mu oya o achi." },
          { sw: "Unaenda kufanya kazi wapi?", en: "Where are you going to work?", kb: "O mo yo e te la achi ole?" },
        ],
      },
      {
        title: "Wakati uliopita — kuwa",
        label: "The time that passed",
        rows: [
          { sw: "Nilikuwa", en: "I was", kb: "ni-bile." },
          { sw: "Ulikuwa", en: "You were", kb: "o-bile." },
          { sw: "Alikuwa", en: "He or she was", kb: "a-bile." },
          { sw: "Tulikuwa", en: "We were", kb: "to-bile." },
          { sw: "Walikuwa", en: "They were", kb: "ba-bile." },
        ],
      },
    ],
    asides: [
      {
        title: "Kumbuka",
        text: "Maneno yenye maana moja yalifundishwa kwa maumbo kadhaa — kwa mfano `Unaishi wapi?` kwa `Umuiana ole?`, `Umukanda ole?` na `Umuishi ole?`. Kila umbo linaulizwa, na maana yake ni ile ile.",
      },
    ],
  },
  {
    id: "chakula",
    title: "Chakula, mboga na matunda",
    english: "Food, greens and fruit",
    taught_on: "12 October 2026",
    source: "Gloire Sadiki — Kibembe Food Teaching Board, Batch 1, 12 October 2026",
    note: "Vyakula vilivyofundishwa kwa sauti na kuthibitishwa na Gloire katika somo la 12 Oktoba 2026.",
    rules: [
      "Maneno yamehifadhiwa kama yalivyosemwa: hakuna alama ya toni, hyphen au tahajia iliyoongezwa.",
      "Chakula kilichokwisha thibitishwa hakirudiwi katika seti hii.",
      "Chakula ambacho hakikufundishwa kwenye sauti hii hakijaongezwa.",
      "Marekebisho ya baadaye ya Gloire yanachukua nafasi ya umbo la awali.",
    ],
    sections: [
      {
        title: "Mboga za majani",
        label: "The greens",
        rows: [
          { sw: "Sukuma wiki", kb: "mchicha", en: "Collard greens" },
          { sw: "Mchicha", kb: "lenga lenga", en: "Amaranth greens" },
          { sw: "Spinachi / spinach", kb: "spinach", en: "Spinach" },
          { sw: "Kisamvu", kb: "alala", en: "Cassava leaves" },
          { sw: "Matembele", kb: "bitlele", en: "Sweet potato leaves" },
          { sw: "Mlenda", kb: "mlenda", en: "Jute mallow" },
          { sw: "Majani ya kunde", kb: "bisashibia unde", en: "Cowpea leaves" },
          { sw: "Kabichi", kb: "shu", en: "Cabbage" },
        ],
      },
      {
        title: "Vyakula na viungo",
        label: "Food and spices",
        rows: [
          { sw: "Mayai", kb: "make", en: "Eggs" },
          { sw: "Maziwa", kb: "maziwa", en: "Milk" },
          { sw: "Mkate", kb: "mkate", en: "Bread" },
          { sw: "Viazi", kb: "bikiombo", en: "Potatoes" },
          { sw: "Viazi vitamu", kb: "bikiombo bialeshe", en: "Sweet potatoes" },
          { sw: "Ndizi za kupika", kb: "ndeu chitea", en: "Cooking bananas" },
          { sw: "Ndizi za kupika", kb: "bisakila", en: "Cooking bananas" },
          { sw: "Pilipili", kb: "pelepele", en: "Chilli" },
          { sw: "Vitunguu / vitunguu saumu", kb: "swaumu", en: "Onions / garlic" },
          { sw: "Vitunguu / vitunguu saumu", kb: "vitongolo swaumu", en: "Onions / garlic" },
          { sw: "Tangawizi", kb: "tangawizi", en: "Ginger" },
          { sw: "Karoti", kb: "karoti", en: "Carrot" },
        ],
      },
      {
        title: "Matunda na vinywaji",
        label: "Fruit and drink",
        rows: [
          { sw: "Embe", kb: "embe", en: "Mango" },
          { sw: "Chungwa", kb: "chungwa", en: "Orange" },
          { sw: "Nanasi", kb: "nanasi", en: "Pineapple" },
          { sw: "Tikiti maji", kb: "tikiti maji", en: "Watermelon" },
          { sw: "Limao", kb: "limao", en: "Lemon" },
          { sw: "Chai", kb: "chai", en: "Tea" },
          { sw: "Kahawa", kb: "kahawa", en: "Coffee" },
          { sw: "Juice", kb: "juice", en: "Juice" },
          { sw: "Soda", kb: "soda", en: "Soda" },
        ],
      },
    ],
    asides: [
      {
        title: "Zilizokwisha thibitishwa — hazirudiwi",
        text: "Samaki — `Heswe` / `Eswe`; Nyama; Muhogo; Mahindi; Maharagwe; Wali; Karanga; Ndizi; Nyanya; Vitunguu; Mafuta ya kupikia; Chumvi; Sukari; Ugali; Uji.",
      },
      {
        title: "Bado hazikufundishwa kwenye sauti hii",
        text: "Bamia, Matango, Parachichi.",
      },
    ],
  },
  ANIMAL_READING,
];

/** One set, by the name it goes by. */
export function setById(id) {
  return TEACHING_SETS.find((set) => set.id === id) || null;
}

/** Every pair a set holds, each one carrying the name of the part of the lesson it belongs to. */
export function pairsOf(id) {
  const set = setById(id);
  if (!set) return [];
  return set.sections.flatMap((section) =>
    section.rows
      .filter((row) => row.kb && row.sw)
      .map((row) => ({ ...row, part: section.title, label: section.label || section.title }))
  );
}