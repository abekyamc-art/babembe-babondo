/**
 * GLOIRE AI — the daily-life examination: greetings and introductions, home and family, and everyday
 * errands.
 *
 * Every Kibembe form below stands exactly as the admin's own knowledge document confirms it — the
 * greetings and everyday conversation the document holds, and the words it files under people and the
 * home. The spelling, the accents, the capitalisation, the hyphens and the spaces are kept as they
 * were confirmed: nothing is replaced with another language's word and nothing is invented, and the
 * two wrong choices of every question are other confirmed forms and never a made-up one.
 *
 * A picture was drawn for every question, and each question shows its own.
 */

const PICTURE = "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/";

const shot = (file, scene, alt) => ({ url: `${PICTURE}${file}`, scene, alt });

/** How many questions one daily-life examination holds. */
export const LIFE_QUESTION_COUNT = 15;

/** The three parts of a person's day this examination covers. */
export const LIFE_TOPICS = {
  greet: "Greetings and introductions",
  home: "Home and family",
  errand: "Everyday errands",
};

/** One picture for each question, drawn for that question's own scene. */
const IMAGE = {
  morning: shot(
    "b21343cb3_generated_image.png",
    "Morning at home",
    "A person waking and stretching on a low bed beside an open window, in warm morning light."
  ),
  arriving: shot(
    "17f2a5b78_generated_image.png",
    "Arriving back",
    "Two people greeting warmly at the door of a house, one arriving with a small bag and the other stepping out with open arms."
  ),
  given: shot(
    "e041e8611_generated_image.png",
    "A gift received",
    "Two people close together, one handing a bowl of food to the other, whose hands are cupped in thanks."
  ),
  again: shot(
    "feb0b7c5a_generated_image.png",
    "Asking to hear it again",
    "Two people talking, the listener leaning in with a hand cupped behind an ear and a friendly, puzzled face."
  ),
  friends: shot(
    "2f18a65f1_generated_image.png",
    "Two friends together",
    "Two friends walking side by side on a village footpath, talking and laughing together."
  ),
  compound: shot(
    "02a1bc2a8_generated_image.png",
    "In the compound",
    "A man standing in a sunny compound with his hand on a young child's shoulder, a shade tree and a low house behind them."
  ),
  child: shot(
    "8ae912e60_generated_image.png",
    "Outside the house",
    "A young child sitting on a woven mat outside a house playing with a small carved toy, an adult watching from the doorway."
  ),
  house: shot(
    "d0c3d2eaa_generated_image.png",
    "The family home",
    "A family house seen from its swept courtyard: a thatched roof, plastered walls, a shade tree and a few chickens."
  ),
  water: shot(
    "8012618df_generated_image.png",
    "At the water point",
    "A woman pouring clear water from a jerrycan into a clay pot at a village water point."
  ),
  doorway: shot(
    "f50dfd70e_generated_image.png",
    "The doorway",
    "The wooden door of a plastered house standing a little open, with a woven mat and a small stool beside the step."
  ),
  market: shot(
    "ce179fcd8_generated_image.png",
    "The village market",
    "A lively open-air market with baskets of tomatoes and plantains and sellers seated beside their produce."
  ),
  paying: shot(
    "bbc64413d_generated_image.png",
    "At the market table",
    "Two hands exchanging plain paper notes and coins over a small market table with a basket of greens beside them."
  ),
  lifting: shot(
    "94ec8a82d_generated_image.png",
    "Lifting together",
    "Two people leaning in together to lift a heavy basket of produce onto one of their heads."
  ),
  unwell: shot(
    "02fa6e502_generated_image.png",
    "A sick day at home",
    "A person lying unwell under a light blanket with a damp cloth on the forehead, a relative seated close beside them."
  ),
  path: shot(
    "85cf1ae3c_generated_image.png",
    "Along the footpath",
    "A person walking along a red earth footpath toward a small roadside shop, carrying an empty woven bag."
  ),
};

/**
 * Every question of the examination. A pair is asked both ways where the confirming form allows it: the
 * Kibembe form for its meaning, and the meaning for its Kibembe form — the second only where that
 * meaning has one confirmed form and no second word of its own.
 */
const ROWS = [
  {
    id: "greet:sleep",
    topic: "greet",
    direction: "kb_to_en",
    kb: "Walolalabile",
    en: "How did you sleep?",
    wrong: ["Sleep well", "See you later"],
    image: IMAGE.morning,
    practice: [
      { en: "How did you sleep?", kb: "Walolalabile" },
      { en: "I slept well", kb: "Na lo lalabia ngeni" },
      { en: "Sleep well", kb: "O lale byangene" },
    ],
  },
  {
    id: "greet:welcome-back",
    topic: "greet",
    direction: "kb_to_en",
    kb: "Karibu lo nge",
    en: "Welcome back",
    wrong: ["Welcome home", "Goodbye / stay well"],
    image: IMAGE.arriving,
    practice: [
      { en: "Welcome back", kb: "Karibu lo nge" },
      { en: "Welcome home", kb: "Karibu umboka" },
    ],
  },
  {
    id: "greet:thanks",
    topic: "greet",
    direction: "kb_to_en",
    kb: "Nakanya",
    en: "Thank you",
    wrong: ["Okay / alright", "Please repeat"],
    image: IMAGE.given,
    practice: [
      { en: "Thank you", kb: "Nakanya" },
      { en: "Okay / alright", kb: "Sawa" },
      { en: "Yes", kb: "Ee ee" },
    ],
  },
  {
    id: "greet:repeat",
    topic: "greet",
    direction: "kb_to_en",
    kb: "Oto ela",
    en: "Please repeat",
    wrong: ["I do not know", "See you later"],
    image: IMAGE.again,
    practice: [
      { en: "Please repeat", kb: "Oto ela" },
      { en: "I do not know", kb: "Shi ke" },
    ],
  },
  {
    id: "greet:friend",
    topic: "greet",
    direction: "en_to_kb",
    kb: "esambo",
    en: "Friend",
    wrong: ["tata", "maha"],
    image: IMAGE.friends,
    practice: [
      { en: "Friend", kb: "esambo" },
      { en: "Father", kb: "tata" },
      { en: "Mother", kb: "maha" },
    ],
  },
  {
    id: "home:father",
    topic: "home",
    direction: "kb_to_en",
    kb: "tata",
    en: "Father",
    wrong: ["Mother", "Sister"],
    image: IMAGE.compound,
    practice: [
      { en: "Father", kb: "tata" },
      { en: "Mother", kb: "maha" },
      { en: "Sister", kb: "yane achi" },
    ],
  },
  {
    id: "home:child",
    topic: "home",
    direction: "kb_to_en",
    kb: "mwana",
    en: "Son / child",
    wrong: ["Friend", "Baby"],
    image: IMAGE.child,
    practice: [
      { en: "Son / child", kb: "mwana" },
      { en: "Baby", kb: "alenge" },
      { en: "Friend", kb: "esambo" },
    ],
  },
  {
    id: "home:house",
    topic: "home",
    direction: "kb_to_en",
    kb: "nyumba",
    en: "House / home",
    wrong: ["Door", "Bed"],
    image: IMAGE.house,
    practice: [
      { en: "House / home", kb: "nyumba" },
      { en: "Door", kb: "mlango" },
      { en: "Bed", kb: "engú" },
    ],
  },
  {
    id: "home:water",
    topic: "home",
    direction: "kb_to_en",
    kb: "maakie",
    en: "Water",
    wrong: ["Food", "Clothes"],
    image: IMAGE.water,
    practice: [
      { en: "Water", kb: "maakie" },
      { en: "Food", kb: "dilébúaa" },
      { en: "Clothes", kb: "múenda" },
    ],
  },
  {
    id: "home:door",
    topic: "home",
    direction: "en_to_kb",
    kb: "mlango",
    en: "Door",
    wrong: ["eyomba", "engú"],
    image: IMAGE.doorway,
    practice: [
      { en: "Door", kb: "mlango" },
      { en: "Room", kb: "eyomba" },
      { en: "Bed", kb: "engú" },
    ],
  },
  {
    id: "errand:market",
    topic: "errand",
    direction: "kb_to_en",
    kb: "So-o",
    en: "Market",
    wrong: ["Road", "Money"],
    image: IMAGE.market,
    practice: [
      { en: "Market", kb: "So-o" },
      { en: "Road", kb: "Ba-la-ba-la" },
      { en: "Money", kb: "Fa-langa" },
    ],
  },
  {
    id: "errand:money",
    topic: "errand",
    direction: "kb_to_en",
    kb: "Fa-langa",
    en: "Money",
    wrong: ["School", "Hospital"],
    image: IMAGE.paying,
    practice: [
      { en: "Money", kb: "Fa-langa" },
      { en: "School", kb: "Ma-somo" },
      { en: "Hospital", kb: "O-pi-ta-li" },
    ],
  },
  {
    id: "errand:help",
    topic: "errand",
    direction: "kb_to_en",
    kb: "M-ngwa-te-le-che",
    en: "Help me",
    wrong: ["Come", "Pay"],
    image: IMAGE.lifting,
    practice: [
      { en: "Help me", kb: "M-ngwa-te-le-che" },
      { en: "Come", kb: "Cha-uno" },
      { en: "Pay", kb: "Ilepa" },
    ],
  },
  {
    id: "errand:sick",
    topic: "errand",
    direction: "kb_to_en",
    kb: "Ni molwala",
    en: "I am sick",
    wrong: ["I am on my way", "I need medicine"],
    image: IMAGE.unwell,
    practice: [
      { en: "I am sick", kb: "Ni molwala" },
      { en: "I need medicine", kb: "Naonda dawa" },
      { en: "I am on my way", kb: "Ni le njela" },
    ],
  },
  {
    id: "errand:shop",
    topic: "errand",
    direction: "kb_to_en",
    kb: "Na ya osoo",
    en: "I am going to the shop",
    wrong: ["I am on my way", "I have no money"],
    image: IMAGE.path,
    practice: [
      { en: "I am going to the shop", kb: "Na ya osoo" },
      { en: "I am on my way", kb: "Ni le njela" },
      { en: "I have no money", kb: "Shiete falanga" },
    ],
  },
];

/** The same list, in a different order, so no examination repeats the last one. */
function shuffled(list) {
  const out = [...list];
  for (let at = out.length - 1; at > 0; at -= 1) {
    const pick = Math.floor(Math.random() * (at + 1));
    [out[at], out[pick]] = [out[pick], out[at]];
  }
  return out;
}

/** One question, with the correct answer standing wherever the shuffle has put it. */
function questionOf(row) {
  const askKibembe = row.direction === "en_to_kb";
  const right = askKibembe ? row.kb : row.en;
  const options = shuffled([right, ...row.wrong]);

  return {
    id: row.id,
    prompt: askKibembe
      ? `What is the Kibembe word for “${row.en}”?`
      : `What does the Kibembe term “${row.kb}” mean?`,
    explain: `${row.kb} = ${row.en}.`,
    options,
    correct: options.indexOf(right),
    focus: LIFE_TOPICS[row.topic],
    practice: row.practice || [{ en: row.en, kb: row.kb }],
    image: row.image,
    hint: `Study the picture — ${row.image.scene} — before you answer.`,
  };
}

/**
 * One daily-life examination: the same questions in a new order, and each question's own picture with
 * it. The answer choices are shuffled as well, so the correct answer never keeps one place.
 */
export function buildLifeExam() {
  return shuffled(ROWS.map(questionOf));
}