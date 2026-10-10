/**
 * GLOIRE AI — every word and phrase of the daily-life examination, and the picture drawn for each one.
 *
 * Every Kibembe form below stands exactly as the admin's own knowledge document confirms it — its
 * spelling, its accents, its capitalisation, its hyphens and its spaces kept as they were written. A
 * form the document does not hold is left out altogether rather than guessed at: nothing is invented
 * and nothing is replaced with another language's word.
 *
 * The two wrong choices of every question are the meanings or the forms of other confirmed entries, so
 * a choice that was never confirmed is never put in front of a student.
 */

import { WORD_FIX_PICTURES } from "./examImages";

const PICTURE = "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/";

const shot = (file, scene, alt) => ({ url: `${PICTURE}${file}`, scene, alt });

/** One picture for every question, drawn for that question's own scene. */
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
  welcoming: shot(
    "ac3c720d0_generated_image.png",
    "Welcoming someone home",
    "A family welcoming someone home in a compound at dusk, one arriving with a bag while two others step forward with open arms."
  ),
  agreeing: shot(
    "3c0887d91_generated_image.png",
    "Agreeing together",
    "Two people seated on low stools facing each other in warm conversation, both smiling and nodding in agreement."
  ),
  night: shot(
    "99c9c2af7_generated_image.png",
    "Tucked in at night",
    "A parent tucking a sleeping child into a low bed by the light of a small oil lamp, a woven blanket drawn up."
  ),
  rested: shot(
    "4d575fbd5_generated_image.png",
    "Waking rested",
    "A person sitting on the edge of a low bed stretching and smiling after a good sleep, sunlight through the open window."
  ),
  bed: shot(
    "dfdd4d2b6_generated_image.png",
    "The bed",
    "A neatly made low bed in a simple room — a woven mat, a folded blanket and a small carved headrest, warm light from the doorway."
  ),
  room: shot(
    "d7503ecbb_generated_image.png",
    "Inside the room",
    "The inside of a simple plastered room with a woven mat on the floor, a wooden stool, a shelf of clay pots and a hanging cloth."
  ),
  road: shot(
    "51c4cebbe_generated_image.png",
    "The road",
    "A wide red-earth road forking through green village land, a few people walking along it at different distances."
  ),
  school: shot(
    "a63e2fd03_generated_image.png",
    "The school",
    "A small village primary school with a thatched roof and a shaded veranda, children gathered outside holding books and slates."
  ),
  clinic: shot(
    "005a9beb1_generated_image.png",
    "The health post",
    "A small whitewashed rural clinic with a plain painted cross on the wall, a nurse at the open door and two people waiting on a bench."
  ),
  beckoning: shot(
    "22ff4230a_generated_image.png",
    "Beckoning to come",
    "A person beckoning someone to come closer with an open hand turned upward and a warm smile, the other a few steps away."
  ),
  onmyway: shot(
    "18c9bdc76_generated_image.png",
    "Walking on the way",
    "A person walking briskly along a village path mid-stride with a small bundle over one shoulder, looking ahead."
  ),
  medicine: shot(
    "b38cddd2c_generated_image.png",
    "The medicine",
    "A small plain medicine bottle and two tablets in a shallow saucer on a wooden table beside a folded cloth and a clay cup."
  ),
  nomoney: shot(
    "211c8ce5b_generated_image.png",
    "An empty purse",
    "A person showing two empty open palms to a market seller, an empty cloth purse lying open beside a basket of greens."
  ),
};

/**
 * Every confirmed entry the examination asks for. `direction` is the way the pair is asked: `kb_to_en`
 * gives the Kibembe form and asks for its meaning, `en_to_kb` gives the meaning and asks for its Kibembe
 * form.
 */
export const LIFE_ROWS = [
  // ── Level 1 — First greetings
  {
    id: "greet:thanks",
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
    direction: "kb_to_en",
    kb: "Oto ela",
    en: "Please repeat",
    wrong: ["I do not know", "See you later"],
    image: IMAGE.again,
    practice: [
      { en: "Please repeat", kb: "Oto ela" },
      { en: "I do not know", kb: "Shi ke" },
      { en: "See you later", kb: "Tomo nane badae" },
    ],
  },
  {
    id: "greet:back",
    direction: "kb_to_en",
    kb: "Karibu lo nge",
    en: "Welcome back",
    wrong: ["Welcome home", "Goodbye / stay well"],
    image: IMAGE.arriving,
    practice: [
      { en: "Welcome back", kb: "Karibu lo nge" },
      { en: "Welcome home", kb: "Karibu umboka" },
      { en: "Goodbye / stay well", kb: "Mwashikale" },
    ],
  },
  {
    id: "greet:home",
    direction: "kb_to_en",
    kb: "Karibu umboka",
    en: "Welcome home",
    wrong: ["Welcome back", "Thank you"],
    image: IMAGE.welcoming,
    practice: [
      { en: "Welcome home", kb: "Karibu umboka" },
      { en: "Welcome back", kb: "Karibu lo nge" },
    ],
  },
  {
    id: "greet:yes",
    direction: "kb_to_en",
    kb: "Ee ee",
    en: "Yes",
    wrong: ["Okay / alright", "I do not know"],
    image: IMAGE.agreeing,
    practice: [
      { en: "Yes", kb: "Ee ee" },
      { en: "Okay / alright", kb: "Sawa" },
      { en: "I am fine / okay", kb: "Ole sawa" },
    ],
  },

  // ── Level 2 — Sleep and rest
  {
    id: "sleep:how",
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
    id: "sleep:well",
    direction: "kb_to_en",
    kb: "O lale byangene",
    en: "Sleep well",
    wrong: ["I slept well", "See you later"],
    image: IMAGE.night,
    practice: [
      { en: "Sleep well", kb: "O lale byangene" },
      { en: "How did you sleep?", kb: "Walolalabile" },
    ],
  },
  {
    id: "sleep:slept",
    direction: "kb_to_en",
    kb: "Na lo lalabia ngeni",
    en: "I slept well",
    wrong: ["Sleep well", "I am fine / okay"],
    image: IMAGE.rested,
    practice: [
      { en: "I slept well", kb: "Na lo lalabia ngeni" },
      { en: "Sleep well", kb: "O lale byangene" },
      { en: "I am fine / okay", kb: "Ole sawa" },
    ],
  },
  {
    id: "sleep:bed",
    direction: "en_to_kb",
    kb: "engú",
    en: "Bed",
    wrong: ["eyomba", "mlango"],
    image: IMAGE.bed,
    practice: [
      { en: "Bed", kb: "engú" },
      { en: "Room", kb: "eyomba" },
      { en: "Door", kb: "mlango" },
    ],
  },
  {
    id: "sleep:room",
    direction: "en_to_kb",
    kb: "eyomba",
    en: "Room",
    wrong: ["engú", "nyumba"],
    image: IMAGE.room,
    practice: [
      { en: "Room", kb: "eyomba" },
      { en: "Bed", kb: "engú" },
      { en: "House / home", kb: "nyumba" },
    ],
  },

  // ── Level 3 — Home and family
  {
    id: "home:father",
    direction: "kb_to_en",
    kb: "tata",
    en: "Father",
    wrong: ["Mother", "Son / child"],
    image: IMAGE.compound,
    practice: [
      { en: "Father", kb: "tata" },
      { en: "Mother", kb: "maha" },
      { en: "Son / child", kb: "mwana" },
    ],
  },
  {
    id: "home:child",
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
    direction: "kb_to_en",
    kb: "nyumba",
    en: "House / home",
    wrong: ["Door", "Water"],
    image: IMAGE.house,
    practice: [
      { en: "House / home", kb: "nyumba" },
      { en: "Door", kb: "mlango" },
      { en: "Water", kb: "maakie" },
    ],
  },
  {
    id: "home:water",
    direction: "kb_to_en",
    kb: "maakie",
    en: "Water",
    wrong: ["House / home", "Bed"],
    image: IMAGE.water,
    practice: [
      { en: "Water", kb: "maakie" },
      { en: "House / home", kb: "nyumba" },
      { en: "Bed", kb: "engú" },
    ],
  },
  {
    id: "home:door",
    direction: "en_to_kb",
    kb: "mlango",
    en: "Door",
    wrong: ["eyomba", "nyumba"],
    image: IMAGE.doorway,
    practice: [
      { en: "Door", kb: "mlango" },
      { en: "Room", kb: "eyomba" },
      { en: "House / home", kb: "nyumba" },
    ],
  },

  // ── Level 4 — Out in the village
  {
    id: "village:market",
    direction: "kb_to_en",
    kb: "So-o",
    en: "Market",
    wrong: ["Road", "Money"],
    image: IMAGE.market,
    practice: [
      { en: "Market", kb: "So-o" },
      { en: "Money", kb: "Fa-langa" },
      { en: "Road", kb: "Ba-la-ba-la" },
    ],
  },
  {
    id: "village:money",
    direction: "kb_to_en",
    kb: "Fa-langa",
    en: "Money",
    wrong: ["Market", "School"],
    image: WORD_FIX_PICTURES.money,
    practice: [
      { en: "Money", kb: "Fa-langa" },
      { en: "I have no money", kb: "Shiete falanga" },
    ],
  },
  {
    id: "village:road",
    direction: "en_to_kb",
    kb: "Ba-la-ba-la",
    en: "Road",
    wrong: ["Ma-somo", "So-o"],
    image: IMAGE.road,
    practice: [
      { en: "Road", kb: "Ba-la-ba-la" },
      { en: "Market", kb: "So-o" },
    ],
  },
  {
    id: "village:school",
    direction: "en_to_kb",
    kb: "Ma-somo",
    en: "School",
    wrong: ["O-pi-ta-li", "Ba-la-ba-la"],
    image: IMAGE.school,
    practice: [
      { en: "School", kb: "Ma-somo" },
      { en: "Hospital", kb: "O-pi-ta-li" },
    ],
  },
  {
    id: "village:hospital",
    direction: "en_to_kb",
    kb: "O-pi-ta-li",
    en: "Hospital",
    wrong: ["Ma-somo", "So-o"],
    image: IMAGE.clinic,
    practice: [
      { en: "Hospital", kb: "O-pi-ta-li" },
      { en: "I need medicine", kb: "Naonda dawa" },
    ],
  },

  // ── Level 5 — Everyday talk
  {
    id: "talk:know",
    direction: "kb_to_en",
    kb: "Shi ke",
    en: "I do not know",
    wrong: ["Okay / alright", "Please repeat"],
    image: WORD_FIX_PICTURES.unknown,
    practice: [
      { en: "I do not know", kb: "Shi ke" },
      { en: "Okay / alright", kb: "Sawa" },
      { en: "Please repeat", kb: "Oto ela" },
    ],
  },
  {
    id: "talk:okay",
    direction: "kb_to_en",
    kb: "Sawa",
    en: "Okay / alright",
    wrong: ["Yes", "I do not know"],
    image: IMAGE.friends,
    practice: [
      { en: "Okay / alright", kb: "Sawa" },
      { en: "I am fine / okay", kb: "Ole sawa" },
      { en: "I am not okay", kb: "Ineshire sawa" },
    ],
  },
  {
    id: "talk:come",
    direction: "en_to_kb",
    kb: "Cha-uno",
    en: "Come",
    wrong: ["Ilepa", "Oto ela"],
    image: IMAGE.beckoning,
    practice: [
      { en: "Come", kb: "Cha-uno" },
      { en: "Pay", kb: "Ilepa" },
    ],
  },
  {
    id: "talk:pay",
    direction: "en_to_kb",
    kb: "Ilepa",
    en: "Pay",
    wrong: ["Cha-uno", "Ni le njela"],
    image: WORD_FIX_PICTURES.pay,
    practice: [
      { en: "Pay", kb: "Ilepa" },
      { en: "I am on my way", kb: "Ni le njela" },
    ],
  },
  {
    id: "talk:help",
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

  // ── Level 6 — On the way
  {
    id: "way:shop",
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
  {
    id: "way:onmyway",
    direction: "kb_to_en",
    kb: "Ni le njela",
    en: "I am on my way",
    wrong: ["I am going to the shop", "I have no money"],
    image: IMAGE.onmyway,
    practice: [
      { en: "I am on my way", kb: "Ni le njela" },
      { en: "I am going to the shop", kb: "Na ya osoo" },
    ],
  },
  {
    id: "way:medicine",
    direction: "kb_to_en",
    kb: "Naonda dawa",
    en: "I need medicine",
    wrong: ["I am sick", "I am not okay"],
    image: IMAGE.medicine,
    practice: [
      { en: "I need medicine", kb: "Naonda dawa" },
      { en: "I am sick", kb: "Ni molwala" },
      { en: "I am not okay", kb: "Ineshire sawa" },
    ],
  },
  {
    id: "way:sick",
    direction: "kb_to_en",
    kb: "Ni molwala",
    en: "I am sick",
    wrong: ["I am fine / okay", "I need medicine"],
    image: IMAGE.unwell,
    practice: [
      { en: "I am sick", kb: "Ni molwala" },
      { en: "I am fine / okay", kb: "Ole sawa" },
      { en: "I need medicine", kb: "Naonda dawa" },
    ],
  },
  {
    id: "way:nomoney",
    direction: "kb_to_en",
    kb: "Shiete falanga",
    en: "I have no money",
    wrong: ["I am on my way", "I need medicine"],
    image: IMAGE.nomoney,
    practice: [
      { en: "I have no money", kb: "Shiete falanga" },
      { en: "Money", kb: "Fa-langa" },
    ],
  },
];