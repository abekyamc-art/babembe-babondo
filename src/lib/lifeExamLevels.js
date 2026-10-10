import { LIFE_ROWS } from "./lifeExamWords";

/**
 * The levels of the daily-life examination, in the order they open.
 *
 * A level is a paper of its own: its own title, its own words, and its own questions. Passing it at
 * 80% is what opens the one after it, and a level may be taken again as many times as a student likes.
 * The last level is drawn from the whole series at once, so the examination never stops growing — a new
 * level is one more entry here and one more set of confirmed words.
 */

const BY_ID = new Map(LIFE_ROWS.map((row) => [row.id, row]));

export const LIFE_LEVELS = [
  {
    no: 1,
    title: "First greetings",
    blurb: "Thanking, asking again, welcoming, saying yes",
    ids: ["greet:thanks", "greet:repeat", "greet:back", "greet:home", "greet:yes"],
  },
  {
    no: 2,
    title: "Sleep and rest",
    blurb: "Sleeping well, waking rested, the bed and the room",
    ids: ["sleep:how", "sleep:well", "sleep:slept", "sleep:bed", "sleep:room"],
  },
  {
    no: 3,
    title: "Home and family",
    blurb: "Father, child, the house, water and the door",
    ids: ["home:father", "home:child", "home:house", "home:water", "home:door"],
  },
  {
    no: 4,
    title: "Out in the village",
    blurb: "The market, money, the road, school and hospital",
    ids: ["village:market", "village:money", "village:road", "village:school", "village:hospital"],
  },
  {
    no: 5,
    title: "Everyday talk",
    blurb: "Saying okay, not knowing, coming and paying",
    ids: ["talk:know", "talk:okay", "talk:come", "talk:pay", "talk:help"],
  },
  {
    no: 6,
    title: "On the way",
    blurb: "The shop, the journey, medicine and a sick day",
    ids: ["way:shop", "way:onmyway", "way:medicine", "way:sick", "way:nomoney"],
  },
  {
    no: 7,
    title: "The whole journey",
    blurb: "A mixed paper drawn from every level",
    mix: 6,
  },
];

/** One level, by the number it goes by. */
export function levelByNo(no) {
  return LIFE_LEVELS.find((level) => level.no === no) || null;
}

/** How many questions a level holds. */
export function levelSize(level) {
  return level?.mix || level?.ids?.length || 0;
}

/** The same list, in a different order, so no paper repeats the last one. */
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
    practice: row.practice || [{ en: row.en, kb: row.kb }],
    image: row.image,
    hint: `Study the picture — ${row.image.scene} — before you answer.`,
  };
}

/**
 * One level's own examination: its words, freshly ordered, with the answer choices shuffled as well so
 * the correct answer never keeps one place.
 */
export function buildLevelExam(no) {
  const level = levelByNo(no);
  if (!level) return [];

  const rows = level.mix
    ? shuffled(LIFE_ROWS).slice(0, level.mix)
    : (level.ids || []).map((id) => BY_ID.get(id)).filter(Boolean);

  return shuffled(rows.map(questionOf));
}